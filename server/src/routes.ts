import express = require("express")
import game = require("./game")
import type { Board, MoveRequest } from "./types"

const router = express.Router()
const {
  addNewElements,
  cloneBoard,
  collectCellsToRemove,
  generateBoard,
  removeAllTriples,
  swapCells,
} = game

let board: Board = generateBoard()
let score = 0

router.get("/api/board", (_req, res) => {
  board = generateBoard()
  score = 0

  res.json({ board })
})

router.post("/api/move", (req, res) => {
  const { row1, col1, row2, col2 } = req.body as MoveRequest

  let workingBoard = swapCells(board, row1, col1, row2, col2)
  const boardAfterSwap = cloneBoard(workingBoard)
  let gainedThisMove = 0

  const rounds: { matched: { row: number; col: number }[]; boardAfter: Board }[] = []

  while (true) {
    const matched = collectCellsToRemove(workingBoard)
    if (matched.length === 0) {
      break
    }
    gainedThisMove += matched.length * 10
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
