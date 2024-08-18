import {v4 as uuidv4} from 'uuid';
import {Room} from "../lib/types/room";
import {User} from "../lib/types/user.type";

export class RoomService {
    private static _instance: RoomService
    private _rooms: Room[] = []

    private constructor() {
    }

    public static getInstance(): RoomService {
        if (!RoomService._instance) {
            RoomService._instance = new RoomService()
        }
        return RoomService._instance
    }

    public get rooms(): Room[] {
        return this._rooms
    }

    public createRoom(user: User): Room {
        const room = {
            id: uuidv4(),
            users: [user]
        }
        this.rooms.push(room)
        return room
    }
}