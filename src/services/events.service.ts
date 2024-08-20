import { UserService } from "./user.service"
import { MultiplayerService } from "./multiplayer.service"
import { ClientEvent, GameEvent, ServerEvent } from "../lib/types/event.type"
import { RoomService } from "./room.service"
import { Room } from "../lib/types/room.type"
import { Game } from "../concepts/game"

export class EventsService {
  private static _instance: EventsService
  private _userService = UserService.getInstance()
  private _roomService = RoomService.getInstance()

  private constructor() {}

  public static getInstance(): EventsService {
    if (!EventsService._instance) {
      EventsService._instance = new EventsService()
    }
    return EventsService._instance
  }

  public dispatch(clientId: string, event: GameEvent): void {
    switch (event.type) {
      case ClientEvent.CREATE_ROOM:
        const initialUser = { ...event.data, clientId }
        this._userService.connectUser(initialUser)
        const room = this._roomService.createRoom(initialUser)

        MultiplayerService.getInstance().broadcast(
          {
            type: ServerEvent.ROOM_CREATED,
            data: room,
          },
          [clientId]
        )
        break

      case ClientEvent.JOIN_ROOM:
        const { user, roomCode } = event.data
        const foundRoom = this._roomService.getRoomById(roomCode)

        if (!foundRoom) {
          MultiplayerService.getInstance().broadcast(
            {
              type: ServerEvent.ROOM_NOT_FOUND,
              data: roomCode,
            },
            [clientId]
          )
          return
        }

        if (foundRoom?.users.findIndex((u) => u.id === user.id) === -1) {
          foundRoom.users.push({ ...user, clientId })
        }

        this._roomService.updateRoom(roomCode, foundRoom)

        MultiplayerService.getInstance().broadcast(
          {
            type: ServerEvent.ROOM_FOUND,
            data: foundRoom,
          },
          foundRoom.users.map((u) => u.clientId)
        )
        break

      case ClientEvent.START_GAME:
        const readyRoom: Room = event.data

        MultiplayerService.getInstance().broadcast(
          {
            type: ServerEvent.GAME_STARTED,
            data: this._roomService.createGameForRoom(readyRoom.id),
          },
          readyRoom.users.map((u) => u.clientId)
        )
        break

      case ClientEvent.CARD_PLAYED:
        this.getGameRoom(event.data.roomId).onCardPlayed(
          event.data.card.value.toString()
        )
        break

      case ClientEvent.PLAYER_SELECTED:
        this.getGameRoom(event.data.roomId).onPlayerSelected(
          event.data.playerId
        )
        break

      case ClientEvent.INSERT_CARD:
        this.getGameRoom(event.data.roomId).onCardInserted(event.data.cardIndex)
        break

      case ClientEvent.SWITCH_CARD:
        this.getGameRoom(event.data.roomId).onCardSwitch(event.data.switch)
        break
    }
  }

  private getGameRoom(roomId: string): Game {
    const gameRoom = this._roomService.getRoomById(roomId)

    if (!gameRoom?.game) {
      throw new Error("Room game not found for room " + roomId)
    }

    return gameRoom?.game
  }
}
