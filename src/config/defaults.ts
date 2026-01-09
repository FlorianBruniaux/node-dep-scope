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
  { pattern: "vite", verdict: "IGNORE", reason: "Build tool" },
  { pattern: "webpack", verdict: "IGNORE", reason: "Build tool" },

  // Linters and formatters - config only
  { pattern: "eslint", verdict: "IGNORE", reason: "Linter" },
  { pattern: "eslint-*", verdict: "IGNORE", reason: "ESLint plugin/config" },
  { pattern: "@eslint/*", verdict: "IGNORE", reason: "ESLint ecosystem" },
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

  // Validation libraries - single schema file is normal
  { pattern: "zod", verdict: "KEEP", reason: "Validation library" },
  { pattern: "valibot", verdict: "KEEP", reason: "Validation library" },
  { pattern: "yup", verdict: "KEEP", reason: "Validation library" },
  { pattern: "joi", verdict: "KEEP", reason: "Validation library" },

  // Config loaders - naturally low spread
  { pattern: "dotenv", verdict: "KEEP", reason: "Environment config" },
  { pattern: "dotenv-*", verdict: "KEEP", reason: "dotenv ecosystem" },
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
