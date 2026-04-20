# dep-scope

[![CI](https://github.com/FlorianBruniaux/node-dep-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/FlorianBruniaux/node-dep-scope/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@florianbruniaux/dep-scope.svg)](https://www.npmjs.com/package/@florianbruniaux/dep-scope)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Symbol-level dependency analysis + LLM-ready migration prompts** for TypeScript/JavaScript projects.

> *"Knip tells you what's unused. dep-scope tells you how you use what you keep — and generates the prompt to remove it."*

## When to use dep-scope

**Good use cases:**
- **Legacy project audit**: Finding lodash functions that now have native equivalents
- **Library consolidation**: Do we really need 3 icon libraries?
- **Migration**: Generate a context-aware prompt and let Claude Code do the refactoring
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
  ↻ Recode Native: 3
  ✗ Remove:        2
  ⊕ Peer Dep:      4

Action Items:
  Remove (unused):
    ✗ moment
    ✗ has-flag

  Recode to native:
    ↻ lodash.debounce (1 symbol) → custom debounce function
    ↻ array-includes (1 symbol) → Array.prototype.includes
    ↻ left-pad (1 symbol) → String.prototype.padStart
```

**What it found:**
- 2 unused packages to remove
- 3 dependencies replaceable with native code (including e18e micro-utilities)
- 4 peer deps that don't need explicit installation

## How it compares

| Feature | Knip | Depcheck | Moderne | dep-scope |
|---------|------|----------|---------|-----------|
| Unused detection | ✅ Excellent | ✅ Good | ❌ | ⚠️ Basic |
| Config file scanning | ✅ | ✅ | ❌ | ❌ |
| Symbol-level analysis | ❌ | ❌ | ✅ | ✅ |
| Native alternatives database | ❌ | ❌ | ✅ (lodash) | ✅ 195 packages |
| e18e micro-utilities coverage | ❌ | ❌ | ❌ | ✅ |
| Duplicate detection | ❌ | ❌ | ❌ | ✅ |
| LLM migration prompt | ❌ | ❌ | ❌ | ✅ |
| OSS / free | ✅ | ✅ | ❌ enterprise | ✅ |

**Recommendation**: Use Knip for unused detection, dep-scope for deeper analysis and migration. They work well together (dep-scope auto-detects Knip if installed).

## Installation

### From npm

```bash
npm install -g @florianbruniaux/dep-scope
```

### From source

```bash
git clone https://github.com/FlorianBruniaux/node-dep-scope.git
cd node-dep-scope
npm install
npm run build
npm install -g .
```

### Without installation

```bash
npx @florianbruniaux/dep-scope scan
```

## Quick Start

```bash
# Navigate to your project
cd /path/to/your/project

# Run a full scan
dep-scope scan

# Scan with duplicate detection
dep-scope scan --check-duplicates

# Generate migration prompts for everything that can be removed
dep-scope migrate

# Generate a markdown report
dep-scope report -o ./dependency-audit.md
```

## Getting accurate results — configure srcPaths

dep-scope scans the directories listed in `srcPaths` (default: `./src`). If your source files live elsewhere the tool will flag packages as unused when they're not.

Create `.depscoperc.json` in your project root:

```json
{
  "srcPaths": ["src", "app", "pages", "components", "lib", "hooks", "server"]
}
```

Run with `--verbose` to see which paths were used (and whether auto-detection kicked in):

```bash
dep-scope scan --verbose
```

Auto-detection is built-in: if `./src` doesn't exist, dep-scope scans `app`, `lib`, `pages`, `components`, `hooks`, `server` automatically. A warning is printed when this happens. Explicit config is always more reliable.

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
| `-s, --src <paths...>` | Source directories to scan | `./src` (with auto-detection) |
| `-t, --threshold <n>` | Symbol count threshold for RECODE verdict | `5` |
| `-d, --include-dev` | Include devDependencies | `false` |
| `-f, --format <type>` | Output format: `console`, `markdown`, `json` | `console` |
| `-o, --output <file>` | Output file path | stdout |
| `-v, --verbose` | Verbose output (shows resolved srcPaths) | `false` |
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
dep-scope scan -s src lib app components

# Scan including devDependencies
dep-scope scan -d

# Scan with duplicate detection
dep-scope scan --check-duplicates

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

### `migrate` - Generate LLM-ready migration prompts

```bash
dep-scope migrate [package] [options]
```

Generates a structured markdown prompt that a LLM (Claude Code, Cursor, etc.) can follow to remove a dependency and replace its usages with native alternatives.

**Without a package argument**, dep-scope scans the project, finds all `RECODE_NATIVE` and `CONSOLIDATE` dependencies that have known native alternatives, and generates one prompt file per candidate.

**With a package name**, generates a prompt for that specific dependency.

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Project path | Current directory |
| `-s, --src <paths...>` | Source directories | `./src` (with auto-detection) |
| `-o, --output <file>` | Output path (single-package mode only) | `.dep-scope/migrate-<pkg>.md` |
| `--dry-run` | Preview candidates without writing files | `false` |

**Examples:**
```bash
# Preview what would be generated (no files written)
dep-scope migrate --dry-run

# Auto-detect all migration candidates and generate prompts
dep-scope migrate

# Target a specific package
dep-scope migrate lodash
dep-scope migrate uuid -p /path/to/project

# Pipe directly into Claude Code
claude -p "$(cat .dep-scope/migrate-lodash.md)"

# Or use claude -p with all generated prompts
for f in .dep-scope/migrate-*.md; do
  echo "--- $f ---"
  claude -p "$(cat $f)"
done
```

**What the generated prompt includes:**
- Audit summary: package, symbols used, files affected, TypeScript target, framework, complexity label
- Per-symbol refactoring plan with exact file locations (`src/hooks/useSearch.ts:12`)
- Native replacement code snippets, adapted to your ES target (e.g. `structuredClone` only when target ≥ ES2022)
- Polyfill fallbacks when your target is below the native API's minimum version
- Step-by-step instructions: branch, replace, build, test, uninstall
- Verification checklist and rollback instructions

**Supported packages:**

| Package | Coverage |
|---------|----------|
| `lodash` / `lodash-es` | Hand-crafted: 12 symbols + catch-all |
| `moment` | Hand-crafted: 11 symbols (format, add, diff, parse, isBefore...) |
| `axios` | Hand-crafted: 8 symbols (get, post, put, interceptors...) |
| `uuid`, `nanoid`, `classnames`, `qs`, `query-string`, `slugify`, `ms`, `escape-html`, `deep-equal` | Generic (from native-alternatives database) |
| 169 e18e packages | Generic: `has-flag`, `left-pad`, `array-includes`, `object-assign`, `is-windows`, `is-ci`, `uniq`, `arrify`, `array.prototype.*`, `string.prototype.*`, `object.*`, and more |

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
  "srcPaths": ["src", "app", "pages", "components", "lib", "hooks"],
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
  - src
  - app
  - components
threshold: 8
ignore:
  - "@internal/*"
fileCountThreshold: 3
```

### Configuration Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `srcPaths` | string[] | `["./src"]` | Source directories to scan. Auto-detected if paths don't exist. |
| `threshold` | number | `5` | Symbol count threshold for RECODE verdict |
| `includeDev` | boolean | `false` | Include devDependencies |
| `ignore` | string[] | `[]` | Packages to ignore (supports globs) |
| `format` | string | `"console"` | Output format: console, markdown, json |
| `verbose` | boolean | `false` | Verbose output (shows resolved paths, warnings) |
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
  srcPaths: ["src", "app", "components"],
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

Extend the native alternatives database for packages not already covered:

```json
{
  "nativeAlternatives": [
    {
      "package": "my-custom-util",
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
- **RECODE_NATIVE**: Less than `threshold` symbols used AND native alternatives exist (built-in DB or e18e)
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

## Native Alternatives Database

dep-scope flags 195 packages as having native replacements, across two sources:

### Built-in (symbol-level, hand-curated)

| Library | Symbol | Native Alternative |
|---------|--------|-------------------|
| lodash | `get` | Optional chaining `?.` |
| lodash | `cloneDeep` | `structuredClone()` |
| lodash | `uniq` | `[...new Set(arr)]` |
| lodash | `debounce` | Custom function (ES6) |
| moment | `format` | `Intl.DateTimeFormat` |
| moment | `add` / `subtract` | `date-fns` or `Temporal` |
| axios | `get` / `post` | `fetch()` |
| uuid | `v4` | `crypto.randomUUID()` |
| nanoid | `nanoid` | `crypto.randomUUID()` |
| classnames | default | Template literals or `clsx` |
| query-string | `parse/stringify` | `URLSearchParams` |
| slugify | default | `str.toLowerCase().replace(/\s+/g, '-')` |

### e18e micro-utilities (169 packages)

Single-purpose packages that ship something native JS already provides. Any symbol imported from these packages gets the native equivalent shown:

| Package | Native |
|---------|--------|
| `has-flag` | `process.argv.includes('--flag')` |
| `left-pad` / `pad-left` | `String.prototype.padStart` |
| `array-includes` | `Array.prototype.includes` |
| `object-assign` / `object.assign` | `Object.assign` |
| `is-windows` | `process.platform === 'win32'` |
| `is-ci` | `Boolean(process.env.CI)` |
| `is-even` / `is-odd` | `(n % 2) === 0` |
| `array-uniq` / `uniq` | `[...new Set(arr)]` |
| `arrify` | `Array.isArray(v) ? v : [v]` |
| `filter-obj` | `Object.fromEntries(Object.entries(obj).filter(fn))` |
| `global` / `globalthis` | `globalThis` |
| `inherits` | Native `class extends` |
| `concat-map` | `Array.prototype.flatMap` |
| `array.prototype.*` (20+) | Direct method call |
| `string.prototype.*` (15+) | Direct method call |
| `object.*` (10+) | Direct method call |
| ... and 100+ more | — |

Source: [e18e/module-replacements](https://github.com/es-tooling/module-replacements) — embedded statically, no runtime dependency added.

## Example Output

```
═══════════════════════════════════════════
  dep-scope Analysis Report
═══════════════════════════════════════════

Summary:
  Total dependencies: 120
  ✓ Keep:          29
  ↻ Recode Native: 5
  ⇄ Consolidate:   14
  ✗ Remove:        3
  ⊕ Peer Dep:      1
  ? Investigate:   68

Estimated Savings:
  Bundle: ~112KB (gzipped)
  Dependencies: 22

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
    ↻ has-flag (1 symbol: hasFlag) → process.argv.includes('--flag')
    ↻ left-pad (1 symbol: leftPad) → String.prototype.padStart
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
} from '@florianbruniaux/dep-scope';

// Basic usage
const analyzer = new UsageAnalyzer({
  srcPaths: ['./src', './app', './components'],
  threshold: 5,
  includeDev: false,
});

const dependencies = await analyzer.scanProject('./my-project');
const duplicates = detectDuplicates(dependencies);

// Find unused dependencies
const unused = dependencies.filter(d => d.verdict === 'REMOVE');

// Find dependencies with native alternatives (includes e18e packages)
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
import { loadConfig, resolveConfig, UsageAnalyzer } from '@florianbruniaux/dep-scope';

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
import { defineConfig } from '@florianbruniaux/dep-scope';

export default defineConfig({
  extends: 'react',
  srcPaths: ['src', 'app', 'components'],
  threshold: 8,
  wellKnownPatterns: [
    { pattern: '@myorg/*', verdict: 'KEEP', reason: 'Internal packages' },
  ],
});
```

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

The most common cause of inaccurate results is an incomplete `srcPaths` configuration. If a package appears as REMOVE but you know it's used, check that its import files are inside the scanned directories.

## Ready-to-use AI prompts

Copy-paste these prompts into Claude Code, Cursor, Copilot Chat, or any AI assistant to get an immediate, guided dep-scope audit. No slash command setup required.

### Full audit — one-shot prompt

```
Run `dep-scope scan --check-duplicates --verbose` on this project (current directory).
Then analyze the output:
1. List all REMOVE packages — confirm each is truly unused before flagging it
2. List all RECODE_NATIVE packages with their native alternatives
3. List all CONSOLIDATE groups and identify the winner to keep
4. List INVESTIGATE packages worth a second look (ignore the obvious false positives)
5. Produce a prioritized action plan: quick wins (REMOVE + trivial RECODE) first,
   then migrations, then consolidations
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
If srcPaths seems wrong (packages flagged REMOVE that you know are used), re-run with
`-s src app pages components lib hooks` and note the discrepancy.
```

### Migration audit — full project

```
Run `dep-scope migrate --dry-run` on this project to see all migration candidates.
Then run `dep-scope migrate` to generate the prompt files.
For each generated file in .dep-scope/:
1. Read the file and summarize what it asks you to do
2. Confirm the file locations are accurate
3. Ask me which package to migrate first
Once I confirm, run the migration by reading the corresponding migrate-<pkg>.md file
and following its instructions exactly — including creating a branch, replacing imports,
running build and tests, and uninstalling the package.
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

### Target a single package

```
Run `dep-scope migrate lodash` (replace "lodash" with the target package).
Then read the generated .dep-scope/migrate-lodash.md file and follow its instructions:
1. Create a branch: git checkout -b refactor/remove-lodash
2. Replace each symbol as documented, file by file
3. Run: npm run build && npm test after each file to catch regressions early
4. Once all symbols are replaced: npm uninstall lodash
5. Final check: npm run build && npm test
6. Confirm no remaining imports: grep -r "from 'lodash'" src/
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

### Quick scan — actionable items only

```
Run `dep-scope scan --actionable-only` on this project.
Show me only what needs action: REMOVE (unused), RECODE_NATIVE (has native alternatives),
and PEER_DEP (redundant in package.json).
For each RECODE_NATIVE package, tell me which symbols are used and what the native
replacement is. Ignore INVESTIGATE for now.
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

### Audit + auto-migrate pipeline (advanced)

```
Step 1 — Audit: run `dep-scope scan --check-duplicates`
Step 2 — Identify candidates: run `dep-scope migrate --dry-run`
Step 3 — For each candidate shown, ask me for confirmation before proceeding
Step 4 — For each confirmed package, run `dep-scope migrate <package>` and
          execute the generated prompt from .dep-scope/migrate-<pkg>.md
Step 5 — After each migration: npm run build && npm test — stop if either fails
Step 6 — Final report: list what was removed, what's left, and estimated bundle savings
Work through candidates one at a time. Never migrate two packages simultaneously.
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

### Multi-project QA prompt

Testing dep-scope across several projects and want a structured feedback report? Use the QA prompt in [`prompts/qa-multi-project.md`](prompts/qa-multi-project.md). It walks an AI agent through finding diverse projects on the machine, running the full command sequence, spot-checking verdicts (including barrel file re-exports and CSS reset packages), and producing a structured report with accuracy assessment, missing coverage, and improvement suggestions.

```bash
cat prompts/qa-multi-project.md | pbcopy   # copy to clipboard, then paste into Claude
```

---

## Claude Code slash command

dep-scope includes a pre-built slash command for [Claude Code](https://claude.ai/code). Once installed, use `/audit-deps` in any project for an AI-assisted audit.

### Install

```bash
# Copy the command to your global Claude commands
cp /path/to/node-dep-scope/.claude/commands/audit-deps.md ~/.claude/commands/
```

### Usage

```
/audit-deps
```

Claude will run `dep-scope scan`, identify false positives, produce a structured audit report, and suggest a prioritized action plan.

## Requirements

- Node.js >= 18.0.0
- TypeScript/JavaScript project with `package.json`

## License

MIT
