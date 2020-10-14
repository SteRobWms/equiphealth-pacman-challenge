import { unwatchFile } from 'fs';
import { GameBoardItemType, KeyToGameDirection, GameDirectionMap, GameDirectionToKeys, GameDirection, pillMax } from '../Map';
import Item from './Item';

class Pacman extends Item implements GameBoardItem {

    type: GameBoardItemType = GameBoardItemType.PACMAN;

    desiredMove: string | false = false;

    score: number = 0;

    // Used to avoid "up" turns on first leg
    firstTurn: boolean = true;

    // These two are used to filter behavior when unable to look behind Pacman, per the rules
    ghostOnYourSix: boolean = false;
    blindSpot: string[] = ["down", "up", "right", "left", "none"]

    constructor(piece: GameBoardPiece, items: GameBoardItem[][], pillTimer: GameBoardItemTimer) {
        super(piece, items, pillTimer);

        // Bind context for callback events
        this.handleKeyPress = this.handleKeyPress.bind(this);

        // Add a listener for keypresses for this object
        window.addEventListener('keypress', this.handleKeyPress, false);

    }

    /**
     * Handle a keypress from the keyboard
     * 
     * @method handleKeyPress
     * @param {KeyboardEvent} e Input event
     */
    handleKeyPress(e: KeyboardEvent): void {

        if (KeyToGameDirection[e.key.toUpperCase()]) {
            this.desiredMove = KeyToGameDirection[e.key.toUpperCase()];
        }
    }

    /**
     * Returns the next move from the keyboard input
     * 
     * @method getNextMove
     * @return {GameBoardItemMove | boolean} Next move
     */
    getNextMove(): GameBoardItemMove | boolean {

        const { moves } = this.piece;

        let move: GameBoardItemMove | false = false;

        // If there is a keyboard move, use it and clear it
        if (this.desiredMove) {
            if (moves[this.desiredMove]) {
                move = { piece: moves[this.desiredMove], direction: GameDirectionMap[this.desiredMove] };
                this.desiredMove = false;
            }
        }

        // Otherwise, continue in the last direction
        if (!move && this.direction !== GameDirection.NONE) {
            const key = GameDirectionToKeys(this.direction);

            if (moves[key]) {
                move = { piece: moves[key], direction: this.direction };
            }
        }

        return move;

    }

    // I used ghost move function as structure for simulateMove(). Both to not "reinvent the wheel" and to maintain consistency in the code base.
    simulateMove(): GameBoardItemMove | boolean {

        // Weigh moves and put in baskets for random selection later
        const { moves } = this.piece;
        const greenMoves: GameBoardItemMoves = {};
        const yellowMoves: GameBoardItemMoves = {};
        const redMoves: GameBoardItemMoves = {};

        // Get my position for comparison to other items' positions later
        let myX = this.piece.x
        let myY = this.piece.y

        // idx is string of direction keys ("up", "down", "left", "right") from moves
        for (const idx in moves) {
            if (idx) {
                const move = moves[idx];

                // Always go down first, to avoid runs ending in 3 tics
                if (this.firstTurn && idx === "down") {
                    this.firstTurn = false;
                    return { piece: move, direction: GameDirectionMap[idx] };
                }

                /** Skip all evaluation for moves behind you, per instructions.
                 *  If !SuperPacman, weigh it as a red move */
                if (idx === this.blindSpot[this.direction]) {
                    redMoves[idx] = move;
                    // If ghost previously marked as on tail and you're now SuperPacman, turn and eat
                    if (this.ghostOnYourSix === true && this.pillTimer.timer > 0) {
                        this.ghostOnYourSix = false;
                        return { piece: move, direction: GameDirectionMap[idx] };
                    }
                }

                // Start more detailed evaluations for open line of sight
                else {
                    let dangerAhead: boolean = false;
                    let pillAhead: boolean = false;
                    let biscuitAhead: boolean = false;
                    let ghostInfo: GameBoardItem | false;
                    let pillInfo: GameBoardItem | false;
                    let biscuitInfo: GameBoardItem | false;
                    // TypeScript finagling. Assigned distances = 100 to avoid number | false typing.
                    let distanceToGhost: number = 100;
                    let distanceToPill: number = 100;
                    let distanceToBiscuit: number = 100;

                    // detailedFindItem is located in src/lib/game/Item.ts
                    if (this.findItem(idx, GameBoardItemType.GHOST)) {
                        ghostInfo = this.detailedFindItem(idx, GameBoardItemType.GHOST)
                        if (ghostInfo !== false) {
                            distanceToGhost = Math.abs(myX - Object(ghostInfo).x) + Math.abs(myY - Object(ghostInfo).y)
                            if (distanceToGhost <= 1) {
                                this.ghostOnYourSix = true;
                            }
                            dangerAhead = true;
                        }
                    };
                    if (this.findItem(idx, GameBoardItemType.PILL)) {
                        pillInfo = this.detailedFindItem(idx, GameBoardItemType.PILL)
                        if (pillInfo !== false) {
                            distanceToPill = Math.abs(myX - Object(pillInfo).x) + Math.abs(myY - Object(pillInfo).y)
                            pillAhead = true;
                        }
                    };
                    if (this.findItem(idx, GameBoardItemType.BISCUIT)) {
                        biscuitInfo = this.detailedFindItem(idx, GameBoardItemType.BISCUIT)
                        if (biscuitInfo !== false) {
                            distanceToBiscuit = Math.abs(myX - Object(biscuitInfo).x) + Math.abs(myY - Object(biscuitInfo).y)
                            biscuitAhead = true;
                        }
                    };

                    /** PILL AHEAD RULES
                     *  Pursue pill 100% of the time if no danger ahead or Pacman can get there before ghost
                     *  Otherwise, scoot! */
                    if (pillAhead === true) {
                        if (dangerAhead === false || (distanceToPill * 2 < distanceToGhost)) {
                            return { piece: move, direction: GameDirectionMap[idx] };
                        }
                    }

                    /** SUPERPACMAN RULES
                     *  Make logic for pursuit of ghost if SuperPacman
                     *  Scared ghosts move once every 2 tics */
                    else if (this.pillTimer.timer > 0 && distanceToGhost * 1.5 <= this.pillTimer.timer) {
                        return { piece: move, direction: GameDirectionMap[idx] };
                    }

                    /** BISCUIT RULES:
                     *  Green queue if biscuit and no danger
                     *  Yellow queue if yes ghosts, but biscuit reachable
                     *  Red queue if ghosts closer than biscuit */

                    else if (biscuitAhead === true) {
                        if (dangerAhead === false) {
                            greenMoves[idx] = move;
                        }
                        else if (distanceToBiscuit * 2 < distanceToGhost) {
                            yellowMoves[idx] = move;
                        }
                        else {
                            redMoves[idx] = move;
                        }
                    }
                    /** NO PILL, NO BISCUIT RULES:
                     *  Yellow queue if no ghosts
                     *  Red queue if ghosts */
                    else if (dangerAhead === false) {
                        yellowMoves[idx] = move;
                    }
                    else {
                        redMoves[idx] = move;
                    }
                }
            }
        }

        /** Extract keys from object with type GameBoardItemMoves, converting to array
         *  1) to escape strong typing and 
         *  2) to allow selection by index */
        const greenMovesIdx = Object.keys(greenMoves);
        const yellowMovesIdx = Object.keys(yellowMoves);
        const redMovesIdx = Object.keys(redMoves);

        /** For each of the new objects created, stairstep down in preference
         *  Select random index within array and use it to fill the return values
         *  return a valid GameBoardItemMove */
        if (greenMovesIdx.length >= 1) {
            const move = Math.floor(Math.random() * greenMovesIdx.length);
            return { piece: greenMoves[greenMovesIdx[move]], direction: GameDirectionMap[greenMovesIdx[move]] };
        }
        else if (yellowMovesIdx.length >= 1) {
            const move = Math.floor(Math.random() * yellowMovesIdx.length);
            return { piece: yellowMoves[yellowMovesIdx[move]], direction: GameDirectionMap[yellowMovesIdx[move]] };
        }
        else {
            const move = Math.floor(Math.random() * redMovesIdx.length);
            return { piece: redMoves[redMovesIdx[move]], direction: GameDirectionMap[redMovesIdx[move]] };
        }

    }

    /**
     * Move Pacman and "eat" the item
     * 
     * @method move
     * @param {GameBoardPiece} piece 
     * @param {GameDirection} direction 
     */
    move(piece: GameBoardPiece, direction: GameDirection): void {

        const item = this.items[piece.y][piece.x];
        if (typeof item !== 'undefined') {
            this.score += item.type;
            switch (item.type) {
                case GameBoardItemType.PILL:
                    this.pillTimer.timer = pillMax;
                    break;
                case GameBoardItemType.GHOST:
                    if (typeof item.gotoTimeout !== 'undefined')
                        item.gotoTimeout();
                    break;
                default: break;
            }
        }
        this.setBackgroundItem({ type: GameBoardItemType.EMPTY });
        this.fillBackgroundItem();

        this.setPiece(piece, direction);
        this.items[piece.y][piece.x] = this;
    }

}

export default Pacman;