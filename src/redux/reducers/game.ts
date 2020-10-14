import { ActionTypes } from '../actions';
import { InitializeGame } from '../../lib/Game';
import { GameBoardItemType, GameMode } from '../../lib/Map';

/** Holds initial state */
const initialState: GameState = { ...InitializeGame(), runningScore: 0, iteration: 0, simulationMode: false };

const gameReducer = (state: GameState = initialState, action: ReduxAction): GameState => {
    const { items, GhostStore, PacmanStore, pillTimer } = state;
    //SRW add simulationMode
    let { mode, runningScore, iteration, turn, simulationMode } = state;

    let newMove; let i;

    switch (action.type) {

        case ActionTypes.INIT:
            runningScore += PacmanStore.score;
            iteration = (iteration || 0) + 1;
            return { ...InitializeGame(), runningScore, iteration, simulationMode };

        case ActionTypes.RESET:
            runningScore = 0;
            iteration = 0;
            simulationMode = false;
            return { ...InitializeGame(), runningScore, iteration, simulationMode };

        case ActionTypes.SET_ITEMS:
            return { ...state, ...action.payload };

        // SRW
        case ActionTypes.SIMULATE:
            runningScore = 0;
            iteration = 0;
            // simulationMode = true;
            return { ...InitializeGame(), runningScore, iteration, simulationMode: true };

        case ActionTypes.TIC:

            if (mode === GameMode.PLAYING) {

                turn += 1;

                // Move Pacman
                // SRW
                // Split Sim vs. Player-Controlled
                if (simulationMode === true) {
                    newMove = PacmanStore.simulateMove();
                }
                else {
                    newMove = PacmanStore.getNextMove();
                }

                if (newMove) {
                    if (items[newMove.piece.y][newMove.piece.x].type === GameBoardItemType.GHOST && pillTimer.timer === 0) {
                        mode = GameMode.FINISHED;
                        //SRW
                        if (simulationMode === true && iteration! < 99) {
                            runningScore += PacmanStore.score;
                            iteration = (iteration || 0) + 1;
                            return { ...InitializeGame(), runningScore, iteration, simulationMode };
                        }
                    } else {
                        PacmanStore.move(newMove.piece, newMove.direction);
                    }
                } else {
                    PacmanStore.setDirection();
                }

                // Move Ghosts
                if (turn % 2 || (pillTimer.timer === 0)) {
                    for (i = 0; i < GhostStore.length; i += 1) {
                        newMove = GhostStore[i].getNextMove();
                        if (newMove) {
                            if (items[newMove.piece.y][newMove.piece.x].type === GameBoardItemType.PACMAN) {
                                if (pillTimer.timer === 0) {
                                    GhostStore[i].move(newMove.piece, newMove.direction);
                                    mode = GameMode.FINISHED;
                                    //SRW
                                    if (simulationMode === true && iteration! < 100) {
                                        runningScore += PacmanStore.score;
                                        iteration = (iteration || 0) + 1;
                                        return { ...InitializeGame(), runningScore, iteration, simulationMode };
                                    }
                                } else {
                                    GhostStore[i].setDirection();
                                }
                            } else {
                                GhostStore[i].move(newMove.piece, newMove.direction);
                            }
                        } else {
                            GhostStore[i].setDirection();
                        }
                    }
                }

                // Decrement Pill counter
                if (pillTimer.timer > 0) pillTimer.timer -= 1;

            }
            return { ...state, items, mode, turn };

        default:
            return state;
    }
};

export default gameReducer;