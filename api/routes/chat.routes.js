import express from 'express'
import { answerTestMessage } from '../controllers/widgetController.js'
import { verifyToken } from '../middleware/verify.js'

const router = express.Router()

router.post('/test', verifyToken, answerTestMessage)

export default router
