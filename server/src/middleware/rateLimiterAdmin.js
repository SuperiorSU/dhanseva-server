import rateLimit from 'express-rate-limit';

export const rateLimiterAdmin = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: { message: 'Too many admin requests, slow down' }
});
