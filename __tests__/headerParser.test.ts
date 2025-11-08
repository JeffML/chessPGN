import { parseTagPairLine, parseHeaders } from '../src/headerParser'
import { describe, test, expect } from 'vitest'

describe('headerParser', () => {
  test('parseTagPairLine simple', () => {
    const line = '[Event "Game One"]'
    const kv = parseTagPairLine(line)
    expect(kv).not.toBeNull()
    expect(kv!.key).toBe('Event')
    expect(kv!.value).toBe('Game One')
  })

  test('parseTagPairLine escaped quote', () => {
    const line = '[Annotator "O\\\"Connor"]'
    const kv = parseTagPairLine(line)
    expect(kv).not.toBeNull()
    expect(kv!.key).toBe('Annotator')
    expect(kv!.value).toBe('O"Connor')
  })

  test('parseTagPairLine malformed returns null', () => {
    expect(parseTagPairLine('[Bad NoQuote]')).toBeNull()
    expect(parseTagPairLine('Not a tag')).toBeNull()
  })

  test('parseHeaders consumes block and returns nextIndex', () => {
    const lines = [
      '[Event "A"]',
      '[Site "X"]',
      '[White "Alice"]',
      '',
      '1. e4 e5 *',
    ]
    const { headers, nextIndex } = parseHeaders(lines, 0)
    expect(headers['Event']).toBe('A')
    expect(headers['Site']).toBe('X')
    expect(headers['White']).toBe('Alice')
    expect(nextIndex).toBe(3)
  })
})
