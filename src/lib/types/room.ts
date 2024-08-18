import {User} from "./user.type";

export type Room = {
    id: string
    adminUserId: string
    users: User[]
}