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
export { VerdictEngine, verdictEngine } from "./analyzers/verdict-engine.js";

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

// Utilities (Phase 1-2: DI Infrastructure)
export {
  PackageJsonReader,
  packageJsonReader,
} from "./utils/package-json-reader.js";
export {
  SourceFileScanner,
  sourceFileScanner,
  type ScanOptions,
} from "./utils/source-file-scanner.js";
export {
  ImportAggregator,
  importAggregator,
} from "./utils/import-aggregator.js";
export {
  ConsoleLogger,
  NullLogger,
  BufferedLogger,
  PrefixedLogger,
  createLogger,
  LogLevel,
} from "./utils/logger.js";
export {
  NodeFileSystem,
  MockFileSystem,
  CachingFileSystem,
  createFileSystem,
} from "./utils/filesystem.js";
export {
  MemoryCache,
  FileAnalysisCache,
  LRUCache,
  fileAnalysisCache,
  createFileAnalysisCache,
  createLRUCache,
  type CacheStats,
  type CacheDependencies,
} from "./utils/cache.js";
export {
  ParallelProcessor,
  parallelProcessor,
  createParallelProcessor,
  type ParallelProcessorOptions,
  type ParallelProcessorDependencies,
  type ProcessingResult,
  type BatchStats,
} from "./utils/parallel-processor.js";

// DI Container
export {
  Container,
  createContainer,
  createTestContainer,
  SERVICE_KEYS,
  type ServiceKey,
  type ServiceMap,
} from "./container/index.js";

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
