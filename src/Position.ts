/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import {
  Piece,
  Color,
  WHITE,
  BLACK,
  EMPTY,
  PieceSymbol,
  KING,
  BITS,
  Ox88,
  Square,
  PIECE_KEYS,
  EP_KEYS,
  CASTLING_KEYS,
  SIDE_KEY,
  ROOK,
  algebraic,
} from './types'

export const DEFAULT_POSITION =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * Position represents a chess position including:
 * - Board state (piece placement)
 * - Turn to move
 * - Castling rights
 * - En passant square
 * - Half-move clock
 * - Move number
 * - Zobrist hash
 *
 * Position is mutable - methods modify the state in place for performance.
 */
export class Position {
  _board: Piece[] = new Array<Piece>(128)
  _turn: Color = WHITE
  _kings: Record<Color, number> = { w: EMPTY, b: EMPTY }
  _halfMoves = 0
  _hash = 0n
  _positionCount = new Map<bigint, number>()
  _epSquare = -1
  _castling: Record<Color, number> = { w: 0, b: 0 }
  _fenEpSquare = -1
  _moveNumber = 1

  constructor(fen: string = DEFAULT_POSITION) {
    this.load(fen)
  }

  /**
   * Load a position from FEN string
   */
  load(fen: string): void {
    let tokens = fen.split(/\s+/)

    // append commonly omitted fen tokens
    if (tokens.length >= 2 && tokens.length < 6) {
      const adjustments = ['-', '-', '0', '1']
      fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(' ')
    }

    tokens = fen.split(/\s+/)

    const position = tokens[0]
    let square = 0

    // Clear board and reset state
    this._board = new Array<Piece>(128)
    this._kings = { w: EMPTY, b: EMPTY }
    this._turn = WHITE
    this._castling = { w: 0, b: 0 }
    this._epSquare = EMPTY
    this._fenEpSquare = EMPTY
    this._halfMoves = 0
    this._moveNumber = 1
    this._hash = 0n
    this._positionCount = new Map<bigint, number>()

    // Parse position
    for (let i = 0; i < position.length; i++) {
      const piece = position.charAt(i)

      if (piece === '/') {
        square += 8
      } else if (piece >= '0' && piece <= '9') {
        square += parseInt(piece, 10)
      } else {
        const color = piece < 'a' ? WHITE : BLACK
        const type = piece.toLowerCase() as PieceSymbol
        const sq = square

        this._set(sq, { type, color })
        if (type === KING) {
          this._kings[color] = sq
        }
        square++
      }
    }

    this._turn = tokens[1] as Color

    if (tokens[2].indexOf('K') > -1) {
      this._castling.w |= BITS.KSIDE_CASTLE
    }
    if (tokens[2].indexOf('Q') > -1) {
      this._castling.w |= BITS.QSIDE_CASTLE
    }
    if (tokens[2].indexOf('k') > -1) {
      this._castling.b |= BITS.KSIDE_CASTLE
    }
    if (tokens[2].indexOf('q') > -1) {
      this._castling.b |= BITS.QSIDE_CASTLE
    }

    this._updateCastlingRights()

    this._epSquare = tokens[3] === '-' ? EMPTY : Ox88[tokens[3] as Square]
    this._fenEpSquare = this._epSquare
    this._halfMoves = parseInt(tokens[4], 10)
    this._moveNumber = parseInt(tokens[5], 10)

    this._hash = this._computeHash()
  }

  private _set(sq: number, piece: Piece): void {
    this._hash ^= this._pieceKey(sq)
    this._board[sq] = piece
    this._hash ^= this._pieceKey(sq)
  }

  private _pieceKey(i: number): bigint {
    if (!this._board[i]) {
      return 0n
    }

    const { color, type } = this._board[i]

    const colorIndex = {
      w: 0,
      b: 1,
    }[color]

    const typeIndex = {
      p: 0,
      n: 1,
      b: 2,
      r: 3,
      q: 4,
      k: 5,
    }[type]

    return PIECE_KEYS[colorIndex][typeIndex][i]
  }

  private _epKey(): bigint {
    return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7]
  }

  private _castlingKey(): bigint {
    const index = (this._castling.w >> 5) | (this._castling.b >> 3)
    return CASTLING_KEYS[index]
  }

  private _computeHash(): bigint {
    let hash = 0n

    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      // did we run off the end of the board
      if (i & 0x88) {
        i += 7
        continue
      }

      if (this._board[i]) {
        hash ^= this._pieceKey(i)
      }
    }

    hash ^= this._epKey()
    hash ^= this._castlingKey()

    if (this._turn === 'b') {
      hash ^= SIDE_KEY
    }

    return hash
  }

  private _updateCastlingRights(): void {
    this._hash ^= this._castlingKey()

    const whiteKingInPlace =
      this._board[Ox88.e1]?.type === KING &&
      this._board[Ox88.e1]?.color === WHITE
    const blackKingInPlace =
      this._board[Ox88.e8]?.type === KING &&
      this._board[Ox88.e8]?.color === BLACK

    if (
      !whiteKingInPlace ||
      this._board[Ox88.a1]?.type !== ROOK ||
      this._board[Ox88.a1]?.color !== WHITE
    ) {
      this._castling.w &= ~BITS.QSIDE_CASTLE
    }

    if (
      !whiteKingInPlace ||
      this._board[Ox88.h1]?.type !== ROOK ||
      this._board[Ox88.h1]?.color !== WHITE
    ) {
      this._castling.w &= ~BITS.KSIDE_CASTLE
    }

    if (
      !blackKingInPlace ||
      this._board[Ox88.a8]?.type !== ROOK ||
      this._board[Ox88.a8]?.color !== BLACK
    ) {
      this._castling.b &= ~BITS.QSIDE_CASTLE
    }

    if (
      !blackKingInPlace ||
      this._board[Ox88.h8]?.type !== ROOK ||
      this._board[Ox88.h8]?.color !== BLACK
    ) {
      this._castling.b &= ~BITS.KSIDE_CASTLE
    }

    this._hash ^= this._castlingKey()
  }

  /**
   * Get the piece at a given square
   */
  get(square: Square): Piece | undefined {
    return this._board[Ox88[square]]
  }

  /**
   * Generate FEN string from current position
   */
  fen(): string {
    let empty = 0
    let fen = ''

    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (this._board[i]) {
        if (empty > 0) {
          fen += empty
          empty = 0
        }
        const { color, type: piece } = this._board[i]

        fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase()
      } else {
        empty++
      }

      if ((i + 1) & 0x88) {
        if (empty > 0) {
          fen += empty
        }

        if (i !== Ox88.h1) {
          fen += '/'
        }

        empty = 0
        i += 8
      }
    }

    let castling = ''
    if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
      castling += 'K'
    }
    if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
      castling += 'Q'
    }
    if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
      castling += 'k'
    }
    if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
      castling += 'q'
    }

    // do we have an empty castling flag?
    castling = castling || '-'

    // Use fenEpSquare directly (simplified version without validation)
    const epSquare =
      this._fenEpSquare !== EMPTY ? algebraic(this._fenEpSquare) : '-'

    return [
      fen,
      this._turn,
      castling,
      epSquare,
      this._halfMoves,
      this._moveNumber,
    ].join(' ')
  }

  /**
   * Create a snapshot of the current position state
   * Used for history tracking
   */
  snapshot(): PositionSnapshot {
    return {
      board: [...this._board],
      turn: this._turn,
      kings: { ...this._kings },
      halfMoves: this._halfMoves,
      hash: this._hash,
      positionCount: new Map(this._positionCount),
      epSquare: this._epSquare,
      castling: { ...this._castling },
      fenEpSquare: this._fenEpSquare,
      moveNumber: this._moveNumber,
    }
  }

  /**
   * Restore position state from a snapshot
   */
  restore(snapshot: PositionSnapshot): void {
    this._board = [...snapshot.board]
    this._turn = snapshot.turn
    this._kings = { ...snapshot.kings }
    this._halfMoves = snapshot.halfMoves
    this._hash = snapshot.hash
    this._positionCount = new Map(snapshot.positionCount)
    this._epSquare = snapshot.epSquare
    this._castling = { ...snapshot.castling }
    this._fenEpSquare = snapshot.fenEpSquare
    this._moveNumber = snapshot.moveNumber
  }
}

/**
 * Snapshot of position state for history tracking
 */
export interface PositionSnapshot {
  board: Piece[]
  turn: Color
  kings: Record<Color, number>
  halfMoves: number
  hash: bigint
  positionCount: Map<bigint, number>
  epSquare: number
  castling: Record<Color, number>
  fenEpSquare: number
  moveNumber: number
}
