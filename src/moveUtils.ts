import { Game } from './Game'
import { Move } from './Move'
import type { InternalMove } from './types'

/**
 * Create a pretty Move object (SAN + before/after FEN) from an internal move
 * using a Game instance. This extracts the orchestration out of ChessPGN so
 * ChessPGN can remain a thin wrapper.
 */
export function createPrettyMove(game: Game, internal: InternalMove): Move {
  const san = game._moveToSan(internal, game._moves({ legal: true }))
  const before = game.fen()

  game._makeMove(internal)
  const after = game.fen()
  game._undoMove()

  return new Move(internal, san, before, after)
}

export default createPrettyMove
