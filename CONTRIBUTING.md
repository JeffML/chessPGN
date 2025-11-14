# Contributing to chessPGN

Thank you for considering contributing to chessPGN! We appreciate your interest
in improving this TypeScript chess library.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting Changes](#submitting-changes)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [API Changes](#api-changes)

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to foster an
inclusive and welcoming community.

## How Can I Contribute?

### Reporting Bugs

Use the [issue tracker](https://github.com/JeffML/chessPGN/issues) to report
bugs. When filing a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Code sample** demonstrating the issue
- **Environment details** (Node.js version, browser, OS)
- **Stack traces** if applicable

### Suggesting Enhancements

Feature requests are welcome! Please:

- Check existing issues first to avoid duplicates
- Provide a clear use case for the feature
- Explain why the feature would benefit other users
- Consider backward compatibility implications

### Pull Requests

We actively welcome pull requests for:

- Bug fixes
- Performance improvements
- Documentation improvements
- New features (discuss in an issue first)
- Test coverage improvements

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)
- Git

### Local Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/<your-username>/chessPGN.git
   cd chessPGN
   ```

3. **Add upstream remote:**

   ```bash
   git remote add upstream https://github.com/JeffML/chessPGN.git
   ```

4. **Install dependencies:**

   ```bash
   npm install
   ```

5. **Verify setup:**
   ```bash
   npm run check
   ```

## Development Workflow

### Project Structure

```
chessPGN/
├── src/                # Source TypeScript files
│   ├── chessPGN.ts    # Legacy wrapper class
│   ├── Game.ts        # Core game implementation
│   ├── Move.ts        # Move representation
│   ├── types.ts       # Type definitions
│   └── pgn.peggy      # PGN parser grammar
├── __tests__/         # Test files
├── dist/              # Built files (generated)
├── docs/              # Documentation
└── website/           # Docusaurus documentation site
```

### Available Scripts

- `npm test` - Run all tests
- `npm run check` - Run all checks (format, lint, test, build)
- `npm run format` - Format code with Prettier
- `npm run lint` - Run ESLint
- `npm run build` - Build the project
- `npm run api:check` - Check for API changes
- `npm run api:update` - Accept API changes

### Making Changes

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the [code standards](#code-standards)

3. **Write or update tests** for your changes

4. **Run the test suite:**

   ```bash
   npm test
   ```

5. **Run all checks:**

   ```bash
   npm run check
   ```

6. **Commit your changes** with clear, descriptive messages:

   ```bash
   git commit -m "feat: add support for feature X"
   ```

   Use conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for test changes
   - `refactor:` for code refactoring
   - `perf:` for performance improvements
   - `chore:` for maintenance tasks

## Submitting Changes

### Before Submitting

1. **Sync with upstream:**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks:**

   ```bash
   npm run check
   ```

   This ensures:
   - ✅ Code is formatted correctly
   - ✅ No ESLint errors
   - ✅ All tests pass
   - ✅ Project builds successfully
   - ✅ API changes are documented

3. **Fix any issues:**
   - Run `npm run format` to auto-fix formatting
   - Address any linting errors manually
   - Ensure all tests pass

### Creating a Pull Request

1. **Push your branch:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description explaining what and why
   - Reference to related issues (e.g., "Fixes #123")
   - Screenshots/examples if applicable

3. **Respond to feedback** from reviewers promptly

4. **Keep PR updated** with main branch if needed

### PR Review Process

- Maintainers will review your PR as soon as possible
- Address any requested changes
- Once approved, a maintainer will merge your PR
- Your contribution will be included in the next release!

## Code Standards

### TypeScript Guidelines

- Use TypeScript strict mode features
- Provide proper type annotations
- Avoid `any` type when possible
- Use interfaces for public APIs
- Document complex type logic

### Code Style

- Follow the existing code style
- Use Prettier for formatting (runs automatically)
- Follow ESLint rules
- Write self-documenting code with clear variable names
- Add comments for complex logic

### Naming Conventions

- Classes: `PascalCase` (e.g., `ChessPGN`, `Game`)
- Functions/methods: `camelCase` (e.g., `makeMove`, `isCheckmate`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_POSITION`)
- Private members: prefix with `_` (e.g., `_board`, `_makeMove`)

## Testing

### Writing Tests

- Place tests in `__tests__/` directory
- Name test files with `.test.ts` extension
- Use descriptive test names
- Test both success and failure cases
- Aim for high code coverage

### Test Structure

```typescript
import { ChessPGN } from '../src/chessPGN'

describe('Feature Name', () => {
  test('should do something specific', () => {
    const chess = new ChessPGN()
    // Arrange
    chess.move('e4')

    // Act
    const result = chess.moves()

    // Assert
    expect(result).toContain('e5')
  })
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- moves.test.ts

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Document parameters, return values, and exceptions
- Provide usage examples for complex features
- Keep TSDoc formatting correct (avoid unescaped braces)

Example:

```typescript
/**
 * Make a move on the board.
 * @param move - SAN string, move object, or null for null move
 * @param options - Options object with optional strict field
 * @returns Move object with full details
 * @throws Error if move is invalid
 */
move(move: string | { from: string; to: string; promotion?: string } | null): Move
```

### Documentation Updates

The documentation is available at https://jeffml.github.io/chessPGN/

When making changes that affect user-facing APIs:

1. **Update relevant markdown files** in `docs/`
2. **Update README.md** if adding major features
3. **Update ADVANCED_FEATURES.md** for advanced topics
4. **Regenerate HTML** if needed (consult maintainers)

## API Changes

### Checking for API Changes

We use API Extractor to track changes to the public API:

```bash
npm run api:check
```

### Reviewing Changes

If API changes are detected:

1. **Review the diff:**

   ```bash
   diff etc/chess-pgn.api.md temp/chess-pgn.api.md
   ```

2. **Verify changes are intentional** and properly documented

3. **Consider backward compatibility:**
   - Breaking changes require major version bump
   - New features require minor version bump
   - Bug fixes require patch version bump

4. **Accept changes:**
   ```bash
   npm run api:update
   ```

### Deprecation Policy

When deprecating APIs:

- Mark with `@deprecated` JSDoc tag
- Provide migration path in documentation
- Keep deprecated APIs for at least one major version
- Log warnings when deprecated features are used

## Questions?

If you have questions not covered here:

- Check existing [issues](https://github.com/JeffML/chessPGN/issues)
- Open a new issue with the "question" label
- Review the [documentation](https://jeffml.github.io/chessPGN/)

## Recognition

Contributors are recognized in:

- Git commit history
- GitHub contributors page
- Release notes (for significant contributions)

Thank you for contributing to chessPGN! 🎉
