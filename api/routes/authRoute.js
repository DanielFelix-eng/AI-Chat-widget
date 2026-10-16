import express from 'express'
import { signup, login, verifyEmail, resendVerification, resetPassword, forgotPassword, googleAuth, logout } from '../controllers/authController.js'
import { verifyToken } from '../middleware/verify.js'
import Company from '../models/company.js'
import Subscription from '../models/subscription.js'
import { subscriptionHasAccess } from '../middleware/requirePlanAccess.js'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/google', googleAuth)
router.post('/logout', logout)
router.post('/verifyEmail', verifyToken, verifyEmail)
router.post('/resendVerification', verifyToken, resendVerification)
router.post('/forgotPassword', forgotPassword)
router.post('/resetPassword', resetPassword)
router.get('/verifyToken', verifyToken, async (req, res) => {
    try {
        const [company, subscription] = await Promise.all([
            req.user.companyId
                ? Company.findById(req.user.companyId).select('onboardingCompleted')
                : null,
            req.user.companyId
                ? Subscription.findOne({ organizationId: req.user.companyId })
                    .select('status planKey trialEndsAt currentPeriodEnd')
                : null,
        ])

        return res.status(200).json({
            message: 'Token is valid',
            user: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                companyId: req.user.companyId,
                isVerified: req.user.isVerified,
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
        return res.status(500).json({ message: 'Could not verify your plan. Please try again.' })
    }
})
export default router
