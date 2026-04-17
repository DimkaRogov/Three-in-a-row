export type Cell = 1 | 2 | 3
export type Row = Cell[]
export type Board = Row[]

export interface GameState {
  board: Board
  score: number
}

export interface MoveRequest {
  row1: number
  col1: number
  row2: number
  col2: number
}
