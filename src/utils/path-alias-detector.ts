/**
 * Path Alias Detector
 * Detects and resolves TypeScript/JavaScript path aliases
 * to distinguish them from actual npm packages
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Common path alias prefixes used in TypeScript/JavaScript projects
 * These are typically configured in tsconfig.json or bundler config
 */
const COMMON_PATH_ALIAS_PATTERNS = [
  // Single character aliases (very common)
  /^@\//, // @/ → ./src (most common in Next.js, Vite)
  /^~\//, // ~/ → ./src or root
  /^#\//, // #/ → ./src (sometimes used)

  // Word-based aliases (common patterns)
  /^@app\//, // @app/ → ./src/app
  /^@lib\//, // @lib/ → ./src/lib
  /^@components\//, // @components/ → ./src/components
  /^@utils\//, // @utils/ → ./src/utils
  /^@hooks\//, // @hooks/ → ./src/hooks
  /^@services\//, // @services/ → ./src/services
  /^@types\/(?![a-z])/, // @types/ but not @types/node (npm package)
  /^@styles\//, // @styles/ → ./src/styles
  /^@assets\//, // @assets/ → ./src/assets
  /^@config\//, // @config/ → ./src/config
  /^@store\//, // @store/ → ./src/store
  /^@api\//, // @api/ → ./src/api
  /^@features\//, // @features/ → ./src/features
  /^@pages\//, // @pages/ → ./src/pages
  /^@layouts\//, // @layouts/ → ./src/layouts
  /^@modules\//, // @modules/ → ./src/modules
  /^@shared\//, // @shared/ → ./src/shared
  /^@common\//, // @common/ → ./src/common
  /^@core\//, // @core/ → ./src/core
  /^@domain\//, // @domain/ → ./src/domain
  /^@infra\//, // @infra/ → ./src/infrastructure
  /^@test\//, // @test/ → ./test or ./tests
  /^@mocks\//, // @mocks/ → ./mocks
];

/**
 * TSConfig paths mapping
 */
export interface PathAliases {
  [alias: string]: string[];
}

/**
 * Read path aliases from tsconfig.json
 */
export function readTsConfigPaths(projectPath: string): PathAliases {
  const tsConfigPath = path.join(projectPath, "tsconfig.json");

  try {
    if (!fs.existsSync(tsConfigPath)) {
      return {};
    }

    const content = fs.readFileSync(tsConfigPath, "utf-8");
    // Remove comments (simple approach - doesn't handle all edge cases)
    const cleanedContent = content
      .replace(/\/\/.*$/gm, "") // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

    const config = JSON.parse(cleanedContent);
    return config?.compilerOptions?.paths ?? {};
  } catch {
    // Failed to read or parse tsconfig.json
    return {};
  }
}

/**
 * Convert tsconfig paths to regex patterns
 * Example: "@/*" becomes a regex matching ^@/.*
 */
export function pathAliasToRegex(alias: string): RegExp {
  // Escape special regex characters except *
  const escaped = alias.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  // Replace * with .* for wildcard matching
  const pattern = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${pattern}`);
}

/**
 * Check if an import path is a path alias (not an npm package)
 */
export function isPathAlias(
  importPath: string,
  projectPath?: string
): boolean {
  // Check common patterns first (fast path)
  for (const pattern of COMMON_PATH_ALIAS_PATTERNS) {
    if (pattern.test(importPath)) {
      return true;
    }
  }

  // If project path provided, check tsconfig.json paths
  if (projectPath) {
    const aliases = readTsConfigPaths(projectPath);
    for (const alias of Object.keys(aliases)) {
      const regex = pathAliasToRegex(alias);
      if (regex.test(importPath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Create a path alias checker for a specific project
 * Caches tsconfig.json reading for performance
 */
export function createPathAliasChecker(projectPath: string): (importPath: string) => boolean {
  // Read tsconfig paths once
  const aliases = readTsConfigPaths(projectPath);
  const aliasPatterns = Object.keys(aliases).map(pathAliasToRegex);

  return (importPath: string): boolean => {
    // Check common patterns first
    for (const pattern of COMMON_PATH_ALIAS_PATTERNS) {
      if (pattern.test(importPath)) {
        return true;
      }
    }

    // Check project-specific aliases
    for (const pattern of aliasPatterns) {
      if (pattern.test(importPath)) {
        return true;
      }
    }

    return false;
  };
}
