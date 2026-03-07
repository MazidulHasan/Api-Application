const crypto = require('crypto');
const db = require('../data/db');

exports.checkout = (req, res) => {
  const userId = req.user.userId;
  const cart = db.carts.get(userId);

  if (!cart || cart.items.length === 0) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Cart is empty' },
    });
  }

  let amount = 0;
  const orderItems = [];

  // Stock validation
  for (const item of cart.items) {
    const product = db.findProductById(item.productId);
    if (!product) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Product ${item.productId} not found` },
      });
    }
    if (product.stock < item.quantity) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `Insufficient stock for product ${product.name}` },
      });
    }
    amount += product.price * item.quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
  }

  // Deduct stock
  for (const item of cart.items) {
    const product = db.findProductById(item.productId);
    product.stock -= item.quantity;
  }

  // Create order
  const order = {
    id: crypto.randomUUID(),
    userId,
    status: 'confirmed',
    amount: parseFloat(amount.toFixed(2)),
    items: orderItems,
    createdAt: new Date().toISOString(),
  };

  db.orders.push(order);

  // Clear cart
  cart.items = [];

  res.status(201).json({
    orderId: order.id,
    status: order.status,
    amount: order.amount,
    items: order.items,
    createdAt: order.createdAt,
  });
};

exports.getOrders = (req, res) => {
  const userId = req.user.userId;
  const userOrders = db.orders.filter((o) => o.userId === userId);
  res.json(userOrders);
};

exports.getOrderDetails = (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.orderId && o.userId === req.user.userId);
  if (!order) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Order not found' },
    });
  }
  res.json(order);
};
