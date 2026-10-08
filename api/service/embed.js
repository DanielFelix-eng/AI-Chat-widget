const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const BATCH_SIZE = 64;
const MAX_ATTEMPTS = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callVoyage(input, inputType) {
    const apiKey = process.env.VOYAGE_API_KEY;
    const model = process.env.VOYAGE_MODEL;
    if (!apiKey || !model) {
        throw new Error('VOYAGE_API_KEY and VOYAGE_MODEL must be set in .env');
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await fetch(VOYAGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ input, model, input_type: inputType }),
        });

        if (res.ok) {
            const json = await res.json();
            // Make sure results line up with the inputs
            return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
        }

        const retryable = res.status === 429 || res.status >= 500;
        if (!retryable || attempt === MAX_ATTEMPTS) {
            const body = await res.text();
            throw new Error(`Voyage API error ${res.status}: ${body}`);
        }

        await sleep(2 ** attempt * 500); // 1s, 2s, 4s, 8s
    }
}

/**
 * @param {string[]} texts
 * @param {'document' | 'query'} inputType  use "document" when ingesting, "query" at search time
 * @returns {Promise<number[][]>} one vector per input text, in order
 */
export async function embedTexts(texts, inputType = 'document') {
    const vectors = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        vectors.push(...(await callVoyage(batch, inputType)));
    }

    // Catch a dimension mismatch with the Atlas vector index before inserting anything
    const expected = Number(process.env.EMBEDDING_DIMENSIONS);
    if (expected && vectors[0] && vectors[0].length !== expected) {
        throw new Error(
            `Embedding has ${vectors[0].length} dimensions but EMBEDDING_DIMENSIONS is ${expected}`
        );
    }

    return vectors;
}