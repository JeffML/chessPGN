/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import { ChessPGN } from './chessPGN'
import { Game } from './Game'
import { parse } from './pgn'
import type { Node } from './node'

/**
 * Options for processing PGN
 */
export interface ProcessPgnOptions {
  strict?: boolean
  newlineChar?: string
}

/**
 * Process a PGN string into a ChessPGN instance
 * This is a convenience wrapper around the PGN parsing logic
 */
export function processPgn(
  pgn: string,
  options: ProcessPgnOptions = {},
): ChessPGN {
  const chess = new ChessPGN()
  chess.loadPgn(pgn, options)
  return chess
}

/**
 * Process a PGN string into a Game instance
 * This creates a lightweight Game without ChessPGN's comment/suffix tracking
 */
export function processPgnToGame(
  pgn: string,
  options: ProcessPgnOptions = {},
): Game {
  // Normalize newlines if needed
  if (options.newlineChar && options.newlineChar !== '\r?\n') {
    pgn = pgn.replace(new RegExp(options.newlineChar, 'g'), '\n')
  }

  const { headers, root } = parse(pgn)
  return new Game(headers, root)
}

/**
 * Parse a PGN string and return the structured data
 * without creating a game instance
 */
export function parsePgn(pgn: string): {
  headers: Record<string, string>
  root: Node
  result?: string
} {
  return parse(pgn)
}
