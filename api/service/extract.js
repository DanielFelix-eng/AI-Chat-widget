import fs from 'fs/promises';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractPdf(buffer) {
    const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer), // pdfjs needs a plain Uint8Array, not a Node Buffer
        useSystemFonts: true,
        isEvalSupported: false,
    }).promise;

    const pages = [];

    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            let text = '';
            for (const item of content.items) {
                if (!('str' in item)) continue; // skip marked-content entries
                text += item.str + (item.hasEOL ? '\n' : '');
            }

            pages.push({ page: i, text });
            page.cleanup();
        }
    } finally {
        await pdf.destroy();
    }

    return pages;
}

/**
 * @param {{ storagePath: string, originalName: string }} doc
 * @returns {Promise<Array<{ page: number | null, text: string }>>}
 */
export async function extractText(doc) {
    const ext = path.extname(doc.originalName).toLowerCase();
    const buffer = await fs.readFile(doc.storagePath);

    if (ext === '.pdf') return extractPdf(buffer);

    if (ext === '.txt' || ext === '.md') {
        return [{ page: null, text: buffer.toString('utf8') }];
    }

    throw new Error(`Unsupported file type: ${ext}`);
}