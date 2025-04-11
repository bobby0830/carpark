import { MongoClient, Db } from 'mongodb';

let cachedDb: Db | null = null;

export async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI || '');
    const db = client.db(process.env.MONGODB_DB);
    
    cachedDb = db;
    return db;
}

export const collections = {
    parkingSpots: 'parkingSpots',
    bookings: 'bookings',
    waitingQueue: 'waitingQueue',
    users: 'users'
};
