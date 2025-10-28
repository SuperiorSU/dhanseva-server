import client from 'prom-client';

// register default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const exportJobsTotal = new client.Counter({ name: 'export_jobs_total', help: 'Total export jobs processed' });
const exportJobDuration = new client.Histogram({ name: 'export_job_duration_seconds', help: 'Export job duration seconds', buckets: [0.5,1,2,5,10,30,60,120] });

function metricsHandler() {
  return async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  };
}

export default { exportJobsTotal, exportJobDuration, metricsHandler };
