import express from 'express'
import { getMyCompany, saveOnboarding, updateWidgetConfig, getUsage } from '../controllers/companyController.js'
import { verifyToken } from '../middleware/verify.js'
import { requirePlanAccess, requirePlanAccessOrWorkspaceSetup } from '../middleware/requirePlanAccess.js'
import { listRegisteredDomains, registerDomain, verifyDomain } from '../controllers/domainController.js'

const router = express.Router()

router.get('/me', verifyToken, requirePlanAccess, getMyCompany)
router.get('/usage', verifyToken, requirePlanAccess, getUsage)
router.get('/domains', verifyToken, requirePlanAccess, listRegisteredDomains)
router.post('/domains', verifyToken, requirePlanAccess, registerDomain)
router.post('/domains/:id/verify', verifyToken, requirePlanAccess, verifyDomain)
router.post('/onboarding', verifyToken, requirePlanAccessOrWorkspaceSetup, saveOnboarding)
router.patch('/widget-config', verifyToken, requirePlanAccess, updateWidgetConfig)

export default router
