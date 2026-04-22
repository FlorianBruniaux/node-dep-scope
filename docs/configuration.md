# Configuration

dep-scope supports configuration files for persistent settings and customization.

## Config File Formats

Config files are detected in this order:

1. `.depscoperc`
2. `.depscoperc.json`
3. `depscope.config.json`
4. `depscope.config.yaml` / `depscope.config.yml`
5. `depscope.config.ts`
6. `depscope.config.js` / `.mjs` / `.cjs`
7. `package.json` → `depScope` field

## Basic Configuration

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

**TypeScript** (`depscope.config.ts`):

```typescript
import { defineConfig } from '@florianbruniaux/dep-scope';

export default defineConfig({
  srcPaths: ["src", "app", "components"],
  threshold: 8,
  wellKnownPatterns: [
    { pattern: "@company/*", verdict: "KEEP", reason: "Internal packages" },
  ],
});
```

## Configuration Options

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
| `checkTransitive` | boolean | `false` | Scan transitive deps for packages with native alternatives |

The following directories are always excluded from scanning: `node_modules`, `dist`, `.next`, `coverage`, `build`, `out`, `.nuxt`, `.svelte-kit`, `.turbo`, `storybook-static`.

> **Most common cause of inaccurate results**: the `srcPaths` option. If dep-scope prints `No standard source directories found — scanning from project root`, configure `srcPaths` explicitly — all verdicts are unreliable until then. Example for a NestJS + React Router project: `{ "srcPaths": ["src", "server", "client", "app"] }`.

## Presets

Use `extends` to inherit from built-in presets:

```json
{
  "extends": "react",
  "threshold": 10
}
```

| Preset | Description |
|--------|-------------|
| `minimal` | Default — ignores @types/*, eslint*, prettier, vitest, jest |
| `react` | React ecosystem — auto-KEEP react, react-dom, @tanstack/*, zustand, etc. |
| `node` | Node.js — ignores @types/node, typescript |

Presets can be combined:

```json
{
  "extends": ["minimal", "react"]
}
```

## Well-Known Patterns

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

**Built-in patterns (220+, always applied):**

- `@radix-ui/*`, `@headlessui/*`, `@chakra-ui/*` → KEEP (UI libraries)
- `@tanstack/*`, `react-hook-form`, `zustand` → KEEP (React ecosystem)
- `@dnd-kit/*`, `react-resizable-panels`, `@xterm/*` → KEEP (UI components, single mount)
- `@nestjs/*`, `fastify`, `@fastify/*`, `express`, `hono` → KEEP (Node.js frameworks)
- `@react-router/*`, `react-router` → KEEP (React Router v7)
- `zod`, `valibot`, `yup` → KEEP (Validation)
- `@prisma/client`, `drizzle-orm`, `typeorm`, `sequelize` → KEEP (ORMs)
- `@upstash/*`, `@neondatabase/*`, `@libsql/*`, `@planetscale/*` → KEEP (Serverless DB/cache)
- `stripe`, `@stripe/*`, `squareup`, `@paypal/*`, `@paddle/*` → KEEP (Payment SDKs)
- `pusher`, `pusher-js`, `ably`, `socket.io`, `@liveblocks/*` → KEEP (Realtime/WebSocket)
- `winston`, `pino`, `bunyan` → KEEP (Loggers, singleton pattern)
- `nodemailer`, `resend`, `@sendgrid/*`, `twilio`, `postmark` → KEEP (Email/SMS)
- `@knocklabs/*`, `@novu/*` → KEEP (Notification services)
- `rxjs` → KEEP (Reactive extensions, used by NestJS)
- `@anthropic-ai/*`, `@google/genai`, `@azure/openai`, `openai`, `replicate` → KEEP (AI SDKs)
- `@workos-inc/*`, `@infisical/*`, `@auth0/*`, `@okta/*`, `firebase` → KEEP (Auth/secrets)
- `cookie-parser`, `cors`, `helmet`, `isbot` → KEEP (HTTP middleware)
- `dompurify` → KEEP (HTML sanitization)
- `algoliasearch`, `@algolia/*`, `typesense`, `meilisearch` → KEEP (Search clients)
- `@sanity/*`, `contentful`, `@storyblok/*`, `@prismicio/*` → KEEP (CMS clients)
- `@aws-sdk/*`, `cloudinary`, `uploadthing` → KEEP (Storage/CDN)
- `@sentry/*`, `@opentelemetry/*`, `dd-trace`, `newrelic` → KEEP (Observability)
- `@growthbook/*`, `@launchdarkly/*`, `flagsmith`, `@statsig/*` → KEEP (Feature flags)
- `inngest`, `@trigger.dev/*`, `bullmq`, `bull` → KEEP (Background jobs)
- `@supabase/*`, `@linear/sdk`, `octokit`, `@notionhq/*` → KEEP (Third-party API clients)
- `viem`, `ethers`, `wagmi`, `@rainbow-me/*` → KEEP (Web3/Blockchain)
- `posthog-js`, `@segment/*`, `mixpanel`, `@amplitude/*` → KEEP (Analytics)
- `prisma` → IGNORE (CLI tool, not imported — distinct from `@prisma/client`)
- `tsx`, `ts-node`, `zod-prisma-types` → IGNORE (Build-time tools, not imported)
- `@types/*`, `eslint*`, `prettier`, `vitest`, `jest` → IGNORE (Dev tools)
- `tailwindcss`, `postcss`, `autoprefixer` → IGNORE (CSS tooling)
- `vite`, `webpack`, `esbuild`, `rollup` → IGNORE (Bundlers)

## Custom Native Alternatives

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

## Custom Duplicate Categories

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

## Config Priority

Settings are merged in this order (later wins):

```
Defaults → Presets (extends) → Config File → CLI Options
```

Arrays (`ignore`, `wellKnownPatterns`) are **merged**, not replaced.
