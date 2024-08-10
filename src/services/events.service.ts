import { WebSocket } from "ws"
import { UserService } from "./user.service"
import { ClientEvent, GameEvent, ServerEvent } from "../types/event.type"
import { GameService } from "./game.service"
import { Player } from "../concepts/player"
import { CardType } from "../lib/types/card.type"
import { MultiplayerService } from "./multiplayer.service"
import { Deck } from "../concepts/deck"
import { Card } from "../types/card.type"

const REQUIRED_PLAYERS_AMOUNT = 2

export class EventsService {
  private static _instance: EventsService
  private _userService = UserService.getInstance()
  private _gameService = GameService.getInstance()

  private constructor() {}

  public static getInstance(): EventsService {
    if (!EventsService._instance) {
      EventsService._instance = new EventsService()
    }
    return EventsService._instance
  }

  public dispatch(client: WebSocket, event: GameEvent): void {
    switch (event.type) {
      case ClientEvent.USER_JOINED:
        const connectedUsers = this._userService.connectUser(event.data)

        if (connectedUsers.length >= REQUIRED_PLAYERS_AMOUNT) {
          this._gameService.startGame(connectedUsers)
        }
        break

      case ClientEvent.CARD_PLAYED:
        const cardValue = event.data
        this._onCardPlayed(cardValue)
        break

      case ClientEvent.PLAYER_SELECTED:
        const selectedPlayer = event.data
        this._onPlayerSelected(selectedPlayer.id)
        break

      case ClientEvent.INSERT_CARD:
        const { card, index } = event.data
        this._gameService.deck.insertCardAtIndex(card, index)
        this._gameService.onNextTurn()
        break
    }
  }

  private _onCardPlayed(cardValue: string): void {
    const activePlayer = this._gameService.activePlayer

    if (!activePlayer) return

    if (activePlayer.protected) {
      activePlayer.protected = false
    }

    if (this._gameService.interactionMode === "activation") {
      activePlayer.discard(+cardValue)
      this._activateCardEffect(cardValue, activePlayer)
      this._gameService.lastCardPlayedId = cardValue
    }

    if (this._gameService.interactionMode === "selection") {
      //   this._checkLastCardIdInteraction(cardValue)
    }
  }

  private _activateCardEffect(cardValue: string, activePlayer: Player): void {
    switch (cardValue) {
      case CardType.NOT_A_PET:
        this._gameService.players.forEach((player) => {
          if (
            player.id !== activePlayer.id &&
            player.hand[0].value.toString() === CardType.KING_CAT
          ) {
            const [playerCard] = player.hand.splice(0, 1)
            const [activePlayerCard] = activePlayer.hand.splice(0, 1)
            player.hand.push(activePlayerCard)
            activePlayer.hand.push(playerCard)
          }
        })
        this._gameService.onNextTurn()
        break

      case CardType.HERMIT_HOME_SWAP:
        this._sendPlayerSelectionEvent()
        break

      case CardType.JITTERY_JUGGLER:
        this._gameService.players.forEach((player) => {
          const playerCard = player.hand.splice(0, 1)[0]
          this._gameService.deck.insertCardAtIndex(playerCard, 0)
        })

        this._gameService.deck.shuffleDeck()

        this._gameService.players.forEach((player) => {
          player.hand.push(this._gameService.deck.draw())
        })

        this._gameService.onNextTurn()
        break

      case CardType.DOGGY_GRAVE_DIGGER:
        this._sendCardViewEvent({
          playedCardValue: CardType.DOGGY_GRAVE_DIGGER,
          card: this._gameService.deck.sideCard,
          deck: this._gameService.deck,
        })
        break

      case CardType.SNAKE_SORCERER:
        this._sendPlayerSelectionEvent()
        break

      case CardType.SHELL_SHIELD:
        activePlayer.protected = true
        this._gameService.onNextTurn()
        break

      case CardType.BATTLE_BUNNY:
        this._sendPlayerSelectionEvent()
        break

      case CardType.MOUSE_TRAPPER:
        const card = this._gameService.deck.draw()
        this._sendCardViewEvent({
          playedCardValue: CardType.MOUSE_TRAPPER,
          card,
          deck: this._gameService.deck,
        })
        break

      case CardType.CRYSTAL_BOWL:
        this._sendPlayerSelectionEvent()
        break

      case CardType.ROYAL_ROBOVAC:
        this._gameService.onNextTurn()
        break
      default:
        break
    }
  }

  private _onPlayerSelected(selectedPlayerId: string): void {
    const activePlayer = this._gameService.activePlayer
    const selectedPlayer = this._gameService.players.find(
      (player) => player.id === selectedPlayerId
    )

    if (!selectedPlayer) {
      throw new Error("Player at id " + selectedPlayerId + " not found")
    }

    this._gameService.lastSelectedPlayer = selectedPlayer

    if (!activePlayer) return

    if (this._gameService.lastSelectedPlayer.protected) {
      //   alert(
      //     "Player " + this._gameService.lastSelectedPlayer.id + " is protected !"
      //   )
      //   togglePlayerSelectionModal(false)
      this._gameService.onNextTurn()
      return
    }

    const selectedPlayerCard = this._gameService.lastSelectedPlayer.hand[0]

    switch (this._gameService.lastCardPlayedId) {
      case CardType.HERMIT_HOME_SWAP:
        const [currentPlayerCard] = activePlayer.hand.splice(0, 1)
        const [targetPlayerCard] = selectedPlayer.hand.splice(0, 1)
        activePlayer.hand.push(targetPlayerCard)
        selectedPlayer.hand.push(currentPlayerCard)

        this._gameService.onNextTurn()
        break

      case CardType.SNAKE_SORCERER:
        selectedPlayer.discard(selectedPlayerCard.value)

        if (selectedPlayerCard.value.toString() === CardType.KING_CAT) {
          selectedPlayer.eliminate()
        } else {
          selectedPlayer.hand.push(this._gameService.deck.draw())
        }

        this._gameService.onNextTurn()
        break

      case CardType.BATTLE_BUNNY:
        const activePlayerCard = activePlayer.hand[0]
        if (activePlayerCard.value > selectedPlayerCard.value) {
          selectedPlayer.eliminate()
        } else if (activePlayerCard.value < selectedPlayerCard.value) {
          activePlayer.eliminate()
        }

        this._gameService.onNextTurn()
        break

      case CardType.CRYSTAL_BOWL:
        this._gameService.interactionMode = "selection"
        this._sendCardSelectionEvent()
        break

      default:
        break
    }
  }

  private _sendPlayerSelectionEvent(): void {
    MultiplayerService.getInstance().broadcast({
      type: ServerEvent.OPEN_PLAYER_SELECTION,
    })
  }

  private _sendCardSelectionEvent(): void {
    MultiplayerService.getInstance().broadcast({
      type: ServerEvent.OPEN_CARD_SELECTION,
    })
  }

  private _sendCardViewEvent({
    playedCardValue,
    card,
    deck,
  }: {
    playedCardValue: CardType
    card: Card
    deck: Deck
  }): void {
    MultiplayerService.getInstance().broadcast({
      type: ServerEvent.OPEN_CARD_VIEW,
      data: {
        playedCardValue,
        card,
        deck,
      },
    })
  }
}
