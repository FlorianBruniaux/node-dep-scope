# dep-scope

[![CI](https://github.com/florianb/node-dep-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/florianb/node-dep-scope/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dep-scope.svg)](https://www.npmjs.com/package/dep-scope)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Symbol-level dependency analysis** for TypeScript/JavaScript projects.

> *"Knip tells you what's unused. dep-scope tells you how you use what you keep."*

## When to use dep-scope

**Good use cases:**
- **Legacy project audit**: Finding lodash functions that now have native equivalents
- **Library consolidation**: Do we really need 3 icon libraries?
- **Curiosity**: "Which symbols from this 50KB library do we actually use?"

**Not the right tool if:**
- You just want unused deps → use [Knip](https://knip.dev) instead
- Your codebase is already well-maintained → dep-scope will mostly say "KEEP"

## Quick Example

```bash
$ dep-scope scan

═══════════════════════════════════════════
  dep-scope Analysis Report
═══════════════════════════════════════════

Summary:
  Total dependencies: 45
  ✓ Keep:          38
  ↻ Recode Native: 1
  ✗ Remove:        2
  ⊕ Peer Dep:      4

Action Items:
  Remove (unused):
    ✗ lodash.isequal
    ✗ moment

  Recode to native:
    ↻ lodash.debounce (1 symbol) → native setTimeout pattern

  Peer deps (redundant in package.json):
    ⊕ react ← required by: react-dom, @tanstack/react-query
```

**What it found:**
- 2 unused packages to remove
- 1 lodash function replaceable with native code
- 4 peer deps that don't need explicit installation

## How it compares

| Feature | Knip | Depcheck | dep-scope |
|---------|------|----------|-----------|
| Unused detection | ✅ Excellent | ✅ Good | ⚠️ Basic |
| Config file scanning | ✅ | ✅ | ❌ |
| Symbol-level analysis | ❌ | ❌ | ✅ |
| Native alternatives | ❌ | ❌ | ✅ |
| Duplicate detection | ❌ | ❌ | ✅ |

**Recommendation**: Use Knip for unused detection, dep-scope for deeper analysis. They work well together (dep-scope auto-detects Knip if installed).

## Installation

### From npm (when published)

```bash
npm install -g dep-scope
```

### From source

```bash
git clone https://github.com/florianb/node-dep-scope.git
cd node-dep-scope
npm install
npm run build
npm install -g .
```

### Without installation

```bash
npx dep-scope scan
```

## Quick Start

```bash
# Navigate to your project
cd /path/to/your/project

# Run a full scan
dep-scope scan

# Generate a markdown report
dep-scope report -o ./dependency-audit.md
```

## Commands

### `scan` - Analyze all dependencies

```bash
dep-scope scan [options]
```

Scans all dependencies and outputs a summary with verdicts.

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Project path | Current directory |
| `-s, --src <paths...>` | Source directories to scan | `./src` |
| `-t, --threshold <n>` | Symbol count threshold for RECODE verdict | `5` |
| `-d, --include-dev` | Include devDependencies | `false` |
| `-f, --format <type>` | Output format: `console`, `markdown`, `json` | `console` |
| `-o, --output <file>` | Output file path | stdout |
| `-v, --verbose` | Verbose output | `false` |
| `--ignore <packages...>` | Packages to ignore | none |
| `--with-knip` | Use Knip for pre-analysis (auto-detected by default) | auto |
| `--no-knip` | Disable Knip integration even if available | `false` |
| `--check-duplicates` | Enable duplicate library detection | `false` |
| `--actionable-only` | Show only actionable items (hide INVESTIGATE) | `false` |
| `--no-config` | Ignore config file | `false` |
| `--no-auto-detect` | Disable monorepo workspace auto-detection | `false` |

**Examples:**
```bash
# Scan with custom source paths
dep-scope scan -s ./src ./lib ./app

# Scan including devDependencies
dep-scope scan -d

# Output as JSON
dep-scope scan -f json -o ./deps.json

# Scan a different project
dep-scope scan -p /path/to/project
```

### `analyze` - Analyze a specific package

```bash
dep-scope analyze <package> [options]
```

Deep analysis of a single dependency: all symbols used, file locations, and alternatives.

**Examples:**
```bash
dep-scope analyze lodash
dep-scope analyze @tanstack/react-query -f markdown
```

### `duplicates` - Find duplicate libraries

```bash
dep-scope duplicates [options]
```

Detects libraries serving the same purpose (e.g., multiple icon libraries, date utilities).

**Detected categories:** icons, date, cssUtils, http, state, dnd, validation, forms, animation, markdown, uuid, lodashLike

### `report` - Generate full audit report

```bash
dep-scope report [options]
```

Generates a comprehensive markdown or JSON report.

**Examples:**
```bash
dep-scope report -o ./audit.md
dep-scope report -p ./my-project -f json -o ./audit.json
```

### `init` - Create config file

```bash
dep-scope init [options]
```

Creates a `.depscoperc.json` config file with sensible defaults.

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Project path | Current directory |

## Configuration

dep-scope supports configuration files for persistent settings and customization.

### Config File Formats

Config files are detected in this order:

1. `.depscoperc`
2. `.depscoperc.json`
3. `depscope.config.json`
4. `depscope.config.yaml` / `depscope.config.yml`
5. `depscope.config.ts`
6. `depscope.config.js` / `.mjs` / `.cjs`
7. `package.json` → `depScope` field

### Basic Configuration

**JSON** (`.depscoperc.json`):
```json
{
  "srcPaths": ["./src", "./lib"],
  "threshold": 8,
  "includeDev": false,
  "ignore": ["@internal/*"],
  "format": "console",
  "verbose": false,
  "fileCountThreshold": 3,
  "autoDetectWorkspace": true
}
```

**YAML** (`depscope.config.yaml`):
```yaml
srcPaths:
  - ./src
  - ./lib
threshold: 8
ignore:
  - "@internal/*"
fileCountThreshold: 3
autoDetectWorkspace: true
```

### Configuration Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `srcPaths` | string[] | `["./src"]` | Source directories to scan |
| `threshold` | number | `5` | Symbol count threshold for RECODE verdict |
| `includeDev` | boolean | `false` | Include devDependencies |
| `ignore` | string[] | `[]` | Packages to ignore (supports globs) |
| `format` | string | `"console"` | Output format: console, markdown, json |
| `verbose` | boolean | `false` | Verbose output |
| `fileCountThreshold` | number | `3` | Minimum file count to auto-KEEP (skip INVESTIGATE) |
| `autoDetectWorkspace` | boolean | `true` | Auto-detect monorepo workspaces |

### Default Ignore Patterns

The following directories are always excluded from scanning:

```
node_modules, dist, .next, coverage
```

**TypeScript** (`depscope.config.ts`):
```typescript
import { defineConfig } from "dep-scope";

export default defineConfig({
  srcPaths: ["./src"],
  threshold: 8,
  wellKnownPatterns: [
    { pattern: "@company/*", verdict: "KEEP", reason: "Internal packages" },
  ],
});
```

### Presets

Use `extends` to inherit from built-in presets:

```json
{
  "extends": "react",
  "threshold": 10
}
```

**Available presets:**

| Preset | Description |
|--------|-------------|
| `minimal` | Default - ignores @types/*, eslint*, prettier, vitest, jest |
| `react` | React ecosystem - auto-KEEP react, react-dom, @tanstack/*, zustand, etc. |
| `node` | Node.js - ignores @types/node, typescript |

Presets can be combined:
```json
{
  "extends": ["minimal", "react"]
}
```

### Well-Known Patterns

Automatically assign KEEP or IGNORE verdicts to packages matching patterns:

```json
{
  "wellKnownPatterns": [
    { "pattern": "@radix-ui/*", "verdict": "KEEP", "reason": "UI components" },
    { "pattern": "@types/*", "verdict": "IGNORE", "reason": "TypeScript types" },
    { "pattern": "eslint*", "verdict": "IGNORE", "reason": "Dev tooling" }
  ]
}
```

**Built-in patterns** (120+ patterns, always applied):
- `@radix-ui/*`, `@headlessui/*`, `@chakra-ui/*` → KEEP (UI libraries)
- `@tanstack/*`, `react-hook-form`, `zustand` → KEEP (React ecosystem)
- `zod`, `valibot`, `yup` → KEEP (Validation)
- `@prisma/client`, `drizzle-orm` → KEEP (ORMs)
- `@types/*`, `eslint*`, `prettier`, `vitest`, `jest` → IGNORE (Dev tools)
- `tailwindcss`, `postcss`, `autoprefixer` → IGNORE (CSS tooling)
- `vite`, `webpack`, `esbuild`, `rollup` → IGNORE (Bundlers)

### Custom Native Alternatives

Extend the native alternatives database:

```json
{
  "nativeAlternatives": [
    {
      "package": "left-pad",
      "symbols": {
        "default": {
          "native": "String.prototype.padStart()",
          "example": "str.padStart(10, ' ')"
        }
      }
    }
  ]
}
```

### Custom Duplicate Categories

Define custom duplicate detection rules:

```json
{
  "duplicateCategories": [
    {
      "name": "internal-ui",
      "description": "Internal UI libraries",
      "packages": ["@company/ui-v1", "@company/ui-v2"],
      "recommendation": "Migrate to @company/ui-v2",
      "preferredOrder": ["@company/ui-v2", "@company/ui-v1"]
    }
  ]
}
```

### Config Priority

Settings are merged in this order (later wins):

```
Defaults → Presets (extends) → Config File → CLI Options
```

Arrays (`ignore`, `wellKnownPatterns`) are **merged**, not replaced.

## Verdicts

| Verdict | Symbol | Meaning |
|---------|--------|---------|
| ✅ KEEP | ✓ | Well-used, no action needed |
| 🔄 RECODE_NATIVE | ↻ | Few symbols used, native alternatives available |
| 🔀 CONSOLIDATE | ⇄ | Duplicate with another library |
| 🗑️ REMOVE | ✗ | Unused (0 imports found) |
| 🔗 PEER_DEP | ⊕ | Required by other packages, redundant in package.json |
| 🔍 INVESTIGATE | ? | Needs manual review |

### How verdicts are determined

- **REMOVE**: No imports detected in source files
- **PEER_DEP**: No direct imports, but required by other installed packages
- **RECODE_NATIVE**: Less than `threshold` symbols used AND native alternatives exist (e.g., `uuid.v4` → `crypto.randomUUID()`)
- **CONSOLIDATE**: Multiple libraries from same category detected (e.g., lucide-react + react-icons)
- **INVESTIGATE**: Low usage but no clear alternative (with reason)
- **KEEP**: Significant usage, no issues

### INVESTIGATE Reasons

When a package gets the INVESTIGATE verdict, dep-scope shows **why**:

| Reason | Threshold | Meaning |
|--------|-----------|---------|
| `LOW_SYMBOL_COUNT` | <= 2 symbols | Only 1-2 symbols used |
| `SINGLE_FILE_USAGE` | exactly 1 file | Used in only 1 file |
| `LOW_FILE_SPREAD` | 2 to `fileCountThreshold` files | Used in 2-3 files (below threshold) |
| `UNKNOWN_PACKAGE` | - | No well-known patterns matched, needs manual review |

**Example output:**
```
? @typescript-eslint/parser (1 symbol in 1 file) [single file usage]
? fast-glob (1 symbol in 2 files) [low file spread]
```

## Example Output

```
═══════════════════════════════════════════
  dep-scope Analysis Report
═══════════════════════════════════════════

Summary:
  Total dependencies: 120
  ✓ Keep:          29
  ↻ Recode Native: 2
  ⇄ Consolidate:   14
  ✗ Remove:        3
  ⊕ Peer Dep:      1
  ? Investigate:   71

Estimated Savings:
  Bundle: ~112KB (gzipped)
  Dependencies: 17

Duplicate Libraries:
  icons: Icon libraries
    ✓ lucide-react        187 files
    → @tabler/icons-react   45 files
    → react-icons           17 files

Action Items:
  Remove (unused):
    ✗ @daily-co/daily-js

  Peer deps (redundant in package.json):
    ⊕ @ai-sdk/provider ← required by: @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai

  Recode to native:
    ↻ uuid (1 symbol: v4) → crypto.randomUUID()
```

## Programmatic API

```typescript
import {
  UsageAnalyzer,
  detectDuplicates,
  defineConfig,
  loadConfig,
  resolveConfig,
  DEFAULT_WELL_KNOWN_PATTERNS
} from 'dep-scope';

// Basic usage
const analyzer = new UsageAnalyzer({
  srcPaths: ['./src'],
  threshold: 5,
  includeDev: false,
});

const dependencies = await analyzer.scanProject('./my-project');
const duplicates = detectDuplicates(dependencies);

// Find unused dependencies
const unused = dependencies.filter(d => d.verdict === 'REMOVE');

// Find dependencies with native alternatives
const recodable = dependencies.filter(d => d.verdict === 'RECODE_NATIVE');
recodable.forEach(dep => {
  console.log(`${dep.name}: ${dep.alternatives.map(a => a.native).join(', ')}`);
});

// Find INVESTIGATE with reasons
const investigate = dependencies.filter(d => d.verdict === 'INVESTIGATE');
investigate.forEach(dep => {
  console.log(`${dep.name}: ${dep.investigateReason}`);
});
```

### Using Config Files

```typescript
import { loadConfig, resolveConfig, UsageAnalyzer } from 'dep-scope';

// Load config from project
const fileConfig = await loadConfig('./my-project');

// Merge with CLI options
const config = resolveConfig({ threshold: 10 }, fileConfig);

// Create analyzer with resolved config
const analyzer = new UsageAnalyzer(config);
```

### defineConfig Helper

For TypeScript config files with full autocomplete:

```typescript
// depscope.config.ts
import { defineConfig } from 'dep-scope';

export default defineConfig({
  extends: 'react',
  threshold: 8,
  wellKnownPatterns: [
    { pattern: '@myorg/*', verdict: 'KEEP', reason: 'Internal packages' },
  ],
});
```

## Native Alternatives Database

dep-scope suggests native replacements for common libraries:

| Library | Symbol | Native Alternative |
|---------|--------|-------------------|
| lodash | `get` | Optional chaining `?.` |
| lodash | `cloneDeep` | `structuredClone()` |
| lodash | `uniq` | `[...new Set(arr)]` |
| moment | `format` | `Intl.DateTimeFormat` |
| axios | `get/post` | `fetch()` |
| uuid | `v4` | `crypto.randomUUID()` |
| nanoid | `nanoid` | `crypto.randomUUID()` |
| classnames | - | Template literals or `clsx` |
| query-string | `parse/stringify` | `URLSearchParams` |
| slugify | `default` | `str.toLowerCase().replace(/\s+/g, '-')` |
| escape-html | `default` | `str.replace(/[&<>"']/g, ...)` |
| deep-equal | `default` | `JSON.stringify(a) === JSON.stringify(b)` |

## Knip Integration

dep-scope automatically uses [Knip](https://knip.dev) when available in your project for improved accuracy:

```bash
# Knip is auto-detected and used by default
dep-scope scan

# Explicitly enable Knip
dep-scope scan --with-knip

# Disable Knip integration
dep-scope scan --no-knip
```

This runs Knip first to detect unused dependencies, then dep-scope adds symbol-level analysis. The combination reduces false positives significantly.

### Why not a Knip plugin/reporter?

We evaluated three integration approaches:

| Approach | Viable? | Why not? |
|----------|---------|----------|
| Knip Preprocessor | ❌ | Preprocessors filter/transform data, can't add symbol-level analysis |
| Knip Reporter | ⚠️ | Technically possible, but couples dep-scope to Knip and loses standalone value |
| Knip Plugin | ❌ | Plugins detect usage in config files, not for analysis enrichment |

**Decision**: dep-scope consumes Knip output rather than being consumed by it. This keeps dep-scope independent while benefiting from Knip's ecosystem detection when needed.

## CI/CD Integration

dep-scope uses exit codes for CI pipelines:

| Exit Code | Meaning |
|-----------|---------|
| `0` | Success, no actionable issues |
| `1` | Success, but actionable issues found |
| `2` | Error (invalid config, missing package.json, etc.) |

### What counts as actionable

The following verdicts trigger exit code 1:

- **REMOVE** > 0 (unused dependencies)
- **RECODE_NATIVE** > 0 (dependencies with native alternatives)
- **PEER_DEP** > 0 (redundant peer dependencies)
- **Duplicates found** (multiple libraries in same category)

Note: **INVESTIGATE** is NOT considered actionable and will not trigger exit code 1.

```bash
# In CI: fail if actionable issues found
dep-scope scan

# In CI: always succeed (for reporting only)
dep-scope scan --no-exit-code

# Show only actionable items (hide INVESTIGATE)
dep-scope scan --actionable-only
```

## Path Alias Handling

dep-scope automatically filters out path aliases to avoid counting internal imports as external packages:

- **Common patterns**: `@/`, `~/`, `#/` prefixes
- **Word-based aliases**: `@app/`, `@components/`, `@utils/`, etc.
- **TSConfig paths**: Custom aliases from `tsconfig.json` → `compilerOptions.paths`

This prevents false positives where `@/components/Button` would incorrectly be counted as an npm package.

## Limitations

The analyzer uses static AST analysis. It won't detect:

- **CSS imports**: `@import 'package'` in CSS/SCSS files
- **Config references**: Tailwind plugins, Babel presets, etc.
- **Runtime-only deps**: Dependencies used only at runtime without imports

Use `--ignore` to exclude packages you know are used in config files. Knip integration (enabled by default) helps detect config-referenced packages.

## Claude Code Integration

dep-scope includes a custom slash command for [Claude Code](https://claude.ai/code). Once installed, use `/audit-deps` in any project to get an AI-assisted dependency audit with actionable recommendations.

### Install the slash command

```bash
# Copy the command to your global Claude commands
cp /path/to/node-dep-scope/.claude/commands/audit-deps.md ~/.claude/commands/
```

Or with curl (after npm publish):
```bash
mkdir -p ~/.claude/commands && curl -o ~/.claude/commands/audit-deps.md https://raw.githubusercontent.com/florianb/node-dep-scope/main/.claude/commands/audit-deps.md
```

### Usage

In any project with Claude Code:

```
/audit-deps
```

Claude will:
1. Run `dep-scope scan` on your project
2. Analyze the results and identify false positives
3. Produce a structured audit report
4. Suggest a prioritized action plan (quick wins → migrations → refactoring)

## Requirements

- Node.js >= 18.0.0
- TypeScript/JavaScript project with `package.json`

## License

MIT
