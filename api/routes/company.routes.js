import express from 'express'
import { getMyCompany, saveOnboarding } from '../controllers/companyController.js'
import { verifyToken } from '../middleware/verify.js'

const router = express.Router()

router.get('/me', verifyToken, getMyCompany)
router.post('/onboarding', verifyToken, saveOnboarding)

export default router
