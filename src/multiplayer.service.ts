import http from 'http';
import {WebSocket, WebSocketServer} from "ws";
import {EventsService} from "./events.service";

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

    initSocket(server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>): void {
        this._socket = new WebSocketServer({server});

        this._socket.on('connection', (ws: WebSocket) => {

            ws.on('message', (message: ArrayBuffer) => {
                const event = JSON.parse(message.toString())
                EventsService.getInstance().dispatch(event)

                // wss.clients.forEach(client => {
                //     if (client !== ws && client.readyState === WebSocket.OPEN) {
                //
                //     }
                // });
            });
        });

    }
}