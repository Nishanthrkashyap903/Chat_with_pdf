import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import router from './routes/index.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieParser()); // Parse cookies

app.use('/api/v1', router)

export default app;