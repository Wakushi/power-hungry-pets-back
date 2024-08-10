import { availableCards } from "../lib/data/card-data"
import { shuffleArray } from "../lib/utils"
import { Card } from "../types/card.type"

export class Deck {
  private _cards: Card[] = []
  sideCard!: Card

  constructor() {
    this._init()
  }

  get cards(): Card[] {
    return this._cards
  }

  set cards(cards: Card[]) {
    this._cards = cards
  }

  private _init(): void {
    this._createDeck()
    this.shuffleDeck()
    this._extractRandomSideCard()
  }

  private _createDeck(): void {
    availableCards.forEach(
      ({ title, description, value, amount, color, descColor }) => {
        for (let i = 0; i < amount; i++) {
          this.cards.push({
            id: `${value}-${i}`,
            title,
            description,
            value,
            amount,
            color,
            descColor,
          })
        }
      }
    )
  }

  public shuffleDeck(): void {
    this.cards = shuffleArray(this.cards)
  }

  private _extractRandomSideCard(): void {
    this.sideCard = this.cards.splice(
      Math.floor(Math.random() * this.cards.length),
      1
    )[0]
  }

  public draw(): Card {
    return this.cards.splice(0, 1)[0]
  }

  public insertCardAtIndex(card: Card, index: number): void {
    this.cards.splice(index, 0, card)
  }
}
