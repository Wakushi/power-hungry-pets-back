import {User} from "./user.type";
import {MultiplayerService} from "./multiplayer.service";
import {ServerEvent} from "./event.type";

export class GameService {
    private static _instance: GameService;
    private _multiplayerService = MultiplayerService.getInstance()

    private constructor() {
    }

    public static getInstance(): GameService {
        if (!GameService._instance) {
            GameService._instance = new GameService()
        }
        return GameService._instance
    }

    public startGame(users: User[]): void {
        this._multiplayerService.broadcast({
            type: ServerEvent.GAME_STARTED,
            data: users
        })
    }


}