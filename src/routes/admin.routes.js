const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/ban', adminController.banUser);
router.delete('/products/:id', adminController.deleteProduct);

module.exports = router;
