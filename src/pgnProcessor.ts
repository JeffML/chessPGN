/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import { ChessPGN } from './chessPGN'
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
