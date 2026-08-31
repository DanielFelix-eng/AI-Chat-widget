import express from 'express'
import dotenv from 'dotenv'
import connectedDB from './db/db.js'
dotenv.config()
const app = express()
const port = process.env.PORT || 8000


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    connectedDB()
    console.log("server is running on port ", port)
})