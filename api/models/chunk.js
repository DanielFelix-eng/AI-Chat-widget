const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema(
    {

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: true,
            index: true,
        },
        text: {
            type: String,
            required: true,
        },
        embedding: {
            type: [Number],
            required: true,
        },
        metadata: {
            page: { type: Number, default: null },
            heading: { type: String, default: null },
            chunkIndex: { type: Number, default: null },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Chunk', chunkSchema);

