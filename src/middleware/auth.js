const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Access token is missing' },
    });
  }

  jwt.verify(token, env.jwt.secret, (err, user) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: {
          code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
          message: isExpired ? 'Access token has expired' : 'Access token is invalid',
        },
      });
    }

    // Check if session is still active
    const db = require('../data/db');
    const session = db.sessions.find((s) => s.sessionId === user.sessionId);
    if (!session || !session.active) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Session has been invalidated' },
      });
    }

    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };
