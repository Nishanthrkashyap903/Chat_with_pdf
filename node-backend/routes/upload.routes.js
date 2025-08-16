// node-backend/routes/upload.routes.js
import { Router } from 'express';
import { uploadMultiple, uploadSingle } from '../controllers/upload.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// POST /api/v1/upload/single  (field name: file)
router.post('/single', verifyToken, upload.single('file'), uploadSingle);

// POST /api/v1/upload/multiple (field name: files)
router.post('/multiple', verifyToken, upload.array('files', 10), uploadMultiple);

export default router;
