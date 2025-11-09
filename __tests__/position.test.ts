import { describe, it, expect } from 'vitest'
import { Position, DEFAULT_POSITION } from '../src/Position'

describe('Position', () => {
  it('should load default position', () => {
    const pos = new Position()

    expect(pos.get('e2')).toEqual({ type: 'p', color: 'w' })
    expect(pos.get('e7')).toEqual({ type: 'p', color: 'b' })
    expect(pos.get('e1')).toEqual({ type: 'k', color: 'w' })
    expect(pos.get('e8')).toEqual({ type: 'k', color: 'b' })
    expect(pos.get('e4')).toBeUndefined()
  })

  it('should generate correct FEN for starting position', () => {
    const pos = new Position()
    expect(pos.fen()).toBe(DEFAULT_POSITION)
  })

  it('should load custom FEN', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const pos = new Position(fen)

    expect(pos.get('e4')).toEqual({ type: 'p', color: 'w' })
    expect(pos.get('e2')).toBeUndefined()
    expect(pos.fen()).toBe(fen)
  })

  it('should snapshot and restore position', () => {
    const pos = new Position()
    const snapshot = pos.snapshot()

    // Load a different position
    pos.load('8/8/8/8/8/8/8/8 w - - 0 1')
    expect(pos.get('e2')).toBeUndefined()

    // Restore original
    pos.restore(snapshot)
    expect(pos.get('e2')).toEqual({ type: 'p', color: 'w' })
    expect(pos.fen()).toBe(DEFAULT_POSITION)
  })

  it('should handle partial FEN strings', () => {
    // FEN with missing half-move and move number
    const pos = new Position(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
    )

    expect(pos.get('e4')).toEqual({ type: 'p', color: 'w' })
    expect(pos._halfMoves).toBe(0)
    expect(pos._moveNumber).toBe(1)
  })
})
