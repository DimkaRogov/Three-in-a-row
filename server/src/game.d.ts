import type { Board, Cell } from "./types";
interface Position {
    row: number;
    col: number;
}
interface Triple {
    cells: Position[];
}
declare function generateElement(): Cell;
declare function generateBoard(): Board;
declare function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean;
declare function swapCells(board: Board, r1: number, c1: number, r2: number, c2: number): Board;
declare function findHorizontalTriples(board: Board): Triple[];
declare function findVerticalTriples(board: Board): Triple[];
declare function findAllTriples(board: Board): Triple[];
declare function collectCellsToRemove(board: Board): Position[];
declare function removeAllTriples(board: Board): Board;
declare function addNewElements(board: Board): Board;
declare function calculateScore(board: Board): number;
declare const _default: {
    cloneBoard: (board: Board) => Board;
    generateElement: typeof generateElement;
    generateBoard: typeof generateBoard;
    isAdjacent: typeof isAdjacent;
    swapCells: typeof swapCells;
    findHorizontalTriples: typeof findHorizontalTriples;
    findVerticalTriples: typeof findVerticalTriples;
    findAllTriples: typeof findAllTriples;
    collectCellsToRemove: typeof collectCellsToRemove;
    removeAllTriples: typeof removeAllTriples;
    addNewElements: typeof addNewElements;
    calculateScore: typeof calculateScore;
};
export = _default;
//# sourceMappingURL=game.d.ts.map