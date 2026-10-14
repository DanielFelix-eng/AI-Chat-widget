import express from 'express'
import { getConversationActivity, getAssistantMetrics } from '../controllers/chatController.js'
import { answerTestMessage } from '../controllers/widgetController.js'
import { verifyToken } from '../middleware/verify.js'

const router = express.Router()

router.post('/test', verifyToken, answerTestMessage)
router.get('/activity', verifyToken, getConversationActivity)
router.get('/metrics', verifyToken, getAssistantMetrics)

export default router
