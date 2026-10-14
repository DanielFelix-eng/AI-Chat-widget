import { retrieveChunks } from '../services/chat/retrieve.js';
import { buildContextMessage, SYSTEM_PROMPT, NO_ANSWER_MESSAGE } from '../services/chat/prompt.js';
import { streamAnswer } from '../services/chat/llm.js';
import ChatMessage from '../models/chatMessage.js';

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

/** Get conversation activity data - message count per day for specified period */
export const getConversationActivity = async (req, res) => {
    try {
        const period = req.query.period || '14d'
        const now = new Date()

        let days = 14
        if (period === '7d') days = 7
        if (period === '30d') days = 30

        const lastDays = []
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(now.getDate() - i)
            date.setHours(0, 0, 0, 0)
            lastDays.push(date)
        }

        // Query chat messages grouped by day
        const activity = await ChatMessage.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: lastDays[0],
                        $lt: new Date(lastDays[lastDays.length - 1].getTime() + 24 * 60 * 60 * 1000)
                    },
                    companyId: req.user.companyId
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ])

        // Convert to map of day -> count
        const activityMap = new Map()
        activity.forEach((item) => {
            const dayKey = `${item._id.year}-${item._id.month}-${item._id.day}`
            activityMap.set(dayKey, item.count)
        })

        // Build result array with counts for each day in the period
        const result = lastDays.map((date) => {
            const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
            return activityMap.get(dayKey) || 0
        })

        return res.status(200).json({ activity: result, period })
    } catch (error) {
        console.error('Failed to fetch conversation activity:', error)
        return res.status(500).json({ message: 'Could not fetch conversation activity.' })
    }
};

/** Get AI assistant performance metrics */
export const getAssistantMetrics = async (req, res) => {
    try {
        const now = new Date()
        const period = req.query.period || '14d'

        let days = 14
        if (period === '7d') days = 7
        if (period === '30d') days = 30

        const lastDate = new Date(now)
        lastDate.setDate(now.getDate() - (days - 1))
        lastDate.setHours(0, 0, 0, 0)

        const firstDate = new Date(now)
        firstDate.setDate(now.getDate() - days + 1)
        firstDate.setHours(0, 0, 0, 0)

        // Total assistant messages in period
        const totalAssistantMessages = await ChatMessage.countDocuments({
            role: 'assistant',
            createdAt: { $gte: firstDate, $lte: lastDate },
            companyId: req.user.companyId
        })

        // Messages with resolution (had chunks retrieved)
        const resolvedMessages = await ChatMessage.countDocuments({
            role: 'assistant',
            retrievedChunkIds: { $ne: [] },
            createdAt: { $gte: firstDate, $lte: lastDate },
            companyId: req.user.companyId
        })

        // Messages with fallback
        const fallbackMessages = await ChatMessage.countDocuments({
            role: 'assistant',
            fallbackUsed: true,
            createdAt: { $gte: firstDate, $lte: lastDate },
            companyId: req.user.companyId
        })

        const resolutionRate = totalAssistantMessages > 0 ? (resolvedMessages / totalAssistantMessages * 100) : 0
        const fallbackRate = totalAssistantMessages > 0 ? (fallbackMessages / totalAssistantMessages * 100) : 0

        return res.status(200).json({
            resolutionRate: Math.round(resolutionRate),
            fallbackRate: Math.round(fallbackRate),
            totalMessages: totalAssistantMessages,
            period
        })
    } catch (error) {
        console.error('Failed to fetch assistant metrics:', error)
        return res.status(500).json({ message: 'Could not fetch assistant metrics.' })
    }
}