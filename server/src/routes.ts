import express = require("express")
import game = require("./game")
import type {
  Board,
  BoardResponse,
  MoveAnimationRound,
  MoveRequest,
  MoveResponse,
} from "./types"

const router = express.Router()
const {
  addNewElements,
  calculateScore,
  cloneBoard,
  collectCellsToRemove,
  generateBoard,
  hasAnyValidMove,
  removeAllTriples,
  swapCells,
} = game

const BOARD_SIZE = 6

let board: Board = generateBoard()
let score = 0

router.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

router.get("/api/board", (_req, res) => {
  const response: BoardResponse = {
    board,
    score,
    gameOver: !hasAnyValidMove(board),
  }

  res.json(response)
})

router.post("/api/new-game", (_req, res) => {
  board = generateBoard()
  score = 0

  const response: BoardResponse = {
    board,
    score,
    gameOver: !hasAnyValidMove(board),
  }

  res.json(response)
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

  if (!hasAnyValidMove(board)) {
    return res.status(409).json({ error: "Game is over. Start a new game." })
  }

  const preSwapBoard = cloneBoard(board)
  let workingBoard = swapCells(board, r1, c1, r2, c2)
  const boardAfterSwap = cloneBoard(workingBoard)
  const initialMatches = collectCellsToRemove(workingBoard)

  if (initialMatches.length === 0) {
    const response: MoveResponse = {
      board: preSwapBoard,
      score,
      gameOver: false,
      reverted: true,
      animation: { boardAfterSwap, rounds: [] },
    }
    return res.json(response)
  }

  let gainedThisMove = 0

  const rounds: MoveAnimationRound[] = []
  let roundIndex = 0

  while (true) {
    const matched = collectCellsToRemove(workingBoard)
    if (matched.length === 0) {
      break
    }
    roundIndex += 1
    const baseScore = calculateScore(workingBoard)
    const roundScore = baseScore * roundIndex
    gainedThisMove += roundScore
    workingBoard = addNewElements(removeAllTriples(workingBoard))
    rounds.push({
      matched,
      boardAfter: cloneBoard(workingBoard),
      multiplier: roundIndex,
      roundScore,
    })
  }

  board = workingBoard
  score += gainedThisMove
  const gameOver = !hasAnyValidMove(board)

  const response: MoveResponse = {
    board,
    score,
    gameOver,
    reverted: false,
    animation: { boardAfterSwap, rounds },
  }

  res.json(response)
})

router.get("/api/score", (_req, res) => {
  res.json({ score })
})

export = router
