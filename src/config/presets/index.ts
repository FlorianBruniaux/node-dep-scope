/**
 * Configuration presets for dep-scope
 */

import type { DepScopeConfig } from "../schema.js";
import { minimalPreset } from "./minimal.js";
import { reactPreset } from "./react.js";
import { nodePreset } from "./node.js";

export const PRESETS: Record<string, Partial<DepScopeConfig>> = {
  minimal: minimalPreset,
  react: reactPreset,
  node: nodePreset,
};

/**
 * Get a preset by name
 */
export function getPreset(name: string): Partial<DepScopeConfig> | null {
  return PRESETS[name] ?? null;
}

/**
 * Get all available preset names
 */
export function getAvailablePresets(): string[] {
  return Object.keys(PRESETS);
}

export { minimalPreset, reactPreset, nodePreset };
