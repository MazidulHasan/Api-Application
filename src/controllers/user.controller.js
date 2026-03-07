const db = require('../data/db');

exports.getProfile = (req, res) => {
  const user = db.findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
};

exports.updateProfile = (req, res) => {
  const userIndex = db.users.findIndex((u) => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  const { firstName, lastName, phone } = req.body;
  const user = db.users[userIndex];

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;

  const { password, ...updatedUser } = user;
  res.json({
    message: 'Profile updated successfully',
    user: updatedUser,
  });
};

exports.changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'currentPassword and newPassword are required' },
    });
  }

  if (newPassword.length < 6) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'New password must be at least 6 characters long',
      },
    });
  }

  const user = db.findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  if (user.password !== currentPassword) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Incorrect current password' },
    });
  }

  user.password = newPassword;
  res.json({ message: 'Password changed successfully' });
};

exports.deleteProfile = (req, res) => {
  const userIndex = db.users.findIndex((u) => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }

  db.users.splice(userIndex, 1);

  // Also invalidate sessions
  db.sessions.forEach((s) => {
    if (s.userId === req.user.userId) {
      s.active = false;
    }
  });

  res.json({ message: 'User successfully deleted' });
};
