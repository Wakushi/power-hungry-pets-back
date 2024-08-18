import {Card} from "../lib/types/card.type"
import {User} from "../lib/types/user.type"

export class Player {
    id: string
    name: string
    hand: Card[] = []
    discards: Card[] = []
    eliminated = false
    protected = false

    constructor(user: User) {
        this.id = user.id
        this.name = user.name
    }

    public eliminate(): void {
        this.eliminated = true
    }

    public discard(cardValue: number): void {
        const cardIndex = this.hand.findIndex((c) => c.value === cardValue)
        if (cardIndex !== -1) {
            const discarded = this.hand.splice(cardIndex, 1)[0]
            this.discards.push(discarded)
            // sendRenderGameMatEvent()
        }
    }
}
