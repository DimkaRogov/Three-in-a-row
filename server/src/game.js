"use strict";
const ROWS = 6;
const COLS = 6;
const CELL_TYPES = [1, 2, 3];
const EMPTY = 0;
const cloneBoard = (board) => board.map((row) => [...row]);
const toInternal = (board) => board.map((row) => row.map((cell) => cell));
const toBoard = (board) => board;
function generateElement() {
    const index = Math.floor(Math.random() * CELL_TYPES.length);
    const picked = CELL_TYPES[index];
    if (picked === undefined) {
        throw new Error("CELL_TYPES index out of range");
    }
    return picked;
}
function generateBoard() {
    const board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => generateElement()));
    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            const rowCells = board[row];
            if (rowCells === undefined) {
                continue;
            }
            while ((col >= 2 &&
                rowCells[col] === rowCells[col - 1] &&
                rowCells[col] === rowCells[col - 2]) ||
                (row >= 2 &&
                    rowCells[col] === board[row - 1]?.[col] &&
                    rowCells[col] === board[row - 2]?.[col])) {
                rowCells[col] = generateElement();
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
    const rowA = nextBoard[r1];
    const rowB = nextBoard[r2];
    if (rowA === undefined || rowB === undefined) {
        return nextBoard;
    }
    const cellA = rowA[c1];
    const cellB = rowB[c2];
    if (cellA === undefined || cellB === undefined) {
        return nextBoard;
    }
    rowA[c1] = cellB;
    rowB[c2] = cellA;
    return nextBoard;
}
function findHorizontalTriples(board) {
    const triples = [];
    for (let row = 0; row < board.length; row += 1) {
        const rowCells = board[row];
        if (rowCells === undefined) {
            continue;
        }
        let col = 0;
        while (col < rowCells.length) {
            const value = rowCells[col];
            let end = col + 1;
            while (end < rowCells.length && rowCells[end] === value) {
                end += 1;
            }
            if (value !== undefined && end - col >= 3) {
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
            const value = board[row]?.[col];
            let end = row + 1;
            while (end < rows && board[end]?.[col] === value) {
                end += 1;
            }
            if (value !== undefined && end - row >= 3) {
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
        const rowCells = internalBoard[row];
        if (rowCells === undefined) {
            continue;
        }
        rowCells[col] = EMPTY;
    }
    const rows = internalBoard.length;
    const cols = internalBoard[0]?.length ?? 0;
    for (let col = 0; col < cols; col += 1) {
        let writeRow = rows - 1;
        for (let row = rows - 1; row >= 0; row -= 1) {
            const rowCells = internalBoard[row];
            if (rowCells === undefined) {
                continue;
            }
            const value = rowCells[col];
            if (value !== EMPTY && value !== undefined) {
                const targetRow = internalBoard[writeRow];
                if (targetRow !== undefined) {
                    targetRow[col] = value;
                }
                writeRow -= 1;
            }
        }
        for (let row = writeRow; row >= 0; row -= 1) {
            const targetRow = internalBoard[row];
            if (targetRow !== undefined) {
                targetRow[col] = EMPTY;
            }
        }
    }
    return toBoard(internalBoard);
}
function addNewElements(board) {
    const internalBoard = toInternal(board);
    for (let row = 0; row < internalBoard.length; row += 1) {
        const rowCells = internalBoard[row];
        if (rowCells === undefined) {
            continue;
        }
        for (let col = 0; col < rowCells.length; col += 1) {
            if (rowCells[col] === EMPTY) {
                rowCells[col] = generateElement();
            }
        }
    }
    return toBoard(internalBoard);
}
function calculateScore(board) {
    const removedCellsCount = collectCellsToRemove(board).length;
    return removedCellsCount * 10;
}
module.exports = {
    cloneBoard,
    generateElement,
    generateBoard,
    isAdjacent,
    swapCells,
    findHorizontalTriples,
    findVerticalTriples,
    findAllTriples,
    collectCellsToRemove,
    removeAllTriples,
    addNewElements,
    calculateScore,
};
//# sourceMappingURL=game.js.map