import { describe, expect, it } from 'vitest'
import { ChessPGN } from '../src/chessPGN'
import { annotateOpenings } from '../src/openings'

// Ruy Lopez: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6
const RUY_LOPEZ_PGN = `[Event "Test"]
[White "A"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`

describe('annotateOpenings', () => {
  it('detects Ruy Lopez and sets ECO/Opening headers', async () => {
    const game = new ChessPGN()
    game.loadPgn(RUY_LOPEZ_PGN)

    await annotateOpenings(game)

    const headers = game.getHeaders()
    expect(headers.ECO).toBe('C70')
    expect(headers.Opening).toMatch(/Ruy Lopez/)
  }, 30000)
})
