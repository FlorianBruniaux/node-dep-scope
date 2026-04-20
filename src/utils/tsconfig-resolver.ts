/**
 * TSConfig Resolver
 * Resolves TypeScript compiler target and module settings,
 * following `extends` chains transitively.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface TsConfigInfo {
  /** Normalized uppercase, e.g. "ES2022", "ESNEXT", "ES5" */
  target: string;
  /** Normalized uppercase, e.g. "NODENEXT", "COMMONJS", "ESNext" */
  module: string;
  lib?: string[];
  moduleResolution?: string;
  strict?: boolean;
}

// TypeScript defaults when no value is specified (already normalized to uppercase)
const TS_DEFAULTS: TsConfigInfo = {
  target: "ES3",
  module: "COMMONJS",
};

/**
 * Resolve TypeScript configuration for a project.
 * Follows `extends` chains up to 5 levels deep.
 * Returns defaults if tsconfig.json is absent or unreadable.
 */
export function resolveTsConfig(projectPath: string): TsConfigInfo {
  const tsconfigPath = path.join(projectPath, "tsconfig.json");
  return resolveTsConfigFile(tsconfigPath, new Set(), projectPath, 0);
}

// ============================================================================
// Internal helpers
// ============================================================================

function resolveTsConfigFile(
  tsconfigPath: string,
  visited: Set<string>,
  projectRoot: string,
  depth: number
): TsConfigInfo {
  // Guard against cycles and runaway chains
  if (depth > 5 || visited.has(tsconfigPath)) {
    return { ...TS_DEFAULTS };
  }
  visited.add(tsconfigPath);

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(tsconfigPath, "utf-8");
  } catch {
    return { ...TS_DEFAULTS };
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(stripJsoncComments(rawContent)) as Record<string, unknown>;
  } catch {
    return { ...TS_DEFAULTS };
  }

  // Resolve `extends` first — it forms the base that the current file overrides
  let base: TsConfigInfo = { ...TS_DEFAULTS };
  const extendsValue = config.extends;
  if (typeof extendsValue === "string") {
    const resolvedExtends = resolveExtendsPath(
      extendsValue,
      path.dirname(tsconfigPath),
      projectRoot
    );
    if (resolvedExtends) {
      base = resolveTsConfigFile(resolvedExtends, visited, projectRoot, depth + 1);
    }
  }

  // Current compilerOptions win over the base
  const compilerOptions = (config.compilerOptions as Record<string, unknown>) ?? {};

  const rawModuleResolution =
    (compilerOptions.moduleResolution as string | undefined) ?? base.moduleResolution;

  return {
    target: normalize((compilerOptions.target as string) ?? base.target),
    module: normalize((compilerOptions.module as string) ?? base.module),
    lib: (compilerOptions.lib as string[] | undefined) ?? base.lib,
    moduleResolution: rawModuleResolution ? normalize(rawModuleResolution) : undefined,
    strict: (compilerOptions.strict as boolean | undefined) ?? base.strict,
  };
}

/**
 * Normalize a compiler option value to uppercase for reliable comparisons.
 */
function normalize(value: string): string {
  return value.toUpperCase();
}

/**
 * Strip single-line (//) and multi-line (/* *\/) comments from JSONC content,
 * correctly skipping over string literals so that patterns like "./src/*"
 * are never mistaken for comment delimiters.
 */
function stripJsoncComments(input: string): string {
  let result = "";
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // String literal — copy verbatim including escape sequences
    if (ch === '"') {
      result += ch;
      i++;
      while (i < len) {
        const c = input[i];
        result += c;
        if (c === "\\") {
          // Escaped character: copy the next char as-is
          i++;
          if (i < len) {
            result += input[i];
            i++;
          }
          continue;
        }
        if (c === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Single-line comment (//)
    if (ch === "/" && input[i + 1] === "/") {
      while (i < len && input[i] !== "\n") i++;
      continue;
    }

    // Multi-line comment (/* ... */)
    if (ch === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < len && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i += 2; // skip closing */
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Resolve the `extends` value to an absolute path.
 * Handles:
 *   - Relative paths: "./tsconfig.base.json", "../tsconfig.json"
 *   - npm packages: "@tsconfig/node18", "@tsconfig/node18/tsconfig.json"
 */
function resolveExtendsPath(
  extendsValue: string,
  tsconfigDir: string,
  projectRoot: string
): string | null {
  if (extendsValue.startsWith(".")) {
    // Relative path — resolve from the directory of the current tsconfig
    const resolved = path.resolve(tsconfigDir, extendsValue);
    if (fs.existsSync(resolved)) return resolved;
    // Try appending .json if absent
    const withJson = resolved + ".json";
    return fs.existsSync(withJson) ? withJson : null;
  }

  // npm package — search in node_modules from the project root
  const candidates = [
    // Direct file reference: "@tsconfig/node18/tsconfig.json"
    path.join(projectRoot, "node_modules", extendsValue),
    // Package with implicit tsconfig.json: "@tsconfig/node18"
    path.join(projectRoot, "node_modules", extendsValue, "tsconfig.json"),
    // With .json extension added
    path.join(projectRoot, "node_modules", extendsValue + ".json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Parse an ES target string to a numeric year for comparison.
 * Returns 0 for unknown values.
 * Examples: "ES2022" → 2022, "ES5" → 5, "ESNEXT" → 9999
 */
export function parseEsTarget(target: string): number {
  const upper = target.toUpperCase();
  if (upper === "ESNEXT") return 9999;
  const yearMatch = upper.match(/^ES(\d+)$/);
  if (yearMatch) return parseInt(yearMatch[1], 10);
  return 0;
}

/**
 * Check if the project's ES target supports a given minimum version.
 * "ES2022" supports "ES2020" → true
 * "ES2019" supports "ES2022" → false
 */
export function targetSupports(projectTarget: string, minRequired: string): boolean {
  return parseEsTarget(projectTarget) >= parseEsTarget(minRequired);
}
