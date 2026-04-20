/**
 * Peer Dependency Analyzer
 * Checks if packages are required by other packages as peer/transitive dependencies
 */

import * as path from "node:path";
import type { PeerDependencyInfo, IFileSystem, ILogger } from "../types/index.js";
import { NodeFileSystem } from "../utils/filesystem.js";
import { ConsoleLogger } from "../utils/logger.js";

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  bin?: string | Record<string, string>;
}

/**
 * Peer Dependency Analyzer Dependencies
 */
export interface PeerDepAnalyzerDependencies {
  fileSystem?: IFileSystem;
  logger?: ILogger;
}

export class PeerDepAnalyzer {
  private readonly fileSystem: IFileSystem;
  private readonly logger: ILogger;
  private cache: Map<string, PackageJson | null> = new Map();

  constructor(deps: PeerDepAnalyzerDependencies = {}) {
    this.fileSystem = deps.fileSystem ?? new NodeFileSystem();
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  /**
   * Analyze peer dependencies for all packages in the project
   * Returns a map of packageName -> PeerDependencyInfo
   */
  async analyzePeerDeps(
    projectPath: string,
    installedPackages: string[]
  ): Promise<Map<string, PeerDependencyInfo>> {
    const result = new Map<string, PeerDependencyInfo>();
    const nodeModulesPath = path.join(projectPath, "node_modules");

    // Build reverse dependency graph: packageName -> packages that depend on it
    const reverseDeps = new Map<string, Set<string>>();

    // Initialize all packages
    for (const pkg of installedPackages) {
      reverseDeps.set(pkg, new Set());
    }

    // Read each installed package's package.json to find its dependencies
    for (const pkg of installedPackages) {
      const pkgJson = await this.readPackageJson(nodeModulesPath, pkg);
      if (!pkgJson) continue;

      // Check all dependency types
      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.peerDependencies,
        ...pkgJson.optionalDependencies,
      };

      for (const depName of Object.keys(allDeps)) {
        // If this dependency is in our installed packages, record the reverse relationship
        if (installedPackages.includes(depName)) {
          const existing = reverseDeps.get(depName) ?? new Set();
          existing.add(pkg);
          reverseDeps.set(depName, existing);
        }
      }
    }

    // Convert to PeerDependencyInfo
    for (const [pkg, requiredBySet] of reverseDeps.entries()) {
      const requiredBy = Array.from(requiredBySet);
      const pkgJson = await this.readPackageJson(nodeModulesPath, pkg); // already cached from above loop
      const isCliTool = pkgJson?.bin !== undefined;

      result.set(pkg, {
        requiredBy,
        onlyPeerDep: false, // Will be updated by usage analyzer
        safeToRemoveFromPackageJson: requiredBy.length > 0,
        isCliTool,
      });
    }

    return result;
  }

  /**
   * Check if a single package is required by other installed packages
   */
  async checkPackagePeerDeps(
    projectPath: string,
    packageName: string,
    installedPackages: string[]
  ): Promise<PeerDependencyInfo> {
    const nodeModulesPath = path.join(projectPath, "node_modules");
    const requiredBy: string[] = [];

    for (const pkg of installedPackages) {
      if (pkg === packageName) continue;

      const pkgJson = await this.readPackageJson(nodeModulesPath, pkg);
      if (!pkgJson) continue;

      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.peerDependencies,
        ...pkgJson.optionalDependencies,
      };

      if (packageName in allDeps) {
        requiredBy.push(pkg);
      }
    }

    const targetPkgJson = await this.readPackageJson(nodeModulesPath, packageName);
    return {
      requiredBy,
      onlyPeerDep: false, // Will be determined by caller based on import analysis
      safeToRemoveFromPackageJson: requiredBy.length > 0,
      isCliTool: targetPkgJson?.bin !== undefined,
    };
  }

  /**
   * Read package.json from node_modules, with caching
   */
  private async readPackageJson(
    nodeModulesPath: string,
    packageName: string
  ): Promise<PackageJson | null> {
    const cacheKey = `${nodeModulesPath}:${packageName}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Handle scoped packages
      const pkgPath = path.join(nodeModulesPath, packageName, "package.json");
      const content = await this.fileSystem.readFile(pkgPath, "utf-8");
      const parsed = JSON.parse(content) as PackageJson;
      this.cache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      // Package might not exist or package.json might be missing
      this.logger.debug(`Could not read package.json for ${packageName}: ${error}`);
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Clear the cache (useful for testing or re-analysis)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Default Instance (for backwards compatibility)
// ============================================================================

/**
 * Default peer dependency analyzer instance
 * @deprecated Use dependency injection with PeerDepAnalyzer constructor instead
 */
export const peerDepAnalyzer = new PeerDepAnalyzer();
