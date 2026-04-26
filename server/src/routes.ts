import express = require("express")
import game from "./game"
import type {
  Board,
  BoardResponse,
  GameState,
  MoveAnimationRound,
  MoveRequest,
  MoveResponse,
} from "./types"

const {
  addNewElements,
  calculateScore,
  cloneBoard,
  collectCellsToRemove,
  findValidMove,
  generateBoard,
  hasAnyValidMove,
  removeAllTriples,
  swapCells,
} = game

const BOARD_SIZE = 6
const MOVE_LIMIT = 25

interface CreateGameRouterOptions {
  initialState?: GameState
}

function isInRange(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < BOARD_SIZE
}

function createGameRouter(
  options: CreateGameRouterOptions = {}
): express.Router {
  const router = express.Router()
  let board: Board = options.initialState
    ? cloneBoard(options.initialState.board)
    : generateBoard()
  let score = options.initialState?.score ?? 0
  let movesLeft = options.initialState?.movesLeft ?? MOVE_LIMIT

  function getCurrentBoardResponse(): BoardResponse {
    const hint = movesLeft > 0 ? findValidMove(board) : null

    return {
      board,
      score,
      movesLeft,
      gameOver: movesLeft <= 0 || hint === null,
      hint,
    }
  }

  router.get("/api/health", (_req, res) => {
    res.json({ status: "ok" })
  })

  router.get("/api/board", (_req, res) => {
    res.json(getCurrentBoardResponse())
  })

  router.post("/api/new-game", (_req, res) => {
    board = generateBoard()
    score = 0
    movesLeft = MOVE_LIMIT

    res.json(getCurrentBoardResponse())
  })

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

    if (movesLeft <= 0 || !hasAnyValidMove(board)) {
      return res.status(409).json({ error: "Game is over. Start a new game." })
    }

    const preSwapBoard = cloneBoard(board)
    let workingBoard = swapCells(board, r1, c1, r2, c2)
    const boardAfterSwap = cloneBoard(workingBoard)
    const initialMatches = collectCellsToRemove(workingBoard)

    if (initialMatches.length === 0) {
      const hint = findValidMove(preSwapBoard)
      const response: MoveResponse = {
        board: preSwapBoard,
        score,
        movesLeft,
        gameOver: hint === null,
        reverted: true,
        hint,
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
    movesLeft = Math.max(0, movesLeft - 1)
    const hint = movesLeft > 0 ? findValidMove(board) : null
    const gameOver = movesLeft <= 0 || hint === null

    const response: MoveResponse = {
      board,
      score,
      movesLeft,
      gameOver,
      reverted: false,
      hint,
      animation: { boardAfterSwap, rounds },
    }

    res.json(response)
  })

  router.get("/api/score", (_req, res) => {
    res.json({ score })
  })

  return router
}

export = createGameRouter
