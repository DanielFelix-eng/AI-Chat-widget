import mongoose from 'mongoose';
import Chunk from '../../models/chunk.model.js';
import Document from '../../models/document.model.js';
import { embedTexts } from '../ingestion/embed.js';

const INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'chunk_vector_index';
const TOP_K = Number(process.env.RETRIEVAL_TOP_K) || 5;
// Atlas cosine scores are 0..1. Tune this using the scores printed by scripts/testRetrieval.js
const MIN_SCORE = Number(process.env.RETRIEVAL_MIN_SCORE) || 0.6;

/**
 * @returns {Promise<Array<{ text, score, page, heading, source }>>}
 *          empty array when nothing relevant was found
 */
export async function retrieveChunks(companyId, question) {
    // Queries use input_type "query" (documents were embedded as "document")
    const [queryVector] = await embedTexts([question], 'query');

    const results = await Chunk.aggregate([
        {
            $vectorSearch: {
                index: INDEX_NAME,
                path: 'embedding',
                queryVector,
                numCandidates: 100,
                limit: TOP_K,
                // Tenant isolation: never search across companies
                filter: { companyId: new mongoose.Types.ObjectId(companyId) },
            },
        },
        {
            $project: {
                text: 1,
                documentId: 1,
                metadata: 1,
                score: { $meta: 'vectorSearchScore' },
            },
        },
    ]);

    const relevant = results.filter((r) => r.score >= MIN_SCORE);
    if (relevant.length === 0) return [];

    // Look up document names so answers can cite their source
    const documentIds = [...new Set(relevant.map((r) => String(r.documentId)))];
    const documents = await Document.find({ _id: { $in: documentIds } })
        .select('originalName')
        .lean();
    const names = new Map(documents.map((d) => [String(d._id), d.originalName]));

    return relevant.map((r) => ({
        text: r.text,
        score: r.score,
        page: r.metadata?.page ?? null,
        heading: r.metadata?.heading ?? null,
        source: names.get(String(r.documentId)) || 'Unknown source',
    }));
}