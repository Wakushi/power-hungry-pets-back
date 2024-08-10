import http from 'http';
import {WebSocket, WebSocketServer} from "ws";
import {EventsService} from "./events.service";
import {GameEvent} from "../types/event.type";

export class MultiplayerService {
    private static _instance: MultiplayerService
    private _socket!: WebSocketServer

    private constructor() {
    }

    public static getInstance(): MultiplayerService {
        if (!MultiplayerService._instance) {
            MultiplayerService._instance = new MultiplayerService()
        }
        return MultiplayerService._instance
    }

    public initSocket(server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>): void {
        this._socket = new WebSocketServer({server});

        this._socket.on('connection', (ws: WebSocket) => {
            ws.on('message', (message: ArrayBuffer) => {
                const event = JSON.parse(message.toString())
                EventsService.getInstance().dispatch(ws, event)
            });
        });
    }

    public broadcast(event: GameEvent, origin?: WebSocket): void {
        this._socket.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client !== origin) {
                client.send(JSON.stringify(event))
            }
        });
    }
}