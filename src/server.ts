import express from "express"
import http from "http"
import {MultiplayerService} from "./services/multiplayer.service"
import {RoomService} from "./services/room.service";

const app = express()
const server = http.createServer(app)
const port = process.env.PORT || 3000

MultiplayerService.getInstance().initSocket(server)

setInterval(() => {
    for (const [key, value] of RoomService.getInstance().rooms.entries()) {
        console.log(value)
    }
}, 2000)

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})
