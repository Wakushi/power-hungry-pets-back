export enum ClientEvent {
    USER_JOINED = 'USER_JOINED'
}

export enum ServerEvent {
    GAME_STARTED = "GAME_STARTED"
}

export type GameEvent = {
    type: ClientEvent | ServerEvent
    data: any
}