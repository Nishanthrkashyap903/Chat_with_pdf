import { Router } from 'express';
import { UpdateAPIKey, generateAnswersFromQuery, generateThreadIdAndEmbeddings, getChatHistory, getUserThreadIds } from '../controllers/ragPipeline.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/v1/rag/updateAPIKey (requires authentication) - Input: { llmApiKey }
router.post('/updateAPIKey', verifyToken, UpdateAPIKey);

// POST /api/v1/rag/generateThreadIdAndEmbeddings (requires authentication) - Input: { pdfPaths }
router.post('/generateThreadIdAndEmbeddings', verifyToken, generateThreadIdAndEmbeddings);

// POST /api/v1/rag/generateAnswersFromQuery (requires authentication) - Input: { threadId, query }
router.post('/generateAnswersFromQuery', verifyToken, generateAnswersFromQuery);

// POST /api/v1/rag/getChatHistory (requires authentication) - Input: { threadId }
router.post('/getChatHistory', verifyToken, getChatHistory);

// GET /api/v1/rag/threads (requires authentication) - Output: { threadIds: string[], count: number }
router.get('/threads', verifyToken, getUserThreadIds);

export default router;