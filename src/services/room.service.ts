import {v4 as uuidv4} from 'uuid';
import {Room} from "../lib/types/room.type";
import {User} from "../lib/types/user.type";
import {Game} from "../concepts/game";

export class RoomService {
    private static _instance: RoomService
    private _rooms: Map<string, Room> = new Map()

    private constructor() {
    }

    public static getInstance(): RoomService {
        if (!RoomService._instance) {
            RoomService._instance = new RoomService()
        }
        return RoomService._instance
    }

    public get rooms(): Map<string, Room> {
        return this._rooms
    }

    public createRoom(user: User): Room {
        const room: Room = {
            id: uuidv4().slice(0, 7),
            adminUserId: user.id,
            users: [user]
        }

        this._rooms.set(room.id, room)

        return room
    }

    public getRoomById(id: string): Room | null {
        const room = this._rooms.get(id)
        return room ? room : null
    }

    public updateRoom(id: string, room: Room): void {
        this._rooms.set(id, room)
    }

    public createGameForRoom(roomId: string): Room {
        const room = this.getRoomById(roomId)

        if (!room) {
            throw new Error('Room not found at id ' + roomId)
        }

        room.game = new Game(room.users)
        return room
    }
}