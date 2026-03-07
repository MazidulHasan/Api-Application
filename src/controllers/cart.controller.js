const db = require('../data/db');

function getCart(userId) {
  if (!db.carts.has(userId)) {
    db.carts.set(userId, { items: [] });
  }
  return db.carts.get(userId);
}

exports.getCart = (req, res) => {
  const cart = getCart(req.user.userId);
  // Populate product details
  const populatedItems = cart.items.map((item) => {
    const product = db.findProductById(item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      product: product || null,
    };
  });

  res.json({ items: populatedItems });
};

exports.addToCart = (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity || quantity < 1) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Valid productId and quantity are required' },
    });
  }

  const product = db.findProductById(productId);
  if (!product) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }

  const cart = getCart(req.user.userId);
  const existingItem = cart.items.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += parseInt(quantity, 10);
  } else {
    cart.items.push({ productId, quantity: parseInt(quantity, 10) });
  }

  res.json({ message: 'Product added to cart', cart });
};

exports.updateQuantity = (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity < 1) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Valid quantity is required' },
    });
  }

  const cart = getCart(req.user.userId);
  const itemIndex = cart.items.findIndex((item) => item.productId === productId);

  if (itemIndex === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not in cart' },
    });
  }

  cart.items[itemIndex].quantity = parseInt(quantity, 10);
  res.json({ message: 'Cart updated', cart });
};

exports.removeItem = (req, res) => {
  const { productId } = req.params;
  const cart = getCart(req.user.userId);

  const initialLength = cart.items.length;
  cart.items = cart.items.filter((item) => item.productId !== productId);

  if (cart.items.length === initialLength) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not in cart' },
    });
  }

  res.json({ message: 'Product removed from cart', cart });
};

exports.clearCart = (req, res) => {
  const cart = getCart(req.user.userId);
  cart.items = [];
  res.json({ message: 'Cart cleared' });
};
