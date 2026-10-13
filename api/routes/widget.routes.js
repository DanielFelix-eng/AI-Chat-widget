import express from 'express'
import { answerWidgetMessage, getPublicWidgetConfig } from '../controllers/widgetController.js'

const router = express.Router()

router.get('/:publicKey/config', getPublicWidgetConfig)
router.post('/:publicKey/chat', answerWidgetMessage)

export default router
