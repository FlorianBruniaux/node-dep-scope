/**
 * Usage Analyzer
 * Phase 2.5 - Refactored as orchestrator using extracted components
 * Aggregates import information into dependency analysis
 */

import { ImportAnalyzer, importAnalyzer as defaultImportAnalyzer } from "./import-analyzer.js";
import { PeerDepAnalyzer, peerDepAnalyzer as defaultPeerDepAnalyzer } from "./peer-dep-analyzer.js";
import { VerdictEngine, verdictEngine as defaultVerdictEngine } from "./verdict-engine.js";
import { PackageNotFoundError } from "../errors/index.js";
import type {
  AnalyzerOptions,
  DependencyAnalysis,
  ImportInfo,
  KnipPreAnalysis,
  ILogger,
  IImportAnalyzer,
  IPeerDepAnalyzer,
  IVerdictEngine,
  IPackageJsonReader,
  ISourceFileScanner,
  IImportAggregator,
  VerdictContext,
} from "../types/index.js";
import { getNativeAlternatives } from "../rules/native-alternatives.js";
import { hasDuplicatesInstalled } from "../rules/duplicate-categories.js";
import { runKnipAnalysis, formatKnipSummary } from "../integrations/knip.js";
import { detectWorkspace } from "../utils/workspace-detector.js";
import { shouldIgnoreWellKnown } from "../rules/well-known-packages.js";
import { DEFAULT_WELL_KNOWN_PATTERNS } from "../config/defaults.js";
import { PackageJsonReader, packageJsonReader as defaultPackageJsonReader } from "../utils/package-json-reader.js";
import { SourceFileScanner, sourceFileScanner as defaultSourceFileScanner } from "../utils/source-file-scanner.js";
import { ImportAggregator, importAggregator as defaultImportAggregator } from "../utils/import-aggregator.js";
import { ConsoleLogger } from "../utils/logger.js";

/**
 * Usage Analyzer Dependencies
 */
export interface UsageAnalyzerDependencies {
  logger?: ILogger;
  importAnalyzer?: IImportAnalyzer;
  peerDepAnalyzer?: IPeerDepAnalyzer;
  verdictEngine?: IVerdictEngine;
  packageJsonReader?: IPackageJsonReader;
  sourceFileScanner?: ISourceFileScanner;
  importAggregator?: IImportAggregator;
}

export class UsageAnalyzer {
  private options: AnalyzerOptions;
  private knipAnalysis: KnipPreAnalysis | null = null;

  // Injected dependencies
  private readonly logger: ILogger;
  private readonly importAnalyzer: IImportAnalyzer;
  private readonly peerDepAnalyzer: IPeerDepAnalyzer;
  private readonly verdictEngine: IVerdictEngine;
  private readonly packageJsonReader: IPackageJsonReader;
  private readonly sourceFileScanner: ISourceFileScanner;
  private readonly importAggregator: IImportAggregator;

  constructor(
    options: Partial<AnalyzerOptions> = {},
    deps: UsageAnalyzerDependencies = {}
  ) {
    this.options = {
      srcPaths: ["./src"],
      threshold: 5,
      fileCountThreshold: 3,
      includeDev: false,
      ignore: ["node_modules", "dist", ".next", "coverage"],
      verbose: false,
      withKnip: false,
      autoDetectWorkspace: true,
      wellKnownPatterns: DEFAULT_WELL_KNOWN_PATTERNS,
      ...options,
    };

    // Initialize dependencies with defaults
    this.logger = deps.logger ?? new ConsoleLogger({ verbose: this.options.verbose });
    this.importAnalyzer = deps.importAnalyzer ?? defaultImportAnalyzer;
    this.peerDepAnalyzer = deps.peerDepAnalyzer ?? defaultPeerDepAnalyzer;
    this.verdictEngine = deps.verdictEngine ?? defaultVerdictEngine;
    this.packageJsonReader = deps.packageJsonReader ?? defaultPackageJsonReader;
    this.sourceFileScanner = deps.sourceFileScanner ?? defaultSourceFileScanner;
    this.importAggregator = deps.importAggregator ?? defaultImportAggregator;
  }

  /**
   * Scan a project and analyze all dependencies
   */
  async scanProject(projectPath: string): Promise<DependencyAnalysis[]> {
    // Run Knip pre-analysis if enabled
    if (this.options.withKnip) {
      await this.runKnipPreAnalysis(projectPath);
    }

    // Read and validate package.json
    const packageJson = await this.packageJsonReader.read(projectPath);

    const allDeps = {
      ...packageJson.dependencies,
      ...(this.options.includeDev ? packageJson.devDependencies : {}),
    };

    // Auto-detect monorepo workspace if using default srcPaths
    await this.autoDetectWorkspace(projectPath);

    // Validate and get source files
    this.options.srcPaths = await this.sourceFileScanner.validatePaths(
      projectPath,
      this.options.srcPaths,
      { autoDetectWorkspace: this.options.autoDetectWorkspace }
    );

    const sourceFiles = await this.sourceFileScanner.scan(
      projectPath,
      this.options.srcPaths,
      this.options.ignore
    );

    this.logger.debug(`Found ${sourceFiles.length} source files`);

    if (sourceFiles.length === 0) {
      this.logger.warn(
        `Warning: No source files found in ${this.options.srcPaths.join(", ")}. ` +
          `Check your --src option.`
      );
    }

    // Analyze all imports
    const allImports = await this.collectImports(sourceFiles);
    this.logger.debug(`Found ${allImports.length} total imports`);

    // Group imports by package
    const importsByPackage = this.importAggregator.groupByPackage(allImports);

    // Filter to only installed dependencies (with glob pattern support)
    const installedPackages = Object.keys(allDeps).filter(
      (pkg) => !this.shouldIgnorePackage(pkg)
    );

    // Analyze peer dependencies
    this.logger.debug("Analyzing peer dependencies...");
    const peerDepMap = await this.peerDepAnalyzer.analyzePeerDeps(
      projectPath,
      installedPackages
    );

    // Analyze each dependency
    const analyses: DependencyAnalysis[] = [];

    for (const packageName of installedPackages) {
      const packageImports = importsByPackage.get(packageName) ?? [];
      const peerDepInfo = peerDepMap.get(packageName);
      const analysis = this.analyzeDependency(
        packageName,
        allDeps[packageName],
        packageImports,
        peerDepInfo
      );
      analyses.push(analysis);
    }

    // Post-process: Update verdict to CONSOLIDATE for packages in duplicate categories
    this.applyConsolidateVerdicts(analyses, installedPackages);

    // Sort by verdict priority
    return analyses.sort((a, b) =>
      this.verdictEngine.compareVerdicts(a.verdict, b.verdict)
    );
  }

  /**
   * Analyze a single dependency
   */
  async analyzeSingleDependency(
    projectPath: string,
    packageName: string
  ): Promise<DependencyAnalysis> {
    const packageJson = await this.packageJsonReader.read(projectPath);

    const version =
      packageJson.dependencies?.[packageName] ??
      packageJson.devDependencies?.[packageName];

    if (!version) {
      throw new PackageNotFoundError(packageName, projectPath);
    }

    // Validate source paths first
    this.options.srcPaths = await this.sourceFileScanner.validatePaths(
      projectPath,
      this.options.srcPaths,
      { autoDetectWorkspace: this.options.autoDetectWorkspace }
    );

    const sourceFiles = await this.sourceFileScanner.scan(
      projectPath,
      this.options.srcPaths,
      this.options.ignore
    );

    const allImports: ImportInfo[] = [];
    for (const file of sourceFiles) {
      try {
        const imports = await this.importAnalyzer.analyzeFile(file);
        const packageImports = imports.filter((i) => i.packageName === packageName);
        allImports.push(...packageImports);
      } catch {
        // Skip files that fail to parse
      }
    }

    return this.analyzeDependency(packageName, version, allImports);
  }

  /**
   * Check if Knip flagged this dependency as unused
   */
  isKnipFlaggedUnused(packageName: string): boolean {
    if (!this.knipAnalysis?.available) return false;
    return (
      this.knipAnalysis.unusedDependencies.has(packageName) ||
      this.knipAnalysis.unusedDevDependencies.has(packageName)
    );
  }

  /**
   * Get Knip analysis results
   */
  getKnipAnalysis(): KnipPreAnalysis | null {
    return this.knipAnalysis;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Run Knip pre-analysis
   */
  private async runKnipPreAnalysis(projectPath: string): Promise<void> {
    this.logger.debug("Running Knip pre-analysis...");
    const knipResult = await runKnipAnalysis(projectPath);

    if (knipResult.available) {
      this.knipAnalysis = {
        unusedDependencies: knipResult.unusedDependencies,
        unusedDevDependencies: knipResult.unusedDevDependencies,
        available: true,
      };
      this.logger.debug(formatKnipSummary(knipResult));
    } else {
      this.logger.warn(`Warning: ${knipResult.error}`);
      this.knipAnalysis = null;
    }
  }

  /**
   * Auto-detect monorepo workspace
   */
  private async autoDetectWorkspace(projectPath: string): Promise<void> {
    if (
      this.options.autoDetectWorkspace &&
      this.options.srcPaths.length === 1 &&
      this.options.srcPaths[0] === "./src"
    ) {
      const workspace = await detectWorkspace(projectPath);
      if (workspace.type !== "none") {
        this.options.srcPaths = workspace.srcPaths;
        this.logger.debug(
          `Detected ${workspace.type} workspace: ${workspace.patterns.join(", ")}`
        );
        this.logger.debug(`Scanning ${workspace.packages.length} packages...`);
      }
    }
  }

  /**
   * Collect imports from all source files
   */
  private async collectImports(sourceFiles: string[]): Promise<ImportInfo[]> {
    const allImports: ImportInfo[] = [];

    for (const file of sourceFiles) {
      try {
        const imports = await this.importAnalyzer.analyzeFile(file);
        allImports.push(...imports);
      } catch (error) {
        this.logger.debug(`Warning: Could not analyze ${file}`);
      }
    }

    return allImports;
  }

  /**
   * Check if a package should be ignored (supports glob patterns)
   */
  private shouldIgnorePackage(packageName: string): boolean {
    // Check wellKnownPatterns for IGNORE verdict
    if (shouldIgnoreWellKnown(packageName, this.options.wellKnownPatterns ?? [])) {
      return true;
    }

    for (const pattern of this.options.ignore) {
      // Exact match
      if (pattern === packageName) return true;

      // Glob pattern with *
      if (pattern.includes("*")) {
        const regex = new RegExp(
          "^" + pattern.replace(/\*/g, ".*").replace(/\//g, "\\/") + "$"
        );
        if (regex.test(packageName)) return true;
      }
    }
    return false;
  }

  /**
   * Analyze a single dependency
   */
  private analyzeDependency(
    packageName: string,
    version: string,
    imports: ImportInfo[],
    peerDepInfo?: { requiredBy: string[]; onlyPeerDep: boolean; safeToRemoveFromPackageJson: boolean }
  ): DependencyAnalysis {
    // Aggregate symbol usage using ImportAggregator
    const symbolsUsed = this.importAggregator.aggregateSymbols(imports);

    // Determine import style
    const importStyle = this.importAggregator.determineImportStyle(imports, packageName);

    // Get unique files
    const files = this.importAggregator.getUniqueFiles(imports);

    // Get native alternatives
    const alternatives = getNativeAlternatives(packageName, symbolsUsed);

    // Update peer dep info with actual usage
    const updatedPeerDepInfo = peerDepInfo
      ? {
          ...peerDepInfo,
          onlyPeerDep: imports.length === 0 && peerDepInfo.requiredBy.length > 0,
        }
      : undefined;

    // Build verdict context
    const verdictContext: VerdictContext = {
      packageName,
      symbolsUsed,
      alternatives,
      totalImports: imports.length,
      peerDepInfo: updatedPeerDepInfo,
      fileCount: files.length,
      options: {
        threshold: this.options.threshold,
        fileCountThreshold: this.options.fileCountThreshold,
        wellKnownPatterns: this.options.wellKnownPatterns,
      },
      knipFlaggedUnused: this.isKnipFlaggedUnused(packageName),
    };

    // Determine verdict using VerdictEngine
    const verdictResult = this.verdictEngine.determineVerdict(verdictContext);

    // Calculate confidence
    const confidence = this.verdictEngine.calculateConfidence(
      { ...verdictContext, knipAnalysis: this.knipAnalysis },
      verdictResult
    );

    return {
      name: packageName,
      version,
      importStyle,
      symbolsUsed,
      totalSymbolsUsed: symbolsUsed.length,
      verdict: verdictResult.verdict,
      confidence,
      alternatives,
      peerDepInfo: updatedPeerDepInfo,
      files,
      fileCount: files.length,
      investigateReason: verdictResult.investigateReason,
      wellKnownReason: verdictResult.wellKnownReason,
    };
  }

  /**
   * Apply CONSOLIDATE verdicts for duplicate packages
   */
  private applyConsolidateVerdicts(
    analyses: DependencyAnalysis[],
    installedPackages: string[]
  ): void {
    for (const analysis of analyses) {
      const duplicateCategory = hasDuplicatesInstalled(
        analysis.name,
        installedPackages
      );
      if (
        duplicateCategory &&
        analysis.verdict !== "REMOVE" &&
        analysis.verdict !== "PEER_DEP"
      ) {
        analysis.verdict = "CONSOLIDATE";
      }
    }
  }
}

// ============================================================================
// Default Instance (for backwards compatibility)
// ============================================================================

/**
 * Default usage analyzer instance
 * @deprecated Use dependency injection with UsageAnalyzer constructor instead
 */
export const usageAnalyzer = new UsageAnalyzer();
