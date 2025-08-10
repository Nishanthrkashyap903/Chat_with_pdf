import { Router } from "express";

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Feature routers
import authRoutes from './auth.routes.js';
import uploadRoutes from './upload.routes.js';

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);

export default router;