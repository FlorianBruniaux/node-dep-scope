/**
 * Core Interfaces for Dependency Injection
 * Phase 1.1 - Foundation for testable, maintainable architecture
 */

import type {
  AnalyzerOptions,
  DependencyAnalysis,
  DuplicateGroup,
  ImportInfo,
  NativeAlternative,
  PeerDependencyInfo,
  ScanResult,
  SymbolUsage,
} from "./index.js";

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger abstraction for dependency injection
 * Replaces direct console.log/warn/error calls
 */
export interface ILogger {
  log(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;

  /** Set verbosity level */
  setVerbose(verbose: boolean): void;

  /** Check if verbose mode is enabled */
  isVerbose(): boolean;
}

// ============================================================================
// FileSystem Interface
// ============================================================================

/**
 * File system abstraction for testability
 * Wraps node:fs/promises operations
 */
export interface IFileSystem {
  /** Read file contents as string */
  readFile(filePath: string, encoding?: BufferEncoding): Promise<string>;

  /** Get file/directory stats */
  stat(filePath: string): Promise<IFileStats>;

  /** Read directory contents */
  readdir(dirPath: string): Promise<string[]>;

  /** Check if path exists */
  exists(filePath: string): Promise<boolean>;
}

/**
 * File stats subset needed by analyzers
 */
export interface IFileStats {
  isDirectory(): boolean;
  isFile(): boolean;
  mtime: Date;
  size: number;
}

// ============================================================================
// Import Analyzer Interface
// ============================================================================

/**
 * Import analyzer for parsing source files
 * Extracts import declarations from TypeScript/JavaScript files
 */
export interface IImportAnalyzer {
  /**
   * Analyze imports from a file path
   * @param filePath - Absolute path to the source file
   * @returns Array of import information
   */
  analyzeFile(filePath: string): Promise<ImportInfo[]>;

  /**
   * Analyze imports from source code content
   * @param content - Source code as string
   * @param filePath - File path for error reporting
   * @returns Array of import information
   */
  analyzeContent(content: string, filePath: string): ImportInfo[];

  /**
   * Extract package name from import source
   * @param source - Import source string (e.g., 'lodash/get', '@scope/pkg')
   * @returns Package name
   */
  extractPackageName(source: string): string;

  /**
   * Determine if import is barrel or direct
   * @param importPath - The import path
   * @param packageName - The package name
   * @returns 'barrel' or 'direct'
   */
  determineImportStyle(importPath: string, packageName: string): "barrel" | "direct";
}

// ============================================================================
// Peer Dependency Analyzer Interface
// ============================================================================

/**
 * Peer dependency analyzer
 * Scans node_modules for peer dependency relationships
 */
export interface IPeerDepAnalyzer {
  /**
   * Analyze peer dependencies for all installed packages
   * @param projectPath - Path to the project root
   * @param installedPackages - List of installed package names
   * @returns Map of package name to peer dependency info
   */
  analyzePeerDeps(
    projectPath: string,
    installedPackages: string[]
  ): Promise<Map<string, PeerDependencyInfo>>;

  /**
   * Check peer dependencies for a specific package
   * @param projectPath - Path to the project root
   * @param packageName - Name of the package to check
   * @param installedPackages - List of installed package names
   * @returns Peer dependency information
   */
  checkPackagePeerDeps(
    projectPath: string,
    packageName: string,
    installedPackages: string[]
  ): Promise<PeerDependencyInfo>;

  /**
   * Clear internal cache
   */
  clearCache(): void;
}

// ============================================================================
// Usage Analyzer Interface
// ============================================================================

/**
 * Main usage analyzer orchestrator
 * Coordinates import analysis, peer dep detection, and verdict determination
 */
export interface IUsageAnalyzer {
  /**
   * Scan a project and analyze all dependencies
   * @param projectPath - Path to the project root
   * @returns Array of dependency analyses sorted by verdict priority
   */
  scanProject(projectPath: string): Promise<DependencyAnalysis[]>;

  /**
   * Analyze a single specific dependency
   * @param projectPath - Path to the project root
   * @param packageName - Name of the package to analyze
   * @returns Dependency analysis for the specified package
   */
  analyzeSingleDependency(
    projectPath: string,
    packageName: string
  ): Promise<DependencyAnalysis>;

  /**
   * Check if Knip flagged a dependency as unused
   * @param packageName - Name of the package
   * @returns true if Knip flagged as unused
   */
  isKnipFlaggedUnused(packageName: string): boolean;
}

// ============================================================================
// Reporter Interfaces
// ============================================================================

/**
 * Base reporter interface
 * Common contract for all output formatters
 */
export interface IReporter {
  /** Reporter format identifier */
  readonly format: "console" | "markdown" | "json";
}

/**
 * Console reporter for terminal output
 */
export interface IConsoleReporter extends IReporter {
  readonly format: "console";

  /**
   * Print scan summary with statistics
   * @param result - Complete scan result
   */
  printScanSummary(result: ScanResult): void;

  /**
   * Print duplicate library groups
   * @param duplicates - Detected duplicate groups
   */
  printDuplicates(duplicates: DuplicateGroup[]): void;

  /**
   * Print action items (non-KEEP verdicts)
   * @param dependencies - All dependency analyses
   */
  printActionItems(dependencies: DependencyAnalysis[]): void;

  /**
   * Print detailed analysis for a single dependency
   * @param analysis - Single dependency analysis
   */
  printDependencyAnalysis(analysis: DependencyAnalysis): void;

  /**
   * Print all dependencies in table format
   * @param dependencies - All dependency analyses
   */
  printDependencyTable(dependencies: DependencyAnalysis[]): void;
}

/**
 * Markdown reporter for file output
 */
export interface IMarkdownReporter extends IReporter {
  readonly format: "markdown";

  /**
   * Generate full scan report as markdown
   * @param result - Complete scan result
   * @returns Markdown string
   */
  generateScanReport(result: ScanResult): string;

  /**
   * Generate single dependency report as markdown
   * @param analysis - Single dependency analysis
   * @returns Markdown string
   */
  generateDependencyReport(analysis: DependencyAnalysis): string;
}

/**
 * JSON reporter for programmatic consumption
 */
export interface IJsonReporter extends IReporter {
  readonly format: "json";

  /**
   * Generate scan result as JSON string
   * @param result - Complete scan result
   * @returns JSON string
   */
  generateScanReport(result: ScanResult): string;

  /**
   * Generate single dependency as JSON string
   * @param analysis - Single dependency analysis
   * @returns JSON string
   */
  generateDependencyReport(analysis: DependencyAnalysis): string;
}

// ============================================================================
// Data Provider Interfaces
// ============================================================================

/**
 * Native alternatives data provider
 * Supplies mappings from library symbols to native JS alternatives
 */
export interface INativeAlternativesProvider {
  /**
   * Get native alternatives for symbols used from a package
   * @param packageName - Name of the package
   * @param symbolsUsed - Symbols actually used from the package
   * @returns Array of native alternatives
   */
  getNativeAlternatives(
    packageName: string,
    symbolsUsed: SymbolUsage[]
  ): NativeAlternative[];

  /**
   * Check if a package has any known alternatives
   * @param packageName - Name of the package
   * @returns true if alternatives exist
   */
  hasAlternatives(packageName: string): boolean;

  /**
   * Get all packages with known alternatives
   * @returns Array of package names
   */
  getPackagesWithAlternatives(): string[];
}

/**
 * Duplicate categories data provider
 * Supplies definitions of functionally overlapping libraries
 */
export interface IDuplicateCategoriesProvider {
  /**
   * Detect duplicate libraries among analyzed dependencies
   * @param analyses - All dependency analyses
   * @returns Array of duplicate groups
   */
  detectDuplicates(analyses: DependencyAnalysis[]): DuplicateGroup[];

  /**
   * Get category for a specific package
   * @param packageName - Name of the package
   * @returns Category name or undefined
   */
  getCategoryForPackage(packageName: string): string | undefined;

  /**
   * Get all packages in a category
   * @param category - Category name
   * @returns Array of package names
   */
  getCategoryPackages(category: string): string[];

  /**
   * Check if a package has duplicates among installed packages
   * @param packageName - Name of the package
   * @param installedPackages - List of installed packages
   * @returns Category name if duplicates exist, undefined otherwise
   */
  hasDuplicatesInstalled(
    packageName: string,
    installedPackages: string[]
  ): string | undefined;
}

// ============================================================================
// Verdict Engine Interface (for Phase 2)
// ============================================================================

/**
 * Verdict determination engine
 * Extracts verdict logic from UsageAnalyzer for testability
 */
export interface IVerdictEngine {
  /**
   * Determine verdict for a dependency
   * @param context - All information needed for verdict determination
   * @returns Verdict result with reason
   */
  determineVerdict(context: VerdictContext): VerdictResult;

  /**
   * Calculate confidence score for a verdict
   * @param context - Verdict context (may include knipAnalysis)
   * @param verdict - Determined verdict
   * @returns Confidence score 0-1
   */
  calculateConfidence(context: VerdictContext | VerdictCalculationContext, verdict: VerdictResult): number;

  /**
   * Check if a verdict requires action
   * @param verdict - The verdict to check
   * @returns true if actionable (not KEEP)
   */
  isActionable(verdict: import("./index.js").Verdict): boolean;

  /**
   * Get priority for verdict sorting
   * @param verdict - The verdict
   * @returns Priority number (lower = higher priority)
   */
  getVerdictPriority(verdict: import("./index.js").Verdict): number;

  /**
   * Compare two verdicts for sorting
   * @param a - First verdict
   * @param b - Second verdict
   * @returns Negative if a < b, positive if a > b, 0 if equal
   */
  compareVerdicts(a: import("./index.js").Verdict, b: import("./index.js").Verdict): number;

  /**
   * Get human-readable description for investigate reason
   * @param reason - The investigate reason
   * @returns Description string
   */
  getInvestigateReasonDescription(reason: import("./index.js").InvestigateReason): string;
}

/**
 * Context for verdict determination
 */
export interface VerdictContext {
  packageName: string;
  symbolsUsed: SymbolUsage[];
  alternatives: NativeAlternative[];
  totalImports: number;
  peerDepInfo?: PeerDependencyInfo;
  fileCount: number;
  options: Pick<AnalyzerOptions, "threshold" | "fileCountThreshold" | "wellKnownPatterns">;
  knipFlaggedUnused?: boolean;
}

/**
 * Result of verdict determination
 */
export interface VerdictResult {
  verdict: import("./index.js").Verdict;
  investigateReason?: import("./index.js").InvestigateReason;
  wellKnownReason?: string;
}

/**
 * Extended context for confidence calculation with Knip analysis
 */
export interface VerdictCalculationContext extends VerdictContext {
  knipAnalysis?: import("./index.js").KnipPreAnalysis | null;
}

// ============================================================================
// Package JSON Reader Interface (for Phase 2)
// ============================================================================

/**
 * Package.json reader abstraction
 */
export interface IPackageJsonReader {
  /**
   * Read and parse package.json
   * @param projectPath - Path to project root
   * @returns Parsed package.json content
   */
  read(projectPath: string): Promise<PackageJsonContent>;

  /**
   * Get production dependencies
   * @param projectPath - Path to project root
   * @returns Dependencies record
   */
  getDependencies(projectPath: string): Promise<Record<string, string>>;

  /**
   * Get dev dependencies
   * @param projectPath - Path to project root
   * @returns Dev dependencies record
   */
  getDevDependencies(projectPath: string): Promise<Record<string, string>>;
}

/**
 * Minimal package.json structure needed by analyzers
 */
export interface PackageJsonContent {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// ============================================================================
// Source File Scanner Interface (for Phase 2)
// ============================================================================

/**
 * Options for source file scanning
 */
export interface SourceFileScanOptions {
  autoDetectWorkspace?: boolean;
}

/**
 * Source file discovery scanner
 */
export interface ISourceFileScanner {
  /**
   * Scan for source files
   * @param projectPath - Path to project root
   * @param srcPaths - Source directories to scan
   * @param ignorePatterns - Patterns to ignore
   * @returns Array of absolute file paths
   */
  scan(
    projectPath: string,
    srcPaths: string[],
    ignorePatterns: string[]
  ): Promise<string[]>;

  /**
   * Validate that source paths exist
   * @param projectPath - Path to project root
   * @param srcPaths - Source paths to validate
   * @param options - Optional scan options
   * @returns Array of valid paths
   */
  validatePaths(
    projectPath: string,
    srcPaths: string[],
    options?: SourceFileScanOptions
  ): Promise<string[]>;
}

// ============================================================================
// Import Aggregator Interface (for Phase 2)
// ============================================================================

/**
 * Import aggregation utilities
 */
export interface IImportAggregator {
  /**
   * Group imports by package name
   * @param imports - All imports from all files
   * @returns Map of package name to imports
   */
  groupByPackage(imports: ImportInfo[]): Map<string, ImportInfo[]>;

  /**
   * Aggregate symbol usage from imports
   * @param imports - Imports for a single package
   * @returns Array of symbol usage info
   */
  aggregateSymbols(imports: ImportInfo[]): SymbolUsage[];

  /**
   * Get unique files from imports
   * @param imports - Imports for a package
   * @returns Array of unique file paths
   */
  getUniqueFiles(imports: ImportInfo[]): string[];

  /**
   * Determine import style (barrel, direct, or mixed)
   * @param imports - Imports for a package
   * @param packageName - The package name
   * @returns Import style
   */
  determineImportStyle(
    imports: ImportInfo[],
    packageName: string
  ): "barrel" | "direct" | "mixed";
}

// ============================================================================
// Cache Interface (for Phase 3)
// ============================================================================

/**
 * Generic cache interface
 */
export interface ICache<K, V> {
  /**
   * Get cached value
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  get(key: K): V | undefined;

  /**
   * Set cached value
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void;

  /**
   * Check if key exists
   * @param key - Cache key
   * @returns true if cached
   */
  has(key: K): boolean;

  /**
   * Delete cached value
   * @param key - Cache key
   */
  delete(key: K): void;

  /**
   * Clear all cached values
   */
  clear(): void;

  /**
   * Get cache size
   */
  readonly size: number;
}

/**
 * File analysis cache with invalidation support
 */
/**
 * Cache statistics for monitoring
 */
export interface ICacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export interface IFileAnalysisCache extends ICache<string, ImportInfo[]> {
  /**
   * Get with automatic invalidation check
   * @param filePath - File path as key
   * @param mtime - File modification time
   * @returns Cached imports or undefined if invalid
   */
  getIfValid(filePath: string, mtime: Date): ImportInfo[] | undefined;

  /**
   * Set with modification time tracking
   * @param filePath - File path as key
   * @param imports - Analyzed imports
   * @param mtime - File modification time
   */
  setWithMtime(filePath: string, imports: ImportInfo[], mtime: Date): void;

  /**
   * Get cache statistics
   * @returns Cache statistics including hits, misses, size, hitRate
   */
  getStats(): ICacheStats;
}

// ============================================================================
// Parallel Processor Interface (for Phase 3)
// ============================================================================

/**
 * Parallel file processor for performance
 */
export interface IParallelProcessor {
  /**
   * Process files in parallel with concurrency control
   * @param files - Files to process
   * @param processor - Processing function
   * @param concurrency - Max concurrent operations
   * @returns Array of results
   */
  processFiles<T>(
    files: string[],
    processor: (file: string) => Promise<T>,
    concurrency?: number
  ): Promise<T[]>;

  /**
   * Get optimal concurrency based on system resources
   * @returns Recommended concurrency level
   */
  getOptimalConcurrency(): number;
}
