import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, collections } from './db';
import dayjs from 'dayjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const db = await connectToDatabase();

    // Get all necessary data
    const [spots, bookings, queue] = await Promise.all([
        db.collection(collections.parkingSpots).find({}).toArray(),
        db.collection(collections.bookings)
            .find({ 
                status: { $in: ['充电中', '泊车中'] }
            })
            .toArray(),
        db.collection(collections.waitingQueue).find({}).toArray()
    ]);

    const now = dayjs();

    // Get all current bookings sorted by end time
    const activeBookings = bookings.sort((a, b) => 
        dayjs(a.endTime).diff(dayjs(b.endTime))
    );

    // Calculate when spots will become available
    const chargingSpots = spots.filter(spot => spot.isChargingSpot);
    const parkingSpots = spots.filter(spot => !spot.isChargingSpot);

    const chargingEndTimes = chargingSpots
        .map(spot => {
            const booking = activeBookings.find(b => b.spotId === spot._id.toString());
            return {
                spotId: spot._id.toString(),
                endTime: booking ? booking.endTime : now.format()
            };
        })
        .sort((a, b) => dayjs(a.endTime).unix() - dayjs(b.endTime).unix());

    const parkingEndTimes = parkingSpots
        .map(spot => {
            const booking = activeBookings.find(b => b.spotId === spot._id.toString());
            return {
                spotId: spot._id.toString(),
                endTime: booking ? booking.endTime : now.format()
            };
        })
        .sort((a, b) => dayjs(a.endTime).unix() - dayjs(b.endTime).unix());

    // Process queue items
    const chargingQueue = queue.filter(q => q.bookingType === '充电');
    const parkingQueue = queue.filter(q => q.bookingType === '泊车');

    // Calculate remaining time for each queue item
    const processedQueue = queue.map(item => {
        const position = item.bookingType === '充电'
            ? chargingQueue.findIndex(q => q._id.toString() === item._id.toString())
            : parkingQueue.findIndex(q => q._id.toString() === item._id.toString());

        const endTimes = item.bookingType === '充电' ? chargingEndTimes : parkingEndTimes;
        const remainingTime = position < endTimes.length
            ? dayjs(endTimes[position].endTime).diff(now, 'minute')
            : dayjs(endTimes[endTimes.length - 1].endTime).diff(now, 'minute') + 
              ((position - endTimes.length + 1) * 60); // Assume 1 hour per additional wait

        return {
            licensePlate: item.licensePlate,
            remainingTime: Math.max(0, remainingTime),
            bookingType: item.bookingType
        };
    });

    // Calculate estimated wait time for a new booking
    const estimatedWaitTime = Math.max(
        chargingQueue.length > 0 
            ? dayjs(chargingEndTimes[chargingQueue.length - 1].endTime).diff(now, 'minute')
            : 0,
        parkingQueue.length > 0
            ? dayjs(parkingEndTimes[parkingQueue.length - 1].endTime).diff(now, 'minute')
            : 0
    );

    return res.status(200).json({
        waitingCount: queue.length,
        estimatedWaitTime: Math.max(0, estimatedWaitTime),
        currentQueue: processedQueue
    });
}
