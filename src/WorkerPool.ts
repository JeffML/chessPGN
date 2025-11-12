/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import { Worker } from 'worker_threads'
import { join } from 'path'
import type { Game } from './Game'

interface ParseTask {
  index: number
  pgn: string
  resolve: (game: Game | null) => void
  reject: (error: Error) => void
}

interface ParseBatch {
  id: number
  tasks: ParseTask[]
}

interface WorkerStats {
  totalParsed: number
  totalErrors: number
}

export class WorkerPool {
  private workers: Worker[] = []
  private workerPath: string
  private nextTaskId = 0
  private pendingBatches = new Map<number, ParseBatch>()
  private taskQueue: ParseTask[] = []
  private batchSize: number
  private strict: boolean
  private stats: WorkerStats = { totalParsed: 0, totalErrors: 0 }
  private terminated = false

  constructor(
    workerCount: number = 4,
    options: { batchSize?: number; strict?: boolean } = {},
  ) {
    this.batchSize = options.batchSize || 5
    this.strict = options.strict || false

    /* Worker script path - will be compiled by test setup */
    this.workerPath = join(__dirname, 'workerParser.js')

    // Create worker threads
    for (let i = 0; i < workerCount; i++) {
      this.createWorker()
    }
  }

  private createWorker(): void {
    if (this.terminated) return

    const worker = new Worker(this.workerPath)

    worker.on(
      'message',
      (response: {
        id: number
        results: Array<{ index: number; game: Game | null; error?: string }>
      }) => {
        this.handleWorkerResponse(response)
      },
    )

    worker.on('error', (error: Error) => {
      console.error('Worker error:', error)
    })

    worker.on('exit', (code: number) => {
      if (code !== 0 && !this.terminated) {
        console.error(`Worker stopped with exit code ${code}`)
      }
    })

    this.workers.push(worker)
  }

  private handleWorkerResponse(response: {
    id: number
    results: Array<{ index: number; game: Game | null; error?: string }>
  }): void {
    const batch = this.pendingBatches.get(response.id)
    if (!batch) {
      /* Batch already processed or cursor terminated */
      return
    }

    // Match results back to original tasks
    for (const result of response.results) {
      const task = batch.tasks.find((t) => t.index === result.index)
      if (task) {
        if (result.error) {
          this.stats.totalErrors++
          task.reject(new Error(result.error))
        } else if (result.game) {
          this.stats.totalParsed++
          task.resolve(result.game)
        } else {
          this.stats.totalErrors++
          task.reject(new Error('Failed to parse game'))
        }
      }
    }

    this.pendingBatches.delete(response.id)

    // Process next batch if queue has items
    this.processQueue()
  }

  private processQueue(): void {
    if (this.terminated || this.taskQueue.length === 0) return

    // Create batch from queue
    const batchTasks = this.taskQueue.splice(0, this.batchSize)
    if (batchTasks.length === 0) return

    const batchId = this.nextTaskId++
    const batch: ParseBatch = {
      id: batchId,
      tasks: batchTasks,
    }

    this.pendingBatches.set(batchId, batch)

    // Send to least busy worker (round-robin)
    const workerIndex = batchId % this.workers.length
    const worker = this.workers[workerIndex]

    worker.postMessage({
      id: batchId,
      batch: batchTasks.map((t) => ({ index: t.index, pgn: t.pgn })),
      strict: this.strict,
    })
  }

  /**
   * Parse a single game using the worker pool
   */
  parseGame(index: number, pgn: string): Promise<Game | null> {
    if (this.terminated) {
      return Promise.reject(new Error('Worker pool has been terminated'))
    }

    return new Promise((resolve, reject) => {
      const task: ParseTask = { index, pgn, resolve, reject }
      this.taskQueue.push(task)
      this.processQueue()
    })
  }

  /**
   * Parse multiple games in batch
   */
  async parseGames(
    games: Array<{ index: number; pgn: string }>,
  ): Promise<Array<{ index: number; game: Game | null }>> {
    const promises = games.map((g) => this.parseGame(g.index, g.pgn))
    const results = await Promise.allSettled(promises)

    return games.map((g, i) => {
      const result = results[i]
      if (result.status === 'fulfilled') {
        return { index: g.index, game: result.value }
      } else {
        return { index: g.index, game: null }
      }
    })
  }

  /**
   * Get statistics about worker pool performance
   */
  getStats(): WorkerStats {
    return { ...this.stats }
  }

  /**
   * Terminate all workers
   */
  async terminate(): Promise<void> {
    if (this.terminated) return

    this.terminated = true

    // Reject all pending tasks
    for (const batch of this.pendingBatches.values()) {
      for (const task of batch.tasks) {
        task.reject(new Error('Worker pool terminated'))
      }
    }

    for (const task of this.taskQueue) {
      task.reject(new Error('Worker pool terminated'))
    }

    this.pendingBatches.clear()
    this.taskQueue = []

    // Terminate all workers
    const terminatePromises = this.workers.map((w) => w.terminate())
    await Promise.all(terminatePromises)
    this.workers = []
  }
}
