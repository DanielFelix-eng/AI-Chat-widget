import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdfjs-dist/legacy/build/pdf.js';

async function extractPdf(buffer) {
    const pages = [];

    await pdf(buffer, {
        pagerender: async (pageData) => {
            const content = await pageData.getTextContent({
                normalizeWhitespace: true,
                disableCombineTextItems: false,
            });

            // Rebuild lines: a change in the Y position means a new line
            let lastY;
            let text = '';
            for (const item of content.items) {
                const y = item.transform[5];
                text += lastY === undefined || lastY === y ? item.str : '\n' + item.str;
                lastY = y;
            }

            pages.push(text);
            return text;
        },
    });

    return pages.map((text, i) => ({ page: i + 1, text }));
}

/**
 * @param {{ storagePath: string, originalName: string }} doc
 * @returns {Promise<Array<{ page: number | null, text: string }>>}
 */
async function extractText(doc) {
    const ext = path.extname(doc.originalName).toLowerCase();
    const buffer = await fs.readFile(doc.storagePath);

    if (ext === '.pdf') return extractPdf(buffer);

    if (ext === '.txt' || ext === '.md') {
        return [{ page: null, text: buffer.toString('utf8') }];
    }

    throw new Error(`Unsupported file type: ${ext}`);
}

module.exports = { extractText };