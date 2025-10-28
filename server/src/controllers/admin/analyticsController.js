import analyticsService from '../../services/analyticsService.js';

// GET /api/v1/admin/analytics/overview
export async function overview(req, res, next) {
  try {
    const data = await analyticsService.overview();
    return res.json({ data });
  } catch (err) { return next(err); }
}

// GET /api/v1/admin/analytics/requests
export async function requestsSeries(req, res, next) {
  try {
    const { from, to, granularity } = req.query;
    const series = await analyticsService.getRequestsSeries({ from, to, granularity });
    return res.json({ data: series });
  } catch (err) { return next(err); }
}

// GET /api/v1/admin/analytics/revenue
export async function revenueSeries(req, res, next) {
  try {
    const { from, to, granularity } = req.query;
    const series = await analyticsService.getRevenueSeries({ from, to, granularity });
    return res.json({ data: series });
  } catch (err) { return next(err); }
}

// GET /api/v1/admin/analytics/dsa-performance
export async function dsaPerformance(req, res, next) {
  try {
    const data = await analyticsService.dsaStats();
    return res.json({ data });
  } catch (err) { return next(err); }
}

export default { overview, requestsSeries, revenueSeries, dsaPerformance };
