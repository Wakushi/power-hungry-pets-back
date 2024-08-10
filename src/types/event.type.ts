export enum ClientEvent {
  USER_JOINED = "USER_JOINED",
  CARD_PLAYED = "CARD_PLAYED",
  PLAYER_SELECTED = "PLAYER_SELECTED",
}

export enum ServerEvent {
  GAME_STARTED = "GAME_STARTED",
  OPEN_PLAYER_SELECTION = "OPEN_PLAYER_SELECTION",
  OPEN_CARD_SELECTION = "OPEN_CARD_SELECTION",
  OPEN_CARD_VIEW = "OPEN_CARD_VIEW",
  NEXT_TURN = "NEXT_TURN",
  GAME_OVER = "GAME_OVER",
}

export type GameEvent = {
  type: ClientEvent | ServerEvent
  data?: any
}
