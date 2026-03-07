require('dotenv').config({ path: process.env.npm_config_dotenv_config_path || '.env' });

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  isQa: process.env.NODE_ENV === 'qa',
  isProd: process.env.NODE_ENV === 'prod',
  verboseErrors: process.env.VERBOSE_ERRORS === 'true',
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-qa-practice-key-replace-me',
    expiresIn: process.env.TOKEN_EXPIRY || '1h',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRY || '24h',
  },
  chaosMode: process.env.CHAOS_MODE === 'true',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOWS_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};
