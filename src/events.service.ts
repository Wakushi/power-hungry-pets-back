import {UserService} from "./user.service";
import {MultiplayerService} from "./multiplayer.service";

enum GameEventType {
    USER_JOINED = 'USER_JOINED'
}

type GameEvent = {
    type: GameEventType
    data: any
}


export class EventsService {
    private static _instance: EventsService
    private _userService = UserService.getInstance()
    private _multiplayerService = MultiplayerService.getInstance()

    private constructor() {
    }

    public static getInstance(): EventsService {
        if (!EventsService._instance) {
            EventsService._instance = new EventsService()
        }
        return EventsService._instance
    }

    public dispatch(event: GameEvent): void {
        switch (event.type) {
            case GameEventType.USER_JOINED:
                this._userService.connectUser(event.data)
                this._multiplayerService
                break
        }
    }
}