import { Board, Cell } from "./types";
export interface Position {
    row: number;
    col: number;
}
export interface Triple {
    cells: Position[];
}
export declare function generateElement(): Cell;
export declare function generateBoard(): Board;
export declare function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean;
export declare function swapCells(board: Board, r1: number, c1: number, r2: number, c2: number): Board;
export declare function findHorizontalTriples(board: Board): Triple[];
export declare function findVerticalTriples(board: Board): Triple[];
export declare function findAllTriples(board: Board): Triple[];
export declare function collectCellsToRemove(board: Board): Position[];
export declare function removeAllTriples(board: Board): Board;
export declare function addNewElements(board: Board): Board;
export declare function calculateScore(board: Board): number;
//# sourceMappingURL=game.d.ts.map