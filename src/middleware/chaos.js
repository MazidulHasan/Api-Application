const env = require('../config/env');

function chaosMiddleware(req, res, next) {
  // Can be enabled globally via env or via a specific header `X-Chaos-Mode: true`
  const isChaos = env.chaosMode || req.header('X-Chaos-Mode') === 'true';

  if (!isChaos) return next();

  // 1. Artificial Delay (100ms - 800ms)
  const delay = Math.floor(Math.random() * 700) + 100;

  // 2. Random 500 Error (~5% chance)
  const shouldError = Math.random() < 0.05;

  setTimeout(() => {
    if (shouldError) {
      return res.status(500).json({
        error: {
          code: 'CHAOS_ERROR',
          message: 'Random chaos mode artificial failure simulated for QA practice.',
        },
      });
    }
    next();
  }, delay);
}

module.exports = chaosMiddleware;
