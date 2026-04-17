import express = require("express")
import game = require("./game")
import type { Board, MoveRequest } from "./types"

const router = express.Router()
const { collectCellsToRemove, generateBoard, swapCells } = game

let board: Board = generateBoard()
let score = 0

router.get("/api/board", (_req, res) => {
  board = generateBoard()
  score = 0

  res.json({ board })
})

router.post("/api/move", (req, res) => {
  const { row1, col1, row2, col2 } = req.body as MoveRequest

  const nextBoard = swapCells(board, row1, col1, row2, col2)
  const matched = collectCellsToRemove(nextBoard)
  const moveScore = matched.length * 10

  board = nextBoard
  score += moveScore

  res.json({ board, score, matched })
})

router.get("/api/score", (_req, res) => {
  res.json({ score })
})

export = router
