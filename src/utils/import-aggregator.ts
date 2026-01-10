/**
 * Import Aggregator
 * Phase 2.4 - Extracted from UsageAnalyzer for better separation of concerns
 */

import type {
  IImportAggregator,
  ILogger,
  ImportInfo,
  SymbolUsage,
} from "../types/index.js";
import { ConsoleLogger } from "./logger.js";

/**
 * Import Aggregator Dependencies
 */
export interface ImportAggregatorDependencies {
  logger?: ILogger;
}

/**
 * Import Aggregator Implementation
 * Groups and aggregates import information for analysis
 */
export class ImportAggregator implements IImportAggregator {
  private readonly logger: ILogger;

  constructor(deps: ImportAggregatorDependencies = {}) {
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  /**
   * Group imports by package name
   * @param imports - All imports from all analyzed files
   * @returns Map of package name to its imports
   */
  groupByPackage(imports: ImportInfo[]): Map<string, ImportInfo[]> {
    const grouped = new Map<string, ImportInfo[]>();

    for (const imp of imports) {
      const existing = grouped.get(imp.packageName) ?? [];
      existing.push(imp);
      grouped.set(imp.packageName, existing);
    }

    this.logger.debug(`Grouped ${imports.length} imports into ${grouped.size} packages`);

    return grouped;
  }

  /**
   * Aggregate symbol usage from imports for a single package
   * @param imports - Imports for a single package
   * @returns Array of symbol usage information sorted by count
   */
  aggregateSymbols(imports: ImportInfo[]): SymbolUsage[] {
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

    // Sort by count descending
    return Array.from(symbolMap.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Get unique files from imports
   * @param imports - Imports for a package
   * @returns Array of unique file paths
   */
  getUniqueFiles(imports: ImportInfo[]): string[] {
    return [...new Set(imports.map((i) => i.location.file))];
  }

  /**
   * Calculate import style (barrel, direct, or mixed)
   * @param imports - Imports for a package
   * @param packageName - The package name
   * @returns Import style
   */
  determineImportStyle(
    imports: ImportInfo[],
    packageName: string
  ): "barrel" | "direct" | "mixed" {
    const hasBarrel = imports.some((i) => this.isBarrelImport(i.importPath, packageName));
    const hasDirect = imports.some((i) => !this.isBarrelImport(i.importPath, packageName));

    if (hasBarrel && hasDirect) return "mixed";
    if (hasBarrel) return "barrel";
    return "direct";
  }

  /**
   * Check if an import path is a barrel import
   * @param importPath - The import path
   * @param packageName - The package name
   * @returns true if it's a barrel import
   */
  private isBarrelImport(importPath: string, packageName: string): boolean {
    return importPath === packageName;
  }

  /**
   * Get import statistics for a package
   * @param imports - Imports for a package
   * @param packageName - The package name
   * @returns Statistics object
   */
  getImportStats(
    imports: ImportInfo[],
    packageName: string
  ): {
    totalImports: number;
    uniqueSymbols: number;
    fileCount: number;
    importStyle: "barrel" | "direct" | "mixed";
  } {
    const symbols = this.aggregateSymbols(imports);
    const files = this.getUniqueFiles(imports);
    const style = this.determineImportStyle(imports, packageName);

    return {
      totalImports: imports.length,
      uniqueSymbols: symbols.length,
      fileCount: files.length,
      importStyle: style,
    };
  }

  /**
   * Filter imports to only those from installed packages
   * @param imports - All imports
   * @param installedPackages - List of installed package names
   * @returns Filtered map of package imports
   */
  filterToInstalled(
    imports: ImportInfo[],
    installedPackages: string[]
  ): Map<string, ImportInfo[]> {
    const grouped = this.groupByPackage(imports);
    const installedSet = new Set(installedPackages);

    const filtered = new Map<string, ImportInfo[]>();
    for (const [pkg, pkgImports] of grouped) {
      if (installedSet.has(pkg)) {
        filtered.set(pkg, pkgImports);
      }
    }

    this.logger.debug(
      `Filtered ${grouped.size} packages to ${filtered.size} installed packages`
    );

    return filtered;
  }

  /**
   * Merge multiple import arrays
   * @param importArrays - Arrays of imports to merge
   * @returns Combined import array
   */
  merge(...importArrays: ImportInfo[][]): ImportInfo[] {
    return importArrays.flat();
  }
}

// ============================================================================
// Default Instance (for backwards compatibility)
// ============================================================================

/**
 * Default import aggregator instance
 * @deprecated Use dependency injection with ImportAggregator constructor instead
 */
export const importAggregator = new ImportAggregator();
