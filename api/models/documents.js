import mongoose from 'mongoose'
const documentSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Company',
        required: true,
        index: true,

    },
    sourceType: {
        type: String, enum: ['pdf', 'url', 'faq', 'docx'],
        required: true,
    },
    originalName: {
        type: String,
        required: true,

    },
    sourceUrl: {
        type: String,
        default: null,

    }, storagePath: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'ready', 'failed'],
        default: 'pending',
        index: true
    },
    errorMessage: {
        type: String,
        default: null
    },
    chunkCount: {
        type: Number,
        default: 0
    }

}, {
    timestamp: truw
})
module.exports = mongoose.model('Document', documentSchema)