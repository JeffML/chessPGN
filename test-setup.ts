/**
 * Test setup file for vitest
 * Compiles worker scripts before tests run
 */

import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const workerSource = join(__dirname, 'src', 'workerParser.ts')
const workerOutput = join(__dirname, 'src', 'workerParser.js')

// Only compile if not already compiled (avoid recompiling in parallel tests)
if (!existsSync(workerOutput)) {
  console.log('Compiling worker script for tests...')
  try {
    /*
     * Compile with esbuild for fast bundling that resolves dependencies
     * This creates a standalone CommonJS file with all dependencies
     */
    execSync(
      `npx esbuild ${workerSource} --bundle --platform=node --format=cjs --outfile=${workerOutput} --external:worker_threads`,
      { stdio: 'inherit' },
    )
    console.log('Worker script compiled successfully')
  } catch (error) {
    console.error('Failed to compile worker script:', error)
    process.exit(1)
  }
}

// Cleanup on process exit
process.on('exit', () => {
  try {
    if (existsSync(workerOutput)) {
      unlinkSync(workerOutput)
    }
  } catch {
    // Ignore cleanup errors (file may already be deleted by another process)
  }
})

// Also cleanup on SIGINT/SIGTERM
const cleanup = () => {
  try {
    if (existsSync(workerOutput)) {
      unlinkSync(workerOutput)
    }
  } catch {
    // Ignore cleanup errors
  }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
