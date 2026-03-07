const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');

// All /users endpoints require authentication
router.use(authenticateToken);

router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);
router.post('/change-password', userController.changePassword);
router.delete('/me', userController.deleteProfile);

module.exports = router;
