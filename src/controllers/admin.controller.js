const db = require('../data/db');

exports.getAllUsers = (req, res) => {
  res.json(db.users.map(({ password, ...user }) => user));
};

exports.banUser = (req, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  user.banned = true;

  // Invalidate any active sessions for this user
  db.sessions.forEach((s) => {
    if (s.userId === user.id) {
      s.active = false;
    }
  });

  res.json({ message: 'User banned successfully' });
};

exports.deleteProduct = (req, res) => {
  const productIndex = db.products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }

  db.products.splice(productIndex, 1);
  res.json({ message: 'Product deleted by admin' });
};
