/**
 * Tests for Game class public API (moves, move, undo, isCheckmate)
 * Ensures Game instances from Cursor have full functionality
 */

import { describe, it, expect } from 'vitest'
import { Game } from '../src/Game'
import { CursorImpl, indexPgnGames } from '../src/Cursor'
import * as fs from 'fs'
import * as path from 'path'

describe('Game public API', () => {
  describe('moves() method', () => {
    it('should generate legal moves as SAN strings', () => {
      const game = new Game()

      const moves = game.moves()
      expect(moves).toHaveLength(20) // 20 legal moves in starting position
      expect(moves).toContain('e4')
      expect(moves).toContain('Nf3')
    })

    it('should support verbose mode', () => {
      const game = new Game()

      const moves = game.moves({ verbose: true })
      expect(moves).toHaveLength(20)
      expect(moves[0]).toHaveProperty('san')
      expect(moves[0]).toHaveProperty('from')
      expect(moves[0]).toHaveProperty('to')
      expect(moves[0]).toHaveProperty('piece')
    })

    it('should filter by square', () => {
      const game = new Game()

      const moves = game.moves({ square: 'e2' })
      expect(moves).toHaveLength(2) // e3 and e4
      expect(moves).toContain('e3')
      expect(moves).toContain('e4')
    })

    it('should filter by piece', () => {
      const game = new Game()

      const moves = game.moves({ piece: 'n' })
      expect(moves).toHaveLength(4) // Na3, Nc3, Nf3, Nh3
      expect(moves).toContain('Na3')
      expect(moves).toContain('Nc3')
      expect(moves).toContain('Nf3')
      expect(moves).toContain('Nh3')
    })
  })

  describe('move() method', () => {
    it('should accept SAN string', () => {
      const game = new Game()

      const move = game.move('e4')
      expect(move.san).toBe('e4')
      expect(move.from).toBe('e2')
      expect(move.to).toBe('e4')
      expect(move.piece).toBe('p')
    })

    it('should accept move object', () => {
      const game = new Game()

      const move = game.move({ from: 'e2', to: 'e4' })
      expect(move.san).toBe('e4')
      expect(move.from).toBe('e2')
      expect(move.to).toBe('e4')
    })

    it('should throw on invalid move', () => {
      const game = new Game()

      expect(() => game.move('e5')).toThrow('Invalid move')
    })

    it('should record move in history', () => {
      const game = new Game()

      const beforeFen = game.fen()
      game.move('e4')
      game.move('e5')

      const afterFen = game.fen()
      // Position should have changed
      expect(afterFen).not.toBe(beforeFen)
      // Black should be to move
      expect(afterFen.split(' ')[1]).toBe('w') // White moves next
      // Should be move 2
      expect(afterFen.split(' ')[5]).toBe('2')
    })
  })

  describe('undo() method', () => {
    it('should undo last move', () => {
      const game = new Game()

      const beforeFen = game.fen()
      game.move('e4')
      const undone = game.undo()

      expect(undone).not.toBeNull()
      expect(undone?.san).toBe('e4')
      expect(game.fen()).toBe(beforeFen)
    })

    it('should return null when no moves to undo', () => {
      const game = new Game()

      const undone = game.undo()
      expect(undone).toBeNull()
    })

    it('should work multiple times', () => {
      const game = new Game()

      const startFen = game.fen()
      game.move('e4')
      game.move('e5')
      game.move('Nf3')

      game.undo()
      game.undo()
      game.undo()

      expect(game.fen()).toBe(startFen)
    })
  })

  describe('isCheckmate() overload', () => {
    it('should work without parameters', () => {
      const game = new Game()

      // Fool's mate
      game.move('f3')
      game.move('e6')
      game.move('g4')
      game.move('Qh4')

      expect(game.isCheckmate()).toBe(true)
    })

    it('should return false when not checkmate', () => {
      const game = new Game()

      expect(game.isCheckmate()).toBe(false)
    })

    it('should still accept legal moves parameter', () => {
      const game = new Game()

      // Fool's mate
      game.move('f3')
      game.move('e6')
      game.move('g4')
      game.move('Qh4')

      const legalMoves = game._moves({ legal: true })
      expect(game.isCheckmate(legalMoves)).toBe(true)
    })
  })

  describe('Game from Cursor', () => {
    it('should support full API for Game instances from Cursor', () => {
      // Load a simple two-game PGN
      const pgn = `[Event "Test"]
[White "Player 1"]
[Black "Player 2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0

[Event "Test 2"]
[White "Player A"]
[Black "Player B"]
[Result "0-1"]

1. d4 d5 2. c4 e6 0-1`

      const indices = indexPgnGames(pgn)
      const cursor = new CursorImpl(pgn, indices)
      const game = cursor.next()

      expect(game).not.toBeNull()
      if (!game) return

      /*
       * Game from Cursor has already played the moves (3. Bb5 a6)
       * So there are 32 legal moves, not 20
       */
      const moves = game.moves()
      expect(moves.length).toBeGreaterThan(0)

      // Test move() - try a legal move from this position
      const firstLegalMove = moves[0]
      const move = game.move(firstLegalMove)
      expect(move.san).toBe(firstLegalMove)

      // Test undo()
      const undone = game.undo()
      expect(undone?.san).toBe(firstLegalMove)

      // Test isCheckmate()
      expect(game.isCheckmate()).toBe(false)
    })

    it('should work on multiple games from cursor', () => {
      const pgnPath = path.join(__dirname, 'pgn', 'multi-escape.pgn')
      const pgn = fs.readFileSync(pgnPath, 'utf8')

      const indices = indexPgnGames(pgn)
      const cursor = new CursorImpl(pgn, indices)

      // multi-escape.pgn has multiple games
      let gameCount = 0

      while (true) {
        const game = cursor.next()
        if (!game || gameCount >= 3) break

        gameCount++

        // Each game should support the API
        const moves = game.moves()
        expect(moves.length).toBeGreaterThan(0)

        const firstMove = game.move(moves[0])
        expect(firstMove.san).toBe(moves[0])

        const undone = game.undo()
        expect(undone).not.toBeNull()

        expect(() => game.isCheckmate()).not.toThrow()
      }

      expect(gameCount).toBeGreaterThanOrEqual(2)
    })
  })
})
