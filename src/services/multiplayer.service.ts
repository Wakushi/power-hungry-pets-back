import http from "http"
import {v4 as uuidv4} from 'uuid';
import {WebSocket, WebSocketServer} from "ws"
import {EventsService} from "./events.service"
import {GameEvent} from "../lib/types/event.type"

export class MultiplayerService {
    private static _instance: MultiplayerService
    private _socket!: WebSocketServer
    private _clients: Map<string, WebSocket> = new Map()

    private constructor() {
    }

    public static getInstance(): MultiplayerService {
        if (!MultiplayerService._instance) {
            MultiplayerService._instance = new MultiplayerService()
        }
        return MultiplayerService._instance
    }

    public initSocket(
        server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    ): void {
        this._socket = new WebSocketServer({server})

        this._socket.on("connection", (client: WebSocket) => {
            const clientId = this._registerClient(client)

            client.on("message", (message: ArrayBuffer) => {
                const event = JSON.parse(message.toString())
                EventsService.getInstance().dispatch(clientId, event)
            })
        })
    }

    public broadcast(event: GameEvent, clientIds: string[]): void {
        clientIds.forEach(id => {
            const client = this._clients.get(id)

            if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(event))
            }
        })
    }

    private _registerClient(client: WebSocket): string {
        const clientId = uuidv4()
        this._clients.set(clientId, client)
        return clientId
    }

    private _getClientById(id: string): WebSocket | null {
        return this._clients.get(id) || null
    }
}
