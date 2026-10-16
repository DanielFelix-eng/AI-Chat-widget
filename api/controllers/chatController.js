import { retrieveChunks } from '../services/chat/retrieve.js';
import { buildContextMessage, SYSTEM_PROMPT, NO_ANSWER_MESSAGE } from '../services/chat/prompt.js';
import { streamAnswer } from '../services/chat/llm.js';
import ChatMessage from '../models/chatMessage.js';
import ChatSession from '../models/chatSession.js';
import Document from '../models/documents.js';

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

function getPeriodRange(value) {
    const daysByPeriod = { '7d': 7, '14d': 14, '30d': 30 }
    const period = Object.hasOwn(daysByPeriod, value) ? value : '14d'
    const days = daysByPeriod[period]
    const end = new Date()
    end.setUTCHours(0, 0, 0, 0)
    end.setUTCDate(end.getUTCDate() + 1)
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - days)

    return { period, days, start, end }
}

function toDayKey({ year, month, day }) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Return distinct conversations started per UTC day in the selected period. */
export const getConversationActivity = async (req, res) => {
    try {
        const { period, days, start, end } = getPeriodRange(req.query.period)
        const activity = await ChatSession.aggregate([
            {
                $match: {
                    companyId: req.user.companyId,
                    createdAt: { $gte: start, $lt: end },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
        ])

        const activityByDay = new Map(activity.map((entry) => [toDayKey(entry._id), entry.count]))
        const result = Array.from({ length: days }, (_, index) => {
            const date = new Date(start)
            date.setUTCDate(start.getUTCDate() + index)
            const key = toDayKey({
                year: date.getUTCFullYear(),
                month: date.getUTCMonth() + 1,
                day: date.getUTCDate(),
            })
            return { date: key, count: activityByDay.get(key) || 0 }
        })

        return res.status(200).json({ activity: result, period })
    } catch (error) {
        console.error('Failed to fetch conversation activity:', error)
        return res.status(500).json({ message: 'Could not fetch conversation activity.' })
    }
}

/** Return real workspace and assistant metrics for the selected period. */
export const getAssistantMetrics = async (req, res) => {
    try {
        const { period, start, end } = getPeriodRange(req.query.period)
        const companyId = req.user.companyId
        const [messageMetrics, conversations, knowledgeDocuments] = await Promise.all([
            ChatMessage.aggregate([
                {
                    $match: {
                        companyId,
                        role: 'assistant',
                        createdAt: { $gte: start, $lt: end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalMessages: { $sum: 1 },
                        resolvedMessages: {
                            $sum: {
                                $cond: [
                                    { $gt: [{ $size: { $ifNull: ['$retrievedChunkIds', []] } }, 0] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        fallbackMessages: { $sum: { $cond: ['$fallbackUsed', 1, 0] } },
                        averageResponseTimeMs: { $avg: '$responseTimeMs' },
                    },
                },
            ]),
            ChatSession.countDocuments({ companyId, createdAt: { $gte: start, $lt: end } }),
            Document.countDocuments({ companyId, status: 'ready' }),
        ])

        const totals = messageMetrics[0] || {
            totalMessages: 0,
            resolvedMessages: 0,
            fallbackMessages: 0,
            averageResponseTimeMs: null,
        }
        const resolutionRate = totals.totalMessages
            ? Math.round((totals.resolvedMessages / totals.totalMessages) * 100)
            : 0
        const fallbackRate = totals.totalMessages
            ? Math.round((totals.fallbackMessages / totals.totalMessages) * 100)
            : 0

        return res.status(200).json({
            period,
            conversations,
            totalMessages: totals.totalMessages,
            resolvedMessages: totals.resolvedMessages,
            fallbackMessages: totals.fallbackMessages,
            resolutionRate,
            fallbackRate,
            averageResponseTimeMs: totals.averageResponseTimeMs === null
                ? null
                : Math.round(totals.averageResponseTimeMs),
            knowledgeDocuments,
        })
    } catch (error) {
        console.error('Failed to fetch assistant metrics:', error)
        return res.status(500).json({ message: 'Could not fetch assistant metrics.' })
    }
}

export const getRecentConversations = async (req, res) => {
    try {
        const conversations = await ChatMessage.aggregate([
            {
                $match: {
                    companyId: req.user.companyId,
                    role: 'user',
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$sessionId',
                    latestMessage: { $first: '$content' },
                    lastMessageAt: { $first: '$createdAt' },
                },
            },
            { $sort: { lastMessageAt: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 1,
                    latestMessage: { $substrCP: ['$latestMessage', 0, 140] },
                    lastMessageAt: 1,
                },
            },
        ])

        return res.status(200).json({ conversations })
    } catch (error) {
        console.error('Failed to fetch recent conversations:', error)
        return res.status(500).json({ message: 'Could not fetch recent conversations.' })
    }
}