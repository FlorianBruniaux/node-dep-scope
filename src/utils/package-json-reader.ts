/**
 * Package JSON Reader
 * Phase 2.1 - Extracted from UsageAnalyzer for better separation of concerns
 */

import * as path from "node:path";
import type {
  IPackageJsonReader,
  PackageJsonContent,
  IFileSystem,
  ILogger,
} from "../types/index.js";
import { NodeFileSystem } from "./filesystem.js";
import { ConsoleLogger } from "./logger.js";
import {
  PackageJsonNotFoundError,
  InvalidPackageJsonError,
} from "../errors/index.js";

/**
 * Package JSON Reader Dependencies
 */
export interface PackageJsonReaderDependencies {
  fileSystem?: IFileSystem;
  logger?: ILogger;
}

/**
 * Package JSON Reader Implementation
 * Handles reading and parsing package.json files with proper error handling
 */
export class PackageJsonReader implements IPackageJsonReader {
  private readonly fileSystem: IFileSystem;
  private readonly logger: ILogger;
  private readonly cache: Map<string, PackageJsonContent> = new Map();

  constructor(deps: PackageJsonReaderDependencies = {}) {
    this.fileSystem = deps.fileSystem ?? new NodeFileSystem();
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  /**
   * Read and parse package.json from a project directory
   * @throws PackageJsonNotFoundError if file doesn't exist
   * @throws InvalidPackageJsonError if file is not valid JSON
   */
  async read(projectPath: string): Promise<PackageJsonContent> {
    const cacheKey = path.resolve(projectPath);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      this.logger.debug(`Using cached package.json for ${projectPath}`);
      return this.cache.get(cacheKey)!;
    }

    const packageJsonPath = path.join(projectPath, "package.json");

    let content: string;
    try {
      content = await this.fileSystem.readFile(packageJsonPath, "utf-8");
    } catch (error) {
      this.logger.debug(`Failed to read package.json: ${error}`);
      throw new PackageJsonNotFoundError(projectPath);
    }

    let parsed: PackageJsonContent;
    try {
      parsed = JSON.parse(content) as PackageJsonContent;
    } catch (error) {
      this.logger.debug(`Failed to parse package.json: ${error}`);
      throw new InvalidPackageJsonError(
        projectPath,
        error instanceof Error ? error.message : "Invalid JSON"
      );
    }

    // Cache the result
    this.cache.set(cacheKey, parsed);
    this.logger.debug(`Parsed package.json for ${projectPath}`);

    return parsed;
  }

  /**
   * Read package.json from an absolute directory path, returning null on failure.
   * Used for node_modules traversal where missing packages are expected.
   */
  async readFrom(absoluteDir: string): Promise<PackageJsonContent | null> {
    const cacheKey = absoluteDir;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }
    const pkgPath = path.join(absoluteDir, "package.json");
    try {
      const content = await this.fileSystem.readFile(pkgPath, "utf-8");
      const parsed = JSON.parse(content) as PackageJsonContent;
      this.cache.set(cacheKey, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Get production dependencies from package.json
   */
  async getDependencies(projectPath: string): Promise<Record<string, string>> {
    const packageJson = await this.read(projectPath);
    return packageJson.dependencies ?? {};
  }

  /**
   * Get dev dependencies from package.json
   */
  async getDevDependencies(projectPath: string): Promise<Record<string, string>> {
    const packageJson = await this.read(projectPath);
    return packageJson.devDependencies ?? {};
  }

  /**
   * Get all dependencies (production + dev)
   */
  async getAllDependencies(
    projectPath: string,
    includeDev: boolean = false
  ): Promise<Record<string, string>> {
    const packageJson = await this.read(projectPath);
    return {
      ...packageJson.dependencies,
      ...(includeDev ? packageJson.devDependencies : {}),
    };
  }

  /**
   * Get peer dependencies from package.json
   */
  async getPeerDependencies(projectPath: string): Promise<Record<string, string>> {
    const packageJson = await this.read(projectPath);
    return packageJson.peerDependencies ?? {};
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
 * Default package JSON reader instance
 * @deprecated Use dependency injection with PackageJsonReader constructor instead
 */
export const packageJsonReader = new PackageJsonReader();
