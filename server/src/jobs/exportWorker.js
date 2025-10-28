import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import exportService from '../services/exportService.js';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const connection = redis;

const worker = new Worker('exports', async (job) => {
  const payload = job.data;
  return await exportService.processExportJob(payload);
}, { connection });

worker.on('completed', (job) => {
  console.log('Export job completed', job.id);
});

worker.on('failed', (job, err) => {
  console.error('Export job failed', job.id, err);
});

export default worker;
