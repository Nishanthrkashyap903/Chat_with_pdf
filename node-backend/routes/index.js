import { Router } from "express";

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Feature routers
import authRoutes from './auth.routes.js';
import ragPiplineRoutes from './ragPipline.routes.js';
import uploadRoutes from './upload.routes.js';

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/rag', ragPiplineRoutes);

export default router;