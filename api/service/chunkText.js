// ~4 characters per token, so 2000 chars is roughly 500 tokens
export const MAX_CHARS = Number(process.env.CHUNK_MAX_CHARS) || 2000;
export const OVERLAP_CHARS = Number(process.env.CHUNK_OVERLAP_CHARS) || 250;

/** Split an oversized paragraph into sentences, hard-splitting any giant sentence. */
function splitLong(text, max) {
    const out = [];
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        if (sentence.length <= max) {
            out.push(sentence);
            continue;
        }
        for (let i = 0; i < sentence.length; i += max) out.push(sentence.slice(i, i + max));
    }
    return out;
}

/** Last ~overlap characters, starting at a word boundary. */
function tail(text, overlap) {
    if (text.length <= overlap) return text;
    const t = text.slice(-overlap);
    const i = t.search(/\s/);
    return i === -1 ? t : t.slice(i + 1);
}

/** Greedily pack units (paragraphs/sentences) into chunks of about `max` chars. */
function pack(units, max, overlap) {
    const chunks = [];
    let current = '';

    for (const unit of units) {
        if (current && current.length + unit.length + 1 > max) {
            chunks.push(current);
            current = tail(current, overlap);
        }
        current = current ? `${current}\n${unit}` : unit;
    }
    if (current.trim()) chunks.push(current);

    return chunks;
}

/** Markdown/text files: split into sections at "# heading" lines so we can keep the heading. */
function splitSections(text) {
    if (!/^#{1,6}\s/m.test(text)) return [{ heading: null, body: text }];

    const sections = [];
    let heading = null;
    let buffer = [];

    const flush = () => {
        const body = buffer.join('\n').trim();
        if (body) sections.push({ heading, body });
        buffer = [];
    };

    for (const line of text.split('\n')) {
        const match = line.match(/^#{1,6}\s+(.*)$/);
        if (match) {
            flush();
            heading = match[1].trim();
        } else {
            buffer.push(line);
        }
    }
    flush();

    return sections;
}

/**
 * @param {Array<{ page: number | null, text: string }>} pages  cleaned pages
 * @returns {Array<{ text: string, metadata: { page: number|null, heading: string|null, chunkIndex: number } }>}
 */
export function chunkPages(pages, { max = MAX_CHARS, overlap = OVERLAP_CHARS } = {}) {
    const chunks = [];

    for (const { page, text } of pages) {
        // Headings only apply to txt/md (page === null)
        const sections = page === null ? splitSections(text) : [{ heading: null, body: text }];

        for (const { heading, body } of sections) {
            const units = body
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter(Boolean)
                .flatMap((p) => (p.length > max ? splitLong(p, max) : [p]));

            for (const chunkText of pack(units, max, overlap)) {
                chunks.push({
                    // Prefix the heading so the embedding carries that context
                    text: heading ? `${heading}\n${chunkText}` : chunkText,
                    metadata: { page, heading, chunkIndex: chunks.length },
                });
            }
        }
    }

    return chunks;
}