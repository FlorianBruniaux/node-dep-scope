/**
 * Source File Scanner
 * Phase 2.2 - Extracted from UsageAnalyzer for better separation of concerns
 */

import fg from "fast-glob";
import * as path from "node:path";
import type {
  ISourceFileScanner,
  IFileSystem,
  ILogger,
} from "../types/index.js";
import { NodeFileSystem } from "./filesystem.js";
import { ConsoleLogger } from "./logger.js";
import { SourcePathNotFoundError } from "../errors/index.js";

/**
 * Source File Scanner Dependencies
 */
export interface SourceFileScannerDependencies {
  fileSystem?: IFileSystem;
  logger?: ILogger;
}

/**
 * Options for source file scanning
 */
export interface ScanOptions {
  /** Whether to auto-detect workspace and filter non-existent paths */
  autoDetectWorkspace?: boolean;
  /** File extensions to scan (default: ts,tsx,js,jsx,mjs,cjs) */
  extensions?: string[];
}

/**
 * Source File Scanner Implementation
 * Discovers and validates source files in a project
 */
export class SourceFileScanner implements ISourceFileScanner {
  private readonly fileSystem: IFileSystem;
  private readonly logger: ILogger;

  private static readonly DEFAULT_EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

  constructor(deps: SourceFileScannerDependencies = {}) {
    this.fileSystem = deps.fileSystem ?? new NodeFileSystem();
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  /**
   * Scan for source files in the given paths
   * @param projectPath - Path to project root
   * @param srcPaths - Source directories to scan (relative to projectPath)
   * @param ignorePatterns - Patterns to ignore
   * @returns Array of absolute file paths
   */
  async scan(
    projectPath: string,
    srcPaths: string[],
    ignorePatterns: string[]
  ): Promise<string[]> {
    const extensions = SourceFileScanner.DEFAULT_EXTENSIONS.join(",");
    const patterns = srcPaths.map((srcPath) =>
      path.join(projectPath, srcPath, `**/*.{${extensions}}`)
    );

    // Build ignore patterns for fast-glob
    // Always ignore node_modules at any depth to handle monorepo sub-packages
    const fgIgnorePatterns = [
      "**/node_modules/**",
      ...ignorePatterns
        .filter((p) => p !== "node_modules") // Already handled above
        .map((p) => `**/${p}/**`),
    ];

    this.logger.debug(`Scanning patterns: ${patterns.join(", ")}`);
    this.logger.debug(`Ignore patterns: ${fgIgnorePatterns.join(", ")}`);

    const files = await fg(patterns, {
      ignore: fgIgnorePatterns,
      absolute: true,
      onlyFiles: true,
    });

    this.logger.debug(`Found ${files.length} source files`);

    return files;
  }

  /**
   * Validate that source paths exist
   * @param projectPath - Path to project root
   * @param srcPaths - Source paths to validate
   * @param options - Validation options
   * @returns Array of valid paths
   * @throws SourcePathNotFoundError if no valid paths and not in autoDetect mode
   */
  async validatePaths(
    projectPath: string,
    srcPaths: string[],
    options: ScanOptions = {}
  ): Promise<string[]> {
    const { autoDetectWorkspace = false } = options;
    const validPaths: string[] = [];

    for (const srcPath of srcPaths) {
      const fullPath = path.join(projectPath, srcPath);
      try {
        const stat = await this.fileSystem.stat(fullPath);
        if (stat.isDirectory()) {
          validPaths.push(srcPath);
          this.logger.debug(`Valid source path: ${srcPath}`);
        } else {
          this.logger.debug(`Not a directory: ${srcPath}`);
        }
      } catch {
        // In monorepo mode, skip non-existent paths silently
        // (some packages may not have src/ or lib/)
        if (!autoDetectWorkspace) {
          throw new SourcePathNotFoundError(srcPath, projectPath);
        }
        this.logger.debug(`Skipping non-existent path: ${srcPath}`);
      }
    }

    // Must have at least one valid path
    if (validPaths.length === 0) {
      throw new SourcePathNotFoundError(
        srcPaths.join(", "),
        projectPath
      );
    }

    return validPaths;
  }

  /**
   * Scan with validation in a single operation
   * @param projectPath - Path to project root
   * @param srcPaths - Source directories to scan
   * @param ignorePatterns - Patterns to ignore
   * @param options - Scan options
   * @returns Object containing valid paths and found files
   */
  async scanWithValidation(
    projectPath: string,
    srcPaths: string[],
    ignorePatterns: string[],
    options: ScanOptions = {}
  ): Promise<{ validPaths: string[]; files: string[] }> {
    const validPaths = await this.validatePaths(projectPath, srcPaths, options);
    const files = await this.scan(projectPath, validPaths, ignorePatterns);
    return { validPaths, files };
  }

  /**
   * Check if a path exists and is a directory
   * @param projectPath - Path to project root
   * @param srcPath - Source path to check
   * @returns true if path exists and is a directory
   */
  async isValidSourcePath(projectPath: string, srcPath: string): Promise<boolean> {
    const fullPath = path.join(projectPath, srcPath);
    try {
      const stat = await this.fileSystem.stat(fullPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get file count without loading all file paths
   * Useful for quick project size estimation
   * @param projectPath - Path to project root
   * @param srcPaths - Source directories to scan
   * @param ignorePatterns - Patterns to ignore
   * @returns Number of source files found
   */
  async countFiles(
    projectPath: string,
    srcPaths: string[],
    ignorePatterns: string[]
  ): Promise<number> {
    const files = await this.scan(projectPath, srcPaths, ignorePatterns);
    return files.length;
  }
}

// ============================================================================
// Default Instance (for backwards compatibility)
// ============================================================================

/**
 * Default source file scanner instance
 * @deprecated Use dependency injection with SourceFileScanner constructor instead
 */
export const sourceFileScanner = new SourceFileScanner();
