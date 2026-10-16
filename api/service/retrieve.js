import mongoose from 'mongoose';
import Chunk from '../models/chunk.js';
import Document from '../models/documents.js';
import { embedTexts } from './embed.js';

const INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'chunks';
const TOP_K = Number(process.env.RETRIEVAL_TOP_K) || 5;
// Atlas cosine scores are 0..1. Tune this using the scores printed by scripts/test-retrieval.js
const MIN_SCORE = Number(process.env.RETRIEVAL_MIN_SCORE) || 0.6;

/**
 * @returns {Promise<Array<{ text: string, score: number, page: number|null, heading: string|null, source: string }>>}
 *          empty array when nothing relevant was found
 */
export async function retrieveChunks(companyId, question) {
    // DEBUG: Record the exact query vector size used for this request.
    const [queryVector] = await embedTexts([question], 'query');
    console.log(`[DEBUG] RAG question="${question}" embeddingLength=${queryVector.length}`);

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

    // DEBUG: Show every candidate and the exact reason candidates are filtered out.
    console.log(`[DEBUG] RAG searchResults=${results.length} index=${INDEX_NAME} topK=${TOP_K} minScore=${MIN_SCORE}`);
    results.forEach((result, index) => {
        const preview = (result.text || '').slice(0, 80);
        console.log(`[DEBUG] RAG result=${index + 1} score=${result.score} text="${preview}"`);
    });

    const relevant = results.filter((result) => result.score >= MIN_SCORE);
    if (results.length === 0) {
        console.log('[DEBUG] RAG retrieval condition: vector search returned no candidates; check index, database, and companyId filter.');
    } else if (relevant.length === 0) {
        console.log(`[DEBUG] RAG retrieval condition: all ${results.length} candidates scored below minScore=${MIN_SCORE}.`);
    } else {
        console.log(`[DEBUG] RAG retrieval condition: ${relevant.length} candidate(s) met minScore=${MIN_SCORE}.`);
    }

    if (relevant.length === 0) return [];

    // Look up document names so answers can cite their source
    const documentIds = [...new Set(relevant.map((result) => String(result.documentId)))];
    const documents = await Document.find({ _id: { $in: documentIds } })
        .select('originalName')
        .lean();
    const names = new Map(documents.map((document) => [String(document._id), document.originalName]));

    return relevant.map((result) => ({
        chunkId: result._id,
        text: result.text,
        score: result.score,
        page: result.metadata?.page ?? null,
        heading: result.metadata?.heading ?? null,
        source: names.get(String(result.documentId)) || 'Unknown source',
    }));
}
