export type Cell = 1 | 2 | 3 | 4 | 5
export type Row = Cell[]
export type Board = Row[]

export interface GameState {
  board: Board
  score: number
  movesLeft: number
}

export interface BoardResponse extends GameState {
  gameOver: boolean
  hint?: MoveHint | null
}

export interface MoveRequest {
  row1: number
  col1: number
  row2: number
  col2: number
}

export interface MoveHint {
  row1: number
  col1: number
  row2: number
  col2: number
}

export interface MoveAnimationRound {
  matched: { row: number; col: number }[]
  boardAfter: Board
  multiplier: number
  roundScore: number
}

export interface MoveResponse {
  board: Board
  score: number
  movesLeft: number
  gameOver: boolean
  reverted: boolean
  hint?: MoveHint | null
  animation: {
    boardAfterSwap: Board
    rounds: MoveAnimationRound[]
  }
}
