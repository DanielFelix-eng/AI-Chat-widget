import express from 'express'
import { getConversation, getConversations, getConversationActivity, getAssistantMetrics, getRecentConversations } from '../controllers/chatController.js'
import { answerTestMessage } from '../controllers/widgetController.js'
import { verifyToken } from '../middleware/verify.js'
import { requirePlanAccess } from '../middleware/requirePlanAccess.js'

const router = express.Router()

router.post('/test', verifyToken, requirePlanAccess, answerTestMessage)
router.get('/activity', verifyToken, requirePlanAccess, getConversationActivity)
router.get('/metrics', verifyToken, requirePlanAccess, getAssistantMetrics)
router.get('/recent', verifyToken, requirePlanAccess, getRecentConversations)
router.get('/conversations', verifyToken, requirePlanAccess, getConversations)
router.get('/conversations/:sessionId', verifyToken, requirePlanAccess, getConversation)

export default router
