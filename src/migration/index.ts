/**
 * Migration module public API
 * Generates LLM-ready migration prompts from dependency analysis
 */

export { generateMigration } from "./generator.js";
export type { MigrationContext, MigrationOutput, MigrationTemplate, SymbolMigrationRule } from "./types.js";
export { lodashTemplate } from "./templates/lodash.js";
export { momentTemplate } from "./templates/moment.js";
export { axiosTemplate } from "./templates/axios.js";

/** Registry of all available templates by package name */
import { lodashTemplate } from "./templates/lodash.js";
import { momentTemplate } from "./templates/moment.js";
import { axiosTemplate } from "./templates/axios.js";
import type { MigrationTemplate, SymbolMigrationRule } from "./types.js";
import type { DependencyAnalysis } from "../types/index.js";

const TEMPLATES: Record<string, MigrationTemplate> = {
  lodash: lodashTemplate,
  "lodash-es": lodashTemplate, // Same API, same rules
  moment: momentTemplate,
  axios: axiosTemplate,
};

/**
 * Get a dedicated migration template for a given package name.
 * Returns null if no hand-crafted template is available.
 */
export function getTemplate(packageName: string): MigrationTemplate | null {
  return TEMPLATES[packageName] ?? null;
}

/** List all packages that have dedicated migration templates */
export function getTemplatedPackages(): string[] {
  return Object.keys(TEMPLATES);
}

/**
 * Build a generic MigrationTemplate from the native alternatives already
 * present in a DependencyAnalysis. Used as fallback when no dedicated
 * hand-crafted template exists.
 *
 * Returns null when the analysis has no known alternatives (nothing to migrate).
 */
export function buildGenericTemplate(
  packageName: string,
  analysis: DependencyAnalysis
): MigrationTemplate | null {
  if (analysis.alternatives.length === 0) return null;

  const symbols: Record<string, SymbolMigrationRule> = {};

  for (const alt of analysis.alternatives) {
    symbols[alt.symbol] = {
      symbol: alt.symbol,
      nativeReplacement: alt.native,
      example: alt.example ?? "",
      minEcmaVersion: alt.minEcmaVersion ?? "ES6",
      caveats: alt.caveats ?? [],
    };
  }

  return { packageName, symbols };
}

/**
 * Get a template for a package: dedicated template first, generic fallback
 * built from native-alternatives data. Returns null when nothing is known.
 */
export function getOrBuildTemplate(
  packageName: string,
  analysis: DependencyAnalysis
): MigrationTemplate | null {
  return TEMPLATES[packageName] ?? buildGenericTemplate(packageName, analysis);
}
