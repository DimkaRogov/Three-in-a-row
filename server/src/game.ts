import type { Board, Cell, MoveHint } from "./types"

const ROWS = 6
const COLS = 6
const CELL_TYPES: Cell[] = [1, 2, 3, 4, 5]
const EMPTY = 0
const MAX_BOARD_GENERATION_ATTEMPTS = 100
const MAX_CELL_GENERATION_ATTEMPTS = 30

type InternalCell = Cell | 0
type InternalBoard = InternalCell[][]

interface Position {
  row: number
  col: number
}

interface Triple {
  cells: Position[]
}

const cloneBoard = (board: Board): Board => board.map((row) => [...row])

const toInternal = (board: Board): InternalBoard =>
  board.map((row) => row.map((cell) => cell as InternalCell))

const toBoard = (board: InternalBoard): Board => board as unknown as Board

function generateElement(): Cell {
  const index = Math.floor(Math.random() * CELL_TYPES.length)
  const picked = CELL_TYPES[index]
  if (picked === undefined) {
    throw new Error("CELL_TYPES index out of range")
  }
  return picked
}

function wouldCreateStartingMatch(
  board: InternalBoard,
  row: number,
  col: number,
  value: Cell
): boolean {
  const hasHorizontalMatch =
    col >= 2 && board[row]?.[col - 1] === value && board[row]?.[col - 2] === value
  const hasVerticalMatch =
    row >= 2 && board[row - 1]?.[col] === value && board[row - 2]?.[col] === value

  return hasHorizontalMatch || hasVerticalMatch
}

function generateBoardWithoutStartingMatches(): Board {
  const board: InternalBoard = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => EMPTY)
  )

  for (let row = 0; row < ROWS; row += 1) {
    const rowCells = board[row]
    if (rowCells === undefined) {
      continue
    }

    for (let col = 0; col < COLS; col += 1) {
      let value = generateElement()

      for (
        let attempt = 0;
        attempt < MAX_CELL_GENERATION_ATTEMPTS &&
        wouldCreateStartingMatch(board, row, col, value);
        attempt += 1
      ) {
        value = generateElement()
      }

      if (wouldCreateStartingMatch(board, row, col, value)) {
        const allowedValues = CELL_TYPES.filter(
          (cellType) => !wouldCreateStartingMatch(board, row, col, cellType)
        )
        value = allowedValues[0] ?? value
      }

      rowCells[col] = value
    }
  }

  return toBoard(board)
}

function fallbackPlayableBoard(): Board {
  return [
    [1, 1, 2, 3, 1, 2],
    [2, 3, 1, 2, 3, 1],
    [3, 1, 2, 3, 1, 2],
    [1, 2, 3, 1, 2, 3],
    [2, 3, 1, 2, 3, 1],
    [3, 1, 2, 3, 1, 2],
  ]
}

function generateBoard(): Board {
  for (let attempt = 0; attempt < MAX_BOARD_GENERATION_ATTEMPTS; attempt += 1) {
    const board = generateBoardWithoutStartingMatches()
    if (findAllTriples(board).length === 0 && findValidMove(board) !== null) {
      return board
    }
  }

  return fallbackPlayableBoard()
}

function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  const rowDiff = Math.abs(r1 - r2)
  const colDiff = Math.abs(c1 - c2)
  return rowDiff + colDiff === 1
}

function swapCells(
  board: Board,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): Board {
  const nextBoard = cloneBoard(board)

  if (!isAdjacent(r1, c1, r2, c2)) {
    return nextBoard
  }

  const rowA = nextBoard[r1]
  const rowB = nextBoard[r2]
  if (rowA === undefined || rowB === undefined) {
    return nextBoard
  }

  const cellA = rowA[c1]
  const cellB = rowB[c2]
  if (cellA === undefined || cellB === undefined) {
    return nextBoard
  }

  rowA[c1] = cellB
  rowB[c2] = cellA
  return nextBoard
}

function findHorizontalTriples(board: Board): Triple[] {
  const triples: Triple[] = []

  for (let row = 0; row < board.length; row += 1) {
    const rowCells = board[row]
    if (rowCells === undefined) {
      continue
    }
    let col = 0
    while (col < rowCells.length) {
      const value = rowCells[col]
      let end = col + 1
      while (end < rowCells.length && rowCells[end] === value) {
        end += 1
      }

      if (value !== undefined && end - col >= 3) {
        triples.push({
          cells: Array.from({ length: end - col }, (_, i) => ({
            row,
            col: col + i,
          })),
        })
      }

      col = end
    }
  }

  return triples
}

function findVerticalTriples(board: Board): Triple[] {
  const triples: Triple[] = []
  const rows = board.length
  const cols = board[0]?.length ?? 0

  for (let col = 0; col < cols; col += 1) {
    let row = 0
    while (row < rows) {
      const value = board[row]?.[col]
      let end = row + 1
      while (end < rows && board[end]?.[col] === value) {
        end += 1
      }

      if (value !== undefined && end - row >= 3) {
        triples.push({
          cells: Array.from({ length: end - row }, (_, i) => ({
            row: row + i,
            col,
          })),
        })
      }

      row = end
    }
  }

  return triples
}

function findAllTriples(board: Board): Triple[] {
  return [...findHorizontalTriples(board), ...findVerticalTriples(board)]
}

function collectCellsToRemove(board: Board): Position[] {
  const triples = findAllTriples(board)
  const unique = new Set<string>()
  const cells: Position[] = []

  for (const triple of triples) {
    for (const cell of triple.cells) {
      const key = `${cell.row}:${cell.col}`
      if (!unique.has(key)) {
        unique.add(key)
        cells.push(cell)
      }
    }
  }

  return cells
}

function removeAllTriples(board: Board): Board {
  const internalBoard = toInternal(board)
  const cellsToRemove = collectCellsToRemove(board)

  if (cellsToRemove.length === 0) {
    return cloneBoard(board)
  }

  for (const { row, col } of cellsToRemove) {
    const rowCells = internalBoard[row]
    if (rowCells === undefined) {
      continue
    }
    rowCells[col] = EMPTY
  }

  const rows = internalBoard.length
  const cols = internalBoard[0]?.length ?? 0

  for (let col = 0; col < cols; col += 1) {
    let writeRow = rows - 1

    for (let row = rows - 1; row >= 0; row -= 1) {
      const rowCells = internalBoard[row]
      if (rowCells === undefined) {
        continue
      }
      const value = rowCells[col]
      if (value !== EMPTY && value !== undefined) {
        const targetRow = internalBoard[writeRow]
        if (targetRow !== undefined) {
          targetRow[col] = value
        }
        writeRow -= 1
      }
    }

    for (let row = writeRow; row >= 0; row -= 1) {
      const targetRow = internalBoard[row]
      if (targetRow !== undefined) {
        targetRow[col] = EMPTY
      }
    }
  }

  return toBoard(internalBoard)
}

function addNewElements(board: Board): Board {
  const internalBoard = toInternal(board)

  for (let row = 0; row < internalBoard.length; row += 1) {
    const rowCells = internalBoard[row]
    if (rowCells === undefined) {
      continue
    }
    for (let col = 0; col < rowCells.length; col += 1) {
      if (rowCells[col] === EMPTY) {
        rowCells[col] = generateElement()
      }
    }
  }

  return toBoard(internalBoard)
}

function calculateScore(board: Board): number {
  const removedCellsCount = collectCellsToRemove(board).length
  return removedCellsCount * 10
}

function findValidMove(board: Board): MoveHint | null {
  const rows = board.length
  const cols = board[0]?.length ?? 0

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (
        col + 1 < cols &&
        collectCellsToRemove(swapCells(board, row, col, row, col + 1)).length >
          0
      ) {
        return { row1: row, col1: col, row2: row, col2: col + 1 }
      }

      if (
        row + 1 < rows &&
        collectCellsToRemove(swapCells(board, row, col, row + 1, col)).length >
          0
      ) {
        return { row1: row, col1: col, row2: row + 1, col2: col }
      }
    }
  }

  return null
}

function hasAnyValidMove(board: Board): boolean {
  return findValidMove(board) !== null
}

export = {
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
  findValidMove,
  hasAnyValidMove,
}
