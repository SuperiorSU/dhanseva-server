import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export const notificationQueue = new Queue('notifications', { connection });

export async function enqueueNotification(notification, opts = {}) {
  // opts: { priority }
  const job = await notificationQueue.add('notification', notification, { removeOnComplete: true, attempts: 5, backoff: { type: 'exponential', delay: 3000 }, priority: opts.priority || 2 });
  return job.id;
}
