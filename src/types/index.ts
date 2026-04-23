/**
 * Core types for dep-scope analyzer
 */

export type ImportType = "named" | "default" | "namespace" | "side-effect";

export interface Location {
  file: string;
  line: number;
  column: number;
}

export interface ImportInfo {
  packageName: string;
  importPath: string;
  symbol: string;
  importType: ImportType;
  location: Location;
}

export interface SymbolUsage {
  symbol: string;
  importType: ImportType;
  locations: Location[];
  count: number;
}

export type Verdict =
  | "KEEP" // Well-used, no action needed
  | "RECODE_NATIVE" // <threshold symbols, native alternatives exist
  | "CONSOLIDATE" // Duplicate with another lib
  | "REMOVE" // Unused
  | "PEER_DEP" // Required by another package (transitive/peer)
  | "INVESTIGATE"; // Needs manual review

/** Reason for INVESTIGATE verdict (provides actionable context) */
export type InvestigateReason =
  | "LOW_SYMBOL_COUNT" // <= 2 symbols used
  | "SINGLE_FILE_USAGE" // fileCount === 1
  | "LOW_FILE_SPREAD" // 1 < fileCount < threshold
  | "UNKNOWN_PACKAGE"; // No patterns matched, needs review

export interface PeerDependencyInfo {
  /** Packages that require this package as peer/transitive dependency */
  requiredBy: string[];
  /** Whether this package is only used as a peer/transitive dependency */
  onlyPeerDep: boolean;
  /** Whether removing from package.json is safe (will still be installed via peer) */
  safeToRemoveFromPackageJson: boolean;
  /** True if the package exposes a CLI binary (has `bin` field in its package.json) */
  isCliTool?: boolean;
}

export interface NativeAlternative {
  symbol: string;
  native: string;
  example: string;
  minEcmaVersion?: string;
  caveats?: string[];
}

export interface BundleSize {
  full: number; // KB - if barrel import
  treeShaken: number; // KB - estimated after shake
  gzip: number; // KB - gzipped
}

export interface DependencyAnalysis {
  name: string;
  version: string;

  // Import analysis
  importStyle: "barrel" | "direct" | "mixed";
  symbolsUsed: SymbolUsage[];
  totalSymbolsUsed: number;

  // Library analysis (if available)
  totalSymbolsAvailable?: number;
  usagePercentage?: number;

  // Bundle impact
  bundleSize?: BundleSize;

  // Decision
  verdict: Verdict;
  confidence: number; // 0-1
  alternatives: NativeAlternative[];

  /** Reason for INVESTIGATE verdict (when applicable) */
  investigateReason?: InvestigateReason;

  /** Reason for auto-KEEP from well-known patterns (when applicable) */
  wellKnownReason?: string;

  // Peer dependency info
  peerDepInfo?: PeerDependencyInfo;

  // Files
  files: string[];
  fileCount: number;
}

export interface DuplicateGroup {
  category: string;
  description: string;
  libraries: LibraryUsage[];
  recommendation: {
    keep: string;
    migrate: string[];
    remove: string[];
  };
  potentialSavings: {
    bundleKb: number;
    dependencyCount: number;
  };
}

export interface LibraryUsage {
  name: string;
  fileCount: number;
  symbolCount: number;
  recommendation: "keep" | "migrate" | "remove";
}

export interface TransitiveEchoFinding {
  /** Package name found as a transitive dependency */
  package: string;
  /** Native replacement from e18e database */
  nativeReplacement: string;
  /** Minimum ECMAScript version for the replacement */
  minEcmaVersion?: string;
  /** Direct dependency that introduced this transitive (shortest BFS path) */
  firstSeenVia: string;
}

export interface ScanResult {
  projectPath: string;
  scannedAt: string;
  dependencies: DependencyAnalysis[];
  duplicates: DuplicateGroup[];
  summary: {
    total: number;
    keep: number;
    recodeNative: number;
    consolidate: number;
    remove: number;
    peerDep: number;
    investigate: number;
  };
  estimatedSavings: {
    bundleKb: number;
    dependencyCount: number;
  };
  /** Transitive packages with native alternatives (only present when --check-transitive) */
  transitiveEchoes?: TransitiveEchoFinding[];
}

export interface AnalyzerOptions {
  srcPaths: string[];
  threshold: number;
  /** Minimum file count to auto-KEEP (skip INVESTIGATE). Default: 3 */
  fileCountThreshold?: number;
  includeDev: boolean;
  ignore: string[];
  verbose: boolean;
  /** Use Knip for pre-analysis (improved accuracy) */
  withKnip?: boolean;
  /** Auto-detect monorepo workspaces (pnpm, turbo, npm, yarn, lerna). Default: true */
  autoDetectWorkspace?: boolean;
  /** Well-known package patterns for automatic verdicts */
  wellKnownPatterns?: import("../config/schema.js").WellKnownPattern[];
  /** Custom native alternatives (merged with built-in NATIVE_ALTERNATIVES) */
  nativeAlternatives?: import("../config/schema.js").CustomNativeAlternative[];
  /** Custom duplicate categories (merged with built-in DUPLICATE_CATEGORIES) */
  duplicateCategories?: import("../config/schema.js").CustomDuplicateCategory[];
  /** String-reference detection config */
  stringReferences?: { disable?: string[] | "all" };
}

export interface KnipPreAnalysis {
  /** Dependencies Knip flagged as unused */
  unusedDependencies: Set<string>;
  /** DevDependencies Knip flagged as unused */
  unusedDevDependencies: Set<string>;
  /** Whether Knip analysis was successful */
  available: boolean;
}

// ============================================================================
// Interface Exports (Phase 1 - Dependency Injection Foundation)
// ============================================================================

export type {
  // Core abstractions
  ILogger,
  IFileSystem,
  IFileStats,

  // Analyzers
  IImportAnalyzer,
  IPeerDepAnalyzer,
  IUsageAnalyzer,

  // Reporters
  IReporter,
  IConsoleReporter,
  IMarkdownReporter,
  IJsonReporter,

  // Data providers
  INativeAlternativesProvider,
  IDuplicateCategoriesProvider,

  // Verdict engine (Phase 2)
  IVerdictEngine,
  VerdictContext,
  VerdictResult,

  // Utilities (Phase 2)
  IPackageJsonReader,
  PackageJsonContent,
  ISourceFileScanner,
  IImportAggregator,

  // Performance (Phase 3)
  ICache,
  IFileAnalysisCache,
  ICacheStats,
  IParallelProcessor,
} from "./interfaces.js";

export type {
  StringRefKind,
  StringReference,
  DetectorContext,
  IStringReferenceDetector,
  IStringReferenceAnalyzer,
} from "./string-ref.js";

export { defineDetector } from "./string-ref.js";
