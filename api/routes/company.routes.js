import express from 'express'
import { getMyCompany, saveOnboarding, updateWidgetConfig } from '../controllers/companyController.js'
import { verifyToken } from '../middleware/verify.js'

const router = express.Router()

router.get('/me', verifyToken, getMyCompany)
router.post('/onboarding', verifyToken, saveOnboarding)
router.patch('/widget-config', verifyToken, updateWidgetConfig)

export default router
