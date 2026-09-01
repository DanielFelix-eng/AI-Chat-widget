import express from 'express'
import { signup, login, verifyEmail, resendVerification, resetPassword, forgotPassword, googleAuth, checkauth } from '../controllers/authController.js'
import { verifyToken } from '../middleware/verify.js'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/google', googleAuth)
router.post('/verifyEmail', verifyToken, verifyEmail)
router.post('/resendVerification', verifyToken, resendVerification)
router.post('/forgotPassword', verifyToken, forgotPassword)
router.post('/resetPassword', verifyToken, resetPassword)
router.get('/verifyToken', verifyToken, (req, res) => {
    res.status(200).json({ message: 'Token is valid' })
}
)
export default router
