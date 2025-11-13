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

  it('removeHeader works through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      instance.setHeader('Event', 'Test Event')
      instance.setHeader('Site', 'Test Site')

      const removed = instance.removeHeader('Event')
      expect(removed).toBe(true)

      const headers = instance.getHeaders()
      expect(headers['Event']).toBe('?') // Should revert to default
      expect(headers['Site']).toBe('Test Site')

      // Try removing non-existent custom header
      const removedCustom = instance.removeHeader('CustomHeader')
      expect(removedCustom).toBe(false)
    }
  })

  it('getComments and removeComments work through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      instance.move('e4')
      instance.setComment('First move')
      instance.move('e5')
      instance.setComment('Response')
      instance.move('Nf3')
      instance.setComment('Third move')

      const comments = instance.getComments()
      expect(comments.length).toBe(3)
      expect(comments.some((c) => c.comment === 'First move')).toBe(true)
      expect(comments.some((c) => c.comment === 'Response')).toBe(true)
      expect(comments.some((c) => c.comment === 'Third move')).toBe(true)

      const removed = instance.removeComments()
      expect(removed.length).toBe(3)
      expect(instance.getComments().length).toBe(0)
    }
  })

  it('suffix annotation methods work through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      instance.move('e4')
      instance.setSuffixAnnotation('!!')
      expect(instance.getSuffixAnnotation()).toBe('!!')

      instance.move('e5')
      instance.setSuffixAnnotation('?')
      expect(instance.getSuffixAnnotation()).toBe('?')

      // Remove annotation
      instance.undo()
      const removed = instance.removeSuffixAnnotation()
      expect(removed).toBe('!!')
      expect(instance.getSuffixAnnotation()).toBeUndefined()
    }
  })

  it('history method works through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      const moves = ['e4', 'e5', 'Nf3', 'Nc6']
      moves.forEach((move) => instance.move(move))

      // Test string history
      const history = instance.history()
      expect(history).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])

      // Test verbose history
      const verboseHistory = instance.history({ verbose: true })
      expect(verboseHistory.length).toBe(4)
      expect(verboseHistory[0].san).toBe('e4')
      expect(verboseHistory[0].from).toBe('e2')
      expect(verboseHistory[0].to).toBe('e4')
      expect(verboseHistory[1].san).toBe('e5')
      expect(verboseHistory[2].san).toBe('Nf3')
      expect(verboseHistory[3].san).toBe('Nc6')

      // Test non-verbose history
      const nonVerboseHistory = instance.history({ verbose: false })
      expect(nonVerboseHistory).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
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

  it('ASCII method works through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      const ascii = instance.ascii()
      // Check for pieces with proper spacing (two spaces between pieces)
      expect(ascii).toContain('r  n  b  q  k  b  n  r')
      expect(ascii).toContain('p  p  p  p  p  p  p  p')
      expect(ascii).toContain('P  P  P  P  P  P  P  P')
      expect(ascii).toContain('R  N  B  Q  K  B  N  R')
    }
  })

  it('Attack query methods work through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      // After e4, d7 and d8 are attacked by the pawn on e4's diagonal
      instance.move('e4')

      // Check attackers method
      const attackers = instance.attackers('d5', 'w')
      expect(attackers).toContain('e4')

      // Check isAttacked method
      expect(instance.isAttacked('d5', 'w')).toBe(true)
      expect(instance.isAttacked('a1', 'b')).toBe(false)
    }
  })

  it('inCheck alias works through interface', () => {
    const checkFen =
      'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      instance.load(checkFen)
      instance.move('Qh4+')

      // Both isCheck() and inCheck() should return true
      expect(instance.isCheck()).toBe(true)
      expect(instance.inCheck()).toBe(true)
    }
  })

  it('Draw condition methods work through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    // Test insufficient material (K vs K)
    const insufficientMaterial = '8/8/8/4k3/4K3/8/8/8 w - - 0 1'

    for (const instance of instances) {
      instance.load(insufficientMaterial)
      expect(instance.isInsufficientMaterial()).toBe(true)
      expect(instance.isDraw()).toBe(true)
    }
  })

  it('Fifty-move rule works through interface', () => {
    // Position with 100 half-moves (50 full moves)
    const fiftyMoveFen = '8/8/8/4k3/4K3/8/8/8 w - - 100 60'
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      instance.load(fiftyMoveFen)
      expect(instance.isDrawByFiftyMoves()).toBe(true)
      expect(instance.isDraw()).toBe(true)
    }
  })

  it('Threefold repetition works through interface', () => {
    const instances: IChessGame[] = [new ChessPGN(), new Game()]

    for (const instance of instances) {
      // Use the same moves as the existing threefold test
      const moves = 'Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8'.split(/\s+/)
      moves.forEach((move) => {
        instance.move(move)
      })

      // After all 8 moves, position has occurred 3 times
      expect(instance.isThreefoldRepetition()).toBe(true)
      expect(instance.isDraw()).toBe(true)
    }
  })
})
