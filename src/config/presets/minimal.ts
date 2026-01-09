/**
 * Minimal preset - basic defaults for any project
 * This is implicitly applied when no preset is specified.
 */

import type { DepScopeConfig } from "../schema.js";

export const minimalPreset: Partial<DepScopeConfig> = {
  // Minimal preset just uses the built-in defaults
  // It exists for explicit `extends: "minimal"` usage
};
