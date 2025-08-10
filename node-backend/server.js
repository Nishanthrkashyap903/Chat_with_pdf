import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// --- Environment Variable Check ---
const requiredEnv = ['MONGODB_URI', 'PORT', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

import app from './app.js';
import { connectToDatabase } from './config/db.js';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error.message);
    process.exit(1);
  }
}

startServer(); 