// node-backend/routes/auth.routes.js
import { Router } from 'express';
import { register, login, logout, getProfile } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', register);

// POST /api/v1/auth/login
router.post('/login', login);

// POST /api/v1/auth/logout (requires authentication)
router.post('/logout', verifyToken, logout);

// GET /api/v1/auth/profile (requires authentication)
router.get('/profile', verifyToken, getProfile);

export default router;
