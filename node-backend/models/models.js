import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

// User schema for authentication
const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = model("User", userSchema);

const qnaSchema = new Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
}, {
    timestamps: true
});

const Qna = model("Qna", qnaSchema);

const userChatHistorySchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    vectorDbCollectionName: {
        type: String,
        required: true
    },
    /**
     * Array of chat history entries, each being a reference to a Qna document.
     */
    chatHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Qna", // Reference to the Qna model                   
    }]
}, {
    timestamps: true
});

const UserChatHistory = model("UserChatHistory", userChatHistorySchema);

export { User, Qna, UserChatHistory };
