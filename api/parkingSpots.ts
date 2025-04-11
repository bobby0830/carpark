import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, collections } from './db';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query } = req;
    const db = await connectToDatabase();

    switch (method) {
        case 'GET':
            if (query.id) {
                // Get single parking spot
                const spot = await db.collection(collections.parkingSpots)
                    .findOne({ _id: new ObjectId(query.id as string) });
                if (!spot) {
                    return res.status(404).json({ error: 'Parking spot not found' });
                }
                return res.status(200).json(spot);
            } else {
                // Get all parking spots
                const spots = await db.collection(collections.parkingSpots).find({}).toArray();
                return res.status(200).json(spots);
            }

        case 'POST':
            // Create new parking spot
            const result = await db.collection(collections.parkingSpots).insertOne(req.body);
            return res.status(201).json({ 
                ...req.body, 
                id: result.insertedId 
            });

        case 'PATCH':
            if (!query.id) {
                return res.status(400).json({ error: 'ID is required' });
            }
            // Update parking spot
            const updateResult = await db.collection(collections.parkingSpots)
                .findOneAndUpdate(
                    { _id: new ObjectId(query.id as string) },
                    { $set: req.body },
                    { returnDocument: 'after' }
                );
            if (!updateResult.value) {
                return res.status(404).json({ error: 'Parking spot not found' });
            }
            return res.status(200).json(updateResult.value);

        default:
            res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
            return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
}
