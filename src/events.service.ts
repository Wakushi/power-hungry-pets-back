import {WebSocket} from "ws";
import {UserService} from "./user.service";
import {ClientEvent, GameEvent} from "./event.type";
import {GameService} from "./game.service";

const REQUIRED_PLAYERS_AMOUNT = 2

export class EventsService {
    private static _instance: EventsService
    private _userService = UserService.getInstance()
    private _gameService = GameService.getInstance()

    private constructor() {
    }

    public static getInstance(): EventsService {
        if (!EventsService._instance) {
            EventsService._instance = new EventsService()
        }
        return EventsService._instance
    }

    public dispatch(client: WebSocket, event: GameEvent): void {

        switch (event.type) {
            case ClientEvent.USER_JOINED:
                const connectedUsers = this._userService.connectUser(event.data)

                if (connectedUsers.length >= REQUIRED_PLAYERS_AMOUNT) {
                    this._gameService.startGame(connectedUsers)
                }
                break
        }
    }
}