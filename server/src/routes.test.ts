import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import createGameRouter from "./routes"
import type {
  Board,
  BoardResponse,
  GameState,
  MoveHint,
  MoveResponse,
} from "./types"

const MOVE_LIMIT = 25

function createTestApp(initialState?: GameState): express.Express {
  const app = express()
  app.use(express.json())
  app.use(createGameRouter({ initialState }))
  return app
}

function requireHint(response: BoardResponse): MoveHint {
  if (response.hint === null || response.hint === undefined) {
    throw new Error("Expected response to include a valid move hint")
  }

  return response.hint
}

describe("API routes", () => {
  it("creates a new game", async () => {
    const app = createTestApp()

    const response = await request(app).post("/api/new-game").expect(200)
    const body = response.body as BoardResponse

    expect(body.board).toHaveLength(6)
    expect(body.board.every((row) => row.length === 6)).toBe(true)
    expect(body.score).toBe(0)
    expect(body.movesLeft).toBe(MOVE_LIMIT)
    expect(body.gameOver).toBe(false)
    expect(body.hint).not.toBeNull()
  })

  it("applies a valid move", async () => {
    const app = createTestApp()

    const newGameResponse = await request(app).post("/api/new-game").expect(200)
    const newGame = newGameResponse.body as BoardResponse
    const hint = requireHint(newGame)

    const moveResponse = await request(app)
      .post("/api/move")
      .send(hint)
      .expect(200)
    const move = moveResponse.body as MoveResponse

    expect(move.reverted).toBe(false)
    expect(move.score).toBeGreaterThan(0)
    expect(move.movesLeft).toBe(newGame.movesLeft - 1)
    expect(move.animation.rounds.length).toBeGreaterThan(0)
  })

  it("rejects an invalid move body", async () => {
    const app = createTestApp()

    const response = await request(app)
      .post("/api/move")
      .send({ row1: 0, col1: 0 })
      .expect(400)

    expect(response.body).toEqual({ error: "Missing or null row2" })
  })

  it("returns 409 after game over", async () => {
    const deadBoard: Board = [
      [1, 2],
      [3, 1],
    ]
    const app = createTestApp({
      board: deadBoard,
      score: 0,
      movesLeft: MOVE_LIMIT,
    })

    const response = await request(app)
      .post("/api/move")
      .send({ row1: 0, col1: 0, row2: 0, col2: 1 })
      .expect(409)

    expect(response.body).toEqual({
      error: "Game is over. Start a new game.",
    })
  })

  it("ends the game when the move limit is reached", async () => {
    const board: Board = [
      [1, 1, 2, 3, 1, 2],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
      [1, 2, 3, 1, 2, 3],
      [2, 3, 1, 2, 3, 1],
      [3, 1, 2, 3, 1, 2],
    ]
    const app = createTestApp({ board, score: 0, movesLeft: 1 })

    const response = await request(app)
      .post("/api/move")
      .send({ row1: 0, col1: 2, row2: 1, col2: 2 })
      .expect(200)
    const move = response.body as MoveResponse

    expect(move.reverted).toBe(false)
    expect(move.movesLeft).toBe(0)
    expect(move.gameOver).toBe(true)
    expect(move.hint).toBeNull()
  })

  it("documents that one API instance shares game state between requests", async () => {
    const app = createTestApp()
    const firstClient = request(app)
    const secondClient = request(app)

    const newGameResponse = await firstClient.post("/api/new-game").expect(200)
    const newGame = newGameResponse.body as BoardResponse
    const hint = requireHint(newGame)

    await firstClient.post("/api/move").send(hint).expect(200)
    const scoredResponse = await firstClient.get("/api/score").expect(200)
    expect(scoredResponse.body).toEqual({ score: expect.any(Number) })
    expect(scoredResponse.body.score).toBeGreaterThan(0)

    await secondClient.post("/api/new-game").expect(200)
    const resetResponse = await firstClient.get("/api/score").expect(200)

    expect(resetResponse.body).toEqual({ score: 0 })
  })
})
