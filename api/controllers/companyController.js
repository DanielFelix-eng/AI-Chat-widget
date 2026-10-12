import crypto from 'crypto'
import Company from '../models/company.js'
import User from '../models/user.js'

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
                    allowedDomains: website ? [website.hostname.replace(/^www\./i, '')] : [],
                    'widgetConfig.primaryColor': primaryColor.toUpperCase(),
                    'widgetConfig.botName': botName,
                    'widgetConfig.greeting': greeting,
                },
                $setOnInsert: {
                    ownerUserId: req.user._id,
                    widgetPublicKey: crypto.randomBytes(24).toString('hex'),
                },
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        )

        await User.updateOne({ _id: req.user._id }, { $set: { companyId: company._id } })
        return res.status(200).json({ success: true, company })
    } catch (error) {
        console.error('Failed to save company onboarding:', error)
        return res.status(500).json({ message: 'Could not save your workspace. Please try again.' })
    }
}
