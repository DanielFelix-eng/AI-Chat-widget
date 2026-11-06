import crypto from 'crypto'
import Company from '../models/company.js'
import User from '../models/user.js'
import { DEFAULT_PLAN, getCurrentPeriodStart } from '../plans.js'

const normalizeWebsite = (value) => {
    const website = String(value || '').trim()
    if (!website) return null

    let parsed
    try {
        parsed = new URL(website)
    } catch {
        return undefined
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined
    return parsed
}

export const getMyCompany = async (req, res) => {
    try {
        const company = await Company.findOne({ ownerUserId: req.user._id })
        return res.status(200).json({ company })
    } catch (error) {
        console.error('Failed to load company:', error)
        return res.status(500).json({ message: 'Could not load your company.' })
    }
}

export const saveOnboarding = async (req, res) => {
    const name = String(req.body.name || '').trim()
    const botName = String(req.body.botName || '').trim()
    const greeting = String(req.body.greeting || '').trim()
    const primaryColor = String(req.body.primaryColor || '').trim()
    const website = normalizeWebsite(req.body.website)

    if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: 'Company name must be between 2 and 100 characters.' })
    }
    if (botName.length < 2 || botName.length > 50) {
        return res.status(400).json({ message: 'Assistant name must be between 2 and 50 characters.' })
    }
    if (!greeting || greeting.length > 180) {
        return res.status(400).json({ message: 'Welcome message is required and must be under 180 characters.' })
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
        return res.status(400).json({ message: 'Choose a valid brand color.' })
    }
    if (website === undefined) {
        return res.status(400).json({ message: 'Enter a valid website URL, including https://.' })
    }

    try {
        const company = await Company.findOneAndUpdate(
            { ownerUserId: req.user._id },
            {
                $set: {
                    name,
                    website: website?.toString() || null,
                    onboardingCompleted: true,
                    allowedDomains: website ? [website.hostname.replace(/^www\./i, '')] : [],
                    plan: DEFAULT_PLAN,
                    planStatus: 'active',
                    currentPeriodStart: getCurrentPeriodStart(new Date()),
                    'usage.widgetsCount': 1,
                    'widgetConfig.primaryColor': primaryColor.toUpperCase(),
                    'widgetConfig.botName': botName,
                    'widgetConfig.greeting': greeting,
                    'widgetConfig.limitMessage': 'Our assistant is unavailable right now. Please contact us to upgrade.',
                    'widgetConfig.branding': 'Powered by Nudge',
                },
                $setOnInsert: {
                    ownerUserId: req.user._id,
                    widgetPublicKey: crypto.randomBytes(24).toString('hex'),
                    plan: DEFAULT_PLAN,
                    planStatus: 'active',
                    currentPeriodStart: getCurrentPeriodStart(new Date()),
                    usage: {
                        repliesThisPeriod: 0,
                        documentsCount: 0,
                        widgetsCount: 1,
                    },
                },
            },
            { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
        )

        await User.updateOne({ _id: req.user._id }, { $set: { companyId: company._id } })
        return res.status(200).json({ success: true, company })
    } catch (error) {
        console.error('Failed to save company onboarding:', error)
        return res.status(500).json({ message: 'Could not save your workspace. Please try again.' })
    }
}

export const updateWidgetConfig = async (req, res) => {
    const botName = String(req.body.botName || '').trim()
    const greeting = String(req.body.greeting || '').trim()
    const primaryColor = String(req.body.primaryColor || '').trim()
    const position = String(req.body.position || '').trim()
    const domains = Array.isArray(req.body.allowedDomains) ? req.body.allowedDomains : []

    if (botName.length < 2 || botName.length > 50) {
        return res.status(400).json({ message: 'Assistant name must be between 2 and 50 characters.' })
    }
    if (!greeting || greeting.length > 180) {
        return res.status(400).json({ message: 'Welcome message is required and must be under 180 characters.' })
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
        return res.status(400).json({ message: 'Choose a valid brand color.' })
    }
    if (!['bottom-right', 'bottom-left'].includes(position)) {
        return res.status(400).json({ message: 'Choose a valid widget position.' })
    }
    if (!domains.length || domains.length > 10) {
        return res.status(400).json({ message: 'Add between 1 and 10 website domains for your widget.' })
    }

    const normalizedDomains = []
    for (const value of domains) {
        const domain = String(value || '').trim().toLowerCase()
        if (!domain || domain.length > 253 || domain.includes('/') || domain.includes(':') || domain.includes('@')) {
            return res.status(400).json({ message: `Enter a hostname only for each allowed website.` })
        }
        try {
            const parsed = new URL(`https://${domain}`)
            if (parsed.hostname !== domain || (!domain.includes('.') && domain !== 'localhost')) {
                throw new Error('Invalid hostname')
            }
            normalizedDomains.push(domain.replace(/^www\./, ''))
        } catch {
            return res.status(400).json({ message: `Invalid website domain: ${domain}` })
        }
    }

    try {
        const company = await Company.findOneAndUpdate(
            { ownerUserId: req.user._id },
            {
                $set: {
                    allowedDomains: [...new Set(normalizedDomains)],
                    'widgetConfig.botName': botName,
                    'widgetConfig.greeting': greeting,
                    'widgetConfig.primaryColor': primaryColor.toUpperCase(),
                    'widgetConfig.position': position,
                    'widgetConfig.enabled': req.body.enabled !== false,
                    'widgetConfig.limitMessage': String(req.body.limitMessage || 'Our assistant is unavailable right now. Please contact us to upgrade.').slice(0, 180),
                },
            },
            { new: true, runValidators: true }
        )

        if (!company) {
            return res.status(404).json({ message: 'Set up your company workspace before configuring the widget.' })
        }

        return res.status(200).json({ success: true, company })
    } catch (error) {
        console.error('Failed to update widget configuration:', error)
        return res.status(500).json({ message: 'Could not save widget settings. Please try again.' })
    }
}

export const getUsage = async (req, res) => {
    try {
        const company = await Company.findOne({ ownerUserId: req.user._id })
            .select('plan planStatus currentPeriodStart usage usageWarningsSent widgetConfig')

        if (!company) {
            return res.status(404).json({ message: 'Set up your workspace before checking usage.' })
        }

        const plan = getPlanConfig(company.plan || DEFAULT_PLAN)
        const resetAt = company.currentPeriodStart ? new Date(company.currentPeriodStart.getTime()) : new Date();
        resetAt.setMonth(resetAt.getMonth() + 1)

        const usage = {
            replies: {
                used: Number(company.usage?.repliesThisPeriod || 0),
                limit: plan.maxRepliesPerMonth,
                remaining: Math.max(0, plan.maxRepliesPerMonth - Number(company.usage?.repliesThisPeriod || 0)),
                warning: Number(company.usage?.repliesThisPeriod || 0) >= plan.maxRepliesPerMonth * 0.8,
            },
            documents: {
                used: Number(company.usage?.documentsCount || 0),
                limit: plan.maxDocuments,
                remaining: Math.max(0, plan.maxDocuments - Number(company.usage?.documentsCount || 0)),
                warning: Number(company.usage?.documentsCount || 0) >= plan.maxDocuments * 0.8,
            },
            widgets: {
                used: Number(company.usage?.widgetsCount || 0),
                limit: plan.maxWidgets,
                remaining: Math.max(0, plan.maxWidgets - Number(company.usage?.widgetsCount || 0)),
                warning: Number(company.usage?.widgetsCount || 0) >= plan.maxWidgets * 0.8,
            },
        }

        return res.status(200).json({
            plan: company.plan || DEFAULT_PLAN,
            planStatus: company.planStatus || 'active',
            resetAt,
            usage,
            limitMessage: company.widgetConfig?.limitMessage || 'Our assistant is unavailable right now. Please contact us to upgrade.',
        })
    } catch (error) {
        console.error('Failed to load usage:', error)
        return res.status(500).json({ message: 'Could not load workspace usage.' })
    }
}
