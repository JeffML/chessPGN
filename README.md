![logo](./chesspgnlogo.png)

# chessPGN

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/JeffML/chessPGN/node.js.yml?branch=main)](https://github.com/JeffML/chessPGN/actions)
[![npm](https://img.shields.io/npm/v/@chess-pgn/chess-pgn?color=blue)](https://www.npmjs.com/package/@chess-pgn/chess-pgn)
[![npm](https://img.shields.io/npm/dm/@chess-pgn/chess-pgn)](https://www.npmjs.com/package/@chess-pgn/chess-pgn)
[![GitHub stars](https://img.shields.io/github/stars/JeffML/chessPGN)](https://github.com/JeffML/chessPGN/stargazers)

chessPGN is a TypeScript chess library used for chess move
generation/validation, piece placement/movement, and check/checkmate/stalemate
detection - basically everything but the AI.

chessPGN has been extensively tested in node.js and most modern browsers.

## Documentation

This README provides a quick example, full documentation can be found at
[https://jeffml.github.io/chessPGN](https://JeffML.github.io/chessPGN).

## Installation

Run the following command to install the most recent version of chessPGN from
NPM:

```sh
npm install chessPGN
```

## Example Code

The code below plays a random game of chess:

```ts
import { ChessPGN } from '@chess-pgn/chessPGN'

const chess = new ChessPGN()

while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
console.log(chess.pgn())
```

## Contributing

If you have any questions, suggestions, or find any bugs please open an issue.
PRs are very welcome too, please read the [Contributing Guide](CONTRIBUTING.md)
first to help make it a smooth process.
