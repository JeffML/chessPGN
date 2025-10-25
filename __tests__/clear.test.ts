import { ChessPGN, SEVEN_TAG_ROSTER } from '../src/chessPGN'
import { expect, test } from 'vitest'

test('clear', () => {
  const chess = new ChessPGN()
  chess.setHeader('White', 'Magnus Carlsen')
  chess.setHeader('Black', 'Viswanathan Anand')

  chess.clear()
  expect(chess.fen()).toEqual('8/8/8/8/8/8/8/8 w - - 0 1')
  expect(chess.getHeaders()).toEqual({ ...SEVEN_TAG_ROSTER })

  expect(chess.hash()).toEqual(
    new ChessPGN('8/8/8/8/8/8/8/8 w - - 0 1', { skipValidation: true }).hash(),
  )
})

test('clear - preserveHeaders = true', () => {
  const chess = new ChessPGN()
  chess.setHeader('White', 'Magnus Carlsen')
  chess.setHeader('Black', 'Viswanathan Anand')

  chess.clear({ preserveHeaders: true })

  expect(chess.fen()).toEqual('8/8/8/8/8/8/8/8 w - - 0 1')
  expect(chess.getHeaders()).toEqual({
    ...SEVEN_TAG_ROSTER,
    White: 'Magnus Carlsen',
    Black: 'Viswanathan Anand',
  })
})
