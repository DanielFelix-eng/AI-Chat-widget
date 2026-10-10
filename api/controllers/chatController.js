import { retrieveChunks } from '../services/chat/retrieve.js';
import { buildContextMessage, SYSTEM_PROMPT, NO_ANSWER_MESSAGE } from '../services/chat/prompt.js';
import { streamAnswer } from '../services/chat/llm.js';

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 10;

/** Keep only well-formed, recent history entries from the client. */
function cleanHistory(history) {
    if (!Array.isArray(history)) return [];

    const cleaned = history
        .filter(
            (m) =>
                m &&
                (m.role === 'user' || m.role === 'assistant') &&
                typeof m.content === 'string' &&
                m.content.trim()
        )
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

    // The API requires the conversation to start with a user message
    while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();

    return cleaned;
}


export const chat = async (req, res) => {
    const { message, history } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: 'message is required' });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
        return res
            .status(400)
            .json({ message: `message must be at most ${MAX_MESSAGE_CHARS} characters` });
    }

    // Stop work if the visitor closes the widget mid-answer
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // stop proxies from buffering the stream
    });

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
        const chunks = await retrieveChunks(req.user.companyId, message.trim());

        // Nothing relevant found: skip the LLM call entirely (saves money, avoids guessing)
        if (chunks.length === 0) {
            send({ type: 'token', text: NO_ANSWER_MESSAGE });
            send({ type: 'done' });
            return;
        }

        send({
            type: 'sources',
            sources: chunks.map((c, i) => ({ n: i + 1, source: c.source, page: c.page })),
        });

        const messages = [
            ...cleanHistory(history),
            { role: 'user', content: buildContextMessage(chunks, message.trim()) },
        ];

        await streamAnswer({
            system: SYSTEM_PROMPT,
            messages,
            onText: (text) => send({ type: 'token', text }),
            signal: abort.signal,
        });

        send({ type: 'done' });
    } catch (err) {
        if (!abort.signal.aborted) {
            console.error('[chat] failed:', err);
            send({ type: 'error', message: 'Sorry, something went wrong. Please try again.' });
        }
    } finally {
        res.end();
    }
};