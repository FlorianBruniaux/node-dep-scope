# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**dep-scope** is a granular dependency analyzer for TypeScript/JavaScript projects. Unlike Knip or Depcheck (binary used/unused), it provides symbol-level analysis: which symbols from each dependency are used, usage percentages, native alternatives, duplicate detection, and peer dependency identification.

**V2 feature**: `dep-scope migrate` generates LLM-ready markdown migration prompts for dependencies that can be removed. Run without arguments to auto-detect all candidates; pass a package name to target one. Prompts are context-aware (TypeScript target, framework, file locations) and ready to pipe into Claude Code.

**e18e integration**: 169 packages from the [e18e module-replacements](https://e18e.dev) project are embedded statically in `src/rules/e18e-data.ts`. Any import from a recognized micro-utility or polyfill package (e.g. `has-flag`, `left-pad`, `array-includes`, `object-assign`) is automatically flagged as RECODE_NATIVE with the native replacement shown. Total packages with alternatives: 195.

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode compilation
node dist/cli/index.js --help  # Run CLI directly

# CLI usage
dep-scope scan                                # Scan all dependencies
dep-scope scan --check-duplicates             # Include duplicate detection
dep-scope analyze <package>                   # Analyze specific package
dep-scope duplicates                          # Find duplicate libraries
dep-scope report -p /path -o ./audit.md       # Generate full report
dep-scope migrate                             # Auto-detect + generate migration prompts
dep-scope migrate <package>                   # Generate migration prompt for one package
dep-scope migrate --dry-run                   # Preview without writing files
```

## Architecture

```
src/
├── types/index.ts              # Core types: Verdict, DependencyAnalysis, InvestigateReason
├── analyzers/
│   ├── import-analyzer.ts      # AST parsing via @typescript-eslint/parser
│   ├── usage-analyzer.ts       # Main orchestrator - aggregates imports, determines verdicts
│   └── peer-dep-analyzer.ts    # Scans node_modules/*/package.json for peer deps
├── config/
│   ├── schema.ts               # Zod schemas for config validation
│   ├── loader.ts               # Multi-format config loading (JSON, YAML, TS, JS)
│   ├── defaults.ts             # DEFAULT_WELL_KNOWN_PATTERNS, default values
│   ├── presets/                # Built-in presets (minimal, react, node)
│   └── index.ts                # Config exports + defineConfig helper
├── migration/
│   ├── types.ts                # MigrationTemplate, MigrationContext, MigrationOutput
│   ├── generator.ts            # Prompt engine: DependencyAnalysis + Context + Template → markdown
│   ├── templates/
│   │   ├── lodash.ts           # Hand-crafted template (12 symbols + catch-all)
│   │   ├── moment.ts           # Hand-crafted template (11 symbols: format, add, diff, parse...)
│   │   └── axios.ts            # Hand-crafted template (8 symbols: get, post, put, interceptors...)
│   └── index.ts                # Public API + template registry + buildGenericTemplate()
├── rules/
│   ├── native-alternatives.ts  # Maps library symbols to native JS alternatives + e18e integration
│   ├── e18e-data.ts            # 169 packages from e18e/module-replacements (static, no runtime dep)
│   ├── duplicate-categories.ts # Defines functional overlaps (icons, date, http, etc.)
│   └── well-known-packages.ts  # Pattern matching for auto-KEEP/IGNORE
├── reporters/
│   ├── console-reporter.ts     # Terminal output with picocolors
│   └── markdown-reporter.ts    # Markdown report generation
├── utils/
│   ├── path-alias-detector.ts  # Filters @/, ~/, tsconfig paths from analysis
│   ├── src-paths-resolver.ts   # Auto-detects source directories when configured paths don't exist
│   └── tsconfig-resolver.ts    # Resolves compilerOptions.target following extends chains
├── cli/index.ts                # Commander.js CLI entry point
└── index.ts                    # Public API exports
```

### Data Flow

1. CLI loads config via `loadConfig()` → detects .depscoperc, YAML, TS, package.json#depScope
2. Config merged: Defaults → Presets (extends) → File Config → CLI Options via `resolveConfig()`
3. `resolveSrcPaths()` resolves source directories — falls back to auto-detection if configured paths don't exist
4. `UsageAnalyzer.scanProject()` reads package.json dependencies
5. Packages matching `wellKnownPatterns` with IGNORE verdict are filtered out
6. `fast-glob` finds all .ts/.tsx/.js/.jsx files in srcPaths
7. `ImportAnalyzer.analyzeFile()` parses each file with @typescript-eslint/parser
8. Extracts `ImportDeclaration` nodes, collects: packageName, symbol, importType, location
9. Groups imports by package, aggregates symbol usage counts
10. For each dependency:
    - Checks `wellKnownPatterns` for auto-KEEP verdict
    - Checks `native-alternatives.ts` (built-in + e18e) for native JS replacements
    - Checks `duplicate-categories.ts` for overlapping libraries
    - Queries `peer-dep-analyzer.ts` for transitive dependency info
    - Determines verdict + investigateReason based on usage patterns
11. Outputs via console or markdown reporter (with investigateReason displayed)

### Migration Flow (`dep-scope migrate`)

1. CLI resolves project path and config
2. `resolveSrcPaths()` resolves source directories with auto-detection fallback
3. `resolveTsConfig(projectPath)` follows `extends` chains to detect `compilerOptions.target`
4. `detectFramework()` reads package.json to identify next/react/node
5. If package specified → `analyzeSingleDependency()` → `getOrBuildTemplate()` → `generateMigration()`
6. If no package → `scanProject()` → filter RECODE_NATIVE + CONSOLIDATE with alternatives → CONSOLIDATE pair deduplication → generate one prompt per candidate
7. `getOrBuildTemplate()`: dedicated template first (lodash, moment, axios), falls back to `buildGenericTemplate()` using `analysis.alternatives` data
8. `generateMigration()` renders markdown with ES-target-aware replacement suggestions (polyfill fallback when target < minEcmaVersion), complexity label (trivial/easy/medium/complex)
9. With `--dry-run`: print summary only, write nothing. Without: writes `.dep-scope/migrate-<pkg>.md` + prints `claude -p "$(cat ...)"` one-liner

### CONSOLIDATE Pair Deduplication

When `migrate` runs in auto-detect mode, if two packages in the same duplicate group both have native alternatives (e.g. `uuid` and `nanoid`), only the one with fewer usages is targeted. This prevents contradictory prompts ("replace uuid with nanoid" + "replace nanoid with uuid").

Logic in `src/cli/index.ts`: `detectDuplicates()` → build peer map → for each CONSOLIDATE candidate, find group peers → keep only the package with `min(files.length)`.

### srcPaths Auto-Detection

`src/utils/src-paths-resolver.ts` resolves source directories for all commands:
1. If configured paths exist on disk → use them as-is
2. If none exist → scan for common directories: `src`, `lib`, `app`, `pages`, `components`, `hooks`, `server` (Next.js also includes `trpc`, `shared`)
3. Last resort → scan from project root (`.`)

Prints a warning when falling back: `[dep-scope] Source path(s) ./src not found — auto-detected: ./app, ./components`

**Critical for accuracy**: if a project scatters imports across multiple directories not in the default list, configure `srcPaths` explicitly in `.depscoperc.json`.

### e18e Integration

`src/rules/e18e-data.ts` contains 169 packages statically extracted from `module-replacements@2.11.0`. No runtime npm dependency — the data is embedded at build time.

`getNativeAlternatives()` checks `E18E_PACKAGES` as a fallback after built-in `NATIVE_ALTERNATIVES`. For e18e packages (single-purpose utilities), any imported symbol gets the package-level native replacement. `hasAlternatives()` and `getPackagesWithAlternatives()` also include e18e packages.

Categories covered: Array methods, String methods, Object methods, Number/Math, prototype helpers, micro-utilities (type checks, array operations, string utilities).

### Verdict System

| Verdict       | Criteria |
|---------------|----------|
| KEEP          | Well-used, no alternatives needed |
| RECODE_NATIVE | < threshold symbols + native alternatives exist (built-in or e18e) |
| CONSOLIDATE   | Duplicate with another lib in same category |
| REMOVE        | Zero imports detected |
| PEER_DEP      | Required by other packages, redundant in package.json |
| INVESTIGATE   | Needs manual review (low usage, no alternatives) |

Threshold default: 5 symbols. Configurable via `-t` flag or config file.

### InvestigateReason

When verdict is INVESTIGATE, `investigateReason` explains why:

| Reason | Meaning |
|--------|---------|
| `LOW_SYMBOL_COUNT` | Only 1-2 symbols used |
| `SINGLE_FILE_USAGE` | Used in only 1 file |
| `LOW_FILE_SPREAD` | Used in 2-3 files (below fileCountThreshold) |
| `UNKNOWN_PACKAGE` | Unknown package, manual review needed |

### Configuration System

Config files detected (in order): `.depscoperc`, `.depscoperc.json`, `depscope.config.{json,yaml,ts,js}`, `package.json#depScope`

Key types in `src/config/schema.ts`:
```typescript
WellKnownPattern { pattern: string; verdict: "KEEP" | "IGNORE"; reason?: string }
CustomNativeAlternative { package: string; symbols: Record<string, {...}> }
CustomDuplicateCategory { name: string; packages: string[]; ... }
```

Presets available: `minimal`, `react`, `node` (via `extends` option)

## Extending Rules

### Native Alternatives (`src/rules/native-alternatives.ts`)

Add entries to `NATIVE_ALTERNATIVES` record for symbol-level alternatives:
```typescript
"library-name": {
  symbolName: {
    native: "Native replacement",
    example: "code example",
    minEcmaVersion: "ES2020",
    caveats: ["optional limitations"]
  }
}
```

Entries here automatically power the generic migration template — no separate template file needed.

### e18e Data (`src/rules/e18e-data.ts`)

For single-purpose packages where the whole package has one native equivalent, add to `E18E_PACKAGES`:
```typescript
"package-name": { native: "native.replacement()", minEcmaVersion: "ES2020", category: "native" },
```

Any symbol imported from the package gets this replacement shown. Regenerate from upstream with the Python script in `scripts/generate-e18e-data.py` when `module-replacements` releases a new version.

### Migration Templates (`src/migration/templates/`)

Add a new file for packages that need richer hand-crafted prompts (detailed examples, polyfill fallbacks, multiple caveats):

```typescript
export const myLibTemplate: MigrationTemplate = {
  packageName: "my-lib",
  symbols: {
    someSymbol: {
      symbol: "someSymbol",
      nativeReplacement: "Native API",
      example: "// code snippet",
      minEcmaVersion: "ES2020",
      caveats: [],
    },
  },
  globalCaveats: ["Run tests after each replacement"],
};
```

Register it in `src/migration/index.ts` → `TEMPLATES` record.

### Duplicate Categories (`src/rules/duplicate-categories.ts`)

Add entries to `DUPLICATE_CATEGORIES` record:
```typescript
categoryName: {
  description: "Category description",
  packages: ["lib1", "lib2", "lib3"],
  recommendation: "Consolidation advice",
  preferredOrder: ["lib1", "lib2"]  // First = most recommended
}
```

### Well-Known Patterns (`src/config/defaults.ts`)

Add entries to `DEFAULT_WELL_KNOWN_PATTERNS` array:
```typescript
{ pattern: "@company/*", verdict: "KEEP", reason: "Internal packages" },
{ pattern: "dev-tool", verdict: "IGNORE", reason: "Dev only" },
```

Patterns support glob syntax (`*` wildcards). Users can also add patterns via config file.

## Configuring srcPaths for Accurate Scans

**Most common cause of missed packages**: source directories not covered by the scan.

Create `.depscoperc.json` in the project root with the correct paths:

```json
{
  "srcPaths": ["src", "app", "pages", "components", "lib", "hooks", "server", "shared"]
}
```

Verify with `--verbose` — dep-scope prints a warning when auto-detection kicks in.

## Path Alias Filtering

Path aliases are automatically filtered from import analysis:
- Common patterns: `@/`, `~/`, `#/`, `@app/`, `@components/`, etc.
- TSConfig paths: Custom aliases from `tsconfig.json` → `compilerOptions.paths`

This prevents false positives where `@/components/Button` would be counted as an npm package.

## TSConfig Resolver

`src/utils/tsconfig-resolver.ts` resolves the project's TypeScript compiler target by following `extends` chains (up to 5 levels deep, cycle-safe). Uses a string-aware JSONC parser — not a regex — to correctly handle glob patterns in `compilerOptions.paths` (e.g. `"@/*": ["./src/*"]`).

Key exports: `resolveTsConfig(projectPath)`, `parseEsTarget(target)`, `targetSupports(projectTarget, minRequired)`.

## Known Limitations

- **Not detected**: CSS imports (`@import 'pkg'`), config file references (tailwind plugins, babel configs)
- **Not published**: Not yet on npm
- **CONSOLIDATE opt-in**: Duplicate detection requires `--check-duplicates` flag
- **migrate CONSOLIDATE**: Only generates prompts for CONSOLIDATE packages that have entries in `NATIVE_ALTERNATIVES` or `E18E_PACKAGES`. Pure consolidation (no native replacement) is not yet covered.
- **srcPaths scope**: If source files live outside configured/auto-detected directories, packages will appear unused. Fix with explicit `srcPaths` in config.

Note: Dynamic imports (`await import('pkg')`) and `require()` calls ARE detected.

## Knip Integration

dep-scope automatically uses Knip when available in the project:

```bash
dep-scope scan              # Auto-detects and uses Knip if installed
dep-scope scan --with-knip  # Force enable Knip
dep-scope scan --no-knip    # Disable Knip integration
```

The integration runs Knip first, then uses its results to boost confidence scores.

## CI/CD Exit Codes

- `0` - No actionable issues
- `1` - Issues found (REMOVE, RECODE_NATIVE, duplicates)
- `2` - Error

Use `--no-exit-code` to always exit with 0.

## Tech Stack

- TypeScript (ES2022, NodeNext modules)
- @typescript-eslint/parser for AST analysis
- Commander.js for CLI
- fast-glob for file matching
- picocolors for terminal output
- zod for config validation
- jiti for TypeScript config loading
- yaml for YAML config support
- Vitest for testing (354 tests)

## Quality Gates (before commit)

```bash
npm run build && npm test
```

Never commit if build or tests fail.

## Language & Communication

- **User communicates in French**: Respond in French
- **ALL project artifacts MUST be in English**: commit messages, code comments, docs, CLI output
