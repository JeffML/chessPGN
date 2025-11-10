/**
 * Test setup file for vitest
 * Compiles worker scripts before tests run
 */

import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const workerSource = join(__dirname, 'src', 'workerParser.ts')
const workerOutput = join(__dirname, 'src', 'workerParser.js')

// Compile worker script before tests
console.log('Compiling worker script for tests...')
try {
  /*
   * Compile with ts-node/esbuild for fast bundling that resolves dependencies
   * This creates a standalone CommonJS file with all dependencies
   */
  execSync(
    `npx esbuild ${workerSource} --bundle --platform=node --format=cjs --outfile=${workerOutput} --external:worker_threads`,
    { stdio: 'inherit' },
  )
  console.log('Worker script compiled successfully')
} catch (error) {
  console.error('Failed to compile worker script:', error)
  console.log('Falling back to simple tsc compilation...')

  try {
    execSync(
      `npx tsc ${workerSource} --outDir src --module commonjs --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck --resolveJsonModule`,
      { stdio: 'inherit' },
    )
    console.log('Worker script compiled with tsc')
  } catch (tscError) {
    console.error('TSC compilation also failed:', tscError)
    process.exit(1)
  }
}

// Cleanup on process exit
process.on('exit', () => {
  if (existsSync(workerOutput)) {
    console.log('Cleaning up compiled worker script...')
    unlinkSync(workerOutput)
  }
})

// Also cleanup on SIGINT/SIGTERM
const cleanup = () => {
  if (existsSync(workerOutput)) {
    unlinkSync(workerOutput)
  }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
