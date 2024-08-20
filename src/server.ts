import express from "express"
import http from "http"
import {MultiplayerService} from "./services/multiplayer.service"

const app = express()
const server = http.createServer(app)
const port = process.env.PORT || 3000

MultiplayerService.getInstance().initSocket(server)

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})
