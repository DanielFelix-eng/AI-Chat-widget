import Company from '../models/company.js'
import { retrieveChunks } from '../service/retrieve.js'
import { buildContextMessage, NO_ANSWER_MESSAGE, SYSTEM_PROMPT } from '../service/prompt.js'
import { streamAnswer } from '../service/llm.js'

const MAX_MESSAGE_CHARS = 2000
const MAX_HISTORY_MESSAGES = 8

function cleanHistory(history) {
    if (!Array.isArray(history)) return []

    const cleaned = history
        .filter((item) =>
            item &&
            ['user', 'assistant'].includes(item.role) &&
            typeof item.content === 'string' &&
            item.content.trim()
        )
        .slice(-MAX_HISTORY_MESSAGES)
        .map(({ role, content }) => ({ role, content: content.slice(0, MAX_MESSAGE_CHARS) }))

    while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift()
    return cleaned
}

async function generateAssistantReply(company, message, history) {
    const chunks = await retrieveChunks(company._id, message)
    const sources = chunks.map((chunk) => ({
        source: chunk.source,
        page: chunk.page,
    }))

    if (!chunks.length) {
        // DEBUG: Retrieval returned no chunks after vector search and score filtering.
        console.log(`[DEBUG] RAG fallback condition: retrieveChunks returned 0 relevant chunks for companyId=${company._id}.`);
        return { answer: NO_ANSWER_MESSAGE, sources }
    }

    let answer = ''
    await streamAnswer({
        system: `${SYSTEM_PROMPT}\n\nYou are the support assistant for ${company.name}. Your name is ${company.widgetConfig.botName}.`,
        messages: [
            ...cleanHistory(history),
            { role: 'user', content: buildContextMessage(chunks, message) },
        ],
        onText: (text) => { answer += text },
    })

    return { answer: answer || NO_ANSWER_MESSAGE, sources }
}

function originIsAllowed(req, company) {
    const origin = req.get('origin')
    if (!origin) return false

    let hostname
    try {
        hostname = new URL(origin).hostname.toLowerCase().replace(/^www\./, '')
    } catch {
        return false
    }

    return company.allowedDomains.some((domain) =>
        domain.toLowerCase().replace(/^www\./, '') === hostname
    )
}

async function findAuthorizedCompany(req, res) {
    const company = await Company.findOne({ widgetPublicKey: req.params.publicKey })
    if (!company || !company.widgetConfig?.enabled) {
        res.status(404).json({ message: 'Widget not found or disabled.' })
        return null
    }
    if (!originIsAllowed(req, company)) {
        res.status(403).json({ message: 'This website is not allowed to use the widget.' })
        return null
    }
    return company
}

export const getPublicWidgetConfig = async (req, res) => {
    try {
        const company = await findAuthorizedCompany(req, res)
        if (!company) return

        return res.status(200).json({
            botName: company.widgetConfig.botName,
            greeting: company.widgetConfig.greeting,
            primaryColor: company.widgetConfig.primaryColor,
            position: company.widgetConfig.position,
        })
    } catch (error) {
        console.error('Could not load public widget configuration:', error)
        return res.status(500).json({ message: 'Could not load widget configuration.' })
    }
}

export const answerWidgetMessage = async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!message) return res.status(400).json({ message: 'Message is required.' })
    if (message.length > MAX_MESSAGE_CHARS) {
        return res.status(400).json({ message: `Message must be at most ${MAX_MESSAGE_CHARS} characters.` })
    }

    try {
        const company = await findAuthorizedCompany(req, res)
        if (!company) return

        const result = await generateAssistantReply(company, message, req.body.history)
        return res.status(200).json({ answer: result.answer })
    } catch (error) {
        console.error('Widget reply failed:', error)
        return res.status(502).json({ message: 'The assistant could not respond. Please try again later.' })
    }
}

export const answerTestMessage = async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!message) return res.status(400).json({ message: 'Message is required.' })
    if (message.length > MAX_MESSAGE_CHARS) {
        return res.status(400).json({ message: `Message must be at most ${MAX_MESSAGE_CHARS} characters.` })
    }

    try {
        const company = await Company.findOne({ ownerUserId: req.user._id })
        if (!company) {
            return res.status(404).json({ message: 'Complete company onboarding before testing your assistant.' })
        }

        const result = await generateAssistantReply(company, message, req.body.history)
        return res.status(200).json(result)
    } catch (error) {
        console.error('Assistant test reply failed:', error)
        return res.status(502).json({ message: 'The assistant could not respond. Please try again later.' })
    }
}
