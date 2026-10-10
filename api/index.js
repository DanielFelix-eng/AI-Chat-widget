import express from 'express'
import 'dotenv/config'
import cookieParser from 'cookie-parser'
import { connectedDB } from './db/db.js'
import authRoute from './routes/authRoute.js'
 import  documentRoute from './routes/document.routes.js'



const app = express()
const port = process.env.PORT || 8000

app.use(express.json())
app.use(cookieParser())
app.use( '/api/auth' , authRoute )
 app.use('/api', documentRoute);
 
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    connectedDB()
    console.log("server is running on port ", port)
})