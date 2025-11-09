/**
 * API Parity Tests: Game vs ChessPGN
 *
 * Ensures that Game instances from Cursor return identical results
 * to ChessPGN instances for the same position.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  createCursorForTesting,
  createMatchingChessPgn,
  compareMovesResults,
  compareGameState,
} from './testHelpers'

describe('Game vs ChessPGN API Parity', () => {
  const pgnPath = path.join(__dirname, 'pgn', 'wcup25.pgn')
  const pgn = fs.readFileSync(pgnPath, 'utf8')

  describe('moves() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        // Compare default moves()
        expect(compareMovesResults(game, chess)).toBe(true)

        // Compare verbose moves()
        expect(compareMovesResults(game, chess, { verbose: true })).toBe(true)
      }
    })
  })

  describe('isCheckmate() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(game.isCheckmate()).toBe(chess.isCheckmate())
      }
    })
  })

  describe('isCheck() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(game.isCheck()).toBe(chess.isCheck())
      }
    })
  })

  describe('isStalemate() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(game.isStalemate()).toBe(chess.isStalemate())
      }
    })
  })

  describe('isDraw() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(game.isDraw()).toBe(chess.isDraw())
      }
    })
  })

  describe('isGameOver() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(game.isGameOver()).toBe(chess.isGameOver())
      }
    })
  })

  describe('fen() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(game.fen()).toBe(chess.fen())
      }
    })
  })

  describe('All game state methods together', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        const comparison = compareGameState(game, chess)

        expect(comparison.isCheckmate).toBe(true)
        expect(comparison.isCheck).toBe(true)
        expect(comparison.isStalemate).toBe(true)
        expect(comparison.isDraw).toBe(true)
        expect(comparison.isGameOver).toBe(true)
        expect(comparison.fen).toBe(true)
      }
    })
  })

  describe('undo() and move() methods', () => {
    it('should undo and redo moves identically for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        // Get initial FEN - should be the same
        const gameFen1 = game.fen()
        const chessFen1 = chess.fen()
        expect(gameFen1).toBe(chessFen1)

        // Undo a move from both
        const gameUndone = game.undo()
        const chessUndone = chess.undo()

        if (gameUndone === null) {
          continue // No moves to undo
        }

        expect(chessUndone).not.toBeNull()
        if (!chessUndone) continue

        // Verify both undid the same move
        expect(gameUndone.san).toBe(chessUndone.san)

        // Verify both are at the same position after undo
        expect(game.fen()).toBe(chess.fen())

        // Redo the move on both
        const gameMoveResult = game.move(gameUndone.san)
        const chessMoveResult = chess.move(chessUndone.san)

        expect(gameMoveResult.san).toBe(gameUndone.san)
        expect(chessMoveResult.san).toBe(chessUndone.san)

        // Get final FEN - should match initial for both
        const gameFen2 = game.fen()
        const chessFen2 = chess.fen()
        expect(gameFen2).toBe(gameFen1)
        expect(chessFen2).toBe(chessFen1)
        expect(gameFen2).toBe(chessFen2)
      }
    })
  })
})
