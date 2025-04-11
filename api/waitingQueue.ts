import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, collections } from './db';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query } = req;
    const db = await connectToDatabase();

    switch (method) {
        case 'GET':
            // Get all queue items
            const queue = await db.collection(collections.waitingQueue)
                .find({})
                .sort({ queueStartTime: 1 })
                .toArray();

            // Get all occupied spots to calculate wait times
            const spots = await db.collection(collections.parkingSpots)
                .find({
                    status: { 
                        $in: ['充电中', '准备充电', '只是泊车', '泊车中']
                    }
                })
                .toArray();

            const now = dayjs();
            const endTimes = spots
                .map(spot => spot.estimatedEndTime || now.format())
                .sort((a, b) => dayjs(a).diff(dayjs(b)));

            // Update wait times for each queue item
            const updatedQueue = queue.map((item, index) => {
                const waitPosition = index;
                const endTime = endTimes[waitPosition] || now.format();
                const estimatedWaitTime = dayjs(endTime).diff(now, 'minute');

                return {
                    ...item,
                    estimatedWaitTime: Math.max(0, estimatedWaitTime)
                };
            });

            // Update all queue items in database
            await Promise.all(updatedQueue.map(item =>
                db.collection(collections.waitingQueue).updateOne(
                    { _id: item._id },
                    { $set: { estimatedWaitTime: item.estimatedWaitTime } }
                )
            ));

            return res.status(200).json(updatedQueue);

        case 'POST':
            // Add to queue
            const { userId, licensePlate, bookingType } = req.body;

            // Get current queue length for position
            const queueLength = await db.collection(collections.waitingQueue).countDocuments();

            const queueItem = {
                userId,
                licensePlate,
                bookingType,
                queueNumber: queueLength + 1,
                queueStartTime: new Date().toISOString(),
                estimatedWaitTime: 0 // Will be calculated on next GET request
            };

            const result = await db.collection(collections.waitingQueue).insertOne(queueItem);
            return res.status(201).json({ 
                ...queueItem, 
                id: result.insertedId 
            });

        case 'DELETE':
            if (!query.id) {
                return res.status(400).json({ error: 'ID is required' });
            }

            // Remove from queue
            const deleteResult = await db.collection(collections.waitingQueue)
                .deleteOne({ _id: new ObjectId(query.id as string) });

            if (deleteResult.deletedCount === 0) {
                return res.status(404).json({ error: 'Queue item not found' });
            }

            // Reorder remaining queue items
            const remainingQueue = await db.collection(collections.waitingQueue)
                .find({})
                .sort({ queueStartTime: 1 })
                .toArray();

            await Promise.all(remainingQueue.map((item, index) =>
                db.collection(collections.waitingQueue).updateOne(
                    { _id: item._id },
                    { $set: { queueNumber: index + 1 } }
                )
            ));

            return res.status(200).json({ message: 'Successfully removed from queue' });

        default:
            res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
            return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
}
