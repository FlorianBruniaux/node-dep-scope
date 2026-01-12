# dep-scope - Challenge This Project

## Context for Reviewers

You are reviewing **dep-scope**, a CLI tool for granular dependency analysis in TypeScript/JavaScript projects. Your role is to critically evaluate the concept, architecture, and implementation. Be brutally honest about flaws, missed opportunities, and questionable design decisions.

---

## Problem Statement

Existing tools (Knip, Depcheck) provide binary analysis: "dependency X is used/unused". This is insufficient because:

1. **No granularity**: A project using only `lodash.get()` is told "lodash is used" - no insight that 99% of lodash is dead weight
2. **No alternatives**: No suggestion that `lodash.get()` → `obj?.foo?.bar` (optional chaining)
3. **No duplicate detection**: Projects often have moment + dayjs + date-fns doing the same thing
4. **No peer dependency awareness**: Packages required transitively clutter package.json unnecessarily

**dep-scope goal**: Symbol-level analysis with actionable recommendations.

---

## Core Concepts

### Verdicts

Each dependency receives one verdict:

| Verdict | Criteria | Action |
|---------|----------|--------|
| `KEEP` | Well-used, no issues | None |
| `REMOVE` | Zero imports detected | `npm uninstall` |
| `RECODE_NATIVE` | < threshold symbols + native alternative exists | Refactor to native JS |
| `CONSOLIDATE` | Duplicate with another library in same category | Pick one, migrate |
| `PEER_DEP` | Required by other packages, not directly imported | Remove from package.json |
| `INVESTIGATE` | Low usage, no clear alternative | Manual review |

### Symbol-Level Analysis

Instead of "lodash is used", dep-scope reports:
```
lodash v4.17.21
  Symbols: get (45x), debounce (12x), cloneDeep (3x)
  Files: 23
  Verdict: RECODE_NATIVE
  Alternatives:
    - get → optional chaining (?.)
    - cloneDeep → structuredClone()
    - debounce → native setTimeout pattern
```

### Native Alternatives Database

Maps library symbols to modern JS equivalents:

```typescript
// src/rules/native-alternatives.ts
"lodash": {
  get: { native: "Optional chaining", example: "obj?.foo?.bar" },
  cloneDeep: { native: "structuredClone()", minEcmaVersion: "ES2022" },
  uniq: { native: "[...new Set(arr)]" },
},
"uuid": {
  v4: { native: "crypto.randomUUID()", minEcmaVersion: "ES2021" },
},
"axios": {
  get: { native: "fetch()", example: "await fetch(url).then(r => r.json())" },
}
```

### Duplicate Categories

Detects functional overlaps:

```typescript
// src/rules/duplicate-categories.ts
icons: ["lucide-react", "react-icons", "@heroicons/react", "@tabler/icons-react"],
date: ["moment", "dayjs", "date-fns", "luxon"],
http: ["axios", "got", "ky", "node-fetch"],
state: ["redux", "zustand", "jotai", "recoil", "valtio"],
```

---

## Architecture

```
src/
├── types/index.ts              # Core interfaces
├── analyzers/
│   ├── import-analyzer.ts      # AST parsing (@typescript-eslint/parser)
│   ├── usage-analyzer.ts       # Main orchestrator
│   ├── verdict-engine.ts       # Verdict determination logic
│   └── peer-dep-analyzer.ts    # Scans node_modules for peer deps
├── rules/
│   ├── native-alternatives.ts  # Symbol → native JS mappings
│   ├── duplicate-categories.ts # Functional overlap definitions
│   └── well-known-packages.ts  # Auto-KEEP/IGNORE patterns
├── config/
│   ├── schema.ts               # Zod validation
│   ├── loader.ts               # Multi-format config loading
│   ├── presets/                # react, node, minimal presets
│   └── defaults.ts             # Default values
├── reporters/
│   ├── console-reporter.ts     # Terminal output
│   └── markdown-reporter.ts    # Report generation
├── infrastructure/             # DI, caching, file system abstraction
└── cli/index.ts                # Commander.js entry point
```

### Data Flow

1. Read `package.json` → extract dependencies
2. `fast-glob` finds all `.ts/.tsx/.js/.jsx` files in srcPaths
3. `@typescript-eslint/parser` parses each file's AST
4. Extract `ImportDeclaration` nodes → collect symbols, locations, counts
5. Aggregate by package → determine verdict based on rules
6. Output via reporter (console/markdown/JSON)

### Dependency Injection

Full DI architecture for testability:

```typescript
const container = createContainer({
  fileSystem: createFileSystem(),
  logger: createLogger(),
  cache: createFileAnalysisCache(),
});

const analyzer = container.resolve(UsageAnalyzer);
```

---

## Configuration System

### Multi-format support

```
.depscoperc.json | depscope.config.yaml | depscope.config.ts | package.json#depScope
```

### Schema

```typescript
{
  extends: "react" | "node" | "minimal" | ["react", "node"],
  srcPaths: ["./src", "./lib"],
  threshold: 5,                    // Symbol count for RECODE verdict
  fileCountThreshold: 3,           // Min files to skip INVESTIGATE
  includeDev: false,
  ignore: ["@internal/*"],
  wellKnownPatterns: [
    { pattern: "@company/*", verdict: "KEEP", reason: "Internal packages" }
  ],
  nativeAlternatives: [...],       // Custom additions
  duplicateCategories: [...],      // Custom categories
}
```

### Well-Known Patterns

75+ built-in patterns for auto-verdicts:

```typescript
// Auto-KEEP (framework essentials)
"@radix-ui/*", "@tanstack/*", "zod", "next", "@prisma/client"

// Auto-IGNORE (dev tools)
"@types/*", "eslint*", "prettier", "vitest", "typescript"
```

---

## CLI Commands

```bash
# Full scan
dep-scope scan [options]
  -p, --path <path>           # Project path
  -s, --src <paths...>        # Source directories
  -t, --threshold <n>         # Symbol threshold (default: 5)
  -d, --include-dev           # Include devDependencies
  -f, --format <type>         # console | markdown | json
  --actionable-only           # Hide INVESTIGATE verdicts
  --with-knip                 # Use Knip for pre-analysis

# Single package deep-dive
dep-scope analyze <package>

# Find duplicates only
dep-scope duplicates

# Generate report
dep-scope report -o ./audit.md

# Create config file
dep-scope init
```

---

## Current Metrics

Tested on real projects:

| Project | Deps | KEEP | REMOVE | RECODE | CONSOLIDATE | PEER_DEP | INVESTIGATE |
|---------|------|------|--------|--------|-------------|----------|-------------|
| techmapper | 15 | 69% | 0% | 0% | 15% | 0% | 13% |
| MethodeAristote/app | 122 | 44% | 2% | 0% | 11% | 1% | 37% |

**Problem**: INVESTIGATE rate is high (37%) on complex projects. Mitigated with `--actionable-only` flag.

---

## Known Limitations

1. **Static analysis only**: No runtime detection
2. **Not detected**:
   - CSS imports (`@import 'package'`)
   - Config file references (Tailwind plugins, Babel presets)
   - Implicit usage (React JSX transform needs `react` without import)
3. **False positives**: Packages used only in config files appear as "unused"
4. **Native alternatives**: Database is manually maintained, may be incomplete

---

## Technical Decisions to Challenge

### 1. AST Parser Choice
Using `@typescript-eslint/parser` instead of TypeScript compiler API or Babel.
- **Rationale**: Handles both TS and JS, good error recovery
- **Trade-off**: Slower than native TS, doesn't resolve types

### 2. Verdict Logic
Threshold-based (< 5 symbols = RECODE candidate).
- **Rationale**: Simple, configurable
- **Trade-off**: Arbitrary, doesn't consider symbol complexity

### 3. INVESTIGATE Catch-All
Packages that don't fit other categories get INVESTIGATE.
- **Rationale**: Avoid false positives in automation
- **Trade-off**: Creates noise (37% on large projects)

### 4. Well-Known Patterns
Hardcoded list of 75+ packages with auto-verdicts.
- **Rationale**: Reduces false positives for framework essentials
- **Trade-off**: Maintenance burden, may miss new packages

### 5. No Type Resolution
Doesn't follow type imports or understand re-exports.
- **Rationale**: Complexity vs value trade-off
- **Trade-off**: May miss indirect usage through barrel files

### 6. Single-Pass Analysis
Analyzes each file independently, aggregates at end.
- **Rationale**: Simple, parallelizable
- **Trade-off**: Can't detect cross-file patterns

---

## Questions for Challengers

1. **Concept validity**: Is symbol-level analysis actually useful, or is binary used/unused sufficient for most cases?

2. **INVESTIGATE problem**: 37% INVESTIGATE rate means the tool punts on 1/3 of dependencies. Is this acceptable? Better heuristics?

3. **Native alternatives**: Is suggesting `structuredClone()` over `lodash.cloneDeep()` good advice? Edge cases?

4. **Threshold logic**: Is "< 5 symbols = consider removal" a valid heuristic? What's better?

5. **Well-known patterns**: Is maintaining a hardcoded list of 75+ packages sustainable? Alternative approaches?

6. **Missing detection**: CSS imports, config files, implicit usage - how critical are these gaps?

7. **Architecture**: Is full DI overkill for a CLI tool? Does it add value or just complexity?

8. **Market fit**: Given Knip exists and is mature, what's the unique value proposition here?

9. **False positive rate**: How would you validate that the tool's recommendations are actually correct?

10. **Scaling**: Will AST parsing 1000+ files be performant? Current approach uses parallel processing.

---

## Repository

- **GitHub**: https://github.com/FlorianBruniaux/node-dep-scope
- **Tech stack**: TypeScript, Commander.js, @typescript-eslint/parser, fast-glob, Zod, picocolors
- **Tests**: 294 unit tests (Vitest)
- **Node**: >= 18.0.0

---

## Your Task

Critically analyze this project:

1. **Concept**: Is the problem real? Is this the right solution?
2. **Architecture**: Clean or over-engineered? Missing abstractions?
3. **Implementation**: Bugs? Edge cases? Performance issues?
4. **UX**: Is the CLI intuitive? Are verdicts actionable?
5. **Gaps**: What's missing that would make this 10x more useful?
6. **Competition**: How does this compare to Knip, Depcheck, webpack-bundle-analyzer?

Be harsh. Point out flaws. Suggest improvements. Challenge assumptions.
