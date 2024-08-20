import {User} from "./user.type";
import {Game} from "../../concepts/game";

export type Room = {
    id: string
    adminUserId: string
    users: User[]
    game?: Game
}