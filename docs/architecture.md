# Architecture & Internals

## Verdict System

| Verdict | Symbol | Meaning |
|---------|--------|---------|
| KEEP | ✓ | Well-used, no action needed |
| RECODE_NATIVE | ↻ | Few symbols used, replaceable with built-in JS (no npm needed) |
| CONSOLIDATE | ⇄ | Duplicate with another library |
| REMOVE | ✗ | Unused (0 imports found) |
| PEER_DEP | ⊕ | Required by other packages, redundant in package.json |
| INVESTIGATE | ? | Needs manual review |

### How verdicts are determined

- **REMOVE**: No imports detected in source files
- **PEER_DEP**: No direct imports, but required by other installed packages
- **RECODE_NATIVE**: Less than `threshold` symbols used AND built-in JS equivalents exist — e.g. `cloneDeep` → `structuredClone()`, `uuid.v4` → `crypto.randomUUID()`, `is-string` → `typeof x === 'string'`. No npm package needed.
- **CONSOLIDATE**: Multiple libraries from same category detected (e.g., lucide-react + react-icons)
- **INVESTIGATE**: Low usage but no clear alternative (with reason)
- **KEEP**: Significant usage, no issues

### INVESTIGATE reasons

When a package gets the INVESTIGATE verdict, dep-scope shows why:

| Reason | Threshold | Meaning |
|--------|-----------|---------|
| `LOW_SYMBOL_COUNT` | <= 2 symbols | Only 1-2 symbols used |
| `SINGLE_FILE_USAGE` | exactly 1 file | Used in only 1 file |
| `LOW_FILE_SPREAD` | 2 to `fileCountThreshold` files | Used in 2-3 files (below threshold) |
| `UNKNOWN_PACKAGE` | - | No well-known patterns matched, needs manual review |

```
? @typescript-eslint/parser (1 symbol in 1 file) [single file usage]
? fast-glob (1 symbol in 2 files) [low file spread]
```

---

## Native Alternatives Database

dep-scope flags 195+ packages as having native replacements, across two sources.

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

Single-purpose packages that ship something native JS already provides. Any symbol imported from these packages gets the native equivalent shown.

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
| ... and 100+ more | |

Source: [e18e/module-replacements](https://github.com/es-tooling/module-replacements), embedded statically with no runtime dependency added.

---

## Knip Integration

dep-scope automatically uses [Knip](https://knip.dev) when available in your project for improved accuracy:

```bash
dep-scope scan           # Knip is auto-detected and used by default
dep-scope scan --with-knip
dep-scope scan --no-knip
```

This runs Knip first to detect unused dependencies, then dep-scope adds symbol-level analysis. The combination reduces false positives significantly.

### Why not a Knip plugin/reporter?

| Approach | Viable? | Why not? |
|----------|---------|----------|
| Knip Preprocessor | No | Preprocessors filter/transform data, can't add symbol-level analysis |
| Knip Reporter | Partial | Technically possible, but couples dep-scope to Knip and loses standalone value |
| Knip Plugin | No | Plugins detect usage in config files, not for analysis enrichment |

dep-scope consumes Knip output rather than being consumed by it. This keeps dep-scope independent while benefiting from Knip's ecosystem detection when needed.

---

## CI/CD Integration

dep-scope uses exit codes for CI pipelines:

| Exit Code | Meaning |
|-----------|---------|
| `0` | Success, no actionable issues |
| `1` | Success, but actionable issues found |
| `2` | Error (invalid config, missing package.json, etc.) |

The following verdicts trigger exit code 1: REMOVE > 0, RECODE_NATIVE > 0, PEER_DEP > 0, duplicates found. INVESTIGATE and transitive echoes do **not** trigger exit code 1.

```bash
dep-scope scan                  # fail if actionable issues found
dep-scope scan --no-exit-code   # always exit 0 (reporting only)
dep-scope scan --actionable-only
```

---

## Path Alias Handling

dep-scope automatically filters out path aliases to avoid counting internal imports as external packages:

- Common patterns: `@/`, `~/`, `#/` prefixes
- Word-based aliases: `@app/`, `@components/`, `@utils/`, etc.
- TSConfig paths: custom aliases from `tsconfig.json` → `compilerOptions.paths`

This prevents false positives where `@/components/Button` would incorrectly be counted as an npm package.

---

## Transitive Echo Detection

`dep-scope scan --check-transitive` walks the full transitive dependency graph (BFS from direct deps) and reports packages that have native JS alternatives in the e18e database (169 packages).

```
Transitive echoes (reportable upstream or via overrides):
  ↗ is-string          via lodash              → typeof x === 'string'
  ↗ has-flag           via chalk               → process.argv.includes('--flag')
```

**Why `↗` and not `✗`**: transitive packages cannot be removed directly from `package.json`. The action is to report the issue to the upstream package maintainer or force a version via `overrides` (npm/pnpm) / `resolutions` (Yarn). These findings do **not** trigger exit code 1 — they are informational.

**Supported layouts**: npm (flat), pnpm (strict + non-strict, `.pnpm/` store), Bun (same as npm). Yarn PnP is detected and skipped with a warning.

**Performance**: BFS reads package.json files with caching. Typical time: ~1s for 1500 packages. The size calculation is not included (no disk I/O beyond JSON files).

---

## Limitations

The analyzer uses static AST analysis. It won't detect:

- **CSS imports**: `@import 'package'` in CSS/SCSS files
- **Config references**: Tailwind plugins, Babel presets, etc.
- **Runtime-only deps**: Dependencies used only at runtime without imports

Use `--ignore` to exclude packages you know are used in config files. Knip integration (enabled by default) helps detect config-referenced packages.

The most common cause of inaccurate results is an incomplete `srcPaths` configuration. If a package appears as REMOVE but you know it's used, check that its import files are inside the scanned directories.
