# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Knip Auto-Detection**: Knip is now automatically used when available in the project. Use `--no-knip` to disable.
- **Path Alias Filtering**: Path aliases (`@/`, `~/`, tsconfig paths) are now automatically filtered from import analysis to avoid false positives.
- **Detailed Symbol Locations**: `analyze` command now shows file:line locations for each symbol usage.
- **`--check-duplicates` Flag**: Duplicate detection is now opt-in via `--check-duplicates` to reduce noise.
- **Expanded wellKnownPatterns**: 120+ patterns covering bundlers, testing, linting, CSS/styling, and more config-only packages.

### Changed

- `--with-knip` is now the default behavior when Knip is installed in the project.
- CONSOLIDATE verdict only appears when `--check-duplicates` is explicitly used.

## [0.1.0] - 2025-01-10

### Added

- **Core Analysis**
  - Symbol-level dependency analysis with AST parsing
  - Usage count and file location tracking
  - Import style detection (barrel vs direct imports)

- **Verdict System**
  - `KEEP` - Well-used dependencies
  - `RECODE_NATIVE` - Dependencies with native JS alternatives
  - `CONSOLIDATE` - Duplicate libraries in same category
  - `REMOVE` - Unused dependencies (0 imports)
  - `PEER_DEP` - Transitive/peer dependencies
  - `INVESTIGATE` - Needs manual review (with detailed reasons)

- **Configuration System**
  - Multi-format support: JSON, YAML, TypeScript, JavaScript
  - Config file detection (`.depscoperc`, `depscope.config.*`, `package.json#depScope`)
  - `defineConfig()` helper for TypeScript configs with full autocomplete
  - JSON Schema for IDE support (`schema.json`)
  - Presets: `minimal`, `react`, `node`
  - Custom well-known patterns, native alternatives, and duplicate categories

- **Well-Known Patterns**
  - 120+ built-in patterns for automatic KEEP/IGNORE verdicts
  - UI libraries: @radix-ui/*, @headlessui/*, @chakra-ui/*, @mantine/*
  - React ecosystem: @tanstack/*, react-hook-form, zustand, jotai, swr
  - Validation: zod, valibot, yup
  - ORMs: @prisma/client, drizzle-orm
  - Dev tools auto-ignored: @types/*, eslint*, prettier, vitest, jest

- **Native Alternatives Database**
  - lodash: get, set, cloneDeep, uniq, flatten, merge, debounce, throttle, etc.
  - moment/dayjs: format, parse, add, subtract, diff
  - axios: get, post, put, delete
  - uuid: v4 → crypto.randomUUID()
  - nanoid: nanoid → crypto.randomUUID()
  - query-string: parse/stringify → URLSearchParams
  - slugify: native string methods
  - escape-html: native string replace
  - deep-equal: JSON.stringify comparison

- **Duplicate Detection**
  - Icon libraries: lucide-react, react-icons, @heroicons/*, @tabler/icons-react
  - Date utilities: moment, dayjs, date-fns, luxon
  - HTTP clients: axios, got, ky, node-fetch
  - State management: redux, zustand, jotai, recoil, valtio
  - Validation: zod, yup, joi, valibot
  - Animation: framer-motion, react-spring, @react-spring/*
  - And more...

- **CLI Commands**
  - `dep-scope scan` - Analyze all dependencies
  - `dep-scope analyze <package>` - Deep analysis of single package
  - `dep-scope duplicates` - Find duplicate libraries
  - `dep-scope report` - Generate full audit report (markdown/json)

- **Programmatic API**
  - `UsageAnalyzer` - Main analyzer class
  - `ImportAnalyzer` - AST-based import parsing
  - `VerdictEngine` - Verdict determination logic
  - `detectDuplicates()` - Duplicate library detection
  - `loadConfig()` / `resolveConfig()` - Configuration loading
  - Full TypeScript types and interfaces

- **Integrations**
  - Knip pre-analysis support (`--with-knip`)
  - Monorepo workspace auto-detection (pnpm, npm, yarn, turbo, lerna)
  - Claude Code `/audit-deps` slash command

- **Performance**
  - File analysis caching with mtime invalidation
  - Parallel file processing with configurable concurrency
  - Optimized AST traversal

- **Architecture**
  - Full dependency injection for testability
  - 294 unit tests with comprehensive coverage
  - Clean separation of concerns (analyzers, reporters, rules, config)

### Technical Details

- TypeScript ES2022 with NodeNext module resolution
- Dependencies: @typescript-eslint/parser, commander, fast-glob, picocolors, zod, yaml, jiti
- Node.js >= 18.0.0 required

[Unreleased]: https://github.com/florianb/node-dep-scope/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/florianb/node-dep-scope/releases/tag/v0.1.0
