// node-backend/routes/protected.routes.js
import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// Protected route example - requires authentication
router.get('/dashboard', verifyToken, (req, res) => {
  res.json({
    message: `Welcome to your dashboard, ${req.user.username}!`,
    user: {
      id: req.user._id,
      username: req.user.username,
      createdAt: req.user.createdAt
    }
  });
});

// Another protected route
router.get('/user-data', verifyToken, (req, res) => {
  res.json({
    message: 'This is protected user data',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

export default router;
