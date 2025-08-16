// node-backend/routes/auth.routes.js
import { Router } from 'express';
import { getProfile, login, logout, register } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/v1/auth/register - Input: { username, password }
router.post('/register', register);

// POST /api/v1/auth/login - Input: { username, password }
router.post('/login', login);

// POST /api/v1/auth/logout (requires authentication)
router.post('/logout', verifyToken, logout);

// GET /api/v1/auth/profile (requires authentication) - Output: { user }
router.get('/profile', verifyToken, getProfile);

export default router;
