/**
 * Configuration loader for dep-scope
 * Supports multiple formats: JSON, YAML, JS, TS, package.json
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { createJiti } from "jiti";
import { ConfigLoadError } from "../errors/index.js";
import {
  type DepScopeConfig,
  type ResolvedConfig,
  type WellKnownPattern,
  validateConfig,
} from "./schema.js";
import { getDefaults, DEFAULT_WELL_KNOWN_PATTERNS } from "./defaults.js";
import { getPreset } from "./presets/index.js";

/**
 * Config file names in priority order
 */
const CONFIG_FILES = [
  ".depscoperc",
  ".depscoperc.json",
  "depscope.config.json",
  "depscope.config.yaml",
  "depscope.config.yml",
  "depscope.config.ts",
  "depscope.config.js",
  "depscope.config.mjs",
  "depscope.config.cjs",
];

/**
 * Load configuration from project directory
 * Searches for config files in priority order
 */
export async function loadConfig(projectPath: string): Promise<DepScopeConfig | null> {
  // Check for config files
  for (const configFile of CONFIG_FILES) {
    const configPath = path.join(projectPath, configFile);

    try {
      await fs.access(configPath);
    } catch {
      continue;
    }

    return await loadConfigFile(configPath);
  }

  // Check package.json for depScope field
  const pkgConfig = await loadFromPackageJson(projectPath);
  if (pkgConfig) {
    return pkgConfig;
  }

  return null;
}

/**
 * Load configuration from a specific file
 */
async function loadConfigFile(configPath: string): Promise<DepScopeConfig> {
  const ext = path.extname(configPath);
  const basename = path.basename(configPath);

  try {
    let rawConfig: unknown;

    if (ext === ".ts") {
      // TypeScript config via jiti
      rawConfig = await loadTypeScriptConfig(configPath);
    } else if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
      // JavaScript config via dynamic import
      const fileUrl = pathToFileURL(configPath).href;
      const module = await import(fileUrl);
      rawConfig = module.default ?? module;
    } else if (ext === ".yaml" || ext === ".yml") {
      // YAML config
      const content = await fs.readFile(configPath, "utf-8");
      rawConfig = parseYaml(content);
    } else {
      // JSON config (including .depscoperc)
      const content = await fs.readFile(configPath, "utf-8");
      rawConfig = JSON.parse(content);
    }

    return validateConfig(rawConfig, configPath);
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      throw error;
    }
    throw new ConfigLoadError(
      configPath,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Load TypeScript config file using jiti
 */
async function loadTypeScriptConfig(configPath: string): Promise<unknown> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
  });

  const module = await jiti.import(configPath);
  return (module as { default?: unknown }).default ?? module;
}

/**
 * Load config from package.json depScope field
 */
async function loadFromPackageJson(projectPath: string): Promise<DepScopeConfig | null> {
  const pkgPath = path.join(projectPath, "package.json");

  try {
    const content = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as { depScope?: unknown };

    if (pkg.depScope && typeof pkg.depScope === "object") {
      return validateConfig(pkg.depScope, `${pkgPath}#depScope`);
    }
  } catch {
    // Ignore errors - package.json might not exist or be invalid
  }

  return null;
}

/**
 * Resolve extends (presets) recursively
 */
function resolveExtends(config: DepScopeConfig): Partial<DepScopeConfig> {
  if (!config.extends) {
    return {};
  }

  const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];
  const merged: Partial<DepScopeConfig> = {};

  for (const presetName of extendsList) {
    const preset = getPreset(presetName);
    if (!preset) {
      throw new Error(
        `Unknown preset "${presetName}". Available presets: minimal, react, node`
      );
    }

    // Merge preset into result
    Object.assign(merged, preset);

    // Special handling for arrays - concatenate instead of replace
    if (preset.wellKnownPatterns) {
      merged.wellKnownPatterns = [
        ...(merged.wellKnownPatterns ?? []),
        ...preset.wellKnownPatterns,
      ];
    }
  }

  return merged;
}

/**
 * Merge CLI options with config file and defaults
 * Priority: CLI > Config File > Extends (presets) > Defaults
 */
export function resolveConfig(
  cliOptions: Partial<DepScopeConfig>,
  fileConfig: DepScopeConfig | null
): ResolvedConfig {
  const defaults = getDefaults();

  // Resolve extends (presets) from file config
  const extendedConfig = fileConfig ? resolveExtends(fileConfig) : {};

  // Build resolved config with proper precedence
  const resolved: ResolvedConfig = {
    srcPaths: cliOptions.srcPaths ?? fileConfig?.srcPaths ?? extendedConfig.srcPaths ?? defaults.srcPaths,
    threshold: cliOptions.threshold ?? fileConfig?.threshold ?? extendedConfig.threshold ?? defaults.threshold,
    fileCountThreshold: cliOptions.fileCountThreshold ?? fileConfig?.fileCountThreshold ?? extendedConfig.fileCountThreshold ?? defaults.fileCountThreshold,
    includeDev: cliOptions.includeDev ?? fileConfig?.includeDev ?? extendedConfig.includeDev ?? defaults.includeDev,
    verbose: cliOptions.verbose ?? fileConfig?.verbose ?? extendedConfig.verbose ?? defaults.verbose,
    format: (cliOptions.format ?? fileConfig?.format ?? extendedConfig.format ?? defaults.format) as "console" | "markdown" | "json",
    output: cliOptions.output ?? fileConfig?.output ?? extendedConfig.output ?? defaults.output,
    withKnip: cliOptions.withKnip ?? fileConfig?.withKnip ?? extendedConfig.withKnip ?? defaults.withKnip,
    autoDetectWorkspace: cliOptions.autoDetectWorkspace ?? fileConfig?.autoDetectWorkspace ?? extendedConfig.autoDetectWorkspace ?? defaults.autoDetectWorkspace,
    checkTransitive: (cliOptions as { checkTransitive?: boolean }).checkTransitive ?? fileConfig?.checkTransitive ?? extendedConfig.checkTransitive ?? defaults.checkTransitive,

    // Arrays are merged, not replaced
    ignore: dedupeArray([
      ...defaults.ignore,
      ...(extendedConfig.ignore ?? []),
      ...(extendedConfig.ignorePatterns ?? []),
      ...(fileConfig?.ignore ?? []),
      ...(fileConfig?.ignorePatterns ?? []),
      ...(cliOptions.ignore ?? []),
    ]),

    wellKnownPatterns: dedupePatterns([
      ...DEFAULT_WELL_KNOWN_PATTERNS,
      ...(extendedConfig.wellKnownPatterns ?? []),
      ...(fileConfig?.wellKnownPatterns ?? []),
      ...(cliOptions.wellKnownPatterns ?? []),
    ]),

    nativeAlternatives: [
      ...(extendedConfig.nativeAlternatives ?? []),
      ...(fileConfig?.nativeAlternatives ?? []),
      ...(cliOptions.nativeAlternatives ?? []),
    ],

    duplicateCategories: [
      ...(extendedConfig.duplicateCategories ?? []),
      ...(fileConfig?.duplicateCategories ?? []),
      ...(cliOptions.duplicateCategories ?? []),
    ],
  };

  return resolved;
}

/**
 * Deduplicate array while preserving order
 */
function dedupeArray(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Deduplicate patterns by pattern string (later entries override earlier)
 */
function dedupePatterns(patterns: WellKnownPattern[]): WellKnownPattern[] {
  const map = new Map<string, WellKnownPattern>();
  for (const pattern of patterns) {
    map.set(pattern.pattern, pattern);
  }
  return Array.from(map.values());
}

/**
 * Get path to config file if one exists
 */
export async function findConfigPath(projectPath: string): Promise<string | null> {
  for (const configFile of CONFIG_FILES) {
    const configPath = path.join(projectPath, configFile);
    try {
      await fs.access(configPath);
      return configPath;
    } catch {
      continue;
    }
  }

  // Check package.json
  const pkgPath = path.join(projectPath, "package.json");
  try {
    const content = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as { depScope?: unknown };
    if (pkg.depScope) {
      return `${pkgPath}#depScope`;
    }
  } catch {
    // Ignore
  }

  return null;
}
