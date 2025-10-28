# Reporting & Analytics (Phase 7)

This document explains how to run the reporting and analytics components added to the backend.

Key pieces:
- `server/src/models/AggregatedMetrics.js` - daily_metrics table model for fast dashboard reads
- `server/src/models/ExportJob.js` - export job tracking
- `server/src/services/analyticsService.js` - overview and time-series helpers with caching (Redis)
- `server/src/services/exportService.js` - enqueues and processes export jobs; uploads CSV/XLSX to S3
- `server/src/jobs/aggregateDailyJob.js` - aggregation logic for daily metrics (cron-ready)
- `server/src/jobs/exportWorker.js` - worker that processes export jobs (use `node src/jobs/exportWorker.js` to run)
- `server/src/routes/admin/analyticsRoutes.js` and controllers - endpoints for admin dashboards and exports
- `server/src/services/monitoringService.js` - Prometheus metrics endpoint helper

Running the scheduled aggregation

1. Ensure Redis, Postgres and AWS credentials are set in `.env`.
2. Start a process to run the aggregator (recommended using a process manager):

```powershell
node ./server/src/jobs/aggregateDailyJob.js
```

Or import and call `scheduleDailyAggregation()` during app startup to enable cron schedule.

Running the export worker

Start a worker process to process export jobs:

```powershell
node ./server/src/jobs/exportWorker.js
```

Endpoints

- `GET /api/v1/admin/analytics/overview` - cached dashboard overview
- `GET /api/v1/admin/analytics/requests?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=daily|weekly|monthly` - time-series
- `GET /api/v1/admin/analytics/revenue` - revenue series
- `POST /api/v1/admin/reports/export` - enqueue export (body: { type, filters, format })
- `GET /api/v1/admin/reports/export/:jobId` - get job status + presigned URL
- `GET /metrics` - Prometheus metrics (mount `monitoringService.metricsHandler()` on a route)

Notes

- Use `Redis` for caching — keys are set with short TTLs and invalidated on relevant mutations.
- Exports are streamed to temporary local files and uploaded to S3; ensure the server has enough disk space for temporary files.
- For production, run workers and aggregation jobs in separate processes (or separate containers) and monitor their health.

Security

- All admin routes must be protected with `verifyAdmin` middleware.
- Ad-hoc SQL (if enabled) must be strictly restricted to `SELECT` statements only and executed with a read-only DB user.
- Mask PII fields if exporting unless the admin has `super_admin` role.
