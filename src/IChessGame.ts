import type { Color, Piece, PieceSymbol, Square } from './types'
import type { Move } from './Move'

/**
 * Common interface for chess game implementations.
 *
 * This interface defines the core public API contract shared between ChessPGN
 * (legacy wrapper) and Game (core implementation). Both classes implement
 * these methods to provide consistent chess game functionality.
 *
 * Note: This interface includes only methods that are truly shared between both
 * classes. Some methods like hash(), setCastlingRights(), and getCastlingRights()
 * are ChessPGN-specific and not included here.
 *
 * @interface IChessGame
 */
export interface IChessGame {
  // Position manipulation
  /**
   * Load a position from FEN notation
   * @param fen - FEN string representing the position
   * @param options - Optional configuration (skipValidation, preserveHeaders)
   */
  load(
    fen: string,
    options?: { skipValidation?: boolean; preserveHeaders?: boolean },
  ): void

  /**
   * Get the FEN string for the current position
   * @param options - Optional configuration (forceEnpassantSquare)
   * @returns FEN string
   */
  fen(options?: { forceEnpassantSquare?: boolean }): string

  /**
   * Reset the game to the starting position
   * @param preserveHeaders - Whether to keep existing headers
   */
  reset(preserveHeaders?: boolean): void

  // Board queries
  /**
   * Get the piece at a specific square
   * @param square - Square to query (e.g., 'e4')
   * @returns Piece at the square or undefined if empty
   */
  get(square: Square): Piece | undefined

  /**
   * Find all squares containing a specific piece
   * @param piece - Piece to find
   * @returns Array of squares containing the piece
   */
  findPiece(piece: Piece): Square[]

  /**
   * Get a 2D array representation of the board
   * @returns 8x8 array of pieces or null for empty squares
   */
  board(): ({ square: Square; type: PieceSymbol; color: Color } | null)[][]

  // Move operations
  /**
   * Make a move on the board
   * @param move - Move in SAN notation, object notation, or null for null move
   * @param options - Optional configuration (strict mode)
   * @returns Move object with details
   * @throws Error if move is invalid
   */
  move(
    move: string | { from: string; to: string; promotion?: string } | null,
    options?: { strict?: boolean },
  ): Move

  /**
   * Undo the last move
   * @returns Move object that was undone, or null if no moves to undo
   */
  undo(): Move | null

  // Game state queries
  /**
   * Check if the current side to move is in check
   * @returns true if in check
   */
  isCheck(): boolean

  /**
   * Check if the current position is checkmate
   * @returns true if checkmate
   */
  isCheckmate(): boolean

  /**
   * Check if the current position is stalemate
   * @returns true if stalemate
   */
  isStalemate(): boolean

  /**
   * Check if the game is drawn (by any condition)
   * @returns true if drawn
   */
  isDraw(): boolean

  /**
   * Check if the game is over (checkmate or draw)
   * @returns true if game is over
   */
  isGameOver(): boolean

  // Headers
  /**
   * Set a PGN header tag
   * @param key - Header name
   * @param value - Header value
   * @returns Updated headers object
   */
  setHeader(key: string, value: string): Record<string, string>

  /**
   * Get all PGN header tags
   * @returns Object containing all headers
   */
  getHeaders(): Record<string, string>

  // Comments
  /**
   * Get comment for current or specified position
   * @param fen - Optional FEN string to get comment for specific position
   * @returns Comment string or undefined
   */
  getComment(fen?: string): string | undefined

  /**
   * Set comment for current position
   * @param comment - Comment text
   * @param fen - Optional FEN string to set comment for specific position
   */
  setComment(comment: string, fen?: string): void

  /**
   * Remove comment for current or specified position
   * @param fen - Optional FEN string to remove comment from specific position
   * @returns Removed comment or undefined
   */
  removeComment(fen?: string): string | undefined

  // PGN operations
  /**
   * Generate PGN string for the game
   * @param options - Formatting options (newline, maxWidth)
   * @returns PGN string
   */
  pgn(options?: { newline?: string; maxWidth?: number }): string
}
