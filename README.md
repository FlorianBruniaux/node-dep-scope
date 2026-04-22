# dep-scope

[![CI](https://github.com/FlorianBruniaux/node-dep-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/FlorianBruniaux/node-dep-scope/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@florianbruniaux/dep-scope.svg)](https://www.npmjs.com/package/@florianbruniaux/dep-scope)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Symbol-level dependency analysis + LLM-ready migration prompts** for TypeScript/JavaScript projects.

> *"Knip tells you what's unused. dep-scope tells you how you use what you keep, and generates the prompt to remove it."*

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

## How it compares

| Feature | Knip | Depcheck | Moderne | dep-scope |
|---------|------|----------|---------|-----------|
| Unused detection | ✅ Excellent | ✅ Good | ❌ | ⚠️ Basic |
| Config file scanning | ✅ | ✅ | ❌ | ❌ |
| Symbol-level analysis | ❌ | ❌ | ✅ | ✅ |
| Native alternatives database | ❌ | ❌ | ✅ (lodash) | ✅ 195 packages |
| e18e micro-utilities coverage | ❌ | ❌ | ❌ | ✅ |
| Transitive graph analysis | ❌ | ❌ | ❌ | ✅ |
| Monorepo workspace support | ⚠️ | ❌ | ❌ | ✅ |
| Duplicate detection | ❌ | ❌ | ❌ | ✅ |
| LLM migration prompt | ❌ | ❌ | ❌ | ✅ |
| OSS / free | ✅ | ✅ | ❌ enterprise | ✅ |

**Recommendation**: Use Knip for unused detection, dep-scope for deeper analysis and migration. They work well together (dep-scope auto-detects Knip if installed).

## Installation

```bash
npm install -g @florianbruniaux/dep-scope
```

**From source:**

```bash
git clone https://github.com/FlorianBruniaux/node-dep-scope.git
cd node-dep-scope
npm install && npm run build && npm install -g .
```

**Without installation:**

```bash
npx @florianbruniaux/dep-scope scan
```

## Quick Start

```bash
cd /path/to/your/project

dep-scope init                        # configure dep-scope for your project (interactive)
dep-scope scan                        # full scan
dep-scope scan --root                 # scan full project, including scripts/ tools/ bin/
dep-scope scan --check-duplicates     # include duplicate detection
dep-scope scan --check-transitive     # surface transitive polyfills (e18e database)
dep-scope scan --each-workspace       # monorepo: scan each package individually
dep-scope migrate                     # generate migration prompts for all candidates
dep-scope migrate lodash              # target a specific package
dep-scope report -o ./audit.md        # markdown report
```

## Getting accurate results

dep-scope scans the directories listed in `srcPaths`. Run `dep-scope init` to auto-detect the right paths for your project — it detects your framework and existing directories, then generates the config.

Auto-detection covers: `src`, `app`, `lib`, `pages`, `components`, `hooks`, `server`, `scripts`, `tools`, `bin`, `cli`. If your project has code elsewhere, pass `--root` to scan everything, or set `srcPaths` explicitly:

```json
{
  "srcPaths": ["src", "app", "scripts", "tools"]
}
```

> **False positive "unused" verdict?** The package may be used in a directory outside the scan scope (`scripts/`, `tools/`, etc.). Run `dep-scope scan --root` to verify before removing anything. When a removal recommendation appears with a narrow scan scope, dep-scope will warn you.

## Documentation

- [Commands reference](docs/commands.md)
- [Configuration](docs/configuration.md)
- [AI prompts + Claude Code slash command](docs/ai-prompts.md)
- [Programmatic API](docs/api.md)
- [Architecture & internals](docs/architecture.md)

## Requirements

- Node.js >= 18.0.0
- TypeScript/JavaScript project with `package.json`

## License

MIT
