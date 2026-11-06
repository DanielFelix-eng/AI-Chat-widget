import express from 'express'
import { answerWidgetMessage, getPublicWidgetConfig } from '../controllers/widgetController.js'
import { widgetChatLimiter } from '../middleware/rateLimit.js'

const router = express.Router()

router.get('/:publicKey/config', getPublicWidgetConfig)
router.post('/:publicKey/chat', widgetChatLimiter, answerWidgetMessage)

export default router
