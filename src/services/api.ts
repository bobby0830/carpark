import axios from 'axios';
import dayjs from 'dayjs';

const BASE_URL = 'http://localhost:3001';

export type User = {
    id: string;
    name: string;
    phone: string;
    balance: number;
    bookingCount: number;
    coupons: number;
    vehicles: Vehicle[];
};

export type Vehicle = {
    id: string;
    licensePlate: string;
    type: string;
};

export type SpotStatus = '充电中' | '未充电' | '准备充电' | '只是泊车' | '泊车中';

export interface ParkingSpot {
    id: string;
    spotNumber: string;
    status: SpotStatus;
    currentUser: string | null;
    startTime: string | null;
    estimatedEndTime: string | null;
    isChargingSpot?: boolean;
};

export type Booking = {
    id: string;
    userId: string;
    spotId: string;
    licensePlate: string;
    status: SpotStatus;
    bookingTime: string;
    endTime: string;
};

export type Coupon = {
    id: string;
    userId: string;
    type: string;
    value: number;
    expireDate: string;
    used: boolean;
};

export interface QueueItem {
    id?: string;
    userId: string;
    licensePlate: string;
    queueNumber: number;
    estimatedWaitTime: number;
    queueStartTime: string;
    bookingType: '充电' | '泊车';
};

export const calculateActualWaitTime = (queueStartTime: string): number => {
    const startTime = dayjs(queueStartTime);
    const now = dayjs();
    return Math.max(0, now.diff(startTime, 'minute'));
};

export type FrequentParkingLot = {
    id: string;
    userId: string;
    name: string;
    address: string;
    visitCount: number;
};

interface QueueInfo {
    waitingCount: number;
    estimatedWaitTime: number;
    currentQueue: Array<{
        licensePlate: string;
        remainingTime: number;
        bookingType: '充电' | '泊车';
    }>;
}

export const api = {
    getQueueInfo: async (): Promise<QueueInfo> => {
        const [spots, bookings, queue] = await Promise.all([
            axios.get<ParkingSpot[]>(`${BASE_URL}/parkingSpots`),
            axios.get<Booking[]>(`${BASE_URL}/bookings`),
            axios.get<QueueItem[]>(`${BASE_URL}/waitingQueue`)
        ]);

        const now = dayjs();

        // Get all current bookings sorted by end time
        const activeBookings = bookings.data
            .filter((b: Booking) => b.status === '充电中' || b.status === '泊车中')
            .sort((a: Booking, b: Booking) => dayjs(a.endTime).diff(dayjs(b.endTime)));

        // Calculate when spots will become available
        const chargingSpots = spots.data.filter((spot: ParkingSpot) => spot.isChargingSpot);
        const parkingSpots = spots.data.filter((spot: ParkingSpot) => !spot.isChargingSpot);

        const chargingEndTimes = chargingSpots
            .map((spot: ParkingSpot) => {
                const booking = activeBookings.find((b: Booking) => b.spotId === spot.id);
                return {
                    spotId: spot.id,
                    endTime: booking ? booking.endTime : now.format()
                };
            })
            .sort((a, b) => dayjs(a.endTime).unix() - dayjs(b.endTime).unix());

        const parkingEndTimes = parkingSpots
            .map((spot: ParkingSpot) => {
                const booking = activeBookings.find((b: Booking) => b.spotId === spot.id);
                return {
                    spotId: spot.id,
                    endTime: booking ? booking.endTime : now.format()
                };
            })
            .sort((a, b) => dayjs(a.endTime).unix() - dayjs(b.endTime).unix());

        // Process queue items
        const chargingQueue = queue.data.filter(q => q.bookingType === '充电');
        const parkingQueue = queue.data.filter(q => q.bookingType === '泊车');

        // Calculate remaining time for each queue item
        const processedQueue = queue.data.map(item => {
            const position = item.bookingType === '充电'
                ? chargingQueue.findIndex(q => q.id === item.id)
                : parkingQueue.findIndex(q => q.id === item.id);

            const endTimeObj = item.bookingType === '充电' ? chargingEndTimes[position] : parkingEndTimes[position];
            const endTime = endTimeObj?.endTime || now.format();

            return {
                licensePlate: item.licensePlate,
                remainingTime: dayjs(endTime).diff(now, 'minute'),
                bookingType: item.bookingType
            };
        });

        // Calculate estimated wait time for a new booking
        const estimatedWaitTime = Math.max(
            chargingQueue.length > 0 ? chargingEndTimes[chargingQueue.length - 1].diff(now, 'minute') : 0,
            parkingQueue.length > 0 ? parkingEndTimes[parkingQueue.length - 1].diff(now, 'minute') : 0
        );

        return {
            waitingCount: queue.data.length,
            estimatedWaitTime,
            currentQueue: processedQueue
        };
    },

    clearHistory: async () => {
        // Clear bookings
        const bookings = await axios.get<Booking[]>(`${BASE_URL}/bookings`);
        await Promise.all(bookings.data.map(booking => 
            axios.delete(`${BASE_URL}/bookings/${booking.id}`)
        ));

        // Reset parking spots
        const spots = await axios.get<ParkingSpot[]>(`${BASE_URL}/parkingSpots`);
        await Promise.all(spots.data.map(spot => 
            axios.patch(`${BASE_URL}/parkingSpots/${spot.id}`, {
                status: '未充电',
                currentUser: null,
                startTime: null,
                estimatedEndTime: null
            })
        ));

        // Get waiting queue and update estimated times
        const [queueToUpdate, spotsToUpdate] = await Promise.all([
            axios.get<QueueItem[]>(`${BASE_URL}/waitingQueue`),
            axios.get<ParkingSpot[]>(`${BASE_URL}/parkingSpots`)
        ]);

        const now = dayjs();
        const occupiedSpots = spots.data.filter(spot => 
            spot.status === '充电中' || 
            spot.status === '准备充电' || 
            spot.status === '只是泊车'
        );

        // Get all end times and sort them
        const endTimes = occupiedSpots
            .map(spot => spot.estimatedEndTime)
            .filter((time): time is string => time !== null)
            .sort();

        // Update wait times for each queue item
        const updatedQueue = queueToUpdate.data.map((item: QueueItem, index: number) => {
            // Each person needs to wait for the previous person plus the next available spot
            const waitPosition = index;
            const relevantEndTime = endTimes[waitPosition];
            const estimatedWaitTime = relevantEndTime
                ? dayjs(relevantEndTime).diff(now, 'minute')
                : 0;

            return {
                ...item,
                estimatedWaitTime
            };
        });

        // Update all queue items
        await Promise.all(updatedQueue.map((item: QueueItem) =>
            axios.put(`${BASE_URL}/waitingQueue/${item.id}`, item)
        ));

        // Clear waiting queue
        const queueItems = await axios.get<QueueItem[]>(`${BASE_URL}/waitingQueue`);
        await Promise.all(queueItems.data.map((item: QueueItem) => 
            axios.delete(`${BASE_URL}/waitingQueue/${item.id}`)
        ));

        return { success: true };
    },

    // Auto-matching parking spot
    findAvailableSpot: async (bookingTime: string, endTime: string, requireCharging: boolean) => {
        const spots = await axios.get<ParkingSpot[]>(`${BASE_URL}/parkingSpots`);
        const bookings = await axios.get<Booking[]>(`${BASE_URL}/bookings`);
        
        // First mark charging spots (A01-A03)
        const spotsWithCharging = spots.data.map(spot => ({
            ...spot,
            isChargingSpot: spot.spotNumber.startsWith('A')
        }));

        // Filter available spots
        const eligibleSpots = spotsWithCharging.filter(spot => {
            // If charging is required, only consider charging spots
            if (requireCharging && !spot.isChargingSpot) {
                return false;
            }

            // Check current spot status
            if (spot.status === '充电中' || spot.status === '准备充电') {
                // If spot is currently charging or preparing to charge, check if it will be free by requested time
                if (!spot.estimatedEndTime || dayjs(bookingTime).isBefore(spot.estimatedEndTime)) {
                    return false;
                }
            }

            // Check future bookings for this spot
            const spotBookings = bookings.data.filter(b => b.spotId === spot.id);
            return !spotBookings.some(booking => {
                const bookingStart = dayjs(booking.bookingTime);
                const bookingEnd = dayjs(booking.endTime);
                const requestStart = dayjs(bookingTime);
                const requestEnd = dayjs(endTime);

                // Check for time overlap
                return (
                    (requestStart.isSame(bookingStart) || requestStart.isAfter(bookingStart)) &&
                    requestStart.isBefore(bookingEnd)
                ) || (
                    (requestEnd.isSame(bookingEnd) || requestEnd.isBefore(bookingEnd)) &&
                    requestEnd.isAfter(bookingStart)
                );
            });
        });

        // Sort spots by preference:
        // 1. For charging requests, prioritize charging spots
        // 2. For non-charging requests, prioritize non-charging spots
        const sortedSpots = eligibleSpots.sort((a, b) => {
            if (requireCharging) {
                if (a.isChargingSpot && !b.isChargingSpot) return -1;
                if (!a.isChargingSpot && b.isChargingSpot) return 1;
            } else {
                if (!a.isChargingSpot && b.isChargingSpot) return -1;
                if (a.isChargingSpot && !b.isChargingSpot) return 1;
            }
            return 0;
        });

        return sortedSpots[0] || null;
    },

    // Debug endpoints
    getAllBookings: () =>
        axios.get<Booking[]>(`${BASE_URL}/bookings`),

    // User related endpoints
    getUser: (userId: string) => 
        axios.get<User>(`${BASE_URL}/users/${userId}`),

    updateUser: (userId: string, data: Partial<User>) =>
        axios.patch<User>(`${BASE_URL}/users/${userId}`, data),

    // Vehicle related endpoints
    addVehicle: (userId: string, vehicle: Omit<Vehicle, 'id'>) =>
        axios.post<Vehicle>(`${BASE_URL}/users/${userId}/vehicles`, vehicle),

    removeVehicle: (userId: string, vehicleId: string) =>
        axios.delete(`${BASE_URL}/users/${userId}/vehicles/${vehicleId}`),

    // Coupon related endpoints
    getUserCoupons: (userId: string) =>
        axios.get<Coupon[]>(`${BASE_URL}/coupons?userId=${userId}&used=false`),

    useCoupon: (couponId: string) =>
        axios.patch<Coupon>(`${BASE_URL}/coupons/${couponId}`, { used: true }),

    // Frequent parking lots
    getFrequentParkingLots: (userId: string) =>
        axios.get<FrequentParkingLot[]>(`${BASE_URL}/frequentParkingLots?userId=${userId}`),

    // Parking related endpoints
    getParkingSpots: () => 
        axios.get<ParkingSpot[]>(`${BASE_URL}/parkingSpots`),

    getParkingSpot: (id: string) => 
        axios.get<ParkingSpot>(`${BASE_URL}/parkingSpots/${id}`),

    updateParkingSpot: (id: string, data: Partial<ParkingSpot>) => 
        axios.patch<ParkingSpot>(`${BASE_URL}/parkingSpots/${id}`, data),

    // Booking related endpoints
    createBooking: (booking: Omit<Booking, 'id'>) => 
        axios.post<Booking>(`${BASE_URL}/bookings`, booking),

    getUserBookings: (userId: string) => 
        axios.get<Booking[]>(`${BASE_URL}/bookings?userId=${userId}&_sort=bookingTime&_order=desc`),

    // Queue related endpoints
    joinQueue: async (data: Omit<QueueItem, 'id'>) => {
        // Get all current bookings and spots to calculate wait time
        const [spots, bookings, queue] = await Promise.all([
            axios.get<ParkingSpot[]>(`${BASE_URL}/parkingSpots`),
            axios.get<Booking[]>(`${BASE_URL}/bookings`),
            axios.get<QueueItem[]>(`${BASE_URL}/waitingQueue`)
        ]);

        // Calculate when the next spot will be available
        const now = dayjs();
        const occupiedSpots = spots.data.filter((spot: ParkingSpot) => 
            (data.bookingType === '充电' ? spot.isChargingSpot : true) &&
            (spot.status === '充电中' || spot.status === '准备充电' || spot.status === '只是泊车')
        );

        // Get all end times and sort them
        const endTimes = occupiedSpots
            .map((spot: ParkingSpot) => spot.estimatedEndTime)
            .filter((time: string | null): time is string => time !== null)
            .sort();

        // Calculate queue position and estimated wait time
        const queuePosition = queue.data.length + 1;
        const estimatedWaitTime = endTimes.length > 0
            ? dayjs(endTimes[0]).diff(now, 'minute')
            : 0;

        const queueItem = {
            userId: data.userId,
            licensePlate: data.licensePlate,
            queueNumber: queuePosition,
            estimatedWaitTime,
            queueStartTime: now.format(),
            bookingType: data.bookingType
        };

        const response = await axios.post(`${BASE_URL}/waitingQueue`, queueItem);
        return response.data;
    },

    getWaitingQueue: async () => {
        const [queue, spots] = await Promise.all([
            axios.get<QueueItem[]>(`${BASE_URL}/waitingQueue`),
            axios.get<ParkingSpot[]>(`${BASE_URL}/parkingSpots`)
        ]);

        const now = dayjs();
        const occupiedSpots = spots.data.filter(spot => 
            spot.status === '充电中' || 
            spot.status === '准备充电' || 
            spot.status === '只是泊车'
        );

        // Get all end times and sort them
        const endTimes = occupiedSpots
            .map(spot => spot.estimatedEndTime || now.format())
            .sort((a, b) => dayjs(a).diff(dayjs(b)));

        // Update wait times for each queue item
        const updatedQueue = queue.data.map((item, index) => {
            // Each person needs to wait for the previous person plus the next available spot
            const waitPosition = index;
            const endTime = endTimes[waitPosition] || now.format();
            const estimatedWaitTime = dayjs(endTime).diff(now, 'minute');

            return {
                ...item,
                estimatedWaitTime
            };
        });

        // Update all queue items
        await Promise.all(updatedQueue.map(item =>
            axios.put(`${BASE_URL}/waitingQueue/${item.id}`, item)
        ));

        return { data: updatedQueue };
    },

    removeFromQueue: (id: string) => 
        axios.delete(`${BASE_URL}/waitingQueue/${id}`),

    addToQueue: (data: {
        userId: string;
        licensePlate: string;
        estimatedWaitTime: number;
    }) => axios.post(`${BASE_URL}/waitingQueue`, {
        ...data,
        queueNumber: 1, // Will be updated by server
        queueStartTime: new Date().toISOString()
    }),
};
