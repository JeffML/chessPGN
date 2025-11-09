/**
 * Test helpers for comparing ChessPGN and Game API behavior
 */

import { ChessPGN } from '../src/chessPGN'
import { Game } from '../src/Game'
import { CursorImpl, indexPgnGames } from '../src/Cursor'
import type { Move } from '../src/Move'
import type { Square, PieceSymbol, Piece } from '../src/types'

/**
 * Load a multi-game PGN and return Cursor with specified range
 */
export function createCursorForTesting(
  pgn: string,
  start: number = 0,
  length: number = 10,
): CursorImpl {
  const indices = indexPgnGames(pgn)
  return new CursorImpl(pgn, indices, { start, length })
}

/**
 * Create ChessPGN instance that matches a Game instance's position
 * by loading the Game's PGN representation
 */
export function createMatchingChessPgn(gameInstance: Game): ChessPGN {
  const chess = new ChessPGN()
  const gamePgn = gameInstance.pgn()
  chess.loadPgn(gamePgn)
  return chess
}

/**
 * Compare moves() results between Game and ChessPGN
 */
export function compareMovesResults(
  game: Game,
  chess: ChessPGN,
  options?: { verbose?: boolean; square?: Square; piece?: PieceSymbol },
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameMoves = game.moves(options as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chessMoves = chess.moves(options as any)

  if (gameMoves.length !== chessMoves.length) return false

  // For string arrays, compare values
  if (typeof gameMoves[0] === 'string') {
    const gameSet = new Set(gameMoves as string[])
    return (chessMoves as string[]).every((m) => gameSet.has(m))
  }

  // For Move arrays, compare SAN
  const gameSans = (gameMoves as unknown as Move[]).map((m) => m.san).sort()
  const chessSans = (chessMoves as unknown as Move[]).map((m) => m.san).sort()
  return JSON.stringify(gameSans) === JSON.stringify(chessSans)
}

/**
 * Compare move() results between Game and ChessPGN
 */
export function compareMoveResults(
  game: Game,
  chess: ChessPGN,
  move: string | { from: string; to: string; promotion?: string } | null,
): boolean {
  try {
    const gameMove = game.move(move)
    const chessMove = chess.move(move)

    return (
      gameMove.san === chessMove.san &&
      gameMove.from === chessMove.from &&
      gameMove.to === chessMove.to &&
      gameMove.piece === chessMove.piece
    )
  } catch {
    try {
      chess.move(move)
      return false // Game threw but ChessPGN didn't
    } catch {
      return true // Both threw
    }
  }
}

/**
 * Compare undo() results between Game and ChessPGN
 */
export function compareUndoResults(game: Game, chess: ChessPGN): boolean {
  const gameUndo = game.undo()
  const chessUndo = chess.undo()

  if (gameUndo === null && chessUndo === null) return true
  if (gameUndo === null || chessUndo === null) return false

  return gameUndo.san === chessUndo.san
}

/**
 * Compare game state queries between Game and ChessPGN
 */
export function compareGameState(
  game: Game,
  chess: ChessPGN,
): {
  isCheckmate: boolean
  isCheck: boolean
  isStalemate: boolean
  isDraw: boolean
  isGameOver: boolean
  fen: boolean
} {
  return {
    isCheckmate: game.isCheckmate() === chess.isCheckmate(),
    isCheck: game.isCheck() === chess.isCheck(),
    isStalemate: game.isStalemate() === chess.isStalemate(),
    isDraw: game.isDraw() === chess.isDraw(),
    isGameOver: game.isGameOver() === chess.isGameOver(),
    fen: game.fen() === chess.fen(),
  }
}

/**
 * Compare get() results between Game and ChessPGN
 */
export function compareGetResults(
  game: Game,
  chess: ChessPGN,
  square: Square,
): boolean {
  const gamePiece = game.get(square)
  const chessPiece = chess.get(square)

  if (gamePiece === undefined && chessPiece === undefined) return true
  if (gamePiece === undefined || chessPiece === undefined) return false

  return (
    gamePiece.type === chessPiece.type && gamePiece.color === chessPiece.color
  )
}

/**
 * Compare findPiece() results between Game and ChessPGN
 */
export function compareFindPieceResults(
  game: Game,
  chess: ChessPGN,
  piece: Piece,
): boolean {
  const gameSquares = game.findPiece(piece)
  const chessSquares = chess.findPiece(piece)

  if (gameSquares.length !== chessSquares.length) return false

  /* Sort both arrays for consistent comparison */
  const gameSorted = [...gameSquares].sort()
  const chessSorted = [...chessSquares].sort()

  return JSON.stringify(gameSorted) === JSON.stringify(chessSorted)
}
