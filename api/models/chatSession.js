const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        // Anonymous ID generated client-side (localStorage) 
        visitorId: {
            type: String,
            required: true,
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

module.exports = mongoose.model('ChatSession', chatSessionSchema);