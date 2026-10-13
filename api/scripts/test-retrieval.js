const QUESTION = 'How long do I have to return an item?';

async function main() {
    await import('../env.js');

    const indexName = process.env.VECTOR_INDEX_NAME || 'chunks';
    const expectedDimensions = Number(process.env.EMBEDDING_DIMENSIONS) || null;
    const mongoose = (await import('mongoose')).default;
    const { connectedDB } = await import('../db/db.js');
    const { default: Company } = await import('../models/company.js');
    const { default: Chunk } = await import('../models/chunk.js');
    const { default: Document } = await import('../models/documents.js');
    const { retrieveChunks } = await import('../service/retrieve.js');

    try {
        await connectedDB();
        console.log(`[DEBUG] Retrieval test database=${mongoose.connection.name}`);

        let company = await Company.findOne({ name: /^Acme Shop$/i }).select('_id name').lean();
        if (!company) {
            const candidates = await Company.find().select('_id name').lean();
            const companiesWithChunks = [];
            for (const candidate of candidates) {
                if (await Chunk.exists({ companyId: candidate._id })) companiesWithChunks.push(candidate);
            }
            if (companiesWithChunks.length !== 1) {
                const available = companiesWithChunks.map((candidate) => candidate.name).join(', ') || '(none)';
                throw new Error(`No Acme Shop company found in database "${mongoose.connection.name}". Companies with chunks: ${available}.`);
            }
            [company] = companiesWithChunks;
            console.log(`[DEBUG] Acme Shop not found; using the only company with chunks ("${company.name}") to test the vector-search pipeline.`);
        }

        const [documentCount, chunkCount] = await Promise.all([
            Document.countDocuments({ companyId: company._id, status: 'ready' }),
            Chunk.countDocuments({ companyId: company._id }),
        ]);
        console.log(`[DEBUG] Company "${company.name}" companyId=${company._id} readyDocuments=${documentCount} chunks=${chunkCount}`);
        console.log(`[DEBUG] Query="${QUESTION}" expectedDimensions=${expectedDimensions ?? 'not configured'}`);

        try {
            const indexes = await Chunk.collection.listSearchIndexes().toArray();
            const index = indexes.find((candidate) => candidate.name === indexName);
            if (!index) {
                console.log(`[DEBUG] Atlas vector index "${indexName}" was not found. Available indexes: ${indexes.map((candidate) => candidate.name).join(', ') || '(none)'}`);
            } else {
                const fields = index.latestDefinition?.fields || index.definition?.fields || [];
                const vectorField = fields.find((field) => field.type === 'vector' && field.path === 'embedding');
                const companyFilter = fields.find((field) => field.type === 'filter' && field.path === 'companyId');
                console.log(`[DEBUG] Atlas index name=${index.name} status=${index.status}`);
                console.log(`[DEBUG] Atlas embedding field=${JSON.stringify(vectorField || null)}`);
                console.log(`[DEBUG] Atlas companyId filter=${JSON.stringify(companyFilter || null)}`);
                if (!vectorField) {
                    console.log('[DEBUG] Atlas index check: missing vector field path "embedding".');
                } else {
                    if (expectedDimensions && vectorField.numDimensions !== expectedDimensions) {
                        console.log(`[DEBUG] Atlas index check: numDimensions=${vectorField.numDimensions} but EMBEDDING_DIMENSIONS=${expectedDimensions}.`);
                    }
                    if (vectorField.similarity !== 'cosine') {
                        console.log(`[DEBUG] Atlas index check: similarity is "${vectorField.similarity}", not "cosine".`);
                    }
                }
                if (!companyFilter) {
                    console.log('[DEBUG] Atlas index check: missing filter field path "companyId".');
                }
            }
        } catch (error) {
            console.error(`[DEBUG] Could not inspect Atlas search indexes: ${error.message}`);
        }

        const results = await retrieveChunks(company._id, QUESTION);
        console.log(`[DEBUG] Retrieval test relevantResults=${results.length}`);
        results.forEach((result, index) => {
            console.log(`[DEBUG] Relevant result=${index + 1} score=${result.score} source="${result.source}" text="${result.text.slice(0, 80)}"`);
        });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error('Retrieval test failed:', error.message);
    process.exitCode = 1;
});
