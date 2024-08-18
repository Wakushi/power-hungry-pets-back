import {MultiplayerService} from "../services/multiplayer.service"

import {Deck} from "./deck"
import {Player} from "./player"
import {UserService} from "../services/user.service"
import {User} from "../lib/types/user.type"
import {ServerEvent} from "../lib/types/event.type"

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
            this._interactionMode = "activation"
            this._onTurnStart()

            this._multiplayerService.broadcast({
                type: ServerEvent.NEXT_TURN,
                data: {players: this.players, activePlayerId: this._activePlayerId},
            }, [])
        }
    }

    public onPlayerElimination(): void {
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
            (player) => player.id !== this.activePlayerId
        )

        if (activePlayerIndex === -1) {
            throw new Error("Next player not found !")
        }

        return this.players[activePlayerIndex].id
    }

    private _onGameOver(winner: Player): void {
        this._gameOver = true
        this._lastWinner = winner
        UserService.getInstance().connectedUsers = []

        this._multiplayerService.broadcast({
            type: ServerEvent.GAME_OVER,
            data: winner,
        }, [])
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
}
