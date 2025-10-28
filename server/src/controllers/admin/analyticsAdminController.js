import analyticsService from '../../services/analyticsService.js';

export async function overview(req, res, next) {
  try {
    const data = await analyticsService.overview();
    return res.json(data);
  } catch (err) { return next(err); }
}

export async function services(req, res, next) {
  try {
    const data = await analyticsService.servicesBreakdown();
    return res.json({ data });
  } catch (err) { return next(err); }
}

export async function payments(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await analyticsService.paymentsSummary({ fromDate: from, toDate: to });
    return res.json(data);
  } catch (err) { return next(err); }
}

export async function dsa(req, res, next) {
  try {
    const data = await analyticsService.dsaStats();
    return res.json(data);
  } catch (err) { return next(err); }
}

export default { overview, services, payments, dsa };
