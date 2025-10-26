import express from 'express'
import cors from 'cors'
import config from 'config'
import { initDb } from './db/connection.js'
import consts from './utils/consts.js'
import authRouter from './apiServices/auth/auth.route.js'
import userRouter from './apiServices/user/user.route.js'
import chatRouter from './apiServices/chat/chat.route.js'

const api = consts.apiPath

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type'],
  })
)

await initDb()

const avoidCors = config.get('avoidCors')
if (avoidCors) app.use(cors())

// Rutas
app.get(`${api}/`, (_, res) => {
  res.send('API de CIUDADANO DIGITAL')
})
app.use(`${api}/auth/`, authRouter)
app.use(`${api}/user/`, userRouter)
app.use(`${api}/chat/`, chatRouter)

export default app
