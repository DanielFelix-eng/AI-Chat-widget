import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        // Anonymous ID generated client-side for each chat session.
        visitorId: {
            type: String,
            required: true,
            index: true,
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
        },
        // Optional: captured if the widget collects it before/during chat
        visitorEmail: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

chatSessionSchema.index({ companyId: 1, createdAt: -1 });
chatSessionSchema.index({ companyId: 1, visitorId: 1 }, { unique: true });

export default mongoose.model('ChatSession', chatSessionSchema);