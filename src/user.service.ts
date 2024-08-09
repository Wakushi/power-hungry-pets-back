import {User} from "./user.type";

export class UserService {
    private static _instance: UserService
    private _connectedUsers: User[] = []

    private constructor() {
    }

    public static getInstance(): UserService {
        if (!UserService._instance) {
            UserService._instance = new UserService()
        }
        return UserService._instance
    }

    public get connectedUsers(): User[] {
        return this._connectedUsers
    }

    public connectUser(user: User): void {
        if (!this._connectedUsers.some((connectedUser) => connectedUser.id === user.id)) {
            this._connectedUsers.push(user)
        }
    }

}