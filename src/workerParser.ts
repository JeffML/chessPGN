/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

/**
 * Worker thread script for parsing PGN games in parallel
 * This file is spawned as a worker thread and communicates via message passing
 */

import { parentPort } from 'worker_threads'
import { processPgnToGame } from './pgnProcessor'
import type { Game } from './Game'

interface ParseRequest {
  id: number
  batch: Array<{ index: number; pgn: string }>
  strict?: boolean
}

interface ParseResponse {
  id: number
  results: Array<{ index: number; game: Game | null; error?: string }>
}

if (!parentPort) {
  throw new Error('This file must be run as a worker thread')
}

parentPort.on('message', (request: ParseRequest) => {
  const results: ParseResponse['results'] = []

  for (const item of request.batch) {
    try {
      const game = processPgnToGame(item.pgn, { strict: request.strict })
      results.push({ index: item.index, game })
    } catch (error) {
      const err = error as Error
      results.push({
        index: item.index,
        game: null,
        error: err.message,
      })
    }
  }

  const response: ParseResponse = {
    id: request.id,
    results,
  }

  parentPort!.postMessage(response)
})
