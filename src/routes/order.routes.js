const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', orderController.getOrders);
router.get('/:orderId', orderController.getOrderDetails);

module.exports = router;
