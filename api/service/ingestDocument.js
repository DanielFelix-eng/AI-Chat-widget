import Document from '../../models/document.model.js';
import Chunk from '../../models/chunk.model.js';
import { extractText } from './extractText.js';
import { cleanPages } from './cleanText.js';
import { chunkPages } from './chunkText.js';
import { embedTexts } from './embed.js';

const MIN_TEXT_LENGTH = 50; // below this, treat the file as having no readable text

async function markFailed(documentId, message) {
    try {
        await Chunk.deleteMany({ documentId }); // never leave partial chunks behind
        await Document.findByIdAndUpdate(documentId, {
            status: 'failed',
            errorMessage: message,
            chunkCount: 0,
        });
    } catch (err) {
        console.error(`[ingestion] could not mark ${documentId} as failed:`, err);
    }
}


export async function ingestDocument(documentId) {
    // Atomic claim: only one run can move a document from pending -> processing
    const doc = await Document.findOneAndUpdate(
        { _id: documentId, status: 'pending' },
        { status: 'processing', errorMessage: null },
        { new: true }
    );
    if (!doc) return; // already claimed, or deleted meanwhile

    const started = Date.now();

    try {
        // 1. Extract
        const rawPages = await extractText(doc);

        // 2. Clean
        const pages = cleanPages(rawPages);
        const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
        if (totalChars < MIN_TEXT_LENGTH) {
            throw new Error(
                'No readable text found. The file may be a scanned PDF (image only).'
            );
        }

        // 3. Chunk
        const chunks = chunkPages(pages);
        if (chunks.length === 0) throw new Error('No chunks were produced from this document.');

        // 4. Embed (the slow, network-bound step)
        const vectors = await embedTexts(chunks.map((c) => c.text), 'document');

        // 5. Persist. Clear old chunks first so re-ingesting is idempotent.
        await Chunk.deleteMany({ documentId: doc._id });
        await Chunk.insertMany(
            chunks.map((chunk, i) => ({
                companyId: doc.companyId,
                documentId: doc._id,
                text: chunk.text,
                embedding: vectors[i],
                metadata: chunk.metadata,
            })),
            { ordered: false }
        );

        // 6. Done
        await Document.findByIdAndUpdate(doc._id, {
            status: 'ready',
            chunkCount: chunks.length,
            errorMessage: null,
        });

        console.log(
            `[ingestion] ${doc._id} ready: ${pages.length} page(s), ${chunks.length} chunk(s), ${Date.now() - started}ms`
        );
    } catch (err) {
        console.error(`[ingestion] ${documentId} failed:`, err);
        await markFailed(documentId, err.message);
    }
}