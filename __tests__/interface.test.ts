import { describe, expect, it } from 'vitest'
import { ChessPGN, Game, IChessGame } from '../src/chessPGN'

describe('IChessGame Interface', () => {
  it('ChessPGN implements IChessGame', () => {
    const chess: IChessGame = new ChessPGN()
    expect(chess).toBeDefined()
    expect(chess.fen()).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
  })

  it('Game implements IChessGame', () => {
    const game: IChessGame = new Game()
    expect(game).toBeDefined()
    expect(game.fen()).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
  })

  it('Can use ChessPGN and Game polymorphically', () => {
    const testMove = (instance: IChessGame) => {
      const move = instance.move('e4')
      expect(move.san).toBe('e4')
      expect(move.from).toBe('e2')
      expect(move.to).toBe('e4')
      return instance.fen()
    }

    const chess = new ChessPGN()
    const game = new Game()

    const chessFen = testMove(chess)
    const gameFen = testMove(game)

    expect(chessFen).toBe(gameFen)
    expect(chessFen).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    )
  })

  it('Interface methods work on both implementations', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      // Test core methods
      expect(instance.get('e2')).toEqual({ type: 'p', color: 'w' })
      expect(instance.board().length).toBe(8)
      expect(instance.isCheck()).toBe(false)
      expect(instance.isCheckmate()).toBe(false)
      expect(instance.isStalemate()).toBe(false)
      expect(instance.isDraw()).toBe(false)
      expect(instance.isGameOver()).toBe(false)

      // Test move
      const move = instance.move('e4')
      expect(move.piece).toBe('p')

      // Test undo
      const undone = instance.undo()
      expect(undone).toBeDefined()
      expect(undone?.san).toBe('e4')

      // Test headers
      instance.setHeader('Event', 'Test Event')
      const headers = instance.getHeaders()
      expect(headers['Event']).toBe('Test Event')

      // Test comments
      instance.move('e4')
      instance.setComment('Good opening move')
      expect(instance.getComment()).toBe('Good opening move')
      const removed = instance.removeComment()
      expect(removed).toBe('Good opening move')
      expect(instance.getComment()).toBeUndefined()

      // Test PGN
      const pgn = instance.pgn()
      expect(pgn).toContain('[Event "Test Event"]')
      expect(pgn).toContain('e4')
    }
  })

  it('Can find pieces using interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      const whitePawns = instance.findPiece({ type: 'p', color: 'w' })
      expect(whitePawns.length).toBe(8)
      expect(whitePawns).toContain('e2')

      const whiteKing = instance.findPiece({ type: 'k', color: 'w' })
      expect(whiteKing).toEqual(['e1'])
    }
  })

  it('Can load and reset positions using interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    const testFen = '8/8/8/4k3/4K3/8/8/8 w - - 0 1'

    for (const instance of instances) {
      instance.load(testFen)
      expect(instance.fen()).toBe(testFen)

      instance.reset()
      expect(instance.fen()).toBe(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )
    }
  })

  it('Game state queries work through interface', () => {
    // Test checkmate position (Scholar's mate)
    const checkmate =
      'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4'

    const instances: IChessGame[] = [new ChessPGN(checkmate), new Game()]
    instances[1].load(checkmate)

    for (const instance of instances) {
      expect(instance.isCheck()).toBe(true)
      expect(instance.isCheckmate()).toBe(true)
      expect(instance.isGameOver()).toBe(true)
    }
  })

  it('Accepts a function that works with any IChessGame implementation', () => {
    // Utility function that accepts any IChessGame implementation
    function playOpening(game: IChessGame): string {
      game.move('e4')
      game.move('e5')
      game.move('Nf3')
      game.move('Nc6')
      return game.fen()
    }

    const chess = new ChessPGN()
    const game = new Game()

    const chessFen = playOpening(chess)
    const gameFen = playOpening(game)

    expect(chessFen).toBe(gameFen)
    expect(chessFen).toBe(
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    )
  })
})
