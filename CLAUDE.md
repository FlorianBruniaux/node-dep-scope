# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**dep-scope** is a granular dependency analyzer for TypeScript/JavaScript projects. Unlike Knip or Depcheck (binary used/unused), it provides symbol-level analysis: which symbols from each dependency are used, usage percentages, native alternatives, duplicate detection, and peer dependency identification.

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode compilation
node dist/cli/index.js --help  # Run CLI directly

# CLI usage
dep-scope scan                           # Scan all dependencies
dep-scope analyze <package>              # Analyze specific package
dep-scope duplicates                     # Find duplicate libraries
dep-scope report -p /path -o ./audit.md  # Generate full report
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
├── rules/
│   ├── native-alternatives.ts  # Maps library symbols to native JS alternatives
│   ├── duplicate-categories.ts # Defines functional overlaps (icons, date, http, etc.)
│   └── well-known-packages.ts  # Pattern matching for auto-KEEP/IGNORE
├── reporters/
│   ├── console-reporter.ts     # Terminal output with picocolors
│   └── markdown-reporter.ts    # Markdown report generation
├── utils/
│   └── path-alias-detector.ts  # Filters @/, ~/, tsconfig paths from analysis
├── cli/index.ts                # Commander.js CLI entry point
└── index.ts                    # Public API exports
```

### Data Flow

1. CLI loads config via `loadConfig()` → detects .depscoperc, YAML, TS, package.json#depScope
2. Config merged: Defaults → Presets (extends) → File Config → CLI Options via `resolveConfig()`
3. `UsageAnalyzer.scanProject()` reads package.json dependencies
4. Packages matching `wellKnownPatterns` with IGNORE verdict are filtered out
5. `fast-glob` finds all .ts/.tsx/.js/.jsx files in srcPaths
6. `ImportAnalyzer.analyzeFile()` parses each file with @typescript-eslint/parser
7. Extracts `ImportDeclaration` nodes, collects: packageName, symbol, importType, location
8. Groups imports by package, aggregates symbol usage counts
9. For each dependency:
   - Checks `wellKnownPatterns` for auto-KEEP verdict
   - Checks `native-alternatives.ts` rules for native JS replacements
   - Checks `duplicate-categories.ts` for overlapping libraries
   - Queries `peer-dep-analyzer.ts` for transitive dependency info
   - Determines verdict + investigateReason based on usage patterns
10. Outputs via console or markdown reporter (with investigateReason displayed)

### Verdict System

| Verdict       | Criteria |
|---------------|----------|
| KEEP          | Well-used, no alternatives needed |
| RECODE_NATIVE | < threshold symbols + native alternatives exist |
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

Add entries to `NATIVE_ALTERNATIVES` record:
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

## Path Alias Filtering

Path aliases are automatically filtered from import analysis:
- Common patterns: `@/`, `~/`, `#/`, `@app/`, `@components/`, etc.
- TSConfig paths: Custom aliases from `tsconfig.json` → `compilerOptions.paths`

This prevents false positives where `@/components/Button` would be counted as an npm package.

## Known Limitations

- **Not detected**: CSS imports (`@import 'pkg'`), config file references (tailwind plugins, babel configs)
- **Not published**: Not yet on npm
- **CONSOLIDATE opt-in**: Duplicate detection requires `--check-duplicates` flag

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
- Vitest for testing (309 tests)