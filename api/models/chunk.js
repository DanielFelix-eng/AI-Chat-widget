import mongoose from 'mongoose';

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
            select: false, // don't load ~1000 floats per chunk on normal queries
        },
        metadata: {
            page: { type: Number, default: null },
            heading: { type: String, default: null },
            chunkIndex: { type: Number, default: null },
        },
    },
    { timestamps: true }
);

export default mongoose.model('Chunk', chunkSchema);