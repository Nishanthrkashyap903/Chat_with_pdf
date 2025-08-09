import { Schema, model } from "mongoose";

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
    chatHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Qna",
    }]
}, {
    timestamps: true
});

const UserChatHistory = model("UserChatHistory", userChatHistorySchema);

export { Qna, UserChatHistory };

