# Commands

## `init` — Configure dep-scope (interactive wizard)

```bash
dep-scope init [options]
```

Detects your project (framework, existing directories) and guides you through 4 questions to generate a `.depscoperc.json` or `depscope.config.ts` tailored to your project layout.

**Options:**

| Option | Description |
|--------|-------------|
| `-p, --path <path>` | Project path (default: current directory) |
| `-y, --yes` | Skip prompts and write defaults (CI-safe) |

**Wizard flow:**

```
dep-scope init

  Detected: Next.js project
  Found dirs: src/, scripts/, app/

? Source directories to scan:
  ● Auto-detected: src/, scripts/, app/  (recommended)
  ○ Full project root (.) — includes everything
  ○ Choose directories manually...

? Include devDependencies in scan? (y/N)
? Symbol threshold for RECODE_NATIVE verdict: (5)
? Config format:
  ● .depscoperc.json  (simple JSON, recommended)
  ○ depscope.config.ts  (TypeScript with autocomplete)

✓ Created .depscoperc.json
  Preset: react  |  Dirs: src, scripts, app  |  Threshold: 5
```

Running `init` on a project that already has a config will ask whether to overwrite it. In non-interactive environments (`--yes` or no TTY) it writes sensible defaults silently.

---

## `scan` — Analyze all dependencies

```bash
dep-scope scan [options]
```

Scans all dependencies and outputs a summary with verdicts.

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Project path | Current directory |
| `-s, --src <paths...>` | Source directories to scan | auto-detected |
| `--root` | Scan from project root — includes `scripts/`, `tools/`, `bin/` (shorthand for `--src .`) | `false` |
| `-t, --threshold <n>` | Symbol count threshold for RECODE verdict | `5` |
| `-d, --include-dev` | Include devDependencies | `false` |
| `-f, --format <type>` | Output format: `console`, `markdown`, `json` | `console` |
| `-o, --output <file>` | Output file path | stdout |
| `-v, --verbose` | Verbose output (shows resolved srcPaths) | `false` |
| `--ignore <packages...>` | Packages to ignore | none |
| `--with-knip` | Use Knip for pre-analysis (auto-detected by default) | auto |
| `--no-knip` | Disable Knip integration even if available | `false` |
| `--check-duplicates` | Enable duplicate library detection | `false` |
| `--check-transitive` | Scan transitive deps for packages with native alternatives | `false` |
| `--each-workspace` | Scan each workspace package individually (monorepo mode) | `false` |
| `--actionable-only` | Show only actionable items (hide INVESTIGATE) | `false` |
| `--no-config` | Ignore config file | `false` |
| `--no-auto-detect` | Disable monorepo workspace auto-detection | `false` |

**Examples:**

```bash
dep-scope scan
dep-scope scan --root                   # scan full project, including scripts/ tools/ bin/
dep-scope scan -s src scripts           # explicit paths
dep-scope scan -d
dep-scope scan --check-duplicates
dep-scope scan --check-transitive
dep-scope scan --each-workspace
dep-scope scan -f json -o ./deps.json
dep-scope scan -p /path/to/project
```

**Auto-detection:** when no `srcPaths` are configured, dep-scope scans whichever of the following directories exist: `src`, `app`, `lib`, `pages`, `components`, `hooks`, `server`, `scripts`, `tools`, `bin`, `cli`, `packages`, `apps`. Use `--root .` if your project has an unusual layout.

---

---

## `scan --each-workspace` — Monorepo mode

```bash
dep-scope scan --each-workspace
dep-scope scan --each-workspace -p /path/to/monorepo
```

Detects the workspace configuration and scans each package individually. Displays a per-package report followed by an aggregate summary.

**Supported layouts**: `pnpm-workspace.yaml`, `package.json#workspaces` (npm/yarn), `turbo.json`, Lerna.

**Output:**

```
Workspace detected (pnpm): 4 packages

═══════════════════════════════════════════
  apps/web
═══════════════════════════════════════════
  Summary: 45 deps — 40 KEEP, 2 RECODE_NATIVE, 1 REMOVE
  ...

═══════════════════════════════════════════
  Workspace Summary (4 packages)
═══════════════════════════════════════════
  Total deps: 89 across 4 packages
  ✗ Remove:        1
  ↻ Recode Native: 2
```

Packages with no `package.json` or 0 dependencies are skipped. All other `scan` flags are compatible (`--check-transitive`, `--check-duplicates`, `--actionable-only`, etc.).

---

## `analyze` — Analyze a specific package

```bash
dep-scope analyze <package> [options]
```

Deep analysis of a single dependency: all symbols used, file locations, and alternatives.

| Option | Description |
|--------|-------------|
| `-p, --path <path>` | Project path |
| `-s, --src <paths...>` | Source directories |
| `--root` | Scan from project root (includes `scripts/`, `tools/`, `bin/`) |
| `-f, --format <type>` | Output format |
| `-v, --verbose` | Verbose output |

```bash
dep-scope analyze lodash
dep-scope analyze gray-matter              # scans auto-detected dirs including scripts/
dep-scope analyze gray-matter --root      # scan full project if used only in scripts/
dep-scope analyze @tanstack/react-query -f markdown
```

---

## `duplicates` — Find duplicate libraries

```bash
dep-scope duplicates [options]
```

Detects libraries serving the same purpose (e.g., multiple icon libraries, date utilities).

**Detected categories:** icons, date, cssUtils, http, state, dnd, validation, forms, animation, markdown, uuid, lodashLike

---

## `migrate` — Generate LLM-ready migration prompts

```bash
dep-scope migrate [package] [options]
```

Generates a structured markdown prompt that an LLM (Claude Code, Cursor, etc.) can follow to remove a dependency and replace its usages with native alternatives.

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
dep-scope migrate --dry-run
dep-scope migrate
dep-scope migrate lodash
dep-scope migrate uuid -p /path/to/project

# Pipe directly into Claude Code
claude -p "$(cat .dep-scope/migrate-lodash.md)"

# Run all generated prompts sequentially
for f in .dep-scope/migrate-*.md; do
  echo "--- $f ---"
  claude -p "$(cat $f)"
done
```

**What the generated prompt includes:**

- Audit summary: package, symbols used, files affected, TypeScript target, framework, complexity label
- Per-symbol refactoring plan with exact file locations (`src/hooks/useSearch.ts:12`)
- Native replacement code snippets, adapted to your ES target (e.g. `structuredClone` only when target >= ES2022)
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

---

## `report` — Generate full audit report

```bash
dep-scope report [options]
```

Generates a comprehensive markdown or JSON report.

```bash
dep-scope report -o ./audit.md
dep-scope report -p ./my-project -f json -o ./audit.json
```
