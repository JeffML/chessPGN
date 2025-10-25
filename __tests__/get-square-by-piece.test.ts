import {
  ChessPGN,
  Piece,
  WHITE,
  BLACK,
  KING,
  QUEEN,
  KNIGHT,
  PAWN,
} from '../src/chessPGN'
import { expect, test } from 'vitest'

test('findPiece - returns array with the only piece', () => {
  const chess = new ChessPGN()
  expect(chess.findPiece({ type: KING, color: WHITE })).toEqual(['e1'])
  expect(chess.findPiece({ type: KING, color: BLACK })).toEqual(['e8'])
})

test('findPiece - returns array with all the pieces', () => {
  const chess = new ChessPGN()
  // there are two white knights
  expect(chess.findPiece({ type: KNIGHT, color: WHITE })).toEqual(['b1', 'g1'])
  // there are 8 black pawns
  expect(chess.findPiece({ type: PAWN, color: BLACK })).toEqual([
    'a7',
    'b7',
    'c7',
    'd7',
    'e7',
    'f7',
    'g7',
    'h7',
  ])
})

test('findPiece - returns empty array for missing piece', () => {
  // queens are missing
  const chess = new ChessPGN('8/6p1/8/2k4p/1R3P1P/Pp2K1P1/r7/8 w - - 1 44')
  expect(chess.findPiece({ type: QUEEN, color: WHITE })).toEqual([])
})

test('findPiece - returns empty array for invalid piece', () => {
  const chess = new ChessPGN()
  expect(
    chess.findPiece({
      type: 'bad-piece',
      color: 'bad-color',
    } as unknown as Piece),
  ).toEqual([])
})
