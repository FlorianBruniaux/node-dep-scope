# dep-scope

[![CI](https://github.com/FlorianBruniaux/node-dep-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/FlorianBruniaux/node-dep-scope/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@florianbruniaux/dep-scope.svg)](https://www.npmjs.com/package/@florianbruniaux/dep-scope)
[![MCP Registry](https://img.shields.io/badge/MCP-registry.modelcontextprotocol.io-6366f1)](https://registry.modelcontextprotocol.io)
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
| MCP Server (AI editors) | ❌ | ❌ | ❌ | ✅ |
| OSS / free | ✅ | ✅ | ❌ enterprise | ✅ |

**Recommendation**: Use Knip for unused detection, dep-scope for deeper analysis and migration. They work well together (dep-scope auto-detects Knip if installed).

## Installation

**CLI (global):**

```bash
npm install -g @florianbruniaux/dep-scope
```

**Without installation:**

```bash
npx @florianbruniaux/dep-scope scan
```

**MCP Server (AI editors — no CLI needed):**

Add to your editor's MCP config and the server runs on demand via npx. See the [MCP Server](#mcp-server) section below for per-editor config snippets.

**From source:**

```bash
git clone https://github.com/FlorianBruniaux/node-dep-scope.git
cd node-dep-scope
npm install && npm run build && npm install -g .
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

## Setup: `dep-scope init`

Run `dep-scope init` before your first scan. The wizard detects your project and generates a config in 4 questions:

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

Use `-y` to skip prompts in CI: `dep-scope init --yes`.

## Getting accurate results

Auto-detection covers: `src`, `app`, `lib`, `pages`, `components`, `hooks`, `server`, `scripts`, `tools`, `bin`, `cli`. If your project has code elsewhere, pass `--root` to scan everything, or set `srcPaths` explicitly in `.depscoperc.json`:

```json
{
  "srcPaths": ["src", "app", "scripts", "tools"]
}
```

> **False positive "unused" verdict?** The package may be used in a directory outside the scan scope (`scripts/`, `tools/`, etc.). Run `dep-scope scan --root` to verify before removing anything. When a removal recommendation appears with a narrow scan scope, dep-scope will warn you.

## MCP Server

dep-scope exposes a **Model Context Protocol server** so AI editors (Claude Code, Cursor, Windsurf) can query your dependencies inline — no CLI, no markdown files, no copy-paste.

> Listed on the [official MCP Registry](https://registry.modelcontextprotocol.io): **`io.github.FlorianBruniaux/dep-scope`**

### Available tools

| Tool | Params | What it does |
|---|---|---|
| `scan_project` | `projectPath`, `srcPaths`, `threshold`, `includeDev`, `checkDuplicates`, `checkTransitive`, `withKnip` | Full dependency scan with verdicts |
| `analyze_package` | `packageName`, `projectPath`, `srcPaths` | Symbol-level breakdown of one package |
| `get_migration_candidates` | `projectPath` | List all RECODE_NATIVE + CONSOLIDATE packages |
| `generate_migration_prompt` | `packageName`, `projectPath` | Generate a migration prompt inline |
| `find_duplicates` | `projectPath` | Detect overlapping libraries |

### Setup

Add the following `mcpServers` entry to your editor's config. The server runs on demand via `npx` — no global install required.

**Claude Code** — `~/.claude.json`:

```json
{
  "mcpServers": {
    "dep-scope": {
      "command": "npx",
      "args": ["--package=@florianbruniaux/dep-scope", "-y", "dep-scope-mcp"]
    }
  }
}
```

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dep-scope": {
      "command": "npx",
      "args": ["--package=@florianbruniaux/dep-scope", "-y", "dep-scope-mcp"]
    }
  }
}
```

**Cursor** — `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "dep-scope": {
      "command": "npx",
      "args": ["--package=@florianbruniaux/dep-scope", "-y", "dep-scope-mcp"]
    }
  }
}
```

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "dep-scope": {
      "command": "npx",
      "args": ["--package=@florianbruniaux/dep-scope", "-y", "dep-scope-mcp"]
    }
  }
}
```

Once connected, you can ask your AI editor to call `scan_project` or `generate_migration_prompt` directly mid-session without running any CLI command.

## Documentation

- [Commands reference](docs/commands.md)
- [Configuration](docs/configuration.md)
- [AI prompts + Claude Code slash command](docs/ai-prompts.md)
- [MCP Server setup](#mcp-server)
- [Programmatic API](docs/api.md)
- [Architecture & internals](docs/architecture.md)

## Requirements

- Node.js >= 18.0.0
- TypeScript/JavaScript project with `package.json`

## License

MIT
