import { v4 as uuidv4 } from 'uuid';
import { Qna, User, UserChatHistory } from "../models/models.js";

export const UpdateAPIKey = async (req, res) => {
    try {
        const { llmApiKey } = req.body;

        if (!llmApiKey) {
            return res.status(400).json({ error: 'No API key provided' });
        }

        const user = await User.findByIdAndUpdate(req.user._id, { LLM_API_KEY: llmApiKey }, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            message: 'API key updated successfully',
            user,
        });
    } catch (error) {
        console.error('UpdateAPIKey error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

export const generateThreadIdAndEmbeddings = async (req, res) => {
    try {
        const { pdfPaths } = req.body;

        if (!pdfPaths || !Array.isArray(pdfPaths) || pdfPaths.length === 0) {
            return res.status(400).json({ error: 'No PDF paths provided' });
        }

        const threadId = uuidv4();

        // Get the user's API key from the database
        const user = await User.findById(req.user._id);
        if (!user || !user.LLM_API_KEY) {
            return res.status(400).json({ error: 'No API key found for this user or user not found' });
        }

        const apiKey = user.LLM_API_KEY;


        // Send request to Flask backend to generate embeddings
        const response = await fetch(`${process.env.FLASK_API_URL}/api/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pdfPaths,
                threadId,
                apiKey
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Embedding generation failed:', errorData);

            if (response.status === 404) {
                return res.status(404).json({ error: 'Embedding service not found' });
            } else if (response.status === 400) {
                return res.status(400).json({ error: errorData.message || 'Invalid request to embedding service' });
            } else {
                return res.status(500).json({ error: 'Failed to generate embeddings' });
            }
        }

        const data = await response.json();
        console.log(data);

        // Create new chat history entry for this user with the new threadId
        const newChatHistory = new UserChatHistory({
            userId: req.user._id,
            threadId: threadId,
            pdfPaths: pdfPaths,
            chatHistory: []
        });

        await newChatHistory.save();

        return res.status(200).json({ threadId, message: "Thread Id and Embeddings generated successfully" });
    } catch (error) {
        console.error('generateThreadId error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

export const generateAnswersFromQuery = async (req, res) => {
    try {
        const { threadId, query } = req.body;

        // Basic validations
        if (!query || typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({ error: 'Query is required and must be a non-empty string' });
        }
        if (!threadId || typeof threadId !== 'string' || !threadId.trim()) {
            return res.status(400).json({ error: 'threadId is required and must be a non-empty string' });
        }

        // Ensure Flask API URL is configured
        if (!process.env.FLASK_API_URL) {
            return res.status(500).json({ error: 'FLASK_API_URL is not configured on the server' });
        }

        // Get the user's API key from the database
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.LLM_API_KEY) {
            return res.status(400).json({ error: 'No API key found for this user' });
        }

        // Get chat history document for this user/thread
        const chatDoc = await UserChatHistory.findOne({ userId: req.user._id, threadId }).populate('chatHistory');
        if (!chatDoc) {
            return res.status(404).json({ error: 'No chat history found for the provided threadId' });
        }

        // 1) Similarity Search -> get chunks
        const simResp = await fetch(`${process.env.FLASK_API_URL}/api/similaritySearch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, threadId, apiKey: user.LLM_API_KEY, topK: 5 })
        });

        if (!simResp.ok) {
            const err = await simResp.json().catch(() => ({ message: 'Unknown error' }));
            if (simResp.status === 404) {
                return res.status(404).json({ error: 'similaritySearch endpoint not found', detail: err.message });
            }
            if (simResp.status === 400) {
                return res.status(400).json({ error: err.message || 'Invalid request to similaritySearch' });
            }
            return res.status(502).json({ error: 'Similarity search failed at Flask service', detail: err.message });
        }

        const simData = await simResp.json();
        const chunks = Array.isArray(simData?.chunks) ? simData.chunks : [];

        if (!Array.isArray(chunks) || chunks.length === 0) {
            return res.status(400).json({ error: 'No relevant chunks found for the query' });
        }

        // Prepare chat history for LLM
        const historyArray = Array.isArray(chatDoc.chatHistory)
            ? chatDoc.chatHistory.map(entry => ({ question: entry.question, answer: entry.answer }))
            : [];

        // 2) LLM Generate -> send query, chunks, apiKey and chat history
        const llmResp = await fetch(`${process.env.FLASK_API_URL}/api/llmGenerate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                chunks,
                apiKey: user.LLM_API_KEY,
                chatHistory: historyArray,
            })
        });

        if (!llmResp.ok) {
            const err = await llmResp.json().catch(() => ({ message: 'Unknown error' }));
            if (llmResp.status === 404) {
                return res.status(404).json({ error: 'llmGenerate endpoint not found', detail: err.message });
            }
            if (llmResp.status === 400) {
                return res.status(400).json({ error: err.message || 'Invalid request to llmGenerate' });
            }
            return res.status(502).json({ error: 'LLM generation failed at Flask service', detail: err.message });
        }

        const llmData = await llmResp.json();
        const answer = typeof llmData?.answer === 'string' ? llmData.answer : null;

        if (!answer) {
            return res.status(502).json({ error: 'Invalid response from LLM service' });
        }

        // 3) Persist QnA and update chat history
        const qna = await Qna.create({ question: query, answer });

        await UserChatHistory.updateOne(
            { _id: chatDoc._id },
            { $push: { chatHistory: qna._id } }
        );

        return res.status(200).json({ threadId, query, answer });
    } catch (error) {
        console.error('generateAnswersFromQuery error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

export const getChatHistory = async (req, res) => {
    try {
        const { threadId } = req.body;

        if (!threadId || typeof threadId !== 'string' || !threadId.trim()) {
            return res.status(400).json({ error: 'threadId is required and must be a non-empty string' });
        }

        const chatDoc = await UserChatHistory.findOne({ threadId, userId: req.user._id }).populate('chatHistory');
        if (!chatDoc) {
            return res.status(404).json({ error: 'No chat history found for the provided threadId' });
        }

        return res.status(200).json({ chatHistory: chatDoc.chatHistory });
    } catch (error) {
        console.error('getChatHistory error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}