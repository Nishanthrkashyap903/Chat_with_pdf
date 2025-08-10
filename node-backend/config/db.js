import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGODB_URI;

// Mongoose recommended options
const options = {
    // modern mongoose no longer needs useNewUrlParser/useUnifiedTopology
    serverSelectionTimeoutMS: 5000,
};

export async function connectToDatabase() {
    // Validate required env
    if (!uri) {
        throw new Error('MONGODB_URI is not set in environment');
    }
    try {
        await mongoose.connect(uri, options);
        console.log('✅ MongoDB connected');

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
        });
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        // Propagate error so the server startup can fail fast
        throw err;
    }
}

