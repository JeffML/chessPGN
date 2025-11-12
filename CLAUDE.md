# chessPGN has several kinds of methods:

- FEN parsing methods
  - Chess constructor
  - load
  - validateFen
- PGN parsing methods
  - loadPgn
- Game manipulation/representation methods
  - ascii
  - attackers
  - board
  - clear
  - fen
  - findPiece
  - get
  - getCastlingRights
  - getComment
  - getComments
  - getHeaders
  - hash
  - history
  - inCheck
  - isAttacked
  - isCheckmate
  - isDraw
  - isDrawByFiftyMoves
  - isInsufficientMaterial
  - isGameOver
  - isStalemate
  - isThreeFoldRepitition
  - move
  - moveNumber
  - moves
  - pgn
  - put
  - remove
  - removeComment
  - removeComments
  - removeHeader
  - reset
  - setCastlingRights
  - setComment
  - setHeader
  - setTurn
  - turn
  - undo
- Miscellaneous
  - squareColor

# code modifications

Any code modifications must pass `npm run check`
