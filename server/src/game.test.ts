import { describe, expect, it } from "vitest"
import game from "./game"
import type { Board } from "./types"

const {
  calculateScore,
  collectCellsToRemove,
  findAllTriples,
  generateBoard,
  removeAllTriples,
  swapCells,
} = game

describe("game logic", () => {
  it("generateBoard creates 6x6 board", () => {
    const board = generateBoard()
    expect(board).toHaveLength(6)
    expect(board.every((row: number[]) => row.length === 6)).toBe(true)
  })

  it("generateBoard has no initial triples", () => {
    for (let i = 0; i < 25; i += 1) {
      const board = generateBoard()
      expect(findAllTriples(board)).toHaveLength(0)
    }
  })

  it("swapCells swaps adjacent cells", () => {
    const board: Board = [
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
    ]

    const swapped = swapCells(board, 0, 0, 0, 1)
    expect(swapped[0]?.[0]).toBe(2)
    expect(swapped[0]?.[1]).toBe(1)
  })

  it("swapCells ignores non-adjacent swap", () => {
    const board: Board = [
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
    ]

    const swapped = swapCells(board, 0, 0, 2, 2)
    expect(swapped).toEqual(board)
  })

  it("collectCellsToRemove finds horizontal triples", () => {
    const board: Board = [
      [1, 1, 1, 2, 3, 2],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
    ]

    expect(collectCellsToRemove(board)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ])
  })

  it("collectCellsToRemove finds vertical triples", () => {
    const board: Board = [
      [1, 2, 3, 1, 2, 3],
      [1, 3, 1, 2, 3, 1],
      [1, 1, 2, 3, 1, 2],
      [2, 2, 3, 1, 2, 3],
      [3, 3, 1, 2, 3, 1],
      [2, 1, 2, 3, 1, 2],
    ]

    expect(collectCellsToRemove(board)).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ])
  })

  it("collectCellsToRemove deduplicates intersecting cells", () => {
    const board: Board = [
      [2, 1, 3, 1, 2, 3],
      [1, 1, 1, 2, 3, 1],
      [2, 1, 2, 3, 1, 2],
      [3, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
    ]

    const cells = collectCellsToRemove(board)
    const uniqueSize = new Set(
      cells.map(
        (cell: { row: number; col: number }) => `${cell.row}:${cell.col}`
      )
    ).size
    expect(cells.length).toBe(uniqueSize)
    expect(cells).toContainEqual({ row: 1, col: 1 })
  })

  it("removeAllTriples clears and collapses columns", () => {
    const board: Board = [
      [1, 1, 1, 2, 3, 2],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
    ]

    const next = removeAllTriples(board)
    expect(next[0]?.[0]).toBe(0)
    expect(next[5]?.[0]).toBe(3)
  })

  it("calculateScore returns 10 points per removed cell", () => {
    const board: Board = [
      [1, 1, 1, 2, 3, 2],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
    ]
    expect(calculateScore(board)).toBe(30)
  })
})
