export interface ParkingLot {
    id: string;
    name: string;
    distance: number;
    availableSpots: number;
    chargingSpots: number;
    operatingHours: string;
    queueLength: number;
    estimatedWaitTime: number;
}

export interface Booking {
    id: string;
    parkingLotId: string;
    date: string;
    timeSlot: string;
    licensePlate: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
