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
  { pattern: "pg", verdict: "KEEP", reason: "PostgreSQL client" },
  { pattern: "mysql2", verdict: "KEEP", reason: "MySQL client" },
  { pattern: "mongodb", verdict: "KEEP", reason: "MongoDB client" },
  { pattern: "mongoose", verdict: "KEEP", reason: "MongoDB ODM" },
  { pattern: "pgvector", verdict: "KEEP", reason: "Postgres vector" },

  // UI primitives - single component usage is normal
  { pattern: "cmdk", verdict: "KEEP", reason: "Command menu (single component)" },
  { pattern: "vaul", verdict: "KEEP", reason: "Drawer component" },
  { pattern: "sonner", verdict: "KEEP", reason: "Toast component" },
  { pattern: "input-otp", verdict: "KEEP", reason: "OTP input component" },
  { pattern: "@uiw/*", verdict: "KEEP", reason: "UIW components" },

  // Math/Rendering - specialized single-use
  { pattern: "katex", verdict: "KEEP", reason: "Math rendering" },
  { pattern: "mathlive", verdict: "KEEP", reason: "Math editor" },
  { pattern: "rehype-*", verdict: "KEEP", reason: "Rehype plugin" },
  { pattern: "remark-*", verdict: "KEEP", reason: "Remark plugin" },

  // Background jobs/Cron - single setup file
  { pattern: "node-cron", verdict: "KEEP", reason: "Cron scheduler" },
  { pattern: "bullmq", verdict: "KEEP", reason: "Job queue" },
  { pattern: "agenda", verdict: "KEEP", reason: "Job scheduler" },

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
    ignore: ["node_modules", "dist", ".next", "coverage"],
    verbose: false,
    format: "console",
    output: undefined,
    withKnip: false,
    autoDetectWorkspace: true,
    wellKnownPatterns: DEFAULT_WELL_KNOWN_PATTERNS,
    nativeAlternatives: [],
    duplicateCategories: [],
  };
}
