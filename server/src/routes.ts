import express = require("express")
import game = require("./game")
import type { Board, MoveRequest } from "./types"

const router = express.Router()
const {
  addNewElements,
  calculateScore,
  cloneBoard,
  collectCellsToRemove,
  generateBoard,
  removeAllTriples,
  swapCells,
} = game

const BOARD_SIZE = 6

let board: Board = generateBoard()
let score = 0

router.get("/api/board", (_req, res) => {
  res.json({ board, score })
})

router.post("/api/new-game", (_req, res) => {
  board = generateBoard()
  score = 0

  res.json({ board, score })
})

function isInRange(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < BOARD_SIZE
}

router.post("/api/move", (req, res) => {
  const body = req.body
  if (body === null || body === undefined || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" })
  }

  const b = body as Record<string, unknown>
  for (const k of ["row1", "col1", "row2", "col2"] as const) {
    if (b[k] === undefined || b[k] === null) {
      return res.status(400).json({ error: `Missing or null ${k}` })
    }
  }
  const { row1, col1, row2, col2 } = body as MoveRequest
  const rawCoords: unknown[] = [row1, col1, row2, col2]
  const nums = rawCoords.map((v) => {
    if (typeof v === "number") {
      return v
    }
    if (typeof v === "string" && v.trim() !== "") {
      return Number(v)
    }
    return NaN
  })
  if (nums.some((n) => !Number.isFinite(n) || !Number.isInteger(n))) {
    return res
      .status(400)
      .json({ error: "row1, col1, row2, col2 must be integers" })
  }
  const [r1, c1, r2, c2] = nums
  if (!isInRange(r1) || !isInRange(c1) || !isInRange(r2) || !isInRange(c2)) {
    return res
      .status(400)
      .json({ error: `row/col must be in [0, ${BOARD_SIZE - 1}]` })
  }

  let workingBoard = swapCells(board, r1, c1, r2, c2)
  const boardAfterSwap = cloneBoard(workingBoard)
  let gainedThisMove = 0

  const rounds: {
    matched: { row: number; col: number }[]
    boardAfter: Board
  }[] = []

  while (true) {
    const matched = collectCellsToRemove(workingBoard)
    if (matched.length === 0) {
      break
    }
    gainedThisMove += calculateScore(workingBoard)
    workingBoard = addNewElements(removeAllTriples(workingBoard))
    rounds.push({ matched, boardAfter: cloneBoard(workingBoard) })
  }

  board = workingBoard
  score += gainedThisMove

  res.json({
    board,
    score,
    animation: { boardAfterSwap, rounds },
  })
})

router.get("/api/score", (_req, res) => {
  res.json({ score })
})

export = router
