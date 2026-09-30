const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        sourceType: {
            type: String,
            enum: ['pdf', 'text', 'url', 'faq', 'docx'],
            required: true,
        },
        originalName: {
            type: String,
            required: true,
        },
        sourceUrl: {
            type: String,
            default: null,
        },
        storagePath: {
            type: String,
            default: null,
        },
        mimeType: {
            type: String,
            default: null,
        },
        size: {
            type: Number,
            default: null,
        },
        // SHA-256 of the file, used to reject duplicate uploads
        contentHash: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'ready', 'failed'],
            default: 'pending',
            index: true,
        },
        errorMessage: {
            type: String,
            default: null,
        },
        chunkCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Fast duplicate lookup per company
documentSchema.index({ companyId: 1, contentHash: 1 });

module.exports = mongoose.model('Document', documentSchema);