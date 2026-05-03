# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-05-03

### Fixed

- **Windows path separator bug** (issue #1): `path.join()` generates backslashes on Windows, which `fast-glob` cannot handle. Source file scanning now normalizes all paths to forward slashes before building glob patterns. Affected: `source-file-scanner.ts`, `src-paths-resolver.ts`, `workspace-detector.ts`. Users on Windows were getting "No source files found" and "Total dependencies: 0" regardless of their `srcPaths` config.

## [0.4.0] - 2026-04-23

### Added

- **Config file detection** (`src/analyzers/string-reference/`): dep-scope now scans config files at the project root to detect packages referenced as strings — eliminating false `REMOVE` verdicts for CLI tools, test runner environments, and framework plugins. Five built-in detectors ship enabled by default: `package-json-scripts` (scripts `"lint": "oxlint ."` → detects `oxlint`), `vitest-config` (`environment: "jsdom"` → detects `jsdom`), `vite-config`, `next-config` (turbopack loaders), `storybook-config` (`addons: ["@storybook/addon-mcp"]`). The `.storybook` directory ignore does not affect this scanner — config files are read by absolute path. Detection is gated against installed packages from `package.json` to prevent false KEEPs from generic strings.

- **`stringReferences` config option**: Opt-out specific detectors via `{ "stringReferences": { "disable": ["storybook-config"] } }` or disable all with `"all"`. User-defined detectors can be added via `defineDetector()` in `depscope.config.ts`.

- **`defineDetector()` public API**: Exported from `@florianbruniaux/dep-scope`. Allows authoring custom string-reference detectors for in-house config formats with full TypeScript type safety.

### Fixed

- `oxfmt`, `oxlint` referenced only in `package.json` scripts no longer produce `REMOVE` verdict.
- `@storybook/addon-mcp` referenced as a string in `.storybook/main.ts` `addons` array no longer produces `REMOVE` verdict.
- `@svgr/webpack` referenced as a string in `next.config.mjs` turbopack `loaders` no longer produces `REMOVE` verdict.
- `jsdom` referenced as `environment: "jsdom"` in `vitest.config.ts` no longer produces `REMOVE` verdict.

## [0.3.10] - 2026-04-23

### Added

- **MCP Server** (`src/mcp/server.ts`): dep-scope now ships a Model Context Protocol server (`dep-scope-mcp` bin) that exposes 5 tools to any MCP-compatible AI editor (Claude Code, Cursor, Windsurf, Claude Desktop): `scan_project`, `analyze_package`, `get_migration_candidates`, `generate_migration_prompt`, `find_duplicates`. AI agents can query dependency analysis inline mid-session without invoking the CLI or piping markdown files. Configure once in `~/.claude.json` (Claude Code) or the equivalent MCP config file for other editors.
  - `scan_project` params: `projectPath`, `srcPaths` (override scan directories, use `["."]` for full root), `threshold`, `includeDev`, `checkDuplicates`, `checkTransitive` (transitive polyfill detection via e18e database), `withKnip` (auto-detected by default).
  - `analyze_package` params: `packageName`, `projectPath`, `srcPaths`.

## [0.3.8] - 2026-04-22

### Added

- **`dep-scope init` wizard**: `init` is now an interactive wizard powered by `@inquirer/prompts`. It detects the project framework (Next.js, React, Node.js), discovers existing source directories, suggests a preset, and asks 4 questions: scan scope, devDependencies, RECODE threshold, config format (JSON or TypeScript). Writes `.depscoperc.json` or `depscope.config.ts`. Use `-y / --yes` for non-interactive mode (CI-safe). Ctrl-C exits cleanly.

- **`--root` flag** (`scan`, `analyze`): Shorthand for `--src .` — scans the full project root including `scripts/`, `tools/`, `bin/`, and any other top-level directory. Use when a dependency is used outside the auto-detected scope.

- **`scripts/`, `tools/`, `bin/`, `cli/` in auto-detection** (`src/utils/src-paths-resolver.ts`): These directories are now included in auto-detection, fixing false-positive `REMOVE` verdicts for packages used only in script or tooling files. `scripts` is also added to the Next.js-specific candidate list.

- **Scope warning on REMOVE verdict**: When `scan` recommends removing a package and the scan scope does not cover the full project root, a dim warning is printed below the `npm remove` line: `⚠ Scanned … only — verify these aren't used in scripts/, tools/, etc.` and `→ Use --root . to scan the full project before removing`.

- **`src/utils/project-detector.ts`**: New utility that consolidates framework detection, directory discovery, and preset selection. Used by the init wizard; can be used programmatically.

### Fixed

- **False-positive REMOVE/RECODE on packages used in `scripts/`**: Packages imported only in `scripts/`, `tools/`, or `bin/` were flagged as unused because auto-detection only covered `src`-style directories. This caused dangerous `npm remove` suggestions that silently broke scripting dependencies (e.g. `gray-matter` in content migration scripts). The fix is twofold: auto-detection now includes those directories, and a warning is shown when the scan scope may be incomplete.

## [0.2.0] - 2026-04-19

### Added

- **`dep-scope migrate` command**: Generates LLM-ready markdown migration prompts for dependencies flagged as removable. Covers both `RECODE_NATIVE` and `CONSOLIDATE` packages that have known native alternatives.
  - Run without arguments to auto-detect all candidates in the project.
  - Pass a package name to target a specific dependency.
  - Outputs one file per package in `.dep-scope/migrate-<pkg>.md`.
  - Prints a `claude -p "$(cat ...)"` one-liner ready to pipe into Claude Code.
  - `--dry-run` flag: preview which packages would be targeted without writing any files.
  - Complexity label per package: `trivial / easy / medium / complex` based on file count.
  - CONSOLIDATE pair deduplication: when two packages in the same duplicate group both have native alternatives, only the package with fewer usages is targeted (avoids contradictory prompts).

- **e18e integration** (`src/rules/e18e-data.ts`): 169 packages from the [e18e module-replacements](https://e18e.dev) project are now recognized as RECODE_NATIVE candidates. No runtime dependency — data is embedded statically at build time. Covers single-purpose polyfills and micro-utilities: `has-flag`, `array-includes`, `left-pad`, `object-assign`, `is-windows`, `is-ci`, `is-even`, `uniq`, `arrify`, the full `array.prototype.*` / `string.prototype.*` / `object.*` families, and more. Total packages with alternatives: **15 → 195**.

- **Migration templates** — hand-crafted for richer prompts:
  - **Lodash** (`src/migration/templates/lodash.ts`): 12 symbols — `debounce`, `throttle`, `cloneDeep`, `isEqual`, `merge`, `omit`, `pick`, `uniq`, `flatten`, `get`, `groupBy`, `isEmpty` — plus a catch-all. Polyfill fallbacks for targets below the native API's minimum version.
  - **Moment** (`src/migration/templates/moment.ts`): 11 symbols — `format`, `fromNow`, `add`, `subtract`, `isBefore`, `isAfter`, `diff`, `parse`, `startOf`, `endOf`, plus default. Global caveats for timezone and immutability differences.
  - **Axios** (`src/migration/templates/axios.ts`): 8 symbols — `get`, `post`, `put`, `patch`, `delete`, `create`, `interceptors`, plus default. Caveats for `response.ok`, JSON parsing, and AbortController for timeouts.

- **Dynamic template engine**: Migration prompts are generated from hand-crafted templates first, then fall back to a generic engine built on the native-alternatives database. Any package with a known replacement gets a prompt automatically — no template file required.

- **TypeScript target detection** (`src/utils/tsconfig-resolver.ts`): Resolves the project's `compilerOptions.target` by following `extends` chains transitively, including npm package extends (e.g. `@tsconfig/node18`). Used to tailor migration prompts to the actual runtime target (e.g. `structuredClone` only suggested for ES2022+).

- **JSONC comment parser**: Replaced the previous regex-based comment stripper with a string-aware state-machine parser. Fixes a bug where glob patterns in `compilerOptions.paths` (e.g. `"@/*": ["./src/*"]`) were incorrectly matched as comment delimiters.

- **srcPaths auto-detection** (`src/utils/src-paths-resolver.ts`): When configured source paths don't exist on disk, all commands now automatically fall back to scanning common directories (`src`, `lib`, `app`, `pages`, `components`, `hooks`, `server`). A warning is printed when auto-detection is used.

- **Knip Auto-Detection**: Knip is now automatically used when available in the project. Use `--no-knip` to disable.
- **Path Alias Filtering**: Path aliases (`@/`, `~/`, tsconfig paths) are now automatically filtered from import analysis to avoid false positives.
- **Detailed Symbol Locations**: `analyze` command now shows file:line locations for each symbol usage.
- **`--check-duplicates` Flag**: Duplicate detection is now opt-in via `--check-duplicates` to reduce noise.
- **Expanded wellKnownPatterns**: 120+ patterns covering bundlers, testing, linting, CSS/styling, and more config-only packages.

### Changed

- `migrate <package>` argument is now optional. Omitting it triggers a full project scan and generates prompts for every migratable dependency.
- Migration template lookup falls back to a generic engine when no dedicated template exists.
- `--with-knip` is now the default behavior when Knip is installed in the project.
- CONSOLIDATE verdict only appears when `--check-duplicates` is explicitly used.
- `scan`, `analyze`, `duplicates`, and `report` all use `resolveSrcPaths()` — srcPaths auto-detection applies to every command.

### Fixed

- TSConfig resolver returned `ES3` on projects using glob patterns in `compilerOptions.paths` (e.g. Next.js projects). The multi-line comment regex `/\/\*[\s\S]*?\*\//g` incorrectly matched `/*` inside JSON string values like `"@/*"` and consumed content up to the next real `*/`. Replaced with a proper JSONC parser that skips string literals.

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

[0.2.0]: https://github.com/florianb/node-dep-scope/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/florianb/node-dep-scope/releases/tag/v0.1.0
