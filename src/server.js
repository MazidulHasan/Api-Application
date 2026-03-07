const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const chaosMiddleware = require('./middleware/chaos');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const orderController = require('./controllers/order.controller');
const adminRoutes = require('./routes/admin.routes');
const { authenticateToken } = require('./middleware/auth');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();

// Application-level Middlewares
app.use(cors());
app.use(express.json());
// Logger
app.use(morgan(env.isQa ? 'dev' : 'short'));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});
app.use(limiter);

// Chaos mode & delays
app.use(chaosMiddleware);

// Swagger UI Setup
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: env.env, timestamp: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.post('/checkout', authenticateToken, orderController.checkout);
app.use('/admin', adminRoutes);

// Fallback 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
});

// Global Error handling must be last
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[API] Server running on port ${env.port} in ${env.env} mode.`);
  console.log(`[API] Chaos mode: ${env.chaosMode}`);
  console.log(`[API] Verbose errors: ${env.verboseErrors}`);
});
