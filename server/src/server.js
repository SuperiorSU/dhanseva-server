import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Database and cache
import sequelize from './db.js';
import redis from './config/redis.js';

// Monitoring
import monitoringService from './services/monitoringService.js';

// Middleware (auth)
import { verifyToken } from './middleware/authMiddleware.js';
import verifyAdmin from './middleware/verifyAdmin.js';

// Routes (some may be optionally present)
import authRoutes from './routes/authRoutes.js';
import servicesRoutes from './routes/servicesRoutes.js';
import serviceRequestRoutes from './routes/serviceRequestRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/admin/index.js';
import adminAnalyticsRoutes from './routes/admin/analyticsRoutes.js';

import fs from 'fs';
import path from 'path';

// Create Express app
const app = express();

// ---- Global middlewares ----
app.use(helmet());

// Dynamic CORS origin handling
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
	origin: (origin, cb) => {
		if (!origin) return cb(null, true);
		if (allowedOrigins.length === 0) return cb(null, true);
		if (allowedOrigins.includes(origin)) return cb(null, true);
		return cb(new Error('Not allowed by CORS'));
	}
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Request id middleware (for tracing)
app.use((req, res, next) => { req.id = req.headers['x-request-id'] || uuidv4(); res.setHeader('X-Request-Id', req.id); next(); });

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX || 100) });
app.use(limiter);

// ---- Health & Metrics ----
app.get('/health', async (req, res) => {
	const uptime = process.uptime();
	let dbStatus = 'unknown';
	try { await sequelize.authenticate(); dbStatus = 'connected'; } catch (e) { dbStatus = 'disconnected'; }
	res.json({ status: 'ok', uptime, db: dbStatus });
});

// Prometheus metrics endpoint
app.get('/metrics', monitoringService.metricsHandler());

// ---- Route mounting (versioned) ----
const apiBase = '/api/v1';

app.use(`${apiBase}/auth`, authRoutes);
app.use(`${apiBase}/services`, servicesRoutes);
app.use(`${apiBase}/requests`, serviceRequestRoutes);
app.use(`${apiBase}/payments`, paymentRoutes);
app.use(`${apiBase}/notifications`, notificationRoutes);

// Admin routes (protected internally)
app.use(`${apiBase}/admin`, adminRoutes);
// Expose analytics and reports under both admin and public analytics path (admin only)
app.use(`${apiBase}/analytics`, adminAnalyticsRoutes);
app.use(`${apiBase}/admin`, adminAnalyticsRoutes);

// Attempt to mount optional routes if present (users, dsa, dashboard)
async function tryMountOptionalRoutes() {
	const tryMount = async (mountPath, relPath) => {
		const fullPath = path.join(process.cwd(), 'server', 'src', relPath);
		if (fs.existsSync(fullPath)) {
			const mod = await import(`./${relPath}`);
			if (mod && mod.default) app.use(mountPath, mod.default);
		}
	};

	await tryMount(`${apiBase}/users`, 'routes/usersRoutes.js');
	await tryMount(`${apiBase}/dsa`, 'routes/dsaRoutes.js');
	await tryMount(`${apiBase}/dashboard`, 'routes/dashboardRoutes.js');
}

// ---- Error handling ----
// 404 handler
app.use('*', (req, res, next) => {
	res.status(404).json({ error: 'Not Found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
	console.error(`[${req.id}] Error:`, err && err.stack ? err.stack : err);
	const status = err.status || 500;
	const safe = { message: err.message || 'Internal Server Error' };
	// Avoid returning sensitive details
	res.status(status).json({ error: safe });
});

// ---- Startup: DB, Redis, Queues, Scheduler ----
async function start() {
	try {
		// Authenticate DB
		await sequelize.authenticate();
		console.log('Database connected');
	} catch (err) {
		console.error('Failed to connect to DB', err);
		process.exit(1);
	}

	try {
		await redis.ping();
		console.log('Redis connected');
	} catch (err) {
		console.error('Failed to connect to Redis', err);
		process.exit(1);
	}

	// Mount optional routes
	await tryMountOptionalRoutes();

	// Start scheduled jobs if enabled
	try {
		// Load aggregation scheduler and optionally start workers
		const { scheduleDailyAggregation } = await import('./jobs/aggregateDailyJob.js');
		scheduleDailyAggregation();
		console.log('Scheduled daily aggregation started');

		if (process.env.START_EXPORT_WORKER === 'true') {
			// initialize export worker in this process (optional)
			await import('./jobs/exportWorker.js');
			console.log('Export worker started in-process');
		}
	} catch (err) {
		console.warn('Scheduler init warning', err && err.message);
	}

	const port = Number(process.env.PORT || 5000);
	const server = app.listen(port, () => console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`));

	// Graceful shutdown
	const shutdown = async () => {
		console.log('Shutting down...');
		server.close();
		try { await sequelize.close(); console.log('DB connection closed'); } catch (e) { console.warn('DB close error', e); }
		try { await redis.quit(); console.log('Redis connection closed'); } catch (e) { console.warn('Redis close error', e); }
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
	process.on('unhandledRejection', (reason) => { console.error('Unhandled Rejection', reason); });
}

start().catch(err => {
	console.error('Failed to start server', err);
	process.exit(1);
});

/*
Sample .env keys (add to your .env):

PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
REDIS_URL=redis://127.0.0.1:6379
S3_BUCKET=your-bucket
AWS_REGION=ap-south-1
RZ_KEY_ID=rzp_test_xxx
RZ_KEY_SECRET=yyy
JWT_SECRET=replace-me

To run workers in-process set START_EXPORT_WORKER=true (not recommended for production).
*/

