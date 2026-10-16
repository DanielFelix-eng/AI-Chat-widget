import express from 'express'
import { signup, login, verifyEmail, resendVerification, resetPassword, forgotPassword, googleAuth, logout } from '../controllers/authController.js'
import { verifyToken } from '../middleware/verify.js'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/google', googleAuth)
router.post('/logout', logout)
router.post('/verifyEmail', verifyToken, verifyEmail)
router.post('/resendVerification', verifyToken, resendVerification)
router.post('/forgotPassword', forgotPassword)
router.post('/resetPassword', resetPassword)
router.get('/verifyToken', verifyToken, (req, res) => {
    res.status(200).json({
        message: 'Token is valid',
        user: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            companyId: req.user.companyId,
            isVerified: req.user.isVerified,
        },
    })
})
export default router
