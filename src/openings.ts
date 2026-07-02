/**
 * Opening annotation for chessPGN games using eco.json data.
 *
 * Requires the optional peer dependency `@chess-openings/eco.json` to be
 * installed.  If it is not installed a descriptive error is thrown at runtime.
 *
 * @module openings
 */

import type { IChessGame } from './IChessGame'
import type { AnnotateOpeningsOptions } from './types'

// ─── eco.json dynamic import ─────────────────────────────────────────────────

type EcoJsonModule = {
  openingBook: () => Promise<Record<string, unknown>>
  findOpening: (
    ob: Record<string, unknown>,
    fen: string,
    pb?: Record<string, unknown>,
  ) => { name: string; eco: string } | null
  getPositionBook: (ob: Record<string, unknown>) => Record<string, unknown>
  splitOpeningName: (name: string) => {
    opening: string
    variation?: string
    subVariation?: string
  }
}

async function loadEcoJson(): Promise<EcoJsonModule> {
  try {
    return (await import('@chess-openings/eco.json')) as EcoJsonModule
  } catch {
    throw new Error(
      'annotateOpenings() requires the optional package @chess-openings/eco.json.\n' +
        'Install it with: npm install @chess-openings/eco.json',
    )
  }
}

// Cached once per process.
let _openingBook: Record<string, unknown> | null = null
let _positionBook: Record<string, unknown> | null = null
let _ecoJson: EcoJsonModule | null = null

/**
 * Load and cache the eco.json module and opening book.
 * The opening book is fetched from GitHub on first call (~468 KB gzipped).
 */
async function getBooks(): Promise<{
  ecoJson: EcoJsonModule
  ob: Record<string, unknown>
  pb: Record<string, unknown>
}> {
  if (!_ecoJson) {
    _ecoJson = await loadEcoJson()
  }
  if (!_openingBook) {
    _openingBook = await _ecoJson.openingBook()
    _positionBook = _ecoJson.getPositionBook(_openingBook)
  }
  return {
    ecoJson: _ecoJson,
    ob: _openingBook,
    pb: _positionBook!,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Annotate a loaded chess game in-place with eco.json opening data.
 *
 * The function walks the move history to find the deepest named opening
 * position, then writes:
 * - ECO/Opening/Variation PGN headers (controlled by `options.headers`)
 * - A boundary comment at the last in-book move (e.g. `{ C60: Ruy Lopez }`)
 * - An optional $146 novelty NAG on the first out-of-book move
 *
 * @param game - A loaded `IChessGame` instance (all moves already played)
 * @param options - Optional annotation settings
 */
export async function annotateOpenings(
  game: IChessGame,
  options?: AnnotateOpeningsOptions,
): Promise<void> {
  const {
    headers: headerMode = 'replace',
    origPrefix = 'Orig',
    customPrefix = 'EcoJson',
    boundaryComment = true,
    noveltyNag = false,
  } = options ?? {}

  const { ecoJson, ob, pb } = await getBooks()
  const { findOpening, splitOpeningName } = ecoJson

  // Get verbose history — each Move has .san and .after (FEN after the move)
  const moves = game.history({ verbose: true })

  // Walk forward to find the deepest named opening position
  let deepestOpening: { name: string; eco: string } | null = null
  let deepestMoveIdx = -1

  for (let i = 0; i < moves.length; i++) {
    const found = findOpening(ob, moves[i].after, pb)
    if (found) {
      deepestOpening = found
      deepestMoveIdx = i
    }
  }

  // ── Headers ────────────────────────────────────────────────────────────────
  if (headerMode && deepestOpening) {
    const split = splitOpeningName(deepestOpening.name)
    const existingHeaders = game.getHeaders()

    if (headerMode === 'replace') {
      // Save originals before overwriting
      if (existingHeaders.ECO)
        game.setHeader(`${origPrefix}ECO`, existingHeaders.ECO)
      if (existingHeaders.Opening)
        game.setHeader(`${origPrefix}Opening`, existingHeaders.Opening)
      if (existingHeaders.Variation)
        game.setHeader(`${origPrefix}Variation`, existingHeaders.Variation)

      game.setHeader('ECO', deepestOpening.eco)
      game.setHeader('Opening', split.opening)
      if (split.variation) {
        game.setHeader('Variation', split.variation)
      } else {
        game.removeHeader('Variation')
      }
    } else if (headerMode === 'additive') {
      game.setHeader(`${customPrefix}ECO`, deepestOpening.eco)
      game.setHeader(`${customPrefix}Opening`, split.opening)
      if (split.variation)
        game.setHeader(`${customPrefix}Variation`, split.variation)
      if (split.subVariation)
        game.setHeader(`${customPrefix}SubVariation`, split.subVariation)
    }
  }

  // ── Boundary comment ───────────────────────────────────────────────────────
  if (boundaryComment && deepestOpening && deepestMoveIdx >= 0) {
    const split = splitOpeningName(deepestOpening.name)
    const label = split.variation
      ? `${split.opening}: ${split.variation}${split.subVariation ? ', ' + split.subVariation : ''}`
      : split.opening
    const commentText = `${deepestOpening.eco}: ${label}`

    const targetFen = moves[deepestMoveIdx].after
    const existing = game.getComment(targetFen)
    game.setComment(
      existing ? `${existing} ${commentText}` : commentText,
      targetFen,
    )
  }

  // ── Novelty NAG ($146) ─────────────────────────────────────────────────────
  if (noveltyNag && deepestOpening) {
    const noveltyMoveIdx = deepestMoveIdx + 1
    if (noveltyMoveIdx < moves.length) {
      // TODO: use game.setNag(146, fen) once setNag() is added to IChessGame
      // For now, prepend $146 to the comment at that position
      const targetFen = moves[noveltyMoveIdx].after
      const existing = game.getComment(targetFen)
      game.setComment(existing ? `$146 ${existing}` : '$146', targetFen)
    }
  }
}
