import { MultiplayerService } from "../services/multiplayer.service"

import { Deck } from "./deck"
import { Player } from "./player"
import { User } from "../lib/types/user.type"
import { ServerEvent } from "../lib/types/event.type"
import { Card, CardType } from "../lib/types/card.type"

export class Game {
  private _multiplayerService = MultiplayerService.getInstance()

  private _deck!: Deck
  private _players: Player[] = []
  private _activePlayerId!: string
  private _gameStarted = false

  private _lastCardPlayedId!: string
  private _lastSelectedPlayer!: Player
  private _lastWinner!: Player
  private _lastTurn = false

  private _gameOver = false
  private _interactionMode: "selection" | "activation" = "activation"
  private _cardViewContext!: {
    playedCardValue: CardType
    cardShown: Card
  }

  constructor(users: User[]) {
    if (users?.length < 2) {
      throw new Error("Can't start game with " + users.length + " players.")
    }
    this.startGame(users)
  }

  public get deck(): Deck {
    return this._deck
  }

  public set deck(deck: Deck) {
    this._deck = deck
  }

  public get players(): Player[] {
    return this._players
  }

  public set players(players: Player[]) {
    this._players = players
  }

  public get interactionMode(): "selection" | "activation" {
    return this._interactionMode
  }

  public set interactionMode(mode: "selection" | "activation") {
    this._interactionMode = mode
  }

  public get activePlayerId(): string {
    return this._activePlayerId
  }

  public get lastCardPlayedId(): string {
    return this._lastCardPlayedId
  }

  public set lastCardPlayedId(id: string) {
    this._lastCardPlayedId = id
  }

  public get lastSelectedPlayer(): Player {
    return this._lastSelectedPlayer
  }

  public set lastSelectedPlayer(player: Player) {
    this._lastSelectedPlayer = player
  }

  public get activePlayer(): Player {
    const activePlayer = this.players.find(
      (player) => player.id === this.activePlayerId
    )

    if (!activePlayer) {
      throw new Error("Player with id " + this.activePlayerId + " not found.")
    }

    return activePlayer
  }

  public startGame(users: User[]): void {
    this._gameOver = false
    this._gameStarted = true
    this._activePlayerId = users[0].id

    this._resetDeck()
    this._resetPlayers(users)
    this._resetPlayerHands()
    this._onTurnStart()
  }

  public onNextTurn(): void {
    if (this._lastTurn) {
      this._compareCards()
    }
    if (!this._gameOver) {
      this._activePlayerId = this._getNextPlayerId()

      while (this.activePlayer.eliminated) {
        this._activePlayerId = this._getNextPlayerId()
      }

      this._interactionMode = "activation"
      this._onTurnStart()

      this._multiplayerService.broadcast(
        {
          type: ServerEvent.NEXT_TURN,
          data: this,
        },
        this.players.map((p) => p.clientId)
      )
    }
  }

  private _onPlayerElimination(): void {
    const activePlayers = this.players.filter((player) => !player.eliminated)
    if (activePlayers.length === 1) {
      this._onGameOver(activePlayers[0])
    }
  }

  private _compareCards(): void {
    let winner: Player = this.players[0]

    this.players
      .filter((p) => !p.eliminated)
      .forEach((player) => {
        if (player.hand[0].value > winner.hand[0].value) {
          winner = player
        }
      })

    this._onGameOver(winner)
  }

  private _getNextPlayerId(): string {
    const activePlayerIndex = this.players.findIndex(
      (player) => player.id === this.activePlayerId
    )

    if (activePlayerIndex === -1) {
      throw new Error("Next player not found !")
    }

    return this.players[(activePlayerIndex + 1) % this.players.length].id
  }

  private _onGameOver(winner: Player): void {
    this._gameOver = true
    this._lastWinner = winner

    this._multiplayerService.broadcast(
      {
        type: ServerEvent.GAME_OVER,
        data: this,
      },
      this.players.map((p) => p.clientId)
    )
  }

  private _resetDeck(): void {
    this.deck = new Deck()
  }

  private _resetPlayers(users: User[]): void {
    this.players = users.map((user) => new Player(user))
  }

  private _resetPlayerHands(): void {
    this.players.forEach((player) => player.hand.push(this.deck.draw()))
  }

  private _onTurnStart(): void {
    const protectedActivePlayer = this.players.find(
      (p) => p.id === this.activePlayerId && p.protected
    )

    if (protectedActivePlayer) {
      protectedActivePlayer.protected = false
    }

    this._activePlayerDraws()
  }

  private _activePlayerDraws(): void {
    const activePlayerIndex = this.players.findIndex(
      (player) => player.id === this._activePlayerId
    )

    this.players[activePlayerIndex].hand.push(this.deck.draw())

    if (!this.deck.cards.length) {
      this._lastTurn = true
    }
  }

  public onCardPlayed(cardValue: string): void {
    const activePlayer = this.activePlayer

    if (!activePlayer || cardValue === CardType.KING_CAT) return

    if (activePlayer.protected) {
      activePlayer.protected = false
    }

    if (this.interactionMode === "activation") {
      activePlayer.discard(+cardValue)
      this._activateCardEffect(cardValue, activePlayer)
      this.lastCardPlayedId = cardValue
    }

    if (this.interactionMode === "selection") {
      this._checkLastCardIdInteraction(cardValue)
    }
  }

  private _activateCardEffect(cardValue: string, activePlayer: Player): void {
    switch (cardValue) {
      case CardType.NOT_A_PET:
        this.players.forEach((player) => {
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
        this.onNextTurn()
        break

      case CardType.HERMIT_HOME_SWAP:
        this._sendPlayerSelectionEvent()
        break

      case CardType.JITTERY_JUGGLER:
        this.players.forEach((player) => {
          if (player.protected) return
          const playerCard = player.hand.splice(0, 1)[0]
          this.deck.insertCardAtIndex(playerCard, 0)
        })

        this.deck.shuffleDeck()

        this.players.forEach((player) => {
          if (player.protected) return
          player.hand.push(this.deck.draw())
        })

        this.onNextTurn()
        break

      case CardType.DOGGY_GRAVE_DIGGER:
        this._sendCardViewEvent({
          playedCardValue: CardType.DOGGY_GRAVE_DIGGER,
          card: this.deck.sideCard,
        })
        break

      case CardType.SNAKE_SORCERER:
        this._sendPlayerSelectionEvent()
        break

      case CardType.SHELL_SHIELD:
        activePlayer.protected = true
        this.onNextTurn()
        break

      case CardType.BATTLE_BUNNY:
        this._sendPlayerSelectionEvent()
        break

      case CardType.MOUSE_TRAPPER:
        const card = this.deck.draw()
        this._sendCardViewEvent({
          playedCardValue: CardType.MOUSE_TRAPPER,
          card,
        })
        break

      case CardType.CRYSTAL_BOWL:
        this._sendPlayerSelectionEvent()
        break

      case CardType.ROYAL_ROBOVAC:
        this.onNextTurn()
        break
      default:
        break
    }
  }

  public onPlayerSelected(selectedPlayerId: string): void {
    const activePlayer = this.activePlayer
    const selectedPlayer = this.players.find(
      (player) => player.id === selectedPlayerId
    )

    if (!selectedPlayer) {
      throw new Error("Player at id " + selectedPlayerId + " not found")
    }

    this.lastSelectedPlayer = selectedPlayer

    if (!activePlayer) return

    if (this.lastSelectedPlayer.protected) {
      this.onNextTurn()
      return
    }

    const selectedPlayerCard = this.lastSelectedPlayer.hand[0]

    switch (this.lastCardPlayedId) {
      case CardType.HERMIT_HOME_SWAP:
        const [currentPlayerCard] = activePlayer.hand.splice(0, 1)
        const [targetPlayerCard] = selectedPlayer.hand.splice(0, 1)
        activePlayer.hand.push(targetPlayerCard)
        selectedPlayer.hand.push(currentPlayerCard)

        this.onNextTurn()
        break

      case CardType.SNAKE_SORCERER:
        selectedPlayer.discard(selectedPlayerCard.value)

        if (selectedPlayerCard.value.toString() === CardType.KING_CAT) {
          selectedPlayer.eliminate()
          this._onPlayerElimination()
        } else {
          selectedPlayer.hand.push(this.deck.draw())
        }

        this.onNextTurn()
        break

      case CardType.BATTLE_BUNNY:
        const activePlayerCard = activePlayer.hand[0]
        if (activePlayerCard.value > selectedPlayerCard.value) {
          selectedPlayer.eliminate()
          this._onPlayerElimination()
        } else if (activePlayerCard.value < selectedPlayerCard.value) {
          activePlayer.eliminate()
          this._onPlayerElimination()
        }

        this.onNextTurn()
        break

      case CardType.CRYSTAL_BOWL:
        this.interactionMode = "selection"
        this._sendCardSelectionEvent()
        break

      default:
        break
    }
  }

  public onCardInserted(cardIndex: number): void {
    this.deck.insertCardAtIndex(this._cardViewContext.cardShown, cardIndex)
    this.onNextTurn()
  }

  public onCardSwitch(switched: boolean): void {
    if (switched) {
      const [userCard] = this.activePlayer.hand.splice(0, 1, this.deck.sideCard)
      this.deck.sideCard = userCard
    }

    this.onNextTurn()
  }

  private _sendPlayerSelectionEvent(): void {
    MultiplayerService.getInstance().broadcast(
      {
        type: ServerEvent.OPEN_PLAYER_SELECTION,
      },
      [this.activePlayer.clientId]
    )
  }

  private _sendCardSelectionEvent(): void {
    MultiplayerService.getInstance().broadcast(
      {
        type: ServerEvent.TOGGLE_CARD_SELECTION,
      },
      [this.activePlayer.clientId]
    )
  }

  private _sendCardViewEvent({
    playedCardValue,
    card,
  }: {
    playedCardValue: CardType
    card: Card
  }): void {
    this._cardViewContext = {
      playedCardValue,
      cardShown: card,
    }

    MultiplayerService.getInstance().broadcast(
      {
        type: ServerEvent.OPEN_CARD_VIEW,
        data: this,
      },
      [this.activePlayer.clientId]
    )
  }

  private _checkLastCardIdInteraction(clickedCardId: string): void {
    switch (this.lastCardPlayedId) {
      case CardType.CRYSTAL_BOWL:
        if (this.lastSelectedPlayer.hand[0].value === +clickedCardId) {
          this.lastSelectedPlayer.eliminate()
          this._onPlayerElimination()
        }
        this.onNextTurn()
        break
      default:
        break
    }
  }
}
