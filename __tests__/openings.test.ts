import { describe, expect, it } from 'vitest'
import { ChessPGN } from '../src/chessPGN'
import { annotateOpenings } from '../src/openings'

// Ruy Lopez: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6
const RUY_LOPEZ_PGN = `[Event "Test"]
[White "A"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`

// Same opening + one clearly off-book move (h4) to test novelty NAG
const RUY_LOPEZ_NOVELTY_PGN = `[Event "Test"]
[White "A"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. h4 *`

describe('annotateOpenings', () => {
  it('detects Ruy Lopez and sets ECO/Opening headers', async () => {
    const game = new ChessPGN()
    game.loadPgn(RUY_LOPEZ_PGN)

    await annotateOpenings(game)

    const headers = game.getHeaders()
    expect(headers.ECO).toBe('C70')
    expect(headers.Opening).toMatch(/Ruy Lopez/)
  }, 30000)

  it('inserts boundary comment at last in-book move', async () => {
    const game = new ChessPGN()
    game.loadPgn(RUY_LOPEZ_PGN)

    await annotateOpenings(game, { boundaryComment: true })

    const pgn = game.pgn()
    // Should contain ECO code and opening name in a comment at the last in-book move
    expect(pgn).toMatch(/\{C70:/)
    expect(pgn).toMatch(/Ruy Lopez/)
  }, 30000)

  it('inserts $146 novelty NAG when enabled', async () => {
    const game = new ChessPGN()
    game.loadPgn(RUY_LOPEZ_NOVELTY_PGN)

    await annotateOpenings(game, { noveltyNag: true, boundaryComment: false })

    const pgn = game.pgn()
    expect(pgn).toContain('$146')
  }, 30000)

  it('does not insert $146 novelty NAG when disabled', async () => {
    const game = new ChessPGN()
    game.loadPgn(RUY_LOPEZ_PGN)

    await annotateOpenings(game, { noveltyNag: false, boundaryComment: false })

    const pgn = game.pgn()
    expect(pgn).not.toContain('$146')
  }, 30000)
})
