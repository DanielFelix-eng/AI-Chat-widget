import express from 'express'
import { getMyCompany, saveOnboarding, updateWidgetConfig } from '../controllers/companyController.js'
import { verifyToken } from '../middleware/verify.js'
import { requirePlanAccess, requirePlanAccessOrWorkspaceSetup } from '../middleware/requirePlanAccess.js'

const router = express.Router()

router.get('/me', verifyToken, requirePlanAccess, getMyCompany)
router.post('/onboarding', verifyToken, requirePlanAccessOrWorkspaceSetup, saveOnboarding)
router.patch('/widget-config', verifyToken, requirePlanAccess, updateWidgetConfig)

export default router
