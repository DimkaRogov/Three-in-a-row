"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const game_1 = require("./game");
const types_1 = require("./types");
const router = express.Router();
let board = (0, game_1.generateBoard)();
let score = 0;
router.get("/api/board", (_req, res) => {
    board = (0, game_1.generateBoard)();
    score = 0;
    res.json({ board });
});
router.post("/api/move", (req, res) => {
    const { row1, col1, row2, col2 } = req.body;
    const nextBoard = (0, game_1.swapCells)(board, row1, col1, row2, col2);
    const matched = (0, game_1.collectCellsToRemove)(nextBoard);
    const moveScore = matched.length * 10;
    board = nextBoard;
    score += moveScore;
    res.json({ board, score, matched });
});
router.get("/api/score", (_req, res) => {
    res.json({ score });
});
exports.default = router;
//# sourceMappingURL=routes.js.map