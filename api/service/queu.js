import { ingestDocument } from "./ingestDocument.js";

// No real queue yet: run the job in-process.
// Later, replace this body with queue.add('ingest', { documentId }).
async function enqueueIngestion(documentId) {
    await ingestDocument(documentId);
}

export { enqueueIngestion };