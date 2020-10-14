export enum ActionTypes {
    SET_ITEMS = 0,
    TIC = 1,
    INIT = 2,
    RESET = 3,
    //SRW add simulate to ActionTypes
    SIMULATE = 4
}

export const initGame = () => ({
    type: ActionTypes.INIT,
    payload: {}
});

export const resetScore = () => ({
    type: ActionTypes.RESET,
    payload: {}
});

//SRW export SIMULATE ActionType
export const simulation = () => ({
    type: ActionTypes.SIMULATE,
    payload: {}
});

export const setItems = (items: GameBoardItem[][]) => ({
    type: ActionTypes.SET_ITEMS,
    payload: {
        items
    }
});

export const tic = () => ({
    type: ActionTypes.TIC,
    payload: {}
});