/**
 * Usage Analyzer
 * Aggregates import information into dependency analysis
 */

import fg from "fast-glob";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { importAnalyzer } from "./import-analyzer.js";
import { peerDepAnalyzer } from "./peer-dep-analyzer.js";
import {
  PackageJsonNotFoundError,
  InvalidPackageJsonError,
  SourcePathNotFoundError,
  PackageNotFoundError,
} from "../errors/index.js";
import type {
  AnalyzerOptions,
  DependencyAnalysis,
  ImportInfo,
  InvestigateReason,
  KnipPreAnalysis,
  NativeAlternative,
  PeerDependencyInfo,
  SymbolUsage,
  Verdict,
} from "../types/index.js";
import { getNativeAlternatives } from "../rules/native-alternatives.js";
import { hasDuplicatesInstalled } from "../rules/duplicate-categories.js";
import { runKnipAnalysis, formatKnipSummary } from "../integrations/knip.js";
import { detectWorkspace } from "../utils/workspace-detector.js";
import { matchWellKnownPackage, shouldIgnoreWellKnown } from "../rules/well-known-packages.js";
import type { WellKnownPattern } from "../config/schema.js";
import { DEFAULT_WELL_KNOWN_PATTERNS } from "../config/defaults.js";

export class UsageAnalyzer {
  private options: AnalyzerOptions;

  private knipAnalysis: KnipPreAnalysis | null = null;

  constructor(options: Partial<AnalyzerOptions> = {}) {
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
  }

  /**
   * Scan a project and analyze all dependencies
   */
  async scanProject(projectPath: string): Promise<DependencyAnalysis[]> {
    // Run Knip pre-analysis if enabled
    if (this.options.withKnip) {
      if (this.options.verbose) {
        console.log("Running Knip pre-analysis...");
      }
      const knipResult = await runKnipAnalysis(projectPath);

      if (knipResult.available) {
        this.knipAnalysis = {
          unusedDependencies: knipResult.unusedDependencies,
          unusedDevDependencies: knipResult.unusedDevDependencies,
          available: true,
        };
        if (this.options.verbose) {
          console.log(formatKnipSummary(knipResult));
        }
      } else {
        console.warn(`Warning: ${knipResult.error}`);
        this.knipAnalysis = null;
      }
    }

    // Read and validate package.json
    const packageJson = await this.readPackageJson(projectPath);

    const allDeps = {
      ...packageJson.dependencies,
      ...(this.options.includeDev ? packageJson.devDependencies : {}),
    };

    // Auto-detect monorepo workspace if using default srcPaths
    if (
      this.options.autoDetectWorkspace &&
      this.options.srcPaths.length === 1 &&
      this.options.srcPaths[0] === "./src"
    ) {
      const workspace = await detectWorkspace(projectPath);
      if (workspace.type !== "none") {
        this.options.srcPaths = workspace.srcPaths;
        if (this.options.verbose) {
          console.log(`Detected ${workspace.type} workspace: ${workspace.patterns.join(", ")}`);
          console.log(`Scanning ${workspace.packages.length} packages...`);
        }
      }
    }

    // Validate and get source files
    await this.validateSourcePaths(projectPath);
    const sourceFiles = await this.getSourceFiles(projectPath);

    if (this.options.verbose) {
      console.log(`Found ${sourceFiles.length} source files`);
    }

    if (sourceFiles.length === 0) {
      console.warn(
        `Warning: No source files found in ${this.options.srcPaths.join(", ")}. ` +
          `Check your --src option.`
      );
    }

    // Analyze all imports
    const allImports: ImportInfo[] = [];
    for (const file of sourceFiles) {
      try {
        const imports = await importAnalyzer.analyzeFile(file);
        allImports.push(...imports);
      } catch (error) {
        // Log but don't fail on individual file errors
        if (this.options.verbose) {
          console.warn(`Warning: Could not analyze ${file}`);
        }
      }
    }

    if (this.options.verbose) {
      console.log(`Found ${allImports.length} total imports`);
    }

    // Group imports by package
    const importsByPackage = this.groupImportsByPackage(allImports);

    // Filter to only installed dependencies (with glob pattern support)
    const installedPackages = Object.keys(allDeps).filter(
      (pkg) => !this.shouldIgnorePackage(pkg)
    );

    // Analyze peer dependencies
    if (this.options.verbose) {
      console.log("Analyzing peer dependencies...");
    }
    const peerDepMap = await peerDepAnalyzer.analyzePeerDeps(
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
    // This ensures packages don't appear in both "Investigate" and "Duplicates" sections
    for (const analysis of analyses) {
      const duplicateCategory = hasDuplicatesInstalled(
        analysis.name,
        installedPackages
      );
      if (duplicateCategory && analysis.verdict !== "REMOVE" && analysis.verdict !== "PEER_DEP") {
        analysis.verdict = "CONSOLIDATE";
      }
    }

    // Sort by verdict priority
    return analyses.sort((a, b) => {
      const priority: Record<Verdict, number> = {
        REMOVE: 0,
        PEER_DEP: 1,
        RECODE_NATIVE: 2,
        CONSOLIDATE: 3,
        INVESTIGATE: 4,
        KEEP: 5,
      };
      return priority[a.verdict] - priority[b.verdict];
    });
  }

  /**
   * Analyze a single dependency
   */
  async analyzeSingleDependency(
    projectPath: string,
    packageName: string
  ): Promise<DependencyAnalysis> {
    const packageJson = await this.readPackageJson(projectPath);

    const version =
      packageJson.dependencies?.[packageName] ??
      packageJson.devDependencies?.[packageName];

    if (!version) {
      throw new PackageNotFoundError(packageName, projectPath);
    }

    const sourceFiles = await this.getSourceFiles(projectPath);

    const allImports: ImportInfo[] = [];
    for (const file of sourceFiles) {
      try {
        const imports = await importAnalyzer.analyzeFile(file);
        const packageImports = imports.filter((i) => i.packageName === packageName);
        allImports.push(...packageImports);
      } catch {
        // Skip files that fail to parse
      }
    }

    return this.analyzeDependency(packageName, version, allImports);
  }

  /**
   * Read and validate package.json
   */
  private async readPackageJson(projectPath: string): Promise<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }> {
    const packageJsonPath = path.join(projectPath, "package.json");

    let content: string;
    try {
      content = await fs.readFile(packageJsonPath, "utf-8");
    } catch (error) {
      throw new PackageJsonNotFoundError(projectPath);
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new InvalidPackageJsonError(
        projectPath,
        error instanceof Error ? error.message : "Invalid JSON"
      );
    }
  }

  /**
   * Validate that source paths exist
   * In monorepo mode (autoDetectWorkspace), filters out non-existent paths
   * In explicit mode (--src provided), throws error if path doesn't exist
   */
  private async validateSourcePaths(projectPath: string): Promise<void> {
    const validPaths: string[] = [];

    for (const srcPath of this.options.srcPaths) {
      const fullPath = path.join(projectPath, srcPath);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          validPaths.push(srcPath);
        }
      } catch {
        // In monorepo mode, skip non-existent paths silently
        // (some packages may not have src/ or lib/)
        if (!this.options.autoDetectWorkspace) {
          throw new SourcePathNotFoundError(srcPath, projectPath);
        }
      }
    }

    // Must have at least one valid path
    if (validPaths.length === 0) {
      throw new SourcePathNotFoundError(
        this.options.srcPaths.join(", "),
        projectPath
      );
    }

    this.options.srcPaths = validPaths;
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
   * Get all TypeScript/JavaScript source files
   */
  private async getSourceFiles(projectPath: string): Promise<string[]> {
    const patterns = this.options.srcPaths.map((srcPath) =>
      path.join(projectPath, srcPath, "**/*.{ts,tsx,js,jsx,mjs,cjs}")
    );

    // Build ignore patterns for fast-glob
    // Always ignore node_modules at any depth to handle monorepo sub-packages
    const ignorePatterns = [
      "**/node_modules/**",
      ...this.options.ignore
        .filter((p) => p !== "node_modules") // Already handled above
        .map((p) => `**/${p}/**`),
    ];

    return fg(patterns, {
      ignore: ignorePatterns,
      absolute: true,
      onlyFiles: true,
    });
  }

  /**
   * Group imports by package name
   */
  private groupImportsByPackage(
    imports: ImportInfo[]
  ): Map<string, ImportInfo[]> {
    const grouped = new Map<string, ImportInfo[]>();

    for (const imp of imports) {
      const existing = grouped.get(imp.packageName) ?? [];
      existing.push(imp);
      grouped.set(imp.packageName, existing);
    }

    return grouped;
  }

  /**
   * Analyze a single dependency
   */
  private analyzeDependency(
    packageName: string,
    version: string,
    imports: ImportInfo[],
    peerDepInfo?: PeerDependencyInfo
  ): DependencyAnalysis {
    // Aggregate symbol usage
    const symbolMap = new Map<string, SymbolUsage>();

    for (const imp of imports) {
      const existing = symbolMap.get(imp.symbol);
      if (existing) {
        existing.locations.push(imp.location);
        existing.count++;
      } else {
        symbolMap.set(imp.symbol, {
          symbol: imp.symbol,
          importType: imp.importType,
          locations: [imp.location],
          count: 1,
        });
      }
    }

    const symbolsUsed = Array.from(symbolMap.values()).sort(
      (a, b) => b.count - a.count
    );

    // Determine import style
    const hasBarrel = imports.some(
      (i) => importAnalyzer.determineImportStyle(i.importPath, packageName) === "barrel"
    );
    const hasDirect = imports.some(
      (i) => importAnalyzer.determineImportStyle(i.importPath, packageName) === "direct"
    );
    const importStyle: "barrel" | "direct" | "mixed" =
      hasBarrel && hasDirect ? "mixed" : hasBarrel ? "barrel" : "direct";

    // Get unique files
    const files = [...new Set(imports.map((i) => i.location.file))];

    // Get native alternatives
    const alternatives = getNativeAlternatives(packageName, symbolsUsed);

    // Update peer dep info with actual usage
    const updatedPeerDepInfo = peerDepInfo
      ? {
          ...peerDepInfo,
          onlyPeerDep: imports.length === 0 && peerDepInfo.requiredBy.length > 0,
        }
      : undefined;

    // Determine verdict
    const verdictResult = this.determineVerdict(
      packageName,
      symbolsUsed,
      alternatives,
      imports.length,
      updatedPeerDepInfo,
      files.length
    );

    return {
      name: packageName,
      version,
      importStyle,
      symbolsUsed,
      totalSymbolsUsed: symbolsUsed.length,
      verdict: verdictResult.verdict,
      confidence: this.calculateConfidence(verdictResult.verdict, symbolsUsed, alternatives, updatedPeerDepInfo, packageName),
      alternatives,
      peerDepInfo: updatedPeerDepInfo,
      files,
      fileCount: files.length,
      investigateReason: verdictResult.investigateReason,
      wellKnownReason: verdictResult.wellKnownReason,
    };
  }

  /**
   * Determine verdict for a dependency
   */
  private determineVerdict(
    packageName: string,
    symbolsUsed: SymbolUsage[],
    alternatives: NativeAlternative[],
    totalImports: number,
    peerDepInfo?: PeerDependencyInfo,
    fileCount?: number
  ): { verdict: Verdict; investigateReason?: InvestigateReason; wellKnownReason?: string } {
    // Check wellKnownPatterns for KEEP verdict (highest priority after REMOVE/PEER_DEP)
    const wellKnownMatch = matchWellKnownPackage(
      packageName,
      this.options.wellKnownPatterns ?? []
    );
    if (wellKnownMatch && wellKnownMatch.verdict === "KEEP") {
      return { verdict: "KEEP", wellKnownReason: wellKnownMatch.reason };
    }

    // Check if Knip flagged this as unused (higher confidence)
    const knipFlaggedUnused =
      this.knipAnalysis?.available &&
      (this.knipAnalysis.unusedDependencies.has(packageName) ||
        this.knipAnalysis.unusedDevDependencies.has(packageName));

    // No imports - check if it's a peer dependency
    if (totalImports === 0) {
      // If it's required by other packages, it's a peer dep (redundant in package.json)
      if (peerDepInfo && peerDepInfo.requiredBy.length > 0) {
        return { verdict: "PEER_DEP" };
      }
      return { verdict: "REMOVE" };
    }

    // If Knip says unused but we found imports, investigate (potential config/dynamic usage)
    if (knipFlaggedUnused && totalImports > 0) {
      // Knip might be right (config file usage), but we found actual imports
      // This is interesting: dep-scope found usage that Knip missed
      // Keep as is, but this case is logged for debugging
    }

    // Few symbols with alternatives = recode native
    if (
      symbolsUsed.length <= this.options.threshold &&
      alternatives.length > 0 &&
      alternatives.length >= symbolsUsed.length * 0.5
    ) {
      return { verdict: "RECODE_NATIVE" };
    }

    // Well-used across many files = keep (regardless of symbol count)
    // This handles UI component libraries like @radix-ui/* that export 1-2 symbols by design
    const fileThreshold = this.options.fileCountThreshold ?? 3;
    if (fileCount !== undefined && fileCount >= fileThreshold) {
      return { verdict: "KEEP" };
    }

    // Few symbols but no alternatives = investigate with reason
    if (symbolsUsed.length <= 2 && alternatives.length === 0) {
      let investigateReason: InvestigateReason;
      if (fileCount === 1) {
        investigateReason = "SINGLE_FILE_USAGE";
      } else if (fileCount !== undefined && fileCount < fileThreshold) {
        investigateReason = "LOW_FILE_SPREAD";
      } else {
        investigateReason = "LOW_SYMBOL_COUNT";
      }
      return { verdict: "INVESTIGATE", investigateReason };
    }

    // Well-used = keep
    return { verdict: "KEEP" };
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

  /**
   * Calculate confidence score for verdict
   */
  private calculateConfidence(
    verdict: Verdict,
    symbolsUsed: SymbolUsage[],
    alternatives: NativeAlternative[],
    peerDepInfo?: PeerDependencyInfo,
    packageName?: string
  ): number {
    // Knip validation boosts confidence
    const knipConfirms =
      packageName &&
      this.knipAnalysis?.available &&
      (verdict === "REMOVE" || verdict === "PEER_DEP") &&
      (this.knipAnalysis.unusedDependencies.has(packageName) ||
        this.knipAnalysis.unusedDevDependencies.has(packageName));

    let confidence: number;

    switch (verdict) {
      case "REMOVE":
        confidence = 1.0; // Very confident if no imports
        break;

      case "PEER_DEP":
        // High confidence if we found packages that depend on it
        confidence = peerDepInfo && peerDepInfo.requiredBy.length > 0 ? 0.95 : 0.7;
        break;

      case "RECODE_NATIVE":
        // Higher confidence if all symbols have alternatives
        const coverage = alternatives.length / Math.max(symbolsUsed.length, 1);
        confidence = Math.min(0.5 + coverage * 0.5, 1.0);
        break;

      case "INVESTIGATE":
        confidence = 0.5; // Uncertain
        break;

      case "KEEP":
        confidence = 0.9; // Pretty confident
        break;

      default:
        confidence = 0.5;
    }

    // Boost confidence if Knip confirms our verdict
    if (knipConfirms) {
      confidence = Math.min(confidence + 0.05, 1.0);
    }

    return confidence;
  }
}

export const usageAnalyzer = new UsageAnalyzer();
