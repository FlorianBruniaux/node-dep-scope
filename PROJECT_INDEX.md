# dep-scope Project Index

Granular dependency analyzer for TypeScript/JavaScript projects. Unlike binary analyzers (used/unused), dep-scope provides symbol-level analysis: which symbols from each dependency are used, usage percentages, native alternatives, duplicate detection, and peer dependency identification.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Key Files Reference](#key-files-reference)
4. [Architecture](#architecture)
5. [Data Flow](#data-flow)
6. [Configuration Reference](#configuration-reference)
7. [API Reference](#api-reference)
8. [Extension Points](#extension-points)
9. [Testing Structure](#testing-structure)
10. [Dependencies](#dependencies)

---

## Project Overview

### Purpose

dep-scope analyzes JavaScript/TypeScript projects to determine how dependencies are actually used at the symbol level. It answers questions like:

- Which symbols from `lodash` are used, and can they be replaced with native code?
- Are there duplicate libraries serving the same purpose (e.g., multiple icon libraries)?
- Which dependencies are only peer dependencies and redundant in `package.json`?

### Key Features

- **Symbol-level analysis**: Tracks individual imports, not just package usage
- **Native alternatives**: Suggests ES6+ replacements for common library functions
- **Duplicate detection**: Identifies overlapping libraries in categories (icons, date, HTTP, etc.)
- **Peer dependency detection**: Finds packages only needed as peer deps
- **Monorepo support**: Auto-detects pnpm, npm, yarn, turborepo, and lerna workspaces
- **Knip integration**: Optional pre-analysis for improved accuracy
- **Multiple output formats**: Console, Markdown, JSON

### Verdict System

| Verdict | Criteria | Action |
|---------|----------|--------|
| `KEEP` | Well-used, no issues | None required |
| `RECODE_NATIVE` | Few symbols used + native alternatives exist | Replace with native code |
| `CONSOLIDATE` | Duplicate with another library in same category | Migrate to preferred library |
| `REMOVE` | Zero imports detected | Remove from package.json |
| `PEER_DEP` | Required by other packages, redundant in package.json | Safe to remove from package.json |
| `INVESTIGATE` | Low usage, no clear alternatives | Manual review needed |

---

## Directory Structure

```
dep-scope/
├── src/
│   ├── index.ts                 # Public API exports
│   ├── types/
│   │   └── index.ts             # Core TypeScript types and interfaces
│   ├── analyzers/
│   │   ├── import-analyzer.ts   # AST parsing for import extraction
│   │   ├── usage-analyzer.ts    # Main orchestrator - aggregates and determines verdicts
│   │   └── peer-dep-analyzer.ts # Scans node_modules for peer dependency info
│   ├── rules/
│   │   ├── native-alternatives.ts   # Maps library symbols to native JS replacements
│   │   ├── duplicate-categories.ts  # Defines overlapping library categories
│   │   └── well-known-packages.ts   # Pattern matching for auto-KEEP/IGNORE packages
│   ├── config/
│   │   ├── index.ts             # Config exports and defineConfig helper
│   │   ├── schema.ts            # Zod schema for config validation
│   │   ├── loader.ts            # Multi-format config loading (JSON, YAML, TS, JS)
│   │   ├── defaults.ts          # Default configuration values
│   │   └── presets/
│   │       ├── index.ts         # Preset registry
│   │       ├── minimal.ts       # Base preset
│   │       ├── react.ts         # React/Next.js optimized preset
│   │       └── node.ts          # Node.js backend preset
│   ├── reporters/
│   │   ├── console-reporter.ts  # Terminal output with colors (picocolors)
│   │   └── markdown-reporter.ts # Markdown report generation
│   ├── integrations/
│   │   └── knip.ts              # Knip pre-analysis integration
│   ├── utils/
│   │   ├── format.ts            # Formatting utilities
│   │   └── workspace-detector.ts # Monorepo workspace auto-detection
│   ├── errors/
│   │   └── index.ts             # Custom error classes
│   └── cli/
│       └── index.ts             # Commander.js CLI implementation
├── tests/
│   ├── analyzers/
│   │   ├── import-analyzer.test.ts  # 43 tests
│   │   ├── usage-analyzer.test.ts   # 28 tests
│   │   └── peer-dep-analyzer.test.ts
│   ├── config/
│   │   └── config.test.ts
│   ├── rules/
│   │   ├── native-alternatives.test.ts
│   │   └── duplicate-categories.test.ts
│   ├── integrations/
│   │   └── knip.test.ts
│   └── errors/
│       └── errors.test.ts
├── dist/                        # Compiled output
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── CLAUDE.md                    # AI assistant context
└── README.md
```

---

## Key Files Reference

### Core Types (`src/types/index.ts`)

Defines all TypeScript interfaces used throughout the project:

| Type | Purpose |
|------|---------|
| `ImportInfo` | Individual import occurrence with location |
| `SymbolUsage` | Aggregated usage of a symbol across files |
| `Verdict` | Analysis result: KEEP, RECODE_NATIVE, CONSOLIDATE, REMOVE, PEER_DEP, INVESTIGATE |
| `DependencyAnalysis` | Complete analysis result for a single dependency |
| `ScanResult` | Full project scan result with summary and duplicates |
| `AnalyzerOptions` | Configuration options for the analyzer |
| `WellKnownPattern` | Pattern for automatic verdict assignment |

### Analyzers

**`import-analyzer.ts`** - AST Parsing Engine
- Uses `@typescript-eslint/parser` for TypeScript/JavaScript parsing
- Extracts import declarations, dynamic imports, and `require()` calls
- Handles scoped packages (`@scope/package/subpath`)
- Returns `ImportInfo[]` with precise file locations

**`usage-analyzer.ts`** - Main Orchestrator
- Coordinates all analysis phases
- Reads `package.json` to get dependency list
- Uses `fast-glob` to find source files
- Aggregates imports by package
- Applies rules (native alternatives, duplicates, well-known patterns)
- Calculates verdicts and confidence scores

**`peer-dep-analyzer.ts`** - Peer Dependency Detection
- Scans `node_modules/*/package.json` for `peerDependencies`
- Identifies packages required only as peer dependencies
- Flags redundant entries in root `package.json`

### Rules

**`native-alternatives.ts`** - Native Replacement Database
- Maps 40+ package symbols to native JavaScript alternatives
- Includes: lodash, moment, axios, uuid, classnames, ramda, etc.
- Each entry includes: native replacement, example code, ECMAScript version, caveats

**`duplicate-categories.ts`** - Duplicate Detection
- Defines 12 functional categories with overlapping libraries
- Categories: icons, date, cssUtils, http, state, dnd, validation, forms, animation, markdown, uuid, lodashLike
- Provides recommendations with preferred order

**`well-known-packages.ts`** - Pattern Matching
- Matches package names against glob patterns
- Assigns automatic KEEP or IGNORE verdicts
- Handles common patterns: `@types/*`, `@radix-ui/*`, build tools, test runners

### Configuration

**`loader.ts`** - Multi-format Config Loading
- Searches for config files in priority order
- Supports: `.depscoperc`, `.depscoperc.json`, `depscope.config.{json,yaml,yml,ts,js,mjs,cjs}`
- Also checks `package.json` `depScope` field
- Uses `jiti` for TypeScript config loading

**`schema.ts`** - Zod Validation Schema
- Full TypeScript type inference
- Validates all configuration options
- Provides detailed error messages for invalid configs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                                   │
│                          (src/cli/index.ts)                             │
│   Commands: scan, analyze, duplicates, report, init                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Configuration Layer                            │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │   Loader   │  │   Schema   │  │  Defaults  │  │  Presets   │        │
│  │  (loader)  │  │   (zod)    │  │            │  │ min/react/ │        │
│  │            │  │            │  │            │  │    node    │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Analysis Layer                                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     UsageAnalyzer                                │   │
│  │                   (Main Orchestrator)                            │   │
│  │                                                                  │   │
│  │   1. Read package.json                                           │   │
│  │   2. Detect workspace (monorepo)                                 │   │
│  │   3. Find source files (fast-glob)                               │   │
│  │   4. Analyze imports (ImportAnalyzer)                            │   │
│  │   5. Analyze peer deps (PeerDepAnalyzer)                         │   │
│  │   6. Apply rules (native, duplicates, well-known)                │   │
│  │   7. Calculate verdicts and confidence                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│          ┌─────────────────────────┼─────────────────────────┐         │
│          ▼                         ▼                         ▼         │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐        │
│  │ ImportAnalyzer │    │ PeerDepAnalyzer│    │ WorkspaceDetect│        │
│  │  (AST Parser)  │    │ (node_modules) │    │   (monorepo)   │        │
│  └────────────────┘    └────────────────┘    └────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Rules Layer                                  │
│                                                                         │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │ Native Alternatives│  │ Duplicate Categories│  │  Well-Known     │  │
│  │                    │  │                     │  │   Packages      │  │
│  │  lodash -> ES6     │  │  icons, date, http  │  │  @types/*, etc  │  │
│  │  moment -> Intl    │  │  state, validation  │  │                 │  │
│  │  axios -> fetch    │  │  forms, animation   │  │                 │  │
│  └────────────────────┘  └────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Reporter Layer                                │
│                                                                         │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │  ConsoleReporter   │  │  MarkdownReporter  │  │   JSON Output    │  │
│  │                    │  │                    │  │                  │  │
│  │  - Color output    │  │  - Tables          │  │  - Structured    │  │
│  │  - Summaries       │  │  - Code blocks     │  │  - Machine-read  │  │
│  │  - Action items    │  │  - Full reports    │  │                  │  │
│  └────────────────────┘  └────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Scan Command Flow

```
1. CLI receives command
   └── dep-scope scan -p ./my-project

2. Configuration Loading
   ├── Load config file (depscope.config.ts, .depscoperc.json, etc.)
   ├── Resolve presets (extends: "react")
   ├── Merge CLI options with config
   └── Apply defaults

3. Workspace Detection (optional)
   ├── Check pnpm-workspace.yaml
   ├── Check turbo.json + package.json workspaces
   ├── Check lerna.json
   ├── Check package.json workspaces (npm/yarn)
   └── Build srcPaths from workspace patterns

4. Source File Discovery
   └── fast-glob: src/**/*.{ts,tsx,js,jsx,mjs,cjs}

5. Import Analysis (per file)
   ├── Parse with @typescript-eslint/parser
   ├── Traverse AST for ImportDeclaration nodes
   ├── Extract: packageName, symbol, importType, location
   ├── Handle dynamic imports: import('pkg')
   └── Handle require calls: require('pkg')

6. Import Aggregation
   ├── Group imports by package name
   └── Aggregate symbol usage counts

7. Peer Dependency Analysis
   ├── Scan node_modules/*/package.json
   └── Build dependency graph for peer deps

8. Verdict Determination (per package)
   │
   ├── Check well-known patterns (auto KEEP/IGNORE)
   │
   ├── If no imports:
   │   ├── If required by other packages → PEER_DEP
   │   └── Otherwise → REMOVE
   │
   ├── If few symbols + native alternatives:
   │   └── RECODE_NATIVE
   │
   ├── If well-used across many files:
   │   └── KEEP
   │
   ├── If duplicate category detected:
   │   └── CONSOLIDATE
   │
   └── Otherwise:
       └── INVESTIGATE (with reason)

9. Post-processing
   ├── Detect duplicate groups
   ├── Calculate summary statistics
   └── Estimate bundle savings

10. Output
    ├── Console: colored summary, action items
    ├── Markdown: full report with tables
    └── JSON: structured data for tooling
```

---

## Configuration Reference

### Config File Locations (Priority Order)

1. `.depscoperc`
2. `.depscoperc.json`
3. `depscope.config.json`
4. `depscope.config.yaml` / `.yml`
5. `depscope.config.ts` / `.js` / `.mjs` / `.cjs`
6. `package.json` `depScope` field

### Configuration Options

```typescript
interface DepScopeConfig {
  // Source Analysis
  srcPaths?: string[];           // Default: ["./src"]
  threshold?: number;            // Symbol count for RECODE_NATIVE. Default: 5
  fileCountThreshold?: number;   // Min files to auto-KEEP. Default: 3
  includeDev?: boolean;          // Include devDependencies. Default: false
  ignore?: string[];             // Packages to ignore (glob patterns supported)

  // Output
  format?: "console" | "markdown" | "json";
  output?: string;               // Output file path
  verbose?: boolean;             // Default: false

  // Features
  withKnip?: boolean;            // Use Knip pre-analysis. Default: false
  autoDetectWorkspace?: boolean; // Detect monorepos. Default: true

  // Presets
  extends?: string | string[];   // "minimal" | "react" | "node"

  // Custom Rules
  wellKnownPatterns?: WellKnownPattern[];
  nativeAlternatives?: CustomNativeAlternative[];
  duplicateCategories?: CustomDuplicateCategory[];
}
```

### Example Configurations

**TypeScript Config (`depscope.config.ts`)**

```typescript
import { defineConfig } from "dep-scope";

export default defineConfig({
  extends: "react",
  srcPaths: ["./src", "./app"],
  threshold: 3,
  ignore: ["@internal/*"],
  wellKnownPatterns: [
    { pattern: "my-company-*", verdict: "KEEP", reason: "Internal packages" },
  ],
});
```

**JSON Config (`.depscoperc.json`)**

```json
{
  "extends": "minimal",
  "srcPaths": ["./src"],
  "threshold": 5,
  "includeDev": false,
  "ignore": ["*-polyfill"]
}
```

### Available Presets

| Preset | Purpose | Key Patterns |
|--------|---------|--------------|
| `minimal` | Base defaults | Common dev tools ignored |
| `react` | React/Next.js projects | React core, styling solutions, animation libraries |
| `node` | Node.js backends | Express ecosystem, database clients, process managers |

---

## API Reference

### Programmatic Usage

```typescript
import {
  UsageAnalyzer,
  detectDuplicates,
  consoleReporter,
  markdownReporter,
  loadConfig,
  resolveConfig,
} from "dep-scope";

// Create analyzer with options
const analyzer = new UsageAnalyzer({
  srcPaths: ["./src"],
  threshold: 5,
  includeDev: false,
  verbose: true,
});

// Scan entire project
const analyses = await analyzer.scanProject("/path/to/project");

// Analyze single package
const lodashAnalysis = await analyzer.analyzeSingleDependency(
  "/path/to/project",
  "lodash"
);

// Detect duplicates from analyses
const duplicates = detectDuplicates(analyses);

// Generate reports
consoleReporter.printScanSummary(result);
const markdown = markdownReporter.generateScanReport(result);
```

### Key Exports

```typescript
// Analyzers
export { UsageAnalyzer, usageAnalyzer } from "./analyzers/usage-analyzer";
export { ImportAnalyzer, importAnalyzer } from "./analyzers/import-analyzer";
export { PeerDepAnalyzer, peerDepAnalyzer } from "./analyzers/peer-dep-analyzer";

// Rules
export { getNativeAlternatives, hasAlternatives } from "./rules/native-alternatives";
export { detectDuplicates, getCategoryForPackage } from "./rules/duplicate-categories";
export { matchWellKnownPackage, shouldIgnoreWellKnown } from "./rules/well-known-packages";

// Reporters
export { ConsoleReporter, consoleReporter } from "./reporters/console-reporter";
export { MarkdownReporter, markdownReporter } from "./reporters/markdown-reporter";

// Config
export { loadConfig, resolveConfig, defineConfig, getPreset } from "./config";

// Integrations
export { runKnipAnalysis, isKnipAvailable } from "./integrations/knip";

// Types (all exported from types/index.ts)
export type {
  Verdict,
  DependencyAnalysis,
  ScanResult,
  ImportInfo,
  SymbolUsage,
  AnalyzerOptions,
  WellKnownPattern,
};
```

---

## Extension Points

### Adding Native Alternatives

Edit `src/rules/native-alternatives.ts`:

```typescript
const NATIVE_ALTERNATIVES: Record<string, Record<string, AlternativeRule>> = {
  // Add new package
  "my-library": {
    someFunction: {
      native: "Native replacement description",
      example: "nativeCode()",
      minEcmaVersion: "ES2020",
      caveats: ["Optional limitations"],
    },
    // Default applies when specific symbol not matched
    default: {
      native: "General advice",
      example: "generalReplacement()",
    },
  },
  // ...existing entries
};
```

**Via Configuration:**

```typescript
// depscope.config.ts
export default defineConfig({
  nativeAlternatives: [
    {
      package: "my-library",
      symbols: {
        myFunction: {
          native: "Array.prototype.at()",
          example: "arr.at(-1)",
          minEcmaVersion: "ES2022",
        },
      },
    },
  ],
});
```

### Adding Duplicate Categories

Edit `src/rules/duplicate-categories.ts`:

```typescript
const DUPLICATE_CATEGORIES: Record<string, CategoryDefinition> = {
  // Add new category
  myCategory: {
    description: "My category description",
    packages: ["lib-a", "lib-b", "lib-c"],
    recommendation: "Use lib-a for best results",
    preferredOrder: ["lib-a", "lib-b", "lib-c"],
  },
  // ...existing entries
};
```

**Via Configuration:**

```typescript
// depscope.config.ts
export default defineConfig({
  duplicateCategories: [
    {
      name: "charting",
      description: "Charting libraries",
      packages: ["chart.js", "recharts", "visx", "victory"],
      recommendation: "Recharts for React; Chart.js for vanilla",
      preferredOrder: ["recharts", "chart.js"],
    },
  ],
});
```

### Adding Well-Known Patterns

Edit `src/config/defaults.ts`:

```typescript
export const DEFAULT_WELL_KNOWN_PATTERNS: WellKnownPattern[] = [
  // Add new patterns
  { pattern: "@my-org/*", verdict: "KEEP", reason: "Internal packages" },
  { pattern: "legacy-*", verdict: "IGNORE", reason: "Legacy code" },
  // ...existing entries
];
```

**Via Configuration:**

```typescript
// depscope.config.ts
export default defineConfig({
  wellKnownPatterns: [
    { pattern: "@acme/*", verdict: "KEEP", reason: "Company packages" },
    { pattern: "*-mock", verdict: "IGNORE", reason: "Test mocks" },
  ],
});
```

### Creating Custom Presets

Create `src/config/presets/custom.ts`:

```typescript
import type { DepScopeConfig } from "../schema.js";

export const customPreset: Partial<DepScopeConfig> = {
  threshold: 3,
  fileCountThreshold: 5,
  wellKnownPatterns: [
    { pattern: "company-*", verdict: "KEEP", reason: "Internal" },
  ],
};
```

Register in `src/config/presets/index.ts`:

```typescript
import { customPreset } from "./custom.js";

export const PRESETS: Record<string, Partial<DepScopeConfig>> = {
  minimal: minimalPreset,
  react: reactPreset,
  node: nodePreset,
  custom: customPreset, // Add here
};
```

---

## Testing Structure

### Test Organization

```
tests/
├── analyzers/
│   ├── import-analyzer.test.ts   # 43 tests - AST parsing
│   ├── usage-analyzer.test.ts    # 28 tests - Main orchestrator
│   └── peer-dep-analyzer.test.ts # Peer dependency detection
├── config/
│   └── config.test.ts            # Config loading and merging
├── rules/
│   ├── native-alternatives.test.ts    # Alternative mapping
│   └── duplicate-categories.test.ts   # Duplicate detection
├── integrations/
│   └── knip.test.ts              # Knip integration
└── errors/
    └── errors.test.ts            # Error handling
```

### Running Tests

```bash
npm test              # Run all 159 tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test Patterns

Tests use Vitest with the following patterns:

- Mock file systems with in-memory content
- Mock `node_modules` structures for peer dep testing
- AST parsing tests with inline code strings
- Configuration tests with temporary directories

---

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@typescript-eslint/parser` | ^8.0.0 | TypeScript/JavaScript AST parsing |
| `@typescript-eslint/types` | ^8.0.0 | AST type definitions |
| `commander` | ^12.0.0 | CLI framework |
| `fast-glob` | ^3.3.0 | Fast file pattern matching |
| `jiti` | ^2.6.1 | TypeScript config file loading |
| `picocolors` | ^1.1.0 | Terminal colors (lightweight) |
| `yaml` | ^2.7.0 | YAML config parsing |
| `zod` | ^4.3.5 | Schema validation with TS inference |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.8.0 | TypeScript compiler |
| `vitest` | ^4.0.16 | Test runner |
| `@vitest/coverage-v8` | ^4.0.16 | Code coverage |
| `@types/node` | ^25.0.3 | Node.js type definitions |

### Why These Choices

- **@typescript-eslint/parser**: Industry standard for TS/JS parsing, used by ESLint
- **fast-glob**: 2-3x faster than node-glob, essential for large monorepos
- **picocolors**: 14x smaller than chalk, same API
- **zod**: Best TypeScript inference, runtime validation
- **jiti**: Lightweight alternative to ts-node for config loading
- **vitest**: Fast, ESM-native, compatible with Jest API

---

## CLI Commands Reference

```bash
# Scan all dependencies
dep-scope scan
dep-scope scan -p /path/to/project
dep-scope scan --src ./src ./lib --threshold 3
dep-scope scan --include-dev --with-knip
dep-scope scan --format json --output ./report.json

# Analyze single package
dep-scope analyze lodash
dep-scope analyze @tanstack/react-query --verbose

# Find duplicates
dep-scope duplicates
dep-scope duplicates --format markdown

# Generate full report
dep-scope report
dep-scope report -o ./dependency-audit.md

# Initialize config
dep-scope init
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No actionable issues |
| 1 | Issues found (REMOVE, RECODE_NATIVE, duplicates) |
| 2 | Error (invalid config, missing package.json, etc.) |

Use `--no-exit-code` to always exit with 0 (useful for CI debugging).

---

## Known Limitations

1. **Not detected**: CSS imports (`@import 'pkg'`), config file references (Tailwind plugins, Babel configs)
2. **Side effects**: Packages imported for side effects (`import 'normalize.css'`) are detected but may show low symbol usage
3. **Re-exports**: Deeply nested re-exports may not trace back to original package
4. **Bundle size estimates**: Rough approximations, not actual bundle analysis

---

## Contributing

1. Read `CLAUDE.md` for AI-assisted development context
2. Follow existing code patterns and TypeScript conventions
3. Add tests for new features (maintain 159+ test coverage)
4. Update this index when adding new files or changing architecture

---

*Generated for dep-scope v0.1.0*
