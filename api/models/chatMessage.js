const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatSession',
            required: true,
            index: true,
        },
        // Duplicated from the session for fast per-company analytics queries
        // without needing to populate/join every time.
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        // Which chunks were retrieved and fed to the LLM for this answer.
        // Invaluable for debugging bad answers and for "was this helpful" review.
        retrievedChunkIds: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Chunk',
            default: [],
        },
        // Set true when no relevant chunks were found and the bot fell back
        // to a "I don't have that info" response instead of the LLM guessing.
        fallbackUsed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);