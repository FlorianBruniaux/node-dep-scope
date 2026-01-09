/**
 * Configuration Schema for dep-scope
 * Uses Zod for validation with full TypeScript inference
 */

import { z } from "zod";

// === Well-Known Pattern Schema ===

export const wellKnownPatternSchema = z.object({
  /** Glob pattern to match package names (e.g., "@types/*", "react-*") */
  pattern: z.string().min(1, "Pattern cannot be empty"),
  /** Verdict to apply when pattern matches */
  verdict: z.enum(["KEEP", "IGNORE"]),
  /** Optional reason for documentation */
  reason: z.string().optional(),
});

export type WellKnownPattern = z.infer<typeof wellKnownPatternSchema>;

// === Custom Native Alternative Schema ===

export const nativeAlternativeSymbolSchema = z.object({
  native: z.string().min(1, "Native replacement description required"),
  example: z.string().min(1, "Example code required"),
  minEcmaVersion: z.string().optional(),
  caveats: z.array(z.string()).optional(),
});

export const customNativeAlternativeSchema = z.object({
  /** Package name */
  package: z.string().min(1, "Package name required"),
  /** Symbol to native mapping */
  symbols: z.record(z.string(), nativeAlternativeSymbolSchema),
});

export type CustomNativeAlternative = z.infer<typeof customNativeAlternativeSchema>;

// === Custom Duplicate Category Schema ===

export const customDuplicateCategorySchema = z.object({
  /** Category name (unique identifier) */
  name: z.string().min(1, "Category name required"),
  /** Human-readable description */
  description: z.string().min(1, "Description required"),
  /** List of packages in this category */
  packages: z.array(z.string()).min(2, "At least 2 packages required for duplicate detection"),
  /** Recommendation text */
  recommendation: z.string().min(1, "Recommendation required"),
  /** Preferred order (first = most recommended) */
  preferredOrder: z.array(z.string()).optional(),
});

export type CustomDuplicateCategory = z.infer<typeof customDuplicateCategorySchema>;

// === Main Config Schema ===

export const depScopeConfigSchema = z.object({
  // === Existing Options ===

  /** Source paths to scan. Default: ["./src"] */
  srcPaths: z.array(z.string()).optional(),

  /** Symbol count threshold for RECODE_NATIVE verdict. Default: 5 */
  threshold: z.number().int().min(1).max(100).optional(),

  /** Minimum file count to auto-KEEP. Default: 3 */
  fileCountThreshold: z.number().int().min(1).max(50).optional(),

  /** Include devDependencies in analysis. Default: false */
  includeDev: z.boolean().optional(),

  /** Packages to ignore (glob patterns supported). Default: [] */
  ignore: z.array(z.string()).optional(),

  /** Legacy alias for ignore */
  ignorePatterns: z.array(z.string()).optional(),

  /** Enable verbose output. Default: false */
  verbose: z.boolean().optional(),

  /** Output format */
  format: z.enum(["console", "markdown", "json"]).optional(),

  /** Output file path */
  output: z.string().optional(),

  /** Use Knip for pre-analysis. Default: false */
  withKnip: z.boolean().optional(),

  /** Auto-detect monorepo workspaces. Default: true */
  autoDetectWorkspace: z.boolean().optional(),

  // === New Options ===

  /**
   * Well-known package patterns for automatic KEEP/IGNORE verdicts.
   * Merged with built-in defaults.
   */
  wellKnownPatterns: z.array(wellKnownPatternSchema).optional(),

  /**
   * Custom native alternatives to extend built-in rules.
   * Merged with NATIVE_ALTERNATIVES.
   */
  nativeAlternatives: z.array(customNativeAlternativeSchema).optional(),

  /**
   * Custom duplicate categories to extend built-in detection.
   * Merged with DUPLICATE_CATEGORIES.
   */
  duplicateCategories: z.array(customDuplicateCategorySchema).optional(),

  /**
   * Presets to inherit configuration from.
   * Available: "minimal", "react", "node"
   */
  extends: z.union([z.string(), z.array(z.string())]).optional(),
});

export type DepScopeConfig = z.infer<typeof depScopeConfigSchema>;

// === Resolved Config (after merging) ===

export interface ResolvedConfig {
  srcPaths: string[];
  threshold: number;
  fileCountThreshold: number;
  includeDev: boolean;
  ignore: string[];
  verbose: boolean;
  format: "console" | "markdown" | "json";
  output?: string;
  withKnip: boolean;
  autoDetectWorkspace: boolean;
  wellKnownPatterns: WellKnownPattern[];
  nativeAlternatives: CustomNativeAlternative[];
  duplicateCategories: CustomDuplicateCategory[];
}

/**
 * Validate config and return typed result or throw with detailed error
 */
export function validateConfig(config: unknown, configPath: string): DepScopeConfig {
  const result = depScopeConfigSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  - ${String(e.path.join("."))}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid config in ${configPath}:\n${errors}`);
  }

  return result.data;
}
