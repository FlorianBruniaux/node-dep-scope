/**
 * Configuration module for dep-scope
 */

// Re-export schema types
export {
  type DepScopeConfig,
  type ResolvedConfig,
  type WellKnownPattern,
  type CustomNativeAlternative,
  type CustomDuplicateCategory,
  validateConfig,
  depScopeConfigSchema,
} from "./schema.js";

// Re-export loader functions
export {
  loadConfig,
  resolveConfig,
  findConfigPath,
} from "./loader.js";

// Re-export defaults
export {
  getDefaults,
  DEFAULT_WELL_KNOWN_PATTERNS,
} from "./defaults.js";

// Re-export presets
export {
  PRESETS,
  getPreset,
  getAvailablePresets,
  minimalPreset,
  reactPreset,
  nodePreset,
} from "./presets/index.js";

/**
 * Helper for TypeScript config files
 * Provides autocompletion and type checking
 *
 * @example
 * ```typescript
 * // depscope.config.ts
 * import { defineConfig } from "dep-scope";
 *
 * export default defineConfig({
 *   extends: "react",
 *   threshold: 8,
 * });
 * ```
 */
export function defineConfig(config: DepScopeConfig): DepScopeConfig {
  return config;
}

// Legacy export for backwards compatibility
export { loadConfig as loadConfigLegacy } from "./loader.js";

// Import types for backwards compat
import type { DepScopeConfig } from "./schema.js";

/**
 * Legacy merge function - use resolveConfig instead
 * @deprecated Use resolveConfig from loader.ts
 */
export function mergeConfig(
  cliOptions: Partial<DepScopeConfig>,
  fileConfig: DepScopeConfig | null
): DepScopeConfig {
  if (!fileConfig) {
    return cliOptions;
  }

  const ignore = [
    ...(fileConfig.ignore ?? []),
    ...(fileConfig.ignorePatterns ?? []),
    ...(cliOptions.ignore ?? []),
  ];

  return {
    ...fileConfig,
    ...cliOptions,
    ignore: ignore.length > 0 ? [...new Set(ignore)] : undefined,
  };
}
