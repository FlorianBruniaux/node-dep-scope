/**
 * Peer Dependency Analyzer
 * Checks if packages are required by other packages as peer/transitive dependencies
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PeerDependencyInfo } from "../types/index.js";

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export class PeerDepAnalyzer {
  private cache: Map<string, PackageJson | null> = new Map();

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

      result.set(pkg, {
        requiredBy,
        onlyPeerDep: false, // Will be updated by usage analyzer
        safeToRemoveFromPackageJson: requiredBy.length > 0,
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

    return {
      requiredBy,
      onlyPeerDep: false, // Will be determined by caller based on import analysis
      safeToRemoveFromPackageJson: requiredBy.length > 0,
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
      const content = await fs.readFile(pkgPath, "utf-8");
      const parsed = JSON.parse(content) as PackageJson;
      this.cache.set(cacheKey, parsed);
      return parsed;
    } catch {
      // Package might not exist or package.json might be missing
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

export const peerDepAnalyzer = new PeerDepAnalyzer();
