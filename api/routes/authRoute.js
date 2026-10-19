import express from 'express'
import { signup, login, verifyEmail, resendVerification, resetPassword, forgotPassword, googleAuth, logout } from '../controllers/authController.js'
import Company from '../models/company.js'
import Subscription from '../models/subscription.js'
import User from '../models/user.js'
import { subscriptionHasAccess } from '../middleware/requirePlanAccess.js'
import jwt from 'jsonwebtoken'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/google', googleAuth)
router.post('/logout', logout)
router.post('/verifyEmail', verifyToken, verifyEmail)
router.post('/resendVerification', verifyToken, resendVerification)
router.post('/forgotPassword', forgotPassword)
router.post('/resetPassword', resetPassword)
router.get('/verifyToken', async (req, res) => {
    try {
        const token = req.cookies?.token
        if (!token) {
            return res.status(200).json({ message: 'No session', user: null })
        }

        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch {
            return res.status(200).json({ message: 'Invalid session', user: null })
        }

        const user = await User.findById(decoded.userId).select('name email companyId isVerified')
        if (!user) {
            return res.status(200).json({ message: 'User not found', user: null })
        }

        const [company, subscription] = await Promise.all([
            user.companyId
                ? Company.findById(user.companyId).select('onboardingCompleted')
                : null,
            user.companyId
                ? Subscription.findOne({ organizationId: user.companyId })
                    .select('status planKey trialEndsAt currentPeriodEnd')
                    : null,
        ])

        return res.status(200).json({
            message: 'Token is valid',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                companyId: user.companyId,
                isVerified: user.isVerified,
                onboardingCompleted: company ? company.onboardingCompleted !== false : false,
                subscription: subscription ? {
                    status: subscription.status,
                    planKey: subscription.planKey,
                    trialEndsAt: subscription.trialEndsAt,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    trialUsed: Boolean(subscription.trialEndsAt),
                    hasAccess: subscriptionHasAccess(subscription),
                } : null,
            },
        })
    } catch (error) {
        console.error('Could not load authentication subscription state:', error)
        return res.status(200).json({ message: 'Auth unavailable', user: null })
    }
})
export default router
