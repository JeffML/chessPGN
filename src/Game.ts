/**
 * @license BSD 2-Clause License
 * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
 * Refactored by Jeff Lowery (jlowery2663@gmail.com)
 * See the LICENSE file for the full text, including disclaimer.
 */

import {
  Piece,
  Square,
  PieceSymbol,
  Color,
  Ox88,
  algebraic,
  ATTACKS,
  RAYS,
  PIECE_MASKS,
  WHITE,
  BLACK,
  PAWN,
  EMPTY,
  swapColor,
  rank,
  file,
  BISHOP,
  KNIGHT,
  InternalMove,
  BITS,
  PAWN_OFFSETS,
  PIECE_OFFSETS,
  SECOND_RANK,
  KING,
  addMove,
  PIECE_KEYS,
  EP_KEYS,
  CASTLING_KEYS,
  SIDE_KEY,
  History,
  ROOKS,
  ROOK,
  SUFFIX_LIST,
  Suffix,
} from './types'
import type { Node } from './node'
import { Move } from './Move'
import { createPrettyMove } from './moveUtils'
import { renderHeaders } from './pgnRenderer'
import { Position } from './Position'

export const DEFAULT_POSITION =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const SAN_NULLMOVE = '--'

/* eslint-disable @typescript-eslint/naming-convention */
// PGN header constants
const SEVEN_TAG_ROSTER = {
  Event: '?',
  Site: '?',
  Date: '????.??.??',
  Round: '?',
  White: '?',
  Black: '?',
  Result: '*',
}

const SUPPLEMENTAL_TAGS: Record<string, string | null> = {
  WhiteTitle: null,
  BlackTitle: null,
  WhiteElo: null,
  BlackElo: null,
  WhiteUSCF: null,
  BlackUSCF: null,
  WhiteNA: null,
  BlackNA: null,
  WhiteType: null,
  BlackType: null,
  EventDate: null,
  EventSponsor: null,
  Section: null,
  Stage: null,
  Board: null,
  Opening: null,
  Variation: null,
  SubVariation: null,
  ECO: null,
  NIC: null,
  Time: null,
  UTCTime: null,
  UTCDate: null,
  TimeControl: null,
  SetUp: null,
  FEN: null,
  Termination: null,
  Annotator: null,
  Mode: null,
  PlyCount: null,
}

const HEADER_TEMPLATE = {
  ...SEVEN_TAG_ROSTER,
  ...SUPPLEMENTAL_TAGS,
}
/* eslint-enable @typescript-eslint/naming-convention */

export class Game {
  get _board() {
    return this._position._board
  }
  _turn: Color = WHITE
  _header: Record<string, string | null> = {}
  // Per-position comments and suffix annotations keyed by FEN
  _comments: Record<string, string> = {}
  _suffixes: Record<string, Suffix> = {}
  _kings: Record<Color, number> = { w: EMPTY, b: EMPTY }
  _halfMoves = 0
  _hash = 0n
  _positionCount = new Map<bigint, number>()
  _epSquare = -1
  _castling: Record<Color, number> = { w: 0, b: 0 }
  _history: History[] = []
  _fenEpSquare = -1
  _moveNumber = 0
  _position: Position = new Position()

  constructor(headers?: Record<string, string>, root?: Node) {
    /*
     * Initialize board to starting position. This sets up all pieces,
     * castling rights, turn, etc.
     */
    this.load(DEFAULT_POSITION, { skipValidation: true })

    // Initialize headers with template + provided headers
    this._header = { ...HEADER_TEMPLATE }
    if (headers) {
      Object.assign(this._header, headers)
    }

    /*
     * If headers specify a custom starting position (SetUp + FEN),
     * load it before processing moves
     */
    if (headers && headers['SetUp'] === '1' && headers['FEN']) {
      this.load(headers['FEN'], { skipValidation: true })
    }

    /*
     * Process root node if provided. This allows Game to be fully initialized
     * from parsed PGN data (headers + move tree).
     */
    if (root) {
      this._processRoot(root)
    }
  }

  /**
   * Process the root node from a parsed PGN, applying all moves in the main line
   * @internal
   */
  private _processRoot(root: Node): void {
    let node: Node | undefined = root

    while (node) {
      if (node.move) {
        /* Use permissive parsing for PGN moves (strict=false) */
        const suffixAnnotation = node.suffixAnnotation
        const move = this._moveFromSan(node.move, false)
        if (!move) {
          throw new Error(`Invalid move in PGN: ${node.move}`)
        }
        this._makeMove(move)
        this._incPositionCount()

        if (suffixAnnotation) {
          this._suffixes[this.fen()] = suffixAnnotation as Suffix
        }
      }

      if (node.comment !== undefined) {
        this._comments[this.fen()] = node.comment
      }

      /* Follow the main line (first variation) */
      node = node.variations[0]
    }
  }

  /**
   * Helper function to infer piece type from SAN notation
   * @internal
   */
  static _inferPieceType(san: string): PieceSymbol | undefined {
    let pieceType = san.charAt(0)
    if (pieceType >= 'a' && pieceType <= 'h') {
      const matches = san.match(/[a-h]\d.*[a-h]\d/)
      if (matches) {
        return undefined
      }
      return PAWN
    }
    pieceType = pieceType.toLowerCase()
    if (pieceType === 'o') {
      return KING
    }
    return pieceType as PieceSymbol
  }

  /**
   * Parses all of the decorators out of a SAN string
   * @internal
   */
  static _strippedSan(move: string): string {
    return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '')
  }

  get(square: Square): Piece | undefined {
    return this._position.get(square)
  }

  findPiece(piece: Piece): Square[] {
    const squares: Square[] = []
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      // did we run off the end of the board
      if (i & 0x88) {
        i += 7
        continue
      }

      // if empty square or wrong color
      if (!this._board[i] || this._board[i]?.color !== piece.color) {
        continue
      }

      // check if square contains the requested piece
      if (
        this._board[i].color === piece.color &&
        this._board[i].type === piece.type
      ) {
        squares.push(algebraic(i))
      }
    }

    return squares
  }

  _attacked(color: Color, square: number): boolean
  _attacked(color: Color, square: number, verbose: false): boolean
  _attacked(color: Color, square: number, verbose: true): Square[]
  _attacked(color: Color, square: number, verbose?: boolean) {
    const attackers: Square[] = []
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      // did we run off the end of the board
      if (i & 0x88) {
        i += 7
        continue
      }

      // if empty square or wrong color
      if (this._board[i] === undefined || this._board[i].color !== color) {
        continue
      }

      const piece = this._board[i]
      const difference = i - square

      // skip - to/from square are the same
      if (difference === 0) {
        continue
      }

      const index = difference + 119

      if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
        if (piece.type === PAWN) {
          if (
            (difference > 0 && piece.color === WHITE) ||
            (difference <= 0 && piece.color === BLACK)
          ) {
            if (!verbose) {
              return true
            } else {
              attackers.push(algebraic(i))
            }
          }
          continue
        }

        // if the piece is a knight or a king
        if (piece.type === 'n' || piece.type === 'k') {
          if (!verbose) {
            return true
          } else {
            attackers.push(algebraic(i))
            continue
          }
        }

        const offset = RAYS[index]
        let j = i + offset

        let blocked = false
        while (j !== square) {
          if (this._board[j] != null) {
            blocked = true
            break
          }
          j += offset
        }

        if (!blocked) {
          if (!verbose) {
            return true
          } else {
            attackers.push(algebraic(i))
            continue
          }
        }
      }
    }

    if (verbose) {
      return attackers
    } else {
      return false
    }
  }
  attackers(square: Square, attackedBy?: Color): Square[] {
    if (!attackedBy) {
      return this._attacked(this._turn, Ox88[square], true)
    } else {
      return this._attacked(attackedBy, Ox88[square], true)
    }
  }

  isAttacked(square: Square, attackedBy: Color): boolean {
    return this._attacked(attackedBy, Ox88[square])
  }

  _isKingAttacked(color: Color): boolean {
    const square = this._kings[color]
    return square === -1 ? false : this._attacked(swapColor(color), square)
  }

  isCheck(): boolean {
    return this._isKingAttacked(this._turn)
  }

  inCheck(): boolean {
    return this.isCheck()
  }

  ascii(): string {
    let s = '   +------------------------+\n'
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      // display the rank
      if (file(i) === 0) {
        s += ' ' + '87654321'[rank(i)] + ' |'
      }

      if (this._board[i]) {
        const piece = this._board[i].type
        const color = this._board[i].color
        const symbol =
          color === WHITE ? piece.toUpperCase() : piece.toLowerCase()
        s += ' ' + symbol + ' '
      } else {
        s += ' . '
      }

      if ((i + 1) & 0x88) {
        s += '|\n'
        i += 8
      }
    }
    s += '   +------------------------+\n'
    s += '     a  b  c  d  e  f  g  h'

    return s
  }

  private _getPositionCount(hash: bigint): number {
    return this._positionCount.get(hash) ?? 0
  }

  isInsufficientMaterial(): boolean {
    /*
     * k.b. vs k.b. (of opposite colors) with mate in 1:
     * 8/8/8/8/1b6/8/B1k5/K7 b - - 0 1
     *
     * k.b. vs k.n. with mate in 1:
     * 8/8/8/8/1n6/8/B7/K1k5 b - - 2 1
     */
    const pieces: Record<PieceSymbol, number> = {
      b: 0,
      n: 0,
      r: 0,
      q: 0,
      k: 0,
      p: 0,
    }
    const bishops = []
    let numPieces = 0
    let squareColor = 0

    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      squareColor = (squareColor + 1) % 2
      if (i & 0x88) {
        i += 7
        continue
      }

      const piece = this._board[i]
      if (piece) {
        pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1
        if (piece.type === BISHOP) {
          bishops.push(squareColor)
        }
        numPieces++
      }
    }

    // k vs. k
    if (numPieces === 2) {
      return true
    } else if (
      // k vs. kn .... or .... k vs. kb
      numPieces === 3 &&
      (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)
    ) {
      return true
    } else if (numPieces === pieces[BISHOP] + 2) {
      // kb vs. kb where any number of bishops are all on the same color
      let sum = 0
      const len = bishops.length
      for (let i = 0; i < len; i++) {
        sum += bishops[i]
      }
      if (sum === 0 || sum === len) {
        return true
      }
    }

    return false
  }

  isThreefoldRepetition(): boolean {
    return this._getPositionCount(this._hash) >= 3
  }

  isDrawByFiftyMoves(): boolean {
    return this._halfMoves >= 100 // 50 moves per side = 100 half moves
  }

  _moves({
    legal = true,
    piece = undefined,
    square = undefined,
  }: {
    legal?: boolean
    piece?: PieceSymbol
    square?: Square
  } = {}): InternalMove[] {
    const forSquare = square ? (square.toLowerCase() as Square) : undefined
    const forPiece = piece?.toLowerCase()

    const moves: InternalMove[] = []
    const us = this._turn
    const them = swapColor(us)

    let firstSquare = Ox88.a8
    let lastSquare = Ox88.h1
    let singleSquare = false

    // are we generating moves for a single square?
    if (forSquare) {
      // illegal square, return empty moves
      if (!(forSquare in Ox88)) {
        return []
      } else {
        firstSquare = lastSquare = Ox88[forSquare]
        singleSquare = true
      }
    }

    for (let from = firstSquare; from <= lastSquare; from++) {
      // did we run off the end of the board
      if (from & 0x88) {
        from += 7
        continue
      }

      // empty square or opponent, skip
      if (!this._board[from] || this._board[from].color === them) {
        continue
      }
      const { type } = this._board[from]

      let to: number
      if (type === PAWN) {
        if (forPiece && forPiece !== type) continue

        // single square, non-capturing
        to = from + PAWN_OFFSETS[us][0]
        if (!this._board[to]) {
          addMove(moves, us, from, to, PAWN)

          // double square
          to = from + PAWN_OFFSETS[us][1]
          if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
            addMove(moves, us, from, to, PAWN, undefined, BITS.BIG_PAWN)
          }
        }

        // pawn captures
        for (let j = 2; j < 4; j++) {
          to = from + PAWN_OFFSETS[us][j]
          if (to & 0x88) continue

          if (this._board[to]?.color === them) {
            addMove(
              moves,
              us,
              from,
              to,
              PAWN,
              this._board[to].type,
              BITS.CAPTURE,
            )
          } else if (to === this._epSquare) {
            addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE)
          }
        }
      } else {
        if (forPiece && forPiece !== type) continue

        for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
          const offset = PIECE_OFFSETS[type][j]
          to = from

          while (true) {
            to += offset
            if (to & 0x88) break

            if (!this._board[to]) {
              addMove(moves, us, from, to, type)
            } else {
              // own color, stop loop
              if (this._board[to].color === us) break

              addMove(
                moves,
                us,
                from,
                to,
                type,
                this._board[to].type,
                BITS.CAPTURE,
              )
              break
            }

            /* break, if knight or king */
            if (type === KNIGHT || type === KING) break
          }
        }
      }
    }

    /*
     * check for castling if we're:
     *   a) generating all moves, or
     *   b) doing single square move generation on the king's square
     */

    if (forPiece === undefined || forPiece === KING) {
      if (!singleSquare || lastSquare === this._kings[us]) {
        // king-side castling
        if (this._castling[us] & BITS.KSIDE_CASTLE) {
          const castlingFrom = this._kings[us]
          const castlingTo = castlingFrom + 2

          if (
            !this._board[castlingFrom + 1] &&
            !this._board[castlingTo] &&
            !this._attacked(them, this._kings[us]) &&
            !this._attacked(them, castlingFrom + 1) &&
            !this._attacked(them, castlingTo)
          ) {
            addMove(
              moves,
              us,
              this._kings[us],
              castlingTo,
              KING,
              undefined,
              BITS.KSIDE_CASTLE,
            )
          }
        }

        // queen-side castling
        if (this._castling[us] & BITS.QSIDE_CASTLE) {
          const castlingFrom = this._kings[us]
          const castlingTo = castlingFrom - 2

          if (
            !this._board[castlingFrom - 1] &&
            !this._board[castlingFrom - 2] &&
            !this._board[castlingFrom - 3] &&
            !this._attacked(them, this._kings[us]) &&
            !this._attacked(them, castlingFrom - 1) &&
            !this._attacked(them, castlingTo)
          ) {
            addMove(
              moves,
              us,
              this._kings[us],
              castlingTo,
              KING,
              undefined,
              BITS.QSIDE_CASTLE,
            )
          }
        }
      }
    }

    /*
     * return all pseudo-legal moves (this includes moves that allow the king
     * to be captured)
     */
    if (!legal || this._kings[us] === -1) {
      return moves
    }

    /*
     * filter out illegal moves (moves that leave the king in check)
     */
    const legalMoves: InternalMove[] = []
    for (let i = 0; i < moves.length; i++) {
      this._makeMove(moves[i])
      if (!this._isKingAttacked(us)) {
        legalMoves.push(moves[i])
      }
      this._undoMove()
    }

    return legalMoves
  }

  board(): ({ square: Square; type: PieceSymbol; color: Color } | null)[][] {
    const output = []
    let row = []

    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (this._board[i] == null) {
        row.push(null)
      } else {
        row.push({
          square: algebraic(i),
          type: this._board[i].type,
          color: this._board[i].color,
        })
      }
      if ((i + 1) & 0x88) {
        output.push(row)
        row = []
        i += 8
      }
    }

    return output
  }

  // Zobrist hashing methods
  _pieceKey(i: number) {
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

  _epKey() {
    return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7]
  }

  _castlingKey() {
    const index = (this._castling.w >> 5) | (this._castling.b >> 3)
    return CASTLING_KEYS[index]
  }

  _computeHash() {
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

  // Game status methods
  isCheckmate(): boolean
  isCheckmate(legalMoves: InternalMove[]): boolean
  isCheckmate(legalMoves?: InternalMove[]): boolean {
    if (legalMoves === undefined) {
      legalMoves = this._moves({ legal: true })
    }
    return this.isCheck() && legalMoves.length === 0
  }

  isStalemate(): boolean
  isStalemate(legalMoves: InternalMove[]): boolean
  isStalemate(legalMoves?: InternalMove[]): boolean {
    if (legalMoves === undefined) {
      legalMoves = this._moves({ legal: true })
    }
    return !this.isCheck() && legalMoves.length === 0
  }

  isDraw(): boolean
  isDraw(legalMoves: InternalMove[]): boolean
  isDraw(legalMoves?: InternalMove[]): boolean {
    if (legalMoves === undefined) {
      legalMoves = this._moves({ legal: true })
    }
    return (
      this.isDrawByFiftyMoves() ||
      this.isStalemate(legalMoves) ||
      this.isInsufficientMaterial() ||
      this.isThreefoldRepetition()
    )
  }

  isGameOver(): boolean
  isGameOver(legalMoves: InternalMove[]): boolean
  isGameOver(legalMoves?: InternalMove[]): boolean {
    if (legalMoves === undefined) {
      legalMoves = this._moves({ legal: true })
    }
    return this.isCheckmate(legalMoves) || this.isDraw(legalMoves)
  }

  // Board manipulation methods
  _set(sq: number, piece: Piece) {
    this._hash ^= this._pieceKey(sq)
    this._board[sq] = piece
    this._hash ^= this._pieceKey(sq)
  }

  _clear(sq: number) {
    this._hash ^= this._pieceKey(sq)
    delete this._board[sq]
  }

  _movePiece(from: number, to: number) {
    this._hash ^= this._pieceKey(from)

    this._board[to] = this._board[from]
    delete this._board[from]

    this._hash ^= this._pieceKey(to)
  }

  // Make/Unmake move methods
  _push(move: InternalMove) {
    this._history.push({
      move,
      positionSnapshot: {
        board: new Array<Piece>(128), // Not used yet - will be used when we fully integrate Position
        kings: { b: this._kings.b, w: this._kings.w },
        turn: this._turn,
        castling: { b: this._castling.b, w: this._castling.w },
        epSquare: this._epSquare,
        fenEpSquare: this._fenEpSquare,
        halfMoves: this._halfMoves,
        moveNumber: this._moveNumber,
        hash: 0n, // Not used - hash is recomputed during undo
        positionCount: new Map(), // Not used yet
      },
    })
  }

  _makeMove(move: InternalMove) {
    const us = this._turn
    const them = swapColor(us)
    this._push(move)

    if (move.flags & BITS.NULL_MOVE) {
      if (us === BLACK) {
        this._moveNumber++
      }
      this._halfMoves++
      this._turn = them

      this._epSquare = EMPTY

      return
    }

    this._hash ^= this._epKey()
    this._hash ^= this._castlingKey()

    if (move.captured) {
      this._hash ^= this._pieceKey(move.to)
    }

    this._movePiece(move.from, move.to)

    // if ep capture, remove the captured pawn
    if (move.flags & BITS.EP_CAPTURE) {
      if (this._turn === BLACK) {
        this._clear(move.to - 16)
      } else {
        this._clear(move.to + 16)
      }
    }

    // if pawn promotion, replace with new piece
    if (move.promotion) {
      this._clear(move.to)
      this._set(move.to, { type: move.promotion, color: us })
    }

    // if we moved the king
    if (this._board[move.to].type === KING) {
      this._kings[us] = move.to

      // if we castled, move the rook next to the king
      if (move.flags & BITS.KSIDE_CASTLE) {
        const castlingTo = move.to - 1
        const castlingFrom = move.to + 1
        this._movePiece(castlingFrom, castlingTo)
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        const castlingTo = move.to + 1
        const castlingFrom = move.to - 2
        this._movePiece(castlingFrom, castlingTo)
      }

      // turn off castling
      this._castling[us] = 0
    }

    // turn off castling if we move a rook
    if (this._castling[us]) {
      for (let i = 0, len = ROOKS[us].length; i < len; i++) {
        if (
          move.from === ROOKS[us][i].square &&
          this._castling[us] & ROOKS[us][i].flag
        ) {
          this._castling[us] ^= ROOKS[us][i].flag
          break
        }
      }
    }

    // turn off castling if we capture a rook
    if (this._castling[them]) {
      for (let i = 0, len = ROOKS[them].length; i < len; i++) {
        if (
          move.to === ROOKS[them][i].square &&
          this._castling[them] & ROOKS[them][i].flag
        ) {
          this._castling[them] ^= ROOKS[them][i].flag
          break
        }
      }
    }

    this._hash ^= this._castlingKey()

    // if big pawn move, update the en passant square
    if (move.flags & BITS.BIG_PAWN) {
      let epSquare

      if (us === BLACK) {
        epSquare = move.to - 16
      } else {
        epSquare = move.to + 16
      }

      this._fenEpSquare = epSquare

      if (
        (!((move.to - 1) & 0x88) &&
          this._board[move.to - 1]?.type === PAWN &&
          this._board[move.to - 1]?.color === them) ||
        (!((move.to + 1) & 0x88) &&
          this._board[move.to + 1]?.type === PAWN &&
          this._board[move.to + 1]?.color === them)
      ) {
        this._epSquare = epSquare
        this._hash ^= this._epKey()
      } else {
        this._epSquare = EMPTY
      }
    } else {
      this._epSquare = EMPTY
      this._fenEpSquare = EMPTY
    }

    // reset the 50 move counter if a pawn is moved or a piece is captured
    if (move.piece === PAWN) {
      this._halfMoves = 0
    } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
      this._halfMoves = 0
    } else {
      this._halfMoves++
    }

    if (us === BLACK) {
      this._moveNumber++
    }

    this._turn = them
    this._hash ^= SIDE_KEY
  }

  _undoMove(): InternalMove | null {
    const old = this._history.pop()
    if (old === undefined) {
      return null
    }

    // XOR out current ep/castling before restoring old state
    this._hash ^= this._epKey()
    this._hash ^= this._castlingKey()

    const move = old.move
    const snapshot = old.positionSnapshot

    // Restore position state from snapshot (except board and hash - handled by undo logic)
    this._kings = snapshot.kings
    this._turn = snapshot.turn
    this._castling = snapshot.castling
    this._epSquare = snapshot.epSquare
    this._fenEpSquare = snapshot.fenEpSquare
    this._halfMoves = snapshot.halfMoves
    this._moveNumber = snapshot.moveNumber
    // Note: hash is managed via XOR operations, positionCount managed separately

    // XOR in restored ep/castling/side
    this._hash ^= this._epKey()
    this._hash ^= this._castlingKey()
    this._hash ^= SIDE_KEY

    const us = this._turn
    const them = swapColor(us)

    if (move.flags & BITS.NULL_MOVE) {
      return move
    }

    this._movePiece(move.to, move.from)

    // to undo any promotions
    if (move.piece) {
      this._clear(move.from)
      this._set(move.from, { type: move.piece, color: us })
    }

    if (move.captured) {
      if (move.flags & BITS.EP_CAPTURE) {
        // en passant capture
        let index: number
        if (us === BLACK) {
          index = move.to - 16
        } else {
          index = move.to + 16
        }
        this._set(index, { type: PAWN, color: them })
      } else {
        // regular capture
        this._set(move.to, { type: move.captured, color: them })
      }
    }

    if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
      let castlingTo: number, castlingFrom: number
      if (move.flags & BITS.KSIDE_CASTLE) {
        castlingTo = move.to + 1
        castlingFrom = move.to - 1
      } else {
        castlingTo = move.to - 2
        castlingFrom = move.to + 1
      }
      this._movePiece(castlingFrom, castlingTo)
    }

    return move
  }

  // Helper methods for position management
  _updateCastlingRights() {
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

  _updateEnPassantSquare() {
    if (this._epSquare === EMPTY) {
      return
    }

    const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16)
    const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16)
    const attackers = [currentSquare + 1, currentSquare - 1]

    if (
      this._board[startSquare] !== null ||
      this._board[this._epSquare] !== null ||
      this._board[currentSquare]?.color !== swapColor(this._turn) ||
      this._board[currentSquare]?.type !== PAWN
    ) {
      this._hash ^= this._epKey()
      this._epSquare = EMPTY
      return
    }

    const canCapture = (square: number) =>
      !(square & 0x88) &&
      this._board[square]?.color === this._turn &&
      this._board[square]?.type === PAWN

    if (!attackers.some(canCapture)) {
      this._hash ^= this._epKey()
      this._epSquare = EMPTY
    }
  }

  _incPositionCount() {
    this._positionCount.set(
      this._hash,
      (this._positionCount.get(this._hash) ?? 0) + 1,
    )
  }

  _decPositionCount(hash: bigint) {
    const currentCount = this._positionCount.get(hash) ?? 0

    if (currentCount === 1) {
      this._positionCount.delete(hash)
    } else {
      this._positionCount.set(hash, currentCount - 1)
    }
  }

  /**
   * Helper function to get move disambiguator for SAN notation
   * @internal
   */
  private static _getDisambiguator(
    move: InternalMove,
    moves: InternalMove[],
  ): string {
    const from = move.from
    const to = move.to
    const piece = move.piece

    let ambiguities = 0
    let sameRank = 0
    let sameFile = 0

    for (let i = 0, len = moves.length; i < len; i++) {
      const ambigFrom = moves[i].from
      const ambigTo = moves[i].to
      const ambigPiece = moves[i].piece

      /*
       * if a move of the same piece type ends on the same to square, we'll need
       * to add a disambiguator to the algebraic notation
       */
      if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
        ambiguities++

        if (rank(from) === rank(ambigFrom)) {
          sameRank++
        }

        if (file(from) === file(ambigFrom)) {
          sameFile++
        }
      }
    }

    if (ambiguities > 0) {
      if (sameRank > 0 && sameFile > 0) {
        /*
         * if there exists a similar moving piece on the same rank and file as
         * the move in question, use the square as the disambiguator
         */
        return algebraic(from)
      } else if (sameFile > 0) {
        /*
         * if the moving piece rests on the same file, use the rank symbol as the
         * disambiguator
         */
        return algebraic(from).charAt(1)
      } else {
        // else use the file symbol
        return algebraic(from).charAt(0)
      }
    }

    return ''
  }

  /**
   * Convert a move from 0x88 coordinates to Standard Algebraic Notation (SAN)
   * @internal
   */
  _moveToSan(move: InternalMove, moves: InternalMove[]): string {
    let output = ''

    if (move.flags & BITS.KSIDE_CASTLE) {
      output = 'O-O'
    } else if (move.flags & BITS.QSIDE_CASTLE) {
      output = 'O-O-O'
    } else if (move.flags & BITS.NULL_MOVE) {
      return SAN_NULLMOVE
    } else {
      if (move.piece !== PAWN) {
        const disambiguator = Game._getDisambiguator(move, moves)
        output += move.piece.toUpperCase() + disambiguator
      }

      if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        if (move.piece === PAWN) {
          output += algebraic(move.from)[0]
        }
        output += 'x'
      }

      output += algebraic(move.to)

      if (move.promotion) {
        output += '=' + move.promotion.toUpperCase()
      }
    }

    this._makeMove(move)
    const legalMoves = this._moves({ legal: true })
    if (this._isKingAttacked(this._turn)) {
      if (this.isCheckmate(legalMoves)) {
        output += '#'
      } else {
        output += '+'
      }
    }
    this._undoMove()

    return output
  }

  /**
   * Convert a move from Standard Algebraic Notation (SAN) to InternalMove format
   * @internal
   */
  _moveFromSan(move: string, strict = false): InternalMove | null {
    // strip off any move decorations: e.g Nf3+?! becomes Nf3
    let cleanMove = Game._strippedSan(move)

    if (!strict) {
      if (cleanMove === '0-0') {
        cleanMove = 'O-O'
      } else if (cleanMove === '0-0-0') {
        cleanMove = 'O-O-O'
      }
    }

    // first implementation of null with a dummy move (black king moves from a8 to a8)
    if (cleanMove == SAN_NULLMOVE) {
      const res: InternalMove = {
        color: this._turn,
        from: 0,
        to: 0,
        piece: 'k',
        flags: BITS.NULL_MOVE,
      }
      return res
    }

    let pieceType = Game._inferPieceType(cleanMove)
    let moves = this._moves({ legal: true, piece: pieceType })

    // strict parser
    for (let i = 0, len = moves.length; i < len; i++) {
      if (cleanMove === Game._strippedSan(this._moveToSan(moves[i], moves))) {
        return moves[i]
      }
    }

    // the strict parser failed
    if (strict) {
      return null
    }

    let piece = undefined
    let matches = undefined
    let from = undefined
    let to = undefined
    let promotion = undefined

    /*
     * The default permissive (non-strict) parser allows the user to parse
     * non-standard chess notations. This parser is only run after the strict
     * Standard Algebraic Notation (SAN) parser has failed.
     *
     * When running the permissive parser, we'll run a regex to grab the piece, the
     * to/from square, and an optional promotion piece. This regex will
     * parse common non-standard notation like: Pe2-e4, Rc1c4, Qf3xf7,
     * f7f8q, b1c3
     *
     * NOTE: Some positions and moves may be ambiguous when using the permissive
     * parser. For example, in this position: 6k1/8/8/B7/8/8/8/BN4K1 w - - 0 1,
     * the move b1c3 may be interpreted as Nc3 or B1c3 (a disambiguated bishop
     * move). In these cases, the permissive parser will default to the most
     * basic interpretation (which is b1c3 parsing to Nc3).
     */

    let overlyDisambiguated = false

    matches = cleanMove.match(
      /([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/,
      //     piece         from              to       promotion
    )

    if (matches) {
      piece = matches[1]
      from = matches[2] as Square
      to = matches[3] as Square
      promotion = matches[4]

      if (from.length == 1) {
        overlyDisambiguated = true
      }
    } else {
      /*
       * The [a-h]?[1-8]? portion of the regex below handles moves that may be
       * overly disambiguated (e.g. Nge7 is unnecessary and non-standard when
       * there is one legal knight move to e7). In this case, the value of
       * 'from' variable will be a rank or file, not a square.
       */

      matches = cleanMove.match(
        /([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/,
      )

      if (matches) {
        piece = matches[1]
        from = matches[2] as Square
        to = matches[3] as Square
        promotion = matches[4]

        if (from.length == 1) {
          overlyDisambiguated = true
        }
      }
    }

    pieceType = Game._inferPieceType(cleanMove)
    moves = this._moves({
      legal: true,
      piece: piece ? (piece as PieceSymbol) : pieceType,
    })

    if (!to) {
      return null
    }

    for (let i = 0, len = moves.length; i < len; i++) {
      if (!from) {
        // if there is no from square, it could be just 'x' missing from a capture
        if (
          cleanMove ===
          Game._strippedSan(this._moveToSan(moves[i], moves)).replace('x', '')
        ) {
          return moves[i]
        }
        // hand-compare move properties with the results from our permissive regex
      } else if (
        (!piece || piece.toLowerCase() == moves[i].piece) &&
        Ox88[from] == moves[i].from &&
        Ox88[to] == moves[i].to &&
        (!promotion || promotion.toLowerCase() == moves[i].promotion)
      ) {
        return moves[i]
      } else if (overlyDisambiguated) {
        /*
         * SPECIAL CASE: we parsed a move string that may have an unneeded
         * rank/file disambiguator (e.g. Nge7).  The 'from' variable will
         */

        const square = algebraic(moves[i].from)
        if (
          (!piece || piece.toLowerCase() == moves[i].piece) &&
          Ox88[to] == moves[i].to &&
          (from == square[0] || from == square[1]) &&
          (!promotion || promotion.toLowerCase() == moves[i].promotion)
        ) {
          return moves[i]
        }
      }
    }

    return null
  }

  /**
   * @deprecated Use setHeader/getHeaders instead
   */
  header(...args: string[]): Record<string, string | null> {
    if (args.length === 0) {
      return this.getHeaders()
    }
    if (args.length === 2) {
      return this.setHeader(args[0], args[1])
    }
    throw new Error('header() requires 0 or 2 arguments')
  }

  setHeader(key: string, value: string): Record<string, string> {
    // Don't allow seven tag roster headers to be set to null - keep their defaults
    if (value === null && key in SEVEN_TAG_ROSTER) {
      return this.getHeaders()
    }

    this._header[key] = value
    if (!(key in SEVEN_TAG_ROSTER)) {
      SUPPLEMENTAL_TAGS[key] = value
    }
    return this.getHeaders()
  }

  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(this._header)) {
      if (value !== null) {
        headers[key] = value
      }
    }
    return headers
  }

  /**
   * Generate FEN string from current position
   */
  fen({
    forceEnpassantSquare = false,
  }: { forceEnpassantSquare?: boolean } = {}): string {
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

    let epSquare = '-'
    /*
     * only print the ep square if en passant is a valid move (pawn is present
     * and ep capture is not pinned)
     */
    if (this._fenEpSquare !== EMPTY) {
      if (forceEnpassantSquare) {
        epSquare = algebraic(this._fenEpSquare)
      } else if (this._epSquare !== EMPTY) {
        const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16)
        const squares = [bigPawnSquare + 1, bigPawnSquare - 1]

        for (const square of squares) {
          // is the square off the board?
          if (square & 0x88) {
            continue
          }

          const color = this._turn

          // is there a pawn that can capture the epSquare?
          if (
            this._board[square]?.color === color &&
            this._board[square]?.type === PAWN
          ) {
            // if the pawn makes an ep capture, does it leave its king in check?
            this._makeMove({
              color,
              from: square,
              to: this._epSquare,
              piece: PAWN,
              captured: PAWN,
              flags: BITS.EP_CAPTURE,
            })
            const isLegal = !this._isKingAttacked(color)
            this._undoMove()

            // if ep is legal, break and set the ep square in the FEN output
            if (isLegal) {
              epSquare = algebraic(this._epSquare)
              break
            }
          }
        }
      }
    }

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
   * Load position from FEN string
   * Note: This doesn't handle headers - that's managed by ChessPGN
   */
  load(
    fen: string,
    { skipValidation = false }: { skipValidation?: boolean } = {},
  ): void {
    let tokens = fen.split(/\s+/)

    // append commonly omitted fen tokens
    if (tokens.length >= 2 && tokens.length < 6) {
      const adjustments = ['-', '-', '0', '1']
      fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(' ')
    }

    tokens = fen.split(/\s+/)

    if (!skipValidation) {
      /*
       * Import validateFen from chessPGN if needed, or inline it here
       * For now, we'll skip validation in Game and let ChessPGN handle it
       */
    }

    const position = tokens[0]
    let square = 0

    // Clear board and reset state (but NOT headers)
    this._position._board = new Array<Piece>(128)
    this._kings = { w: EMPTY, b: EMPTY }
    this._turn = WHITE
    this._castling = { w: 0, b: 0 }
    this._epSquare = EMPTY
    this._fenEpSquare = EMPTY
    this._halfMoves = 0
    this._moveNumber = 1
    this._history = []
    this._hash = this._computeHash()
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
    /*
     * Note: Position count is incremented by the caller (ChessPGN.load or after moves)
     * not during FEN loading, since loading is setting up a position, not making a move
     */
    
    // Keep Position in sync
    this._position.load(fen)
  }

  /**
   * Reset game internal state to an initial starting position.
   * If `preserveHeaders` is false (default) the header template will be
   * re-applied. When true, existing headers are preserved.
   */
  reset(preserveHeaders: boolean = false): void {
    // Reset board and state
    this._position._board = new Array<Piece>(128)
    this._kings = { w: EMPTY, b: EMPTY }
    this._turn = WHITE
    this._castling = { w: 0, b: 0 }
    this._epSquare = EMPTY
    this._fenEpSquare = EMPTY
    this._halfMoves = 0
    this._moveNumber = 1
    this._history = []

    // Headers: reset to template unless caller asked to preserve
    if (!preserveHeaders) {
      this._header = { ...HEADER_TEMPLATE }
    }

    // Clear any SetUp/FEN tags when resetting to the default position
    this._header['SetUp'] = null
    this._header['FEN'] = null

    // Recompute hash and clear position counts
    this._hash = this._computeHash()
    this._positionCount = new Map<bigint, number>()
    // Clear per-position metadata when not preserving headers
    if (!preserveHeaders) {
      this._comments = {}
      this._suffixes = {}
    }
  }

  /**
   * Per-position comment / suffix API
   * These mirror the older ChessPGN APIs but live on Game so that
   * multi-game cursors can yield independent Game instances with their
   * own per-game metadata.
   */

  _pruneComments() {
    const reversedHistory: (InternalMove | null)[] = []
    const currentComments: Record<string, string> = {}

    const copyComment = (fen: string) => {
      if (fen in this._comments) {
        currentComments[fen] = this._comments[fen]
      }
    }

    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove())
    }

    copyComment(this.fen())

    while (true) {
      const move = reversedHistory.pop()
      if (!move) break
      this._makeMove(move)
      copyComment(this.fen())
    }

    this._comments = currentComments
  }

  getComment(fen?: string): string | undefined {
    return this._comments[fen ?? this.fen()]
  }

  setComment(comment: string, fen?: string): void {
    /**
     * Store the comment exactly as provided by the caller. Caller may be the
     * PGN parser (which expects raw braces preserved) or the user API which
     * may sanitize before calling.
     */
    this._comments[fen ?? this.fen()] = comment
  }

  removeComment(fen?: string): string | undefined {
    const key = fen ?? this.fen()
    const old = this._comments[key]
    delete this._comments[key]
    return old
  }

  getComments(): {
    fen: string
    comment?: string
    suffixAnnotation?: string
  }[] {
    this._pruneComments()

    const allFenKeys = new Set<string>()
    Object.keys(this._comments).forEach((fen) => allFenKeys.add(fen))
    Object.keys(this._suffixes).forEach((fen) => allFenKeys.add(fen))

    const result: {
      fen: string
      comment?: string
      suffixAnnotation?: string
    }[] = []
    for (const fen of allFenKeys) {
      const commentContent = this._comments[fen]
      const suffixAnnotation = this._suffixes[fen]

      const entry: {
        fen: string
        comment?: string
        suffixAnnotation?: string
      } = { fen }
      if (commentContent !== undefined) entry.comment = commentContent
      if (suffixAnnotation !== undefined)
        entry.suffixAnnotation = suffixAnnotation
      result.push(entry)
    }

    return result
  }

  public getSuffixAnnotation(fen?: string): Suffix | undefined {
    return this._suffixes[fen ?? this.fen()]
  }

  public setSuffixAnnotation(suffix: Suffix, fen?: string): void {
    if (!SUFFIX_LIST.includes(suffix)) {
      throw new Error(`Invalid suffix: ${suffix}`)
    }
    this._suffixes[fen ?? this.fen()] = suffix
  }

  public removeSuffixAnnotation(fen?: string): Suffix | undefined {
    const key = fen ?? this.fen()
    const old = this._suffixes[key]
    delete this._suffixes[key]
    return old
  }

  removeComments(): { fen: string; comment: string }[] {
    this._pruneComments()
    return Object.keys(this._comments).map((fen) => {
      const comment = this._comments[fen]
      delete this._comments[fen]
      return { fen: fen, comment: comment }
    })
  }

  /*
   * ==========================================================================
   * Public Move API - enables Game instances from Cursor to work standalone
   * ==========================================================================
   */

  /**
   * Generate all legal moves for the current position.
   * Supports filtering by square and/or piece, and verbose mode for full Move objects.
   */
  moves(): string[]
  moves({ square }: { square: Square }): string[]
  moves({ piece }: { piece: PieceSymbol }): string[]
  moves({ square, piece }: { square: Square; piece: PieceSymbol }): string[]
  moves({ verbose, square }: { verbose: true; square?: Square }): Move[]
  moves({ verbose, square }: { verbose: false; square?: Square }): string[]
  moves({
    verbose,
    square,
  }: {
    verbose?: boolean
    square?: Square
  }): string[] | Move[]
  moves({ verbose, piece }: { verbose: true; piece?: PieceSymbol }): Move[]
  moves({ verbose, piece }: { verbose: false; piece?: PieceSymbol }): string[]
  moves({
    verbose,
    piece,
  }: {
    verbose?: boolean
    piece?: PieceSymbol
  }): string[] | Move[]
  moves({
    verbose,
    square,
    piece,
  }: {
    verbose: true
    square?: Square
    piece?: PieceSymbol
  }): Move[]
  moves({
    verbose,
    square,
    piece,
  }: {
    verbose: false
    square?: Square
    piece?: PieceSymbol
  }): string[]
  moves({
    verbose,
    square,
    piece,
  }: {
    verbose?: boolean
    square?: Square
    piece?: PieceSymbol
  }): string[] | Move[]
  moves({ square, piece }: { square?: Square; piece?: PieceSymbol }): Move[]
  moves({
    verbose = false,
    square = undefined,
    piece = undefined,
  }: { verbose?: boolean; square?: Square; piece?: PieceSymbol } = {}) {
    const legalMoves = this._moves({ legal: true, square, piece })

    if (verbose) {
      return legalMoves.map((move) => createPrettyMove(this, move))
    } else {
      return legalMoves.map((move) => this._moveToSan(move, legalMoves))
    }
  }

  /**
   * Make a move on the board.
   * @param move - SAN string (e.g., 'e4'), move object ({ from: 'e2', to: 'e4' }), or null for null move
   * @param options - { strict: boolean } - whether to strictly validate SAN format
   * @returns Move object with full details
   * @throws Error if move is invalid
   */
  move(
    move: string | { from: string; to: string; promotion?: string } | null,
    { strict = false }: { strict?: boolean } = {},
  ): Move {
    let moveObj: InternalMove | null = null

    if (typeof move === 'string') {
      moveObj = this._moveFromSan(move, strict)
    } else if (move === null) {
      moveObj = this._moveFromSan(SAN_NULLMOVE, strict)
    } else if (typeof move === 'object') {
      const moves = this._moves({ legal: true })

      // Convert pretty move object to internal move
      for (let i = 0, len = moves.length; i < len; i++) {
        if (
          move.from === algebraic(moves[i].from) &&
          move.to === algebraic(moves[i].to) &&
          (!('promotion' in moves[i]) || move.promotion === moves[i].promotion)
        ) {
          moveObj = moves[i]
          break
        }
      }
    }

    // Failed to find move
    if (!moveObj) {
      if (typeof move === 'string') {
        throw new Error(`Invalid move: ${move}`)
      } else {
        throw new Error(`Invalid move: ${JSON.stringify(move)}`)
      }
    }

    // Disallow null moves when in check
    if (this.isCheck() && moveObj.flags & BITS.NULL_MOVE) {
      throw new Error('Null move not allowed when in check')
    }

    // Create pretty move before making the move (need current state for SAN/FEN)
    const prettyMove = createPrettyMove(this, moveObj)

    this._makeMove(moveObj)
    return prettyMove
  }

  /**
   * Undo the last move made.
   * @returns Move object that was undone, or null if no moves to undo
   */
  undo(): Move | null {
    const move = this._undoMove()
    if (move) {
      return createPrettyMove(this, move)
    }
    return null
  }

  /**
   * Generate PGN string for the game
   * @param options - Formatting options (newline character and max width)
   * @returns PGN string representation of the game
   */
  pgn({
    newline = '\n',
    maxWidth = 0,
  }: { newline?: string; maxWidth?: number } = {}): string {
    const result: string[] = []
    const { lines: headerLines, headerExists } = renderHeaders(
      this._header,
      newline,
    )
    result.push(...headerLines)

    if (headerExists && this._history.length) {
      result.push(newline)
    }

    const appendComment = (moveString: string) => {
      const comment = this.getComment()
      if (typeof comment !== 'undefined') {
        const delimiter = moveString.length > 0 ? ' ' : ''
        moveString = `${moveString}${delimiter}{${comment}}`
      }
      return moveString
    }

    /* Pop all of history onto reversed_history */
    const reversedHistory = []
    while (this._history.length > 0) {
      const move = this._undoMove()
      if (move) reversedHistory.push(move)
    }

    const moves = []
    let moveString = ''
    let moveNumber = 1

    /* Special case of a commented starting position with no moves */
    if (reversedHistory.length === 0) {
      moves.push(appendComment(''))
    }

    /* Build the list of moves */
    while (reversedHistory.length > 0) {
      moveString = appendComment(moveString)
      const move = reversedHistory.pop()

      if (!move) break

      /* If the position started with black to move, start PGN with number. ... */
      if (this._history.length === 0 && move.color === 'b') {
        const prefix = `${moveNumber}. ...`
        moveString = moveString ? `${moveString} ${prefix}` : prefix
      } else if (move.color === 'w') {
        /* Store the previous generated move_string if we have one */
        if (moveString.length) {
          moves.push(moveString)
        }
        moveString = moveNumber + '.'
      }

      moveString =
        moveString + ' ' + this._moveToSan(move, this._moves({ legal: true }))
      this._makeMove(move)

      if (move.color === 'b') {
        moveNumber++
      }
    }

    /* Are there any other leftover moves? */
    if (moveString.length) {
      moves.push(appendComment(moveString))
    }

    /* Add result (there ALWAYS has to be a result according to spec) */
    moves.push(this._header.Result || '*')

    /* Join together moves */
    if (maxWidth === 0) {
      return result.join('') + moves.join(' ')
    }

    /* Wrap at maxWidth */
    const strip = function () {
      if (result.length > 0 && result[result.length - 1] === ' ') {
        result.pop()
        return true
      }
      return false
    }

    const wrapComment = function (width: number, move: string) {
      for (const token of move.split(' ')) {
        if (!token) continue
        if (width + token.length > maxWidth) {
          while (strip()) {
            width--
          }
          result.push(newline)
          width = 0
        }
        result.push(token)
        width += token.length
        result.push(' ')
        width++
      }
      if (strip()) {
        width--
      }
      return width
    }

    let currentWidth = 0
    for (let i = 0; i < moves.length; i++) {
      if (currentWidth + moves[i].length > maxWidth) {
        if (moves[i].includes('{')) {
          currentWidth = wrapComment(currentWidth, moves[i])
          continue
        }
      }
      if (currentWidth + moves[i].length > maxWidth && i !== 0) {
        if (result[result.length - 1] === ' ') {
          result.pop()
        }
        result.push(newline)
        currentWidth = 0
      } else if (i !== 0) {
        result.push(' ')
        currentWidth++
      }
      result.push(moves[i])
      currentWidth += moves[i].length
    }

    return result.join('')
  }
}
