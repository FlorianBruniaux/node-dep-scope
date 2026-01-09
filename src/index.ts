/**
 * dep-scope
 * Analyze granular dependency usage in TypeScript/JavaScript projects
 */

// Core exports
export * from "./types/index.js";

// Analyzers
export { ImportAnalyzer, importAnalyzer } from "./analyzers/import-analyzer.js";
export { UsageAnalyzer, usageAnalyzer } from "./analyzers/usage-analyzer.js";
export { PeerDepAnalyzer, peerDepAnalyzer } from "./analyzers/peer-dep-analyzer.js";

// Rules
export {
  getNativeAlternatives,
  hasAlternatives,
  getPackagesWithAlternatives,
} from "./rules/native-alternatives.js";
export {
  detectDuplicates,
  getCategoryForPackage,
} from "./rules/duplicate-categories.js";

// Reporters
export { MarkdownReporter, markdownReporter } from "./reporters/markdown-reporter.js";
export { ConsoleReporter, consoleReporter } from "./reporters/console-reporter.js";

// Integrations
export {
  runKnipAnalysis,
  isKnipAvailable,
  formatKnipSummary,
  type KnipAnalysis,
  type KnipOutput,
} from "./integrations/knip.js";

// Config
export {
  loadConfig,
  resolveConfig,
  mergeConfig,
  defineConfig,
  type DepScopeConfig,
  type ResolvedConfig,
  type WellKnownPattern,
  type CustomNativeAlternative,
  type CustomDuplicateCategory,
  DEFAULT_WELL_KNOWN_PATTERNS,
  getPreset,
  getAvailablePresets,
  PRESETS,
} from "./config/index.js";

// Well-known packages
export {
  matchWellKnownPackage,
  shouldIgnoreWellKnown,
  getWellKnownVerdict,
} from "./rules/well-known-packages.js";
