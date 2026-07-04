## Plan: chessPGN960 — Chess960 variant built on chessPGN

**TL;DR**: Create a `Game960` subclass that overrides castling logic to support
Fischer Random Chess, built entirely on top of the existing `Game` class.

### Design Decisions

- **Subclass `Game`** (not wrapper): Private `_moves()`, `_makeMove()`,
  `_updateCastlingRights()` are naturally accessible for override.
- **Shredder-FEN**: `HAha`-style castling notation (uppercase = white rooks,
  lowercase = black; letters indicate starting file of eligible rooks). No
  engine dependency — "Shredder" refers to the notation format only.
- **Dynamic rook tracking**: Store start positions at construction, track
  moves/captures to invalidate castling rights.
- **Explicit opt-in**: `new Game960({ index: 518 })` or `new Game960({ fen })`.
  No auto-detection from FEN (avoids ambiguity).

### LOC Estimates

| File                               | Purpose                                                                                           | ~LOC     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| `src/types.ts` (modify)            | `generate960Position()`, Shredder-FEN helpers                                                     | 80       |
| `src/Game960.ts` (new)             | Core class: constructor, load, fen, \_moves castling, \_makeMove castling, \_updateCastlingRights | 220      |
| `src/chessPGN960.ts` (new)         | Public exports + startPosition(index) helper                                                      | 40       |
| `src/chessPGN.ts` (modify)         | Export Game960                                                                                    | 3        |
| `__tests__/chess960.test.ts` (new) | Tests: position validity, castling, FEN round-trip, rights                                        | 150      |
| **Total**                          |                                                                                                   | **~493** |

### Steps

#### Phase 1: Types & 960 Position Generator (~80 LOC)

1. Add to `src/types.ts`:
   - `generate960Position(index)` → FEN string for SP 0-959
   - `all960Positions` array (lazily computed)
   - `DEFAULT_POSITION_960` (standard as SP 518)
   - Shredder-FEN castling parse/format helpers

#### Phase 2: Game960 Core (~220 LOC) — depends on Phase 1

2. Create `src/Game960.ts`: a. Constructor: accept `{ index?, fen? }`, store
   `_startRooks` b. Override `load()`: parse Shredder-FEN castling → `_castling`
   bits c. Override `fen()`: output Shredder-FEN castling field d. Override
   `_moves()` castling: find king + rooks, validate squares e. Override
   `_makeMove()` castling: move rook to correct square f. Override
   `_updateCastlingRights()`: king/rook move detection

#### Phase 3: Exports & Tests (~190 LOC) — depends on Phase 2

3. Create `src/chessPGN960.ts`: export Game960, startPosition(), types
4. Create `__tests__/chess960.test.ts`: position validity, SP 518 parity,
   adjacent rook castling, FEN round-trip, rights clearing

### Verification

1. `npm test` — 540 existing + new 960 tests pass
2. `npm run check` — clean
3. Manual: load, play castling, verify FEN output

### Scope

- **In**: 960 board setup, castling, Shredder-FEN I/O
- **Out**: PGN variant tags, ChessPGN wrapper, perft, annotateOpenings
