import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, collections } from './db';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query } = req;
    const db = await connectToDatabase();

    switch (method) {
        case 'GET':
            let filter = {};
            if (query.userId) {
                filter = { userId: query.userId };
            }
            
            const bookings = await db.collection(collections.bookings)
                .find(filter)
                .sort({ bookingTime: -1 })
                .toArray();
            
            return res.status(200).json(bookings);

        case 'POST':
            // Create new booking
            const result = await db.collection(collections.bookings).insertOne({
                ...req.body,
                bookingTime: new Date().toISOString()
            });
            
            // Update parking spot status
            await db.collection(collections.parkingSpots).updateOne(
                { _id: new ObjectId(req.body.spotId) },
                { 
                    $set: { 
                        status: req.body.status,
                        currentUser: req.body.userId,
                        startTime: req.body.bookingTime,
                        estimatedEndTime: req.body.endTime
                    } 
                }
            );

            return res.status(201).json({ 
                ...req.body, 
                id: result.insertedId 
            });

        case 'PATCH':
            if (!query.id) {
                return res.status(400).json({ error: 'ID is required' });
            }

            const updateResult = await db.collection(collections.bookings)
                .findOneAndUpdate(
                    { _id: new ObjectId(query.id as string) },
                    { $set: req.body },
                    { returnDocument: 'after' }
                );

            if (!updateResult || !updateResult.value) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            return res.status(200).json(updateResult.value);

        default:
            res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
            return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
}
