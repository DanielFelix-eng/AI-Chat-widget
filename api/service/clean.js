const PAGE_NUMBER_LINE = /^(page\s+)?\d+(\s*(of|\/)\s*\d+)?$/i;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

const toLines = (text) =>
    text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

/**
 * Headers/footers = short lines that show up in the first/last 2 lines
 * of at least half the pages. Only meaningful for documents with 4+ pages.
 */
function findRepeatedLines(pages) {
    if (pages.length < 4) return new Set();

    const counts = new Map();
    for (const { text } of pages) {
        const lines = toLines(text);
        const candidates = new Set([...lines.slice(0, 2), ...lines.slice(-2)]);
        for (const line of candidates) {
            if (line.length < 80) counts.set(line, (counts.get(line) || 0) + 1);
        }
    }

    const threshold = Math.ceil(pages.length * 0.5);
    return new Set([...counts].filter(([, n]) => n >= threshold).map(([line]) => line));
}

/**
 * @param {Array<{ page: number | null, text: string }>} pages
 * @returns same shape, cleaned, with empty pages removed
 */
export function cleanPages(pages) {
    const repeated = findRepeatedLines(pages);

    return pages
        .map(({ page, text }) => {
            // PDF text has hard line breaks inside paragraphs; txt/md keep their structure
            const isPdf = page !== null;

            let cleaned = text.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '');

            if (isPdf) {
                cleaned = cleaned
                    .split('\n')
                    .filter((l) => {
                        const line = l.trim();
                        return !repeated.has(line) && !PAGE_NUMBER_LINE.test(line);
                    })
                    .join('\n');

                cleaned = cleaned
                    // "informa-\ntion" -> "information"
                    .replace(/([a-z])-\n([a-z])/g, '$1$2')
                    // join wrapped lines, but keep bullets/numbered items on their own line
                    .replace(/([^\n])\n(?!\n|\s*([-*\u2022]|\d+[.)])\s)/g, '$1 ');
            }

            cleaned = cleaned
                .replace(/[ \t]+/g, ' ')
                .replace(/ ?\n ?/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            return { page, text: cleaned };
        })
        .filter((p) => p.text.length > 0);
}