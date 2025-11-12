/**
 * Parity test for clear() and reset() methods
 */

import { describe, it, expect } from 'vitest'
import { ChessPGN, Game } from '../src/chessPGN'

describe('clear() and reset() parity', () => {
  it('clear() should produce identical empty boards', () => {
    const chess = new ChessPGN()
    const game = new Game()

    chess.move('e4')
    game.move('e4')

    chess.clear()
    game.clear()

    // Both should have empty boards
    expect(game.fen()).toBe('8/8/8/8/8/8/8/8 w - - 0 1')
    expect(chess.fen()).toBe('8/8/8/8/8/8/8/8 w - - 0 1')
    expect(game.fen()).toBe(chess.fen())
  })

  it('clear({ preserveHeaders: true }) should preserve headers identically', () => {
    const chess = new ChessPGN()
    const game = new Game()

    chess.setHeader('White', 'Alice')
    game.setHeader('White', 'Alice')
    chess.setHeader('Black', 'Bob')
    game.setHeader('Black', 'Bob')

    chess.move('e4')
    game.move('e4')

    chess.clear({ preserveHeaders: true })
    game.clear(true)

    // Both should have empty boards
    expect(game.fen()).toBe(chess.fen())
    expect(game.fen()).toBe('8/8/8/8/8/8/8/8 w - - 0 1')

    // Both should preserve headers
    expect(game.getHeaders()['White']).toBe('Alice')
    expect(chess.getHeaders()['White']).toBe('Alice')
    expect(game.getHeaders()['Black']).toBe('Bob')
    expect(chess.getHeaders()['Black']).toBe('Bob')
  })

  it('reset() should produce identical starting positions', () => {
    const chess = new ChessPGN()
    const game = new Game()

    // Make some moves
    chess.move('e4')
    game.move('e4')
    chess.move('e5')
    game.move('e5')

    // Clear to empty boards
    chess.clear()
    game.clear()

    // Reset to starting position
    chess.reset()
    game.reset()

    // Both should be at starting position
    expect(game.fen()).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    expect(chess.fen()).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    expect(game.fen()).toBe(chess.fen())
  })

  it('reset({ preserveHeaders: true }) should preserve headers identically', () => {
    const chess = new ChessPGN()
    const game = new Game()

    chess.setHeader('White', 'Alice')
    game.setHeader('White', 'Alice')
    chess.setHeader('Black', 'Bob')
    game.setHeader('Black', 'Bob')

    chess.move('e4')
    game.move('e4')

    chess.reset(true)
    game.reset(true)

    // Both should be at starting position
    expect(game.fen()).toBe(chess.fen())
    expect(game.fen()).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )

    // Both should preserve headers
    expect(game.getHeaders()['White']).toBe('Alice')
    expect(chess.getHeaders()['White']).toBe('Alice')
    expect(game.getHeaders()['Black']).toBe('Bob')
    expect(chess.getHeaders()['Black']).toBe('Bob')
  })

  it('reset() without preserveHeaders should reset headers identically', () => {
    const chess = new ChessPGN()
    const game = new Game()

    chess.setHeader('White', 'Alice')
    game.setHeader('White', 'Alice')

    chess.reset()
    game.reset()

    // Headers should be reset to default
    expect(game.getHeaders()['White']).toBe(chess.getHeaders()['White'])
    expect(game.getHeaders()['White']).toBe('?')
  })

  it('clear() and reset() should handle moves after clearing', () => {
    const chess = new ChessPGN()
    const game = new Game()

    // Clear and try to make a move (should fail on empty board)
    chess.clear()
    game.clear()

    expect(() => chess.move('e4')).toThrow()
    expect(() => game.move('e4')).toThrow()

    // Reset and make moves (should work)
    chess.reset()
    game.reset()

    const chessMove = chess.move('e4')
    const gameMove = game.move('e4')

    expect(chessMove.san).toBe('e4')
    expect(gameMove.san).toBe('e4')
    expect(game.fen()).toBe(chess.fen())
  })
})
