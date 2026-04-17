"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElement = generateElement;
exports.generateBoard = generateBoard;
exports.isAdjacent = isAdjacent;
exports.swapCells = swapCells;
exports.findHorizontalTriples = findHorizontalTriples;
exports.findVerticalTriples = findVerticalTriples;
exports.findAllTriples = findAllTriples;
exports.collectCellsToRemove = collectCellsToRemove;
exports.removeAllTriples = removeAllTriples;
exports.addNewElements = addNewElements;
exports.calculateScore = calculateScore;
const types_1 = require("./types");
const ROWS = 6;
const COLS = 6;
const CELL_TYPES = [1, 2, 3];
const EMPTY = 0;
const cloneBoard = (board) => board.map((row) => [...row]);
const toInternal = (board) => board.map((row) => row.map((cell) => cell));
const toBoard = (board) => board;
function generateElement() {
    const index = Math.floor(Math.random() * CELL_TYPES.length);
    return CELL_TYPES[index];
}
function generateBoard() {
    const board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => generateElement()));
    // Avoid initial triples so the board starts in a stable state.
    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            while ((col >= 2 &&
                board[row][col] === board[row][col - 1] &&
                board[row][col] === board[row][col - 2]) ||
                (row >= 2 &&
                    board[row][col] === board[row - 1][col] &&
                    board[row][col] === board[row - 2][col])) {
                board[row][col] = generateElement();
            }
        }
    }
    return board;
}
function isAdjacent(r1, c1, r2, c2) {
    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);
    return rowDiff + colDiff === 1;
}
function swapCells(board, r1, c1, r2, c2) {
    const nextBoard = cloneBoard(board);
    if (!isAdjacent(r1, c1, r2, c2)) {
        return nextBoard;
    }
    ;
    [nextBoard[r1][c1], nextBoard[r2][c2]] = [nextBoard[r2][c2], nextBoard[r1][c1]];
    return nextBoard;
}
function findHorizontalTriples(board) {
    const triples = [];
    for (let row = 0; row < board.length; row += 1) {
        let col = 0;
        while (col < board[row].length) {
            const value = board[row][col];
            let end = col + 1;
            while (end < board[row].length && board[row][end] === value) {
                end += 1;
            }
            if (end - col >= 3) {
                triples.push({
                    cells: Array.from({ length: end - col }, (_, i) => ({ row, col: col + i })),
                });
            }
            col = end;
        }
    }
    return triples;
}
function findVerticalTriples(board) {
    const triples = [];
    const rows = board.length;
    const cols = board[0]?.length ?? 0;
    for (let col = 0; col < cols; col += 1) {
        let row = 0;
        while (row < rows) {
            const value = board[row][col];
            let end = row + 1;
            while (end < rows && board[end][col] === value) {
                end += 1;
            }
            if (end - row >= 3) {
                triples.push({
                    cells: Array.from({ length: end - row }, (_, i) => ({ row: row + i, col })),
                });
            }
            row = end;
        }
    }
    return triples;
}
function findAllTriples(board) {
    return [...findHorizontalTriples(board), ...findVerticalTriples(board)];
}
function collectCellsToRemove(board) {
    const triples = findAllTriples(board);
    const unique = new Set();
    const cells = [];
    for (const triple of triples) {
        for (const cell of triple.cells) {
            const key = `${cell.row}:${cell.col}`;
            if (!unique.has(key)) {
                unique.add(key);
                cells.push(cell);
            }
        }
    }
    return cells;
}
function removeAllTriples(board) {
    const internalBoard = toInternal(board);
    const cellsToRemove = collectCellsToRemove(board);
    if (cellsToRemove.length === 0) {
        return cloneBoard(board);
    }
    for (const { row, col } of cellsToRemove) {
        internalBoard[row][col] = EMPTY;
    }
    const rows = internalBoard.length;
    const cols = internalBoard[0]?.length ?? 0;
    for (let col = 0; col < cols; col += 1) {
        let writeRow = rows - 1;
        for (let row = rows - 1; row >= 0; row -= 1) {
            const value = internalBoard[row][col];
            if (value !== EMPTY) {
                internalBoard[writeRow][col] = value;
                writeRow -= 1;
            }
        }
        for (let row = writeRow; row >= 0; row -= 1) {
            internalBoard[row][col] = EMPTY;
        }
    }
    return toBoard(internalBoard);
}
function addNewElements(board) {
    const internalBoard = toInternal(board);
    for (let row = 0; row < internalBoard.length; row += 1) {
        for (let col = 0; col < (internalBoard[row]?.length ?? 0); col += 1) {
            if (internalBoard[row][col] === EMPTY) {
                internalBoard[row][col] = generateElement();
            }
        }
    }
    return toBoard(internalBoard);
}
function calculateScore(board) {
    const removedCellsCount = collectCellsToRemove(board).length;
    return removedCellsCount * 10;
}
//# sourceMappingURL=game.js.map