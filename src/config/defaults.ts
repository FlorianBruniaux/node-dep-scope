/**
 * Default configuration values for dep-scope
 */

import type { ResolvedConfig, WellKnownPattern } from "./schema.js";

/**
 * Default well-known patterns that apply to all projects.
 * These represent packages that are typically:
 * - Dev-only (types, linters, formatters, test runners)
 * - Framework core that doesn't need investigation
 */
export const DEFAULT_WELL_KNOWN_PATTERNS: WellKnownPattern[] = [
  // TypeScript types - dev only, no runtime usage
  { pattern: "@types/*", verdict: "IGNORE", reason: "TypeScript type definitions" },

  // Build tools - dev only
  { pattern: "typescript", verdict: "IGNORE", reason: "TypeScript compiler" },
  { pattern: "tsup", verdict: "IGNORE", reason: "Build tool" },
  { pattern: "esbuild", verdict: "IGNORE", reason: "Build tool" },
  { pattern: "rollup", verdict: "IGNORE", reason: "Build tool" },
  { pattern: "rollup-*", verdict: "IGNORE", reason: "Rollup plugin" },
  { pattern: "vite", verdict: "IGNORE", reason: "Build tool" },
  { pattern: "vite-*", verdict: "IGNORE", reason: "Vite plugin" },
  { pattern: "@vitejs/*", verdict: "IGNORE", reason: "Vite ecosystem" },
  { pattern: "webpack", verdict: "IGNORE", reason: "Build tool" },
  { pattern: "webpack-*", verdict: "IGNORE", reason: "Webpack plugin" },
  { pattern: "@swc/*", verdict: "IGNORE", reason: "SWC compiler" },
  { pattern: "swc", verdict: "IGNORE", reason: "SWC compiler" },
  { pattern: "@babel/*", verdict: "IGNORE", reason: "Babel compiler" },
  { pattern: "babel-*", verdict: "IGNORE", reason: "Babel plugin" },
  { pattern: "turbo", verdict: "IGNORE", reason: "Monorepo tool" },
  { pattern: "lerna", verdict: "IGNORE", reason: "Monorepo tool" },
  { pattern: "nx", verdict: "IGNORE", reason: "Monorepo tool" },
  { pattern: "@nx/*", verdict: "IGNORE", reason: "Nx ecosystem" },

  // CSS/PostCSS tooling - config only
  { pattern: "tailwindcss", verdict: "IGNORE", reason: "CSS framework (config only)" },
  { pattern: "@tailwindcss/*", verdict: "IGNORE", reason: "Tailwind ecosystem" },
  { pattern: "postcss", verdict: "IGNORE", reason: "CSS processor (config only)" },
  { pattern: "postcss-*", verdict: "IGNORE", reason: "PostCSS plugin" },
  { pattern: "autoprefixer", verdict: "IGNORE", reason: "PostCSS plugin" },
  { pattern: "cssnano", verdict: "IGNORE", reason: "CSS minifier" },
  { pattern: "sass", verdict: "IGNORE", reason: "CSS preprocessor" },
  { pattern: "less", verdict: "IGNORE", reason: "CSS preprocessor" },
  { pattern: "stylus", verdict: "IGNORE", reason: "CSS preprocessor" },

  // Git hooks and commit tooling - dev only
  { pattern: "husky", verdict: "IGNORE", reason: "Git hooks" },
  { pattern: "lint-staged", verdict: "IGNORE", reason: "Git hooks" },
  { pattern: "commitlint", verdict: "IGNORE", reason: "Commit linting" },
  { pattern: "@commitlint/*", verdict: "IGNORE", reason: "Commitlint ecosystem" },
  { pattern: "semantic-release", verdict: "IGNORE", reason: "Release automation" },
  { pattern: "@semantic-release/*", verdict: "IGNORE", reason: "Semantic release plugins" },
  { pattern: "release-it", verdict: "IGNORE", reason: "Release automation" },
  { pattern: "standard-version", verdict: "IGNORE", reason: "Release automation" },
  { pattern: "changeset", verdict: "IGNORE", reason: "Changeset tool" },
  { pattern: "@changesets/*", verdict: "IGNORE", reason: "Changesets ecosystem" },

  // Linters and formatters - config only
  { pattern: "eslint", verdict: "IGNORE", reason: "Linter" },
  { pattern: "eslint-*", verdict: "IGNORE", reason: "ESLint plugin/config" },
  { pattern: "@eslint/*", verdict: "IGNORE", reason: "ESLint ecosystem" },
  { pattern: "@typescript-eslint/*", verdict: "IGNORE", reason: "TypeScript ESLint (eslint config/parser)" },
  { pattern: "prettier", verdict: "IGNORE", reason: "Formatter" },
  { pattern: "prettier-*", verdict: "IGNORE", reason: "Prettier plugin" },

  // Test runners - dev only
  { pattern: "vitest", verdict: "IGNORE", reason: "Test runner" },
  { pattern: "@vitest/*", verdict: "IGNORE", reason: "Vitest ecosystem" },
  { pattern: "jest", verdict: "IGNORE", reason: "Test runner" },
  { pattern: "@jest/*", verdict: "IGNORE", reason: "Jest ecosystem" },
  { pattern: "mocha", verdict: "IGNORE", reason: "Test runner" },

  // UI Component libraries - legitimate low-spread usage
  { pattern: "@radix-ui/*", verdict: "KEEP", reason: "UI component library" },
  { pattern: "@headlessui/*", verdict: "KEEP", reason: "UI component library" },
  { pattern: "@ark-ui/*", verdict: "KEEP", reason: "UI component library" },
  { pattern: "@chakra-ui/*", verdict: "KEEP", reason: "UI component library" },
  { pattern: "@mantine/*", verdict: "KEEP", reason: "UI component library" },
  { pattern: "@mui/*", verdict: "KEEP", reason: "Material UI" },
  { pattern: "@nextui-org/*", verdict: "KEEP", reason: "NextUI" },

  // React ecosystem - provider/hook pattern has low spread
  { pattern: "@tanstack/*", verdict: "KEEP", reason: "TanStack ecosystem" },
  { pattern: "react-hook-form", verdict: "KEEP", reason: "React forms" },
  { pattern: "swr", verdict: "KEEP", reason: "React data fetching" },
  { pattern: "zustand", verdict: "KEEP", reason: "State management" },
  { pattern: "jotai", verdict: "KEEP", reason: "State management" },
  { pattern: "recoil", verdict: "KEEP", reason: "State management" },
  { pattern: "react-query", verdict: "KEEP", reason: "Legacy TanStack Query" },

  // Framework core - essential but localized
  { pattern: "next", verdict: "KEEP", reason: "Next.js framework" },
  { pattern: "next-auth", verdict: "KEEP", reason: "Next.js authentication" },
  { pattern: "@auth/*", verdict: "KEEP", reason: "Auth.js ecosystem" },
  { pattern: "@prisma/client", verdict: "KEEP", reason: "Prisma ORM" },
  { pattern: "drizzle-orm", verdict: "KEEP", reason: "Drizzle ORM" },
  { pattern: "@trpc/*", verdict: "KEEP", reason: "tRPC framework" },
  { pattern: "trpc", verdict: "KEEP", reason: "tRPC framework" },

  // Framework runtime companions - loaded by the framework, may have zero direct imports
  // (e.g. react-dom is used by Next.js internally; the modern JSX transform means React apps
  // can legitimately have zero `import React` statements)
  { pattern: "react", verdict: "KEEP", reason: "React runtime (may be unused via JSX transform)" },
  { pattern: "react-dom", verdict: "KEEP", reason: "React DOM renderer (loaded by framework)" },
  { pattern: "react-native", verdict: "KEEP", reason: "React Native runtime" },
  { pattern: "scheduler", verdict: "KEEP", reason: "React scheduler (required by react-dom)" },
  { pattern: "tslib", verdict: "KEEP", reason: "TypeScript runtime helpers" },

  // Astro framework + plugins — referenced in astro.config.mjs, not TS imports
  { pattern: "astro", verdict: "KEEP", reason: "Astro framework" },
  { pattern: "@astrojs/*", verdict: "KEEP", reason: "Astro plugin (astro.config.mjs)" },

  // Decorator / reflection packages — side-effect import only (import 'reflect-metadata')
  { pattern: "reflect-metadata", verdict: "KEEP", reason: "Decorator reflection (NestJS/TypeORM side-effect import)" },

  // Tailwind plugins — referenced in tailwind.config.*, not TS imports
  { pattern: "daisyui", verdict: "KEEP", reason: "Tailwind plugin (tailwind.config.*)" },
  { pattern: "@tailwindcss/typography", verdict: "KEEP", reason: "Tailwind plugin" },
  { pattern: "@tailwindcss/forms", verdict: "KEEP", reason: "Tailwind plugin" },
  { pattern: "@tailwindcss/aspect-ratio", verdict: "KEEP", reason: "Tailwind plugin" },
  { pattern: "@tailwindcss/container-queries", verdict: "KEEP", reason: "Tailwind plugin" },

  // Monorepo CLI tools — invoked in package.json scripts, never imported
  { pattern: "@manypkg/*", verdict: "IGNORE", reason: "Monorepo management CLI" },
  { pattern: "ultra-runner", verdict: "IGNORE", reason: "Monorepo task runner" },

  // Validation libraries - single schema file is normal
  { pattern: "zod", verdict: "KEEP", reason: "Validation library" },
  { pattern: "valibot", verdict: "KEEP", reason: "Validation library" },
  { pattern: "yup", verdict: "KEEP", reason: "Validation library" },
  { pattern: "joi", verdict: "KEEP", reason: "Validation library" },

  // Config loaders - naturally low spread
  { pattern: "dotenv", verdict: "KEEP", reason: "Environment config" },
  { pattern: "dotenv-*", verdict: "KEEP", reason: "dotenv ecosystem" },

  // AI SDK - single provider file is normal
  { pattern: "@ai-sdk/*", verdict: "KEEP", reason: "AI SDK (single provider file)" },
  { pattern: "ai", verdict: "KEEP", reason: "Vercel AI SDK" },
  { pattern: "openai", verdict: "KEEP", reason: "OpenAI SDK" },

  // Auth - single provider/middleware is normal
  { pattern: "@clerk/*", verdict: "KEEP", reason: "Clerk auth (provider pattern)" },
  { pattern: "@auth/*", verdict: "KEEP", reason: "Auth.js ecosystem" },
  { pattern: "lucia", verdict: "KEEP", reason: "Lucia auth" },
  { pattern: "@auth0/*", verdict: "KEEP", reason: "Auth0 SDK (single provider)" },
  { pattern: "@okta/*", verdict: "KEEP", reason: "Okta SDK (single init)" },
  { pattern: "@stytch/*", verdict: "KEEP", reason: "Stytch auth SDK (single client)" },
  { pattern: "@descope/*", verdict: "KEEP", reason: "Descope auth SDK (single client)" },
  { pattern: "firebase", verdict: "KEEP", reason: "Firebase SDK (single app init)" },
  { pattern: "@firebase/*", verdict: "KEEP", reason: "Firebase modular SDK" },

  // Editor libraries - single editor component is normal
  { pattern: "@codemirror/*", verdict: "KEEP", reason: "CodeMirror (editor component)" },
  { pattern: "codemirror", verdict: "KEEP", reason: "CodeMirror" },
  { pattern: "prosemirror-*", verdict: "KEEP", reason: "ProseMirror (editor component)" },
  { pattern: "@tiptap/*", verdict: "KEEP", reason: "TipTap editor" },
  { pattern: "monaco-editor", verdict: "KEEP", reason: "Monaco editor" },
  { pattern: "@monaco-editor/*", verdict: "KEEP", reason: "Monaco editor" },

  // Vercel/Next.js ecosystem - single usage is normal
  { pattern: "@vercel/*", verdict: "KEEP", reason: "Vercel SDK" },
  { pattern: "@t3-oss/*", verdict: "KEEP", reason: "T3 ecosystem" },
  { pattern: "next-themes", verdict: "KEEP", reason: "Theme provider" },

  // Database/Cache - single connection file is normal
  { pattern: "redis", verdict: "KEEP", reason: "Redis client (single connection)" },
  { pattern: "ioredis", verdict: "KEEP", reason: "Redis client" },
  { pattern: "@upstash/redis", verdict: "KEEP", reason: "Upstash Redis client (single connection file)" },
  { pattern: "@upstash/ratelimit", verdict: "KEEP", reason: "Upstash rate limiter (single setup file)" },
  { pattern: "@upstash/*", verdict: "KEEP", reason: "Upstash SDK (single init file)" },
  { pattern: "pg", verdict: "KEEP", reason: "PostgreSQL client" },
  { pattern: "@neondatabase/*", verdict: "KEEP", reason: "Neon serverless PostgreSQL driver" },
  { pattern: "mysql2", verdict: "KEEP", reason: "MySQL client" },
  { pattern: "mongodb", verdict: "KEEP", reason: "MongoDB client" },
  { pattern: "mongoose", verdict: "KEEP", reason: "MongoDB ODM" },
  { pattern: "pgvector", verdict: "KEEP", reason: "Postgres vector" },
  { pattern: "@prisma/*", verdict: "KEEP", reason: "Prisma adapter/extension (single setup file)" },
  { pattern: "@libsql/*", verdict: "KEEP", reason: "Turso/libSQL client" },
  { pattern: "libsql", verdict: "KEEP", reason: "Turso/libSQL client" },
  { pattern: "@planetscale/*", verdict: "KEEP", reason: "PlanetScale driver" },

  // UI primitives - single component usage is normal
  { pattern: "cmdk", verdict: "KEEP", reason: "Command menu (single component)" },
  { pattern: "vaul", verdict: "KEEP", reason: "Drawer component" },
  { pattern: "sonner", verdict: "KEEP", reason: "Toast component" },
  { pattern: "input-otp", verdict: "KEEP", reason: "OTP input component" },
  { pattern: "@uiw/*", verdict: "KEEP", reason: "UIW components" },
  { pattern: "@dnd-kit/*", verdict: "KEEP", reason: "DnD Kit (drag-and-drop, single setup)" },
  { pattern: "react-dnd*", verdict: "KEEP", reason: "React DnD (drag-and-drop, single setup)" },
  { pattern: "@xterm/*", verdict: "KEEP", reason: "xterm.js terminal (single instance)" },
  { pattern: "xterm", verdict: "KEEP", reason: "xterm.js terminal (single instance)" },
  { pattern: "react-resizable-panels", verdict: "KEEP", reason: "Resizable panels (single layout usage)" },
  { pattern: "react-resizable*", verdict: "KEEP", reason: "Resizable component (single usage)" },
  { pattern: "react-virtuoso", verdict: "KEEP", reason: "Virtual list (single component)" },
  { pattern: "react-window", verdict: "KEEP", reason: "Virtual list (single component)" },
  { pattern: "@tanstack/react-virtual", verdict: "KEEP", reason: "Virtual list (single component)" },

  // Math/Rendering - specialized single-use
  { pattern: "katex", verdict: "KEEP", reason: "Math rendering" },
  { pattern: "mathlive", verdict: "KEEP", reason: "Math editor" },
  { pattern: "rehype-*", verdict: "KEEP", reason: "Rehype plugin" },
  { pattern: "remark-*", verdict: "KEEP", reason: "Remark plugin" },

  // Background jobs/Cron - single setup file
  { pattern: "node-cron", verdict: "KEEP", reason: "Cron scheduler" },
  { pattern: "bullmq", verdict: "KEEP", reason: "Job queue" },
  { pattern: "bull", verdict: "KEEP", reason: "Job queue (single queue instance)" },
  { pattern: "agenda", verdict: "KEEP", reason: "Job scheduler" },
  { pattern: "inngest", verdict: "KEEP", reason: "Inngest background jobs (single client)" },
  { pattern: "@trigger.dev/*", verdict: "KEEP", reason: "Trigger.dev workflow SDK (single client)" },

  // Payment - single server instance + single client init
  { pattern: "stripe", verdict: "KEEP", reason: "Stripe server SDK (single instance)" },
  { pattern: "@stripe/*", verdict: "KEEP", reason: "Stripe SDK (single init file)" },
  { pattern: "squareup", verdict: "KEEP", reason: "Square payment SDK (single client)" },
  { pattern: "@paypal/*", verdict: "KEEP", reason: "PayPal SDK (single client)" },
  { pattern: "@paddle/*", verdict: "KEEP", reason: "Paddle payment SDK (single client)" },

  // Realtime/WebSocket - single connection setup per side
  { pattern: "pusher", verdict: "KEEP", reason: "Pusher server SDK (single connection)" },
  { pattern: "pusher-js", verdict: "KEEP", reason: "Pusher client SDK (single connection)" },
  { pattern: "ably", verdict: "KEEP", reason: "Ably realtime (single connection)" },
  { pattern: "socket.io", verdict: "KEEP", reason: "Socket.io server (single setup)" },
  { pattern: "socket.io-client", verdict: "KEEP", reason: "Socket.io client (single connection)" },
  { pattern: "ws", verdict: "KEEP", reason: "WebSocket (single server setup)" },
  { pattern: "@liveblocks/*", verdict: "KEEP", reason: "Liveblocks realtime (single provider)" },
  { pattern: "partykit", verdict: "KEEP", reason: "PartyKit realtime (single server)" },

  // Notification/Messaging services - single provider init
  { pattern: "@knocklabs/*", verdict: "KEEP", reason: "Knock notification SDK (single provider)" },
  { pattern: "@novu/*", verdict: "KEEP", reason: "Novu notification SDK (single provider)" },
  { pattern: "twilio", verdict: "KEEP", reason: "Twilio SDK (single client)" },
  { pattern: "mailgun.js", verdict: "KEEP", reason: "Mailgun SDK (single init)" },
  { pattern: "postmark", verdict: "KEEP", reason: "Postmark email SDK (single client)" },
  { pattern: "@mailchimp/*", verdict: "KEEP", reason: "Mailchimp SDK (single init)" },

  // Third-party API clients - single integration file
  { pattern: "@notionhq/*", verdict: "KEEP", reason: "Notion API client (single integration file)" },
  { pattern: "@airtable/*", verdict: "KEEP", reason: "Airtable client (single integration file)" },
  { pattern: "airtable", verdict: "KEEP", reason: "Airtable client (single integration file)" },
  { pattern: "@linear/sdk", verdict: "KEEP", reason: "Linear API client (single integration)" },
  { pattern: "octokit", verdict: "KEEP", reason: "GitHub API client (single init)" },
  { pattern: "@octokit/*", verdict: "KEEP", reason: "Octokit ecosystem" },
  { pattern: "@supabase/*", verdict: "KEEP", reason: "Supabase SDK (single client)" },
  { pattern: "replicate", verdict: "KEEP", reason: "Replicate AI SDK (single client)" },

  // Analytics/Monitoring - single init
  { pattern: "@sentry/*", verdict: "KEEP", reason: "Sentry (single instrumentation file)" },
  { pattern: "posthog-js", verdict: "KEEP", reason: "PostHog analytics (single init)" },
  { pattern: "posthog-node", verdict: "KEEP", reason: "PostHog server SDK (single init)" },
  { pattern: "@posthog/*", verdict: "KEEP", reason: "PostHog SDK" },
  { pattern: "@segment/*", verdict: "KEEP", reason: "Segment analytics (single init)" },
  { pattern: "mixpanel", verdict: "KEEP", reason: "Mixpanel analytics (single init)" },
  { pattern: "mixpanel-browser", verdict: "KEEP", reason: "Mixpanel browser SDK (single init)" },
  { pattern: "@amplitude/*", verdict: "KEEP", reason: "Amplitude analytics (single init)" },
  { pattern: "dd-trace", verdict: "KEEP", reason: "Datadog APM tracer (single init)" },
  { pattern: "newrelic", verdict: "KEEP", reason: "New Relic agent (single require)" },
  { pattern: "@opentelemetry/*", verdict: "KEEP", reason: "OpenTelemetry instrumentation (single setup)" },

  // Feature flags - single SDK init
  { pattern: "@growthbook/*", verdict: "KEEP", reason: "GrowthBook feature flags (single SDK init)" },
  { pattern: "growthbook", verdict: "KEEP", reason: "GrowthBook feature flags" },
  { pattern: "@launchdarkly/*", verdict: "KEEP", reason: "LaunchDarkly feature flags (single client)" },
  { pattern: "launchdarkly-*", verdict: "KEEP", reason: "LaunchDarkly SDK" },
  { pattern: "flagsmith", verdict: "KEEP", reason: "Flagsmith feature flags (single init)" },
  { pattern: "unleash-client", verdict: "KEEP", reason: "Unleash feature flags (single client)" },
  { pattern: "@statsig/*", verdict: "KEEP", reason: "Statsig feature flags (single init)" },

  // Search - single client init
  { pattern: "algoliasearch", verdict: "KEEP", reason: "Algolia search client (single init)" },
  { pattern: "@algolia/*", verdict: "KEEP", reason: "Algolia ecosystem" },
  { pattern: "typesense", verdict: "KEEP", reason: "Typesense search client (single init)" },
  { pattern: "meilisearch", verdict: "KEEP", reason: "MeiliSearch client (single init)" },
  { pattern: "@elastic/elasticsearch", verdict: "KEEP", reason: "Elasticsearch client (single init)" },
  { pattern: "@elastic/*", verdict: "KEEP", reason: "Elastic ecosystem" },

  // CMS clients - single init + fetch pattern
  { pattern: "@sanity/client", verdict: "KEEP", reason: "Sanity CMS client (single init)" },
  { pattern: "@sanity/*", verdict: "KEEP", reason: "Sanity CMS ecosystem" },
  { pattern: "contentful", verdict: "KEEP", reason: "Contentful CMS client (single init)" },
  { pattern: "@contentful/*", verdict: "KEEP", reason: "Contentful ecosystem" },
  { pattern: "@storyblok/*", verdict: "KEEP", reason: "Storyblok CMS client (single init)" },
  { pattern: "@prismicio/*", verdict: "KEEP", reason: "Prismic CMS client (single init)" },
  { pattern: "tinacms", verdict: "KEEP", reason: "TinaCMS (single config)" },
  { pattern: "@tinacms/*", verdict: "KEEP", reason: "TinaCMS ecosystem" },

  // File storage/CDN - single client per service
  { pattern: "@aws-sdk/*", verdict: "KEEP", reason: "AWS SDK v3 (single client per service)" },
  { pattern: "aws-sdk", verdict: "KEEP", reason: "AWS SDK v2 (single instance)" },
  { pattern: "cloudinary", verdict: "KEEP", reason: "Cloudinary SDK (single init)" },
  { pattern: "@cloudinary/*", verdict: "KEEP", reason: "Cloudinary ecosystem" },
  { pattern: "uploadthing", verdict: "KEEP", reason: "Uploadthing file uploads (single router)" },
  { pattern: "@uploadthing/*", verdict: "KEEP", reason: "Uploadthing ecosystem" },

  // Web3/Blockchain - single provider or wallet init
  { pattern: "viem", verdict: "KEEP", reason: "Viem Ethereum client (single init)" },
  { pattern: "ethers", verdict: "KEEP", reason: "Ethers.js Ethereum library (single provider)" },
  { pattern: "wagmi", verdict: "KEEP", reason: "Wagmi React hooks for Web3 (single provider)" },
  { pattern: "@rainbow-me/*", verdict: "KEEP", reason: "RainbowKit wallet UI (single provider)" },
  { pattern: "web3", verdict: "KEEP", reason: "Web3.js Ethereum library (single instance)" },
  { pattern: "@privy-io/*", verdict: "KEEP", reason: "Privy embedded wallet (single provider)" },
  { pattern: "@thirdweb-dev/*", verdict: "KEEP", reason: "Thirdweb Web3 SDK" },
  { pattern: "thirdweb", verdict: "KEEP", reason: "Thirdweb Web3 SDK" },

  // HTTP frameworks - single app init
  { pattern: "express", verdict: "KEEP", reason: "Express server (single app init)" },
  { pattern: "express-*", verdict: "KEEP", reason: "Express middleware" },
  { pattern: "hono", verdict: "KEEP", reason: "Hono framework (single app init)" },
  { pattern: "@hono/*", verdict: "KEEP", reason: "Hono ecosystem" },
  { pattern: "koa", verdict: "KEEP", reason: "Koa server (single app init)" },
  { pattern: "koa-*", verdict: "KEEP", reason: "Koa middleware" },

  // Serialization/utility — low spread is expected by design
  { pattern: "superjson", verdict: "KEEP", reason: "Serialization (single config point)" },
  { pattern: "http-status-codes", verdict: "KEEP", reason: "HTTP constants (low spread is normal)" },
  { pattern: "http-status", verdict: "KEEP", reason: "HTTP constants" },

  // Dev CLI tools — run via scripts, not imported
  { pattern: "prisma", verdict: "IGNORE", reason: "Prisma CLI (migration runner, not imported — use @prisma/client for the client)" },
  { pattern: "tsx", verdict: "IGNORE", reason: "TypeScript executor (dev CLI, not imported)" },
  { pattern: "ts-node", verdict: "IGNORE", reason: "TypeScript executor (dev CLI, not imported)" },
  { pattern: "zod-prisma-types", verdict: "IGNORE", reason: "Prisma generator (runs at build time, not imported)" },
  { pattern: "prisma-*", verdict: "IGNORE", reason: "Prisma generator/plugin (build-time tool)" },
  { pattern: "*-prisma-*", verdict: "IGNORE", reason: "Prisma generator/plugin (build-time tool)" },

  // Misc specialized libraries
  { pattern: "dataloader", verdict: "KEEP", reason: "Data batching (single setup)" },
  { pattern: "svix", verdict: "KEEP", reason: "Webhook service" },
  { pattern: "papaparse", verdict: "KEEP", reason: "CSV parser" },
  { pattern: "diff-match-patch", verdict: "KEEP", reason: "Diff utility" },
  { pattern: "gpt-tokenizer", verdict: "KEEP", reason: "Token counter" },
  { pattern: "file-type", verdict: "KEEP", reason: "File detection" },
  { pattern: "bcrypt*", verdict: "KEEP", reason: "Password hashing" },
  { pattern: "argon2", verdict: "KEEP", reason: "Password hashing" },

  // CSS reset / base stylesheets — side-effect import only (import 'normalize.css')
  { pattern: "normalize.css", verdict: "IGNORE", reason: "CSS reset (side-effect import)" },
  { pattern: "reset-css", verdict: "IGNORE", reason: "CSS reset (side-effect import)" },
  { pattern: "modern-normalize", verdict: "IGNORE", reason: "CSS reset (side-effect import)" },
  { pattern: "sanitize.css", verdict: "IGNORE", reason: "CSS reset (side-effect import)" },
  { pattern: "the-new-css-reset", verdict: "IGNORE", reason: "CSS reset (side-effect import)" },
  { pattern: "minireset.css", verdict: "IGNORE", reason: "CSS reset (side-effect import)" },

  // Web font packages — side-effect import only (import '@fontsource/inter')
  { pattern: "@fontsource/*", verdict: "IGNORE", reason: "Web font (side-effect import)" },
  { pattern: "fontsource-*", verdict: "IGNORE", reason: "Web font (side-effect import)" },
  { pattern: "@fontsource-variable/*", verdict: "IGNORE", reason: "Variable web font (side-effect import)" },

  // CSS animation libraries (import via @import, not detected)
  { pattern: "tw-animate-css", verdict: "KEEP", reason: "CSS animations (@import)" },
  { pattern: "animate.css", verdict: "KEEP", reason: "CSS animations (@import)" },

  // Video/WebRTC SDKs (often used via iframe/REST, not direct imports)
  { pattern: "@daily-co/*", verdict: "KEEP", reason: "Video SDK (iframe/REST API)" },
  { pattern: "@livekit/*", verdict: "KEEP", reason: "Video SDK" },
  { pattern: "@100mslive/*", verdict: "KEEP", reason: "Video SDK" },
  { pattern: "twilio-video", verdict: "KEEP", reason: "Video SDK" },
  { pattern: "agora-rtc-sdk*", verdict: "KEEP", reason: "Video SDK" },

  // Analytics (singleton pattern - low file spread is normal)
  { pattern: "@hotjar/*", verdict: "KEEP", reason: "Analytics (singleton)" },
  { pattern: "@segment/*", verdict: "KEEP", reason: "Analytics (singleton)" },
  { pattern: "@sentry/*", verdict: "KEEP", reason: "Error tracking (singleton)" },
  { pattern: "posthog-js", verdict: "KEEP", reason: "Analytics (singleton)" },
  { pattern: "mixpanel-browser", verdict: "KEEP", reason: "Analytics (singleton)" },
  { pattern: "@amplitude/*", verdict: "KEEP", reason: "Analytics (singleton)" },

  // ProseMirror ecosystem (editor dependencies)
  { pattern: "orderedmap", verdict: "KEEP", reason: "ProseMirror dependency" },

  // React UI utilities (single component usage is normal)
  { pattern: "react-inlinesvg", verdict: "KEEP", reason: "SVG rendering component" },
  { pattern: "react-top-loading-bar", verdict: "KEEP", reason: "Navigation progress" },
  { pattern: "nprogress", verdict: "KEEP", reason: "Progress bar" },

  // Streaming utilities
  { pattern: "resumable-stream", verdict: "KEEP", reason: "Stream utilities" },
  { pattern: "eventsource-parser", verdict: "KEEP", reason: "SSE parsing" },

  // NestJS framework - low spread is normal (modules, decorators, single service file)
  { pattern: "@nestjs/*", verdict: "KEEP", reason: "NestJS framework" },
  { pattern: "nestjs-*", verdict: "KEEP", reason: "NestJS ecosystem" },

  // React Router v7 - framework packages with low spread by design
  { pattern: "@react-router/*", verdict: "KEEP", reason: "React Router v7 framework" },
  { pattern: "react-router", verdict: "KEEP", reason: "React Router" },

  // Fastify ecosystem - plugins registered once in app bootstrap
  { pattern: "@fastify/*", verdict: "KEEP", reason: "Fastify plugin (single registration)" },
  { pattern: "fastify-*", verdict: "KEEP", reason: "Fastify plugin" },
  { pattern: "fastify", verdict: "KEEP", reason: "Fastify framework" },

  // Logger - singleton pattern, low spread is normal
  { pattern: "winston", verdict: "KEEP", reason: "Logger (singleton pattern)" },
  { pattern: "pino", verdict: "KEEP", reason: "Logger (singleton pattern)" },
  { pattern: "pino-*", verdict: "KEEP", reason: "Pino logger ecosystem" },
  { pattern: "bunyan", verdict: "KEEP", reason: "Logger (singleton pattern)" },

  // Email - single service file is normal
  { pattern: "nodemailer", verdict: "KEEP", reason: "Email service (single setup file)" },
  { pattern: "@sendgrid/*", verdict: "KEEP", reason: "Email service" },
  { pattern: "resend", verdict: "KEEP", reason: "Email service" },

  // RxJS - used by NestJS internally + observable pattern
  { pattern: "rxjs", verdict: "KEEP", reason: "Reactive extensions (NestJS + observable pattern)" },

  // HTTP middleware - single registration in app bootstrap
  { pattern: "cookie-parser", verdict: "KEEP", reason: "Express/Fastify middleware (single registration)" },
  { pattern: "http-proxy-middleware", verdict: "KEEP", reason: "Proxy middleware (single registration)" },
  { pattern: "cors", verdict: "KEEP", reason: "CORS middleware (single registration)" },
  { pattern: "helmet", verdict: "KEEP", reason: "Security middleware (single registration)" },
  { pattern: "compression", verdict: "KEEP", reason: "Compression middleware (single registration)" },
  { pattern: "morgan", verdict: "KEEP", reason: "HTTP logger middleware (single registration)" },

  // Bot detection / request utilities - single middleware usage
  { pattern: "isbot", verdict: "KEEP", reason: "Bot detection (single middleware)" },

  // AI SDKs - single provider file is normal
  { pattern: "@anthropic-ai/*", verdict: "KEEP", reason: "Anthropic AI SDK (single provider file)" },
  { pattern: "@google/genai", verdict: "KEEP", reason: "Google AI SDK (single provider file)" },
  { pattern: "@azure/openai", verdict: "KEEP", reason: "Azure OpenAI SDK (single provider file)" },
  { pattern: "@mistralai/*", verdict: "KEEP", reason: "Mistral AI SDK (single provider file)" },
  { pattern: "@cohere-ai/*", verdict: "KEEP", reason: "Cohere AI SDK (single provider file)" },

  // Auth providers - single provider/middleware file
  { pattern: "@workos-inc/*", verdict: "KEEP", reason: "WorkOS auth (single provider file)" },
  { pattern: "@casl/*", verdict: "KEEP", reason: "Authorization library" },
  { pattern: "casbin", verdict: "KEEP", reason: "Authorization library" },

  // Secrets/Config - single init file
  { pattern: "@infisical/*", verdict: "KEEP", reason: "Secrets manager (single init file)" },
  { pattern: "@dopplerhq/*", verdict: "KEEP", reason: "Secrets manager (single init file)" },

  // CRM/Support - single integration file
  { pattern: "crisp-api", verdict: "KEEP", reason: "CRM API (single integration file)" },
  { pattern: "@intercom/*", verdict: "KEEP", reason: "CRM (single integration)" },

  // ORM/DB frameworks
  { pattern: "typeorm", verdict: "KEEP", reason: "TypeORM framework" },
  { pattern: "typeorm-*", verdict: "KEEP", reason: "TypeORM ecosystem" },
  { pattern: "mikro-orm", verdict: "KEEP", reason: "MikroORM framework" },
  { pattern: "@mikro-orm/*", verdict: "KEEP", reason: "MikroORM ecosystem" },
  { pattern: "sequelize", verdict: "KEEP", reason: "Sequelize ORM" },
  { pattern: "sequelize-*", verdict: "KEEP", reason: "Sequelize ecosystem" },

  // CLI / terminal utilities - single usage is normal
  { pattern: "log-update", verdict: "KEEP", reason: "CLI progress output (single usage)" },
  { pattern: "ora", verdict: "KEEP", reason: "CLI spinner (single usage)" },
  { pattern: "chalk", verdict: "KEEP", reason: "Terminal colors" },
  { pattern: "open", verdict: "KEEP", reason: "Open URLs/files (single usage)" },

  // Sanitization - typically one wrapper util
  { pattern: "dompurify", verdict: "KEEP", reason: "HTML sanitization (single utility wrapper)" },
  { pattern: "isomorphic-dompurify", verdict: "KEEP", reason: "HTML sanitization (SSR)" },
];

/**
 * Get default configuration values
 */
export function getDefaults(): ResolvedConfig {
  return {
    srcPaths: ["./src"],
    threshold: 5,
    fileCountThreshold: 3,
    includeDev: false,
    ignore: [
      "node_modules",
      "dist",
      "build",
      "out",
      "target",
      ".next",
      ".nuxt",
      ".svelte-kit",
      ".turbo",
      ".vite",
      ".cache",
      ".parcel-cache",
      "coverage",
      "storybook-static",
      ".storybook",
    ],
    verbose: false,
    format: "console",
    output: undefined,
    withKnip: false,
    autoDetectWorkspace: true,
    checkTransitive: false,
    wellKnownPatterns: DEFAULT_WELL_KNOWN_PATTERNS,
    nativeAlternatives: [],
    duplicateCategories: [],
    stringReferences: {},
  };
}
