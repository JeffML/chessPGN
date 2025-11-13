/**
 * API Parity Tests: Game vs ChessPGN
 *
 * Ensures that Game instances from Cursor return identical results
 * to ChessPGN instances for the same position.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import type { Square } from '../src/types'
import {
  createCursorForTesting,
  createMatchingChessPgn,
  compareMovesResults,
  compareGameState,
  compareFindPieceResults,
  compareGetResults,
  compareHistoryResults,
  compareHeadersResults,
  compareCommentsResults,
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

  describe('findPiece() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        /* Test finding various pieces */
        const piecesToFind = [
          { type: 'p' as const, color: 'w' as const },
          { type: 'p' as const, color: 'b' as const },
          { type: 'n' as const, color: 'w' as const },
          { type: 'n' as const, color: 'b' as const },
          { type: 'b' as const, color: 'w' as const },
          { type: 'b' as const, color: 'b' as const },
          { type: 'r' as const, color: 'w' as const },
          { type: 'r' as const, color: 'b' as const },
          { type: 'q' as const, color: 'w' as const },
          { type: 'q' as const, color: 'b' as const },
          { type: 'k' as const, color: 'w' as const },
          { type: 'k' as const, color: 'b' as const },
        ]

        for (const piece of piecesToFind) {
          expect(compareFindPieceResults(game, chess, piece)).toBe(true)
        }
      }
    })
  })

  describe('get() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        const squares: Square[] = [
          'a1',
          'b1',
          'c1',
          'd1',
          'e1',
          'f1',
          'g1',
          'h1',
          'a2',
          'b2',
          'c2',
          'd2',
          'e2',
          'f2',
          'g2',
          'h2',
          'a3',
          'b3',
          'c3',
          'd3',
          'e3',
          'f3',
          'g3',
          'h3',
          'a4',
          'b4',
          'c4',
          'd4',
          'e4',
          'f4',
          'g4',
          'h4',
          'a5',
          'b5',
          'c5',
          'd5',
          'e5',
          'f5',
          'g5',
          'h5',
          'a6',
          'b6',
          'c6',
          'd6',
          'e6',
          'f6',
          'g6',
          'h6',
          'a7',
          'b7',
          'c7',
          'd7',
          'e7',
          'f7',
          'g7',
          'h7',
          'a8',
          'b8',
          'c8',
          'd8',
          'e8',
          'f8',
          'g8',
          'h8',
        ]

        for (const square of squares) {
          expect(compareGetResults(game, chess, square)).toBe(true)
        }
      }
    })
  })

  describe('history() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        // Compare string history
        expect(compareHistoryResults(game, chess)).toBe(true)

        // Compare verbose history
        expect(compareHistoryResults(game, chess, { verbose: true })).toBe(
          true,
        )

        // Compare non-verbose history explicitly
        expect(compareHistoryResults(game, chess, { verbose: false })).toBe(
          true,
        )
      }
    })
  })

  describe('getHeaders() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(compareHeadersResults(game, chess)).toBe(true)
      }
    })
  })

  describe('removeHeader() method', () => {
    it('should behave identically for both implementations', () => {
      const cursor = createCursorForTesting(pgn, 0, 5)

      for (let i = 0; i < 5; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        // Try removing a standard header
        const gameResult1 = game.removeHeader('Event')
        const chessResult1 = chess.removeHeader('Event')
        expect(gameResult1).toBe(chessResult1)

        // Verify headers match after removal
        expect(compareHeadersResults(game, chess)).toBe(true)

        // Try removing a non-existent header
        const gameResult2 = game.removeHeader('NonExistent')
        const chessResult2 = chess.removeHeader('NonExistent')
        expect(gameResult2).toBe(chessResult2)
      }
    })
  })

  describe('getComments() method', () => {
    it('should return identical results for 10 games', () => {
      const cursor = createCursorForTesting(pgn, 0, 10)

      for (let i = 0; i < 10; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        expect(compareCommentsResults(game, chess)).toBe(true)
      }
    })
  })

  describe('comment and suffix annotation methods', () => {
    it('should behave identically when setting and getting', () => {
      const cursor = createCursorForTesting(pgn, 0, 5)

      for (let i = 0; i < 5; i++) {
        const game = cursor.next()
        expect(game).not.toBeNull()
        if (!game) break

        const chess = createMatchingChessPgn(game)

        // Set comment on both
        game.setComment('Test comment')
        chess.setComment('Test comment')

        // Get comment from both
        expect(game.getComment()).toBe(chess.getComment())
        expect(game.getComment()).toBe('Test comment')

        // Set suffix annotation on both
        game.setSuffixAnnotation('!!')
        chess.setSuffixAnnotation('!!')

        // Get suffix annotation from both
        expect(game.getSuffixAnnotation()).toBe(chess.getSuffixAnnotation())
        expect(game.getSuffixAnnotation()).toBe('!!')

        // Compare all comments
        expect(compareCommentsResults(game, chess)).toBe(true)

        // Remove suffix annotation
        const gameRemoved = game.removeSuffixAnnotation()
        const chessRemoved = chess.removeSuffixAnnotation()
        expect(gameRemoved).toBe(chessRemoved)
        expect(gameRemoved).toBe('!!')

        // Verify suffix is removed
        expect(game.getSuffixAnnotation()).toBe(chess.getSuffixAnnotation())
        expect(game.getSuffixAnnotation()).toBeUndefined()
      }
    })
  })
})
