import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redis = new IORedis(REDIS_URL);

redis.on('error', (err) => console.error('Redis error', err));

export default redis;
