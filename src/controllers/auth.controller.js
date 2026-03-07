const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../data/db');
const env = require('../config/env');

function generateTokens(user, sessionId) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  };

  const accessToken = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
  const refreshToken = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.refreshExpiresIn });

  return { accessToken, refreshToken, decodedAccess: jwt.decode(accessToken) };
}

exports.register = (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
    });
  }

  if (password.length < 6) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters long' },
    });
  }

  const existingUser = db.findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Email already exists' },
    });
  }

  const newUser = {
    id: crypto.randomUUID(),
    email,
    password,
    firstName,
    lastName,
    phone: phone || '',
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  res.status(201).json({
    message: 'User created successfully',
    userId: newUser.id,
    createdAt: newUser.createdAt,
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Email and password are required' },
    });
  }

  const user = db.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
    });
  }

  const sessionId = crypto.randomUUID();
  db.sessions.push({ sessionId, userId: user.id, active: true });

  const { accessToken, refreshToken, decodedAccess } = generateTokens(user, sessionId);

  res.json({
    accessToken,
    refreshToken,
    expiresIn: decodedAccess.exp - decodedAccess.iat,
    tokenType: 'Bearer',
    issuedAt: new Date(decodedAccess.iat * 1000).toISOString(),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
};

exports.refresh = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Refresh token is required' },
    });
  }

  jwt.verify(refreshToken, env.jwt.secret, (err, userPayload) => {
    if (err) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Invalid or expired refresh token' },
      });
    }

    const session = db.sessions.find((s) => s.sessionId === userPayload.sessionId && s.active);
    if (!session) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Session has been invalidated or expired' },
      });
    }

    const user = db.findUserById(userPayload.userId);
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User no longer exists' },
      });
    }

    const {
      accessToken,
      refreshToken: newRefresh,
      decodedAccess,
    } = generateTokens(user, userPayload.sessionId);

    res.json({
      accessToken,
      refreshToken: newRefresh,
      expiresIn: decodedAccess.exp - decodedAccess.iat,
      tokenType: 'Bearer',
      issuedAt: new Date(decodedAccess.iat * 1000).toISOString(),
    });
  });
};

exports.logout = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(200).json({ message: 'Already logged out' });
  }

  jwt.verify(token, env.jwt.secret, { ignoreExpiration: true }, (err, user) => {
    if (!err && user) {
      const session = db.sessions.find((s) => s.sessionId === user.sessionId);
      if (session) {
        session.active = false;
      }
    }
    res.json({ message: 'Logged out successfully' });
  });
};
