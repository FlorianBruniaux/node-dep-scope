/**
 * Migration module public API
 * Generates LLM-ready migration prompts from dependency analysis
 */

export { generateMigration } from "./generator.js";
export type { MigrationContext, MigrationOutput, MigrationTemplate, SymbolMigrationRule } from "./types.js";
export { lodashTemplate } from "./templates/lodash.js";

/** Registry of all available templates by package name */
import { lodashTemplate } from "./templates/lodash.js";
import type { MigrationTemplate } from "./types.js";

const TEMPLATES: Record<string, MigrationTemplate> = {
  lodash: lodashTemplate,
  "lodash-es": lodashTemplate, // Same API, same rules
};

/**
 * Get a migration template for a given package name.
 * Returns null if no template is available.
 */
export function getTemplate(packageName: string): MigrationTemplate | null {
  return TEMPLATES[packageName] ?? null;
}

/** List all packages that have migration templates */
export function getTemplatedPackages(): string[] {
  return Object.keys(TEMPLATES);
}
