import {MultiplayerService} from "../services/multiplayer.service"

import {Deck} from "./deck"
import {Player} from "./player"
import {UserService} from "../services/user.service"
import {User} from "../lib/types/user.type"
import {ServerEvent} from "../lib/types/event.type"
import {CardType} from "../lib/types/card.type";

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

    public onCardPlayed(cardValue: string): void {
        const activePlayer = this.activePlayer

        if (!activePlayer) return

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
                    const playerCard = player.hand.splice(0, 1)[0]
                    this.deck.insertCardAtIndex(playerCard, 0)
                })

                this.deck.shuffleDeck()

                this.players.forEach((player) => {
                    player.hand.push(this.deck.draw())
                })

                this.onNextTurn()
                break

            case CardType.DOGGY_GRAVE_DIGGER:
                // this._sendCardViewEvent({
                //     playedCardValue: CardType.DOGGY_GRAVE_DIGGER,
                //     card: this.deck.sideCard,
                //     deck: this.deck,
                // })
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
                // this._sendCardViewEvent({
                //     playedCardValue: CardType.MOUSE_TRAPPER,
                //     card,
                //     deck: this.deck,
                // })
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

    //
    // private _onPlayerSelected(selectedPlayerId: string): void {
    //     const activePlayer = this.activePlayer
    //     const selectedPlayer = this.players.find(
    //         (player) => player.id === selectedPlayerId
    //     )
    //
    //     if (!selectedPlayer) {
    //         throw new Error("Player at id " + selectedPlayerId + " not found")
    //     }
    //
    //     this.lastSelectedPlayer = selectedPlayer
    //
    //     if (!activePlayer) return
    //
    //     if (this.lastSelectedPlayer.protected) {
    //         //   alert(
    //         //     "Player " + this.lastSelectedPlayer.id + " is protected !"
    //         //   )
    //         //   togglePlayerSelectionModal(false)
    //         this.onNextTurn()
    //         return
    //     }
    //
    //     const selectedPlayerCard = this.lastSelectedPlayer.hand[0]
    //
    //     switch (this.lastCardPlayedId) {
    //         case CardType.HERMIT_HOME_SWAP:
    //             const [currentPlayerCard] = activePlayer.hand.splice(0, 1)
    //             const [targetPlayerCard] = selectedPlayer.hand.splice(0, 1)
    //             activePlayer.hand.push(targetPlayerCard)
    //             selectedPlayer.hand.push(currentPlayerCard)
    //
    //             this.onNextTurn()
    //             break
    //
    //         case CardType.SNAKE_SORCERER:
    //             selectedPlayer.discard(selectedPlayerCard.value)
    //
    //             if (selectedPlayerCard.value.toString() === CardType.KING_CAT) {
    //                 selectedPlayer.eliminate()
    //             } else {
    //                 selectedPlayer.hand.push(this.deck.draw())
    //             }
    //
    //             this.onNextTurn()
    //             break
    //
    //         case CardType.BATTLE_BUNNY:
    //             const activePlayerCard = activePlayer.hand[0]
    //             if (activePlayerCard.value > selectedPlayerCard.value) {
    //                 selectedPlayer.eliminate()
    //             } else if (activePlayerCard.value < selectedPlayerCard.value) {
    //                 activePlayer.eliminate()
    //             }
    //
    //             this.onNextTurn()
    //             break
    //
    //         case CardType.CRYSTAL_BOWL:
    //             this.interactionMode = "selection"
    //             this._sendCardSelectionEvent(true)
    //             break
    //
    //         default:
    //             break
    //     }
    // }
    //

    private _sendPlayerSelectionEvent(): void {
        MultiplayerService.getInstance().broadcast({
            type: ServerEvent.OPEN_PLAYER_SELECTION,
        }, this._players.map(p => p.clientId))
    }

    //
    // private _sendCardSelectionEvent(open: boolean): void {
    //     MultiplayerService.getInstance().broadcast({
    //         type: ServerEvent.TOGGLE_CARD_SELECTION,
    //         data: open,
    //     }, [])
    // }
    //
    // private _sendCardViewEvent({
    //                                playedCardValue,
    //                                card,
    //                                deck,
    //                            }: {
    //     playedCardValue: CardType
    //     card: Card
    //     deck: Deck
    // }): void {
    //     MultiplayerService.getInstance().broadcast({
    //         type: ServerEvent.OPEN_CARD_VIEW,
    //         data: {
    //             playedCardValue,
    //             card,
    //             deck,
    //         },
    //     }, [])
    // }
    //
    private _checkLastCardIdInteraction(clickedCardId: string): void {
        switch (this.lastCardPlayedId) {
            case CardType.CRYSTAL_BOWL:
                if (
                    this.lastSelectedPlayer.hand[0].value === +clickedCardId
                ) {
                    this.lastSelectedPlayer.eliminate()
                }
                // this._sendCardSelectionEvent(false)
                this.onNextTurn()
                break
            default:
                break
        }
    }
}
