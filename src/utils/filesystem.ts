/**
 * FileSystem Abstraction
 * Phase 1.3 - Injectable file system to replace direct fs calls
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { IFileSystem, IFileStats } from "../types/interfaces.js";

/**
 * Node FileSystem - Default implementation using node:fs/promises
 */
export class NodeFileSystem implements IFileSystem {
  async readFile(filePath: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
    return fs.readFile(filePath, encoding);
  }

  async stat(filePath: string): Promise<IFileStats> {
    const stats = await fs.stat(filePath);
    return {
      isDirectory: () => stats.isDirectory(),
      isFile: () => stats.isFile(),
      mtime: stats.mtime,
      size: stats.size,
    };
  }

  async readdir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Mock FileSystem - In-memory implementation for testing
 */
export class MockFileSystem implements IFileSystem {
  private readonly files: Map<string, string> = new Map();
  private readonly directories: Set<string> = new Set();
  private readonly stats: Map<string, { mtime: Date; size: number }> = new Map();

  constructor() {
    // Root always exists
    this.directories.add("/");
  }

  async readFile(filePath: string, _encoding?: BufferEncoding): Promise<string> {
    const normalizedPath = this.normalizePath(filePath);
    const content = this.files.get(normalizedPath);
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`) as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }
    return content;
  }

  async stat(filePath: string): Promise<IFileStats> {
    const normalizedPath = this.normalizePath(filePath);
    const isDir = this.directories.has(normalizedPath);
    const isFile = this.files.has(normalizedPath);

    if (!isDir && !isFile) {
      const error = new Error(`ENOENT: no such file or directory, stat '${filePath}'`) as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }

    const fileStats = this.stats.get(normalizedPath) ?? { mtime: new Date(), size: 0 };

    return {
      isDirectory: () => isDir,
      isFile: () => isFile,
      mtime: fileStats.mtime,
      size: isFile ? (this.files.get(normalizedPath)?.length ?? 0) : 0,
    };
  }

  async readdir(dirPath: string): Promise<string[]> {
    const normalizedPath = this.normalizePath(dirPath);
    if (!this.directories.has(normalizedPath)) {
      const error = new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`) as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }

    const entries: string[] = [];
    const prefix = normalizedPath === "/" ? "/" : normalizedPath + "/";

    // Find all files in this directory
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.slice(prefix.length);
        const firstSegment = relativePath.split("/")[0];
        if (firstSegment && !entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }

    // Find all subdirectories
    for (const dirPathEntry of this.directories) {
      if (dirPathEntry.startsWith(prefix) && dirPathEntry !== normalizedPath) {
        const relativePath = dirPathEntry.slice(prefix.length);
        const firstSegment = relativePath.split("/")[0];
        if (firstSegment && !entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }

    return entries.sort();
  }

  async exists(filePath: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(filePath);
    return this.files.has(normalizedPath) || this.directories.has(normalizedPath);
  }

  // ============================================================================
  // Mock Setup Methods (for tests)
  // ============================================================================

  /**
   * Add a file to the mock filesystem
   */
  addFile(filePath: string, content: string, mtime?: Date): this {
    const normalizedPath = this.normalizePath(filePath);
    this.files.set(normalizedPath, content);
    this.stats.set(normalizedPath, {
      mtime: mtime ?? new Date(),
      size: content.length,
    });

    // Ensure parent directories exist
    this.ensureDirectoryExists(path.dirname(normalizedPath));

    return this;
  }

  /**
   * Add a directory to the mock filesystem
   */
  addDirectory(dirPath: string): this {
    this.ensureDirectoryExists(this.normalizePath(dirPath));
    return this;
  }

  /**
   * Remove a file from the mock filesystem
   */
  removeFile(filePath: string): this {
    const normalizedPath = this.normalizePath(filePath);
    this.files.delete(normalizedPath);
    this.stats.delete(normalizedPath);
    return this;
  }

  /**
   * Clear all files and directories
   */
  clear(): this {
    this.files.clear();
    this.directories.clear();
    this.stats.clear();
    this.directories.add("/");
    return this;
  }

  /**
   * Get all registered files (for debugging)
   */
  getFiles(): string[] {
    return Array.from(this.files.keys()).sort();
  }

  /**
   * Get all registered directories (for debugging)
   */
  getDirectories(): string[] {
    return Array.from(this.directories).sort();
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private normalizePath(filePath: string): string {
    // Normalize path separators and remove trailing slashes
    const normalized = path.normalize(filePath).replace(/\\/g, "/");
    return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
  }

  private ensureDirectoryExists(dirPath: string): void {
    const normalized = this.normalizePath(dirPath);
    if (normalized === "/" || normalized === ".") {
      return;
    }

    this.directories.add(normalized);

    // Recursively create parent directories
    const parent = path.dirname(normalized);
    if (parent !== normalized && parent !== "/") {
      this.ensureDirectoryExists(parent);
    }
  }
}

/**
 * Caching FileSystem Wrapper
 * Caches file reads for performance in repeated access patterns
 */
export class CachingFileSystem implements IFileSystem {
  private readonly cache: Map<string, string> = new Map();
  private readonly statsCache: Map<string, IFileStats> = new Map();

  constructor(private readonly inner: IFileSystem) {}

  async readFile(filePath: string, encoding?: BufferEncoding): Promise<string> {
    const cacheKey = `${filePath}:${encoding ?? "utf-8"}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const content = await this.inner.readFile(filePath, encoding);
    this.cache.set(cacheKey, content);
    return content;
  }

  async stat(filePath: string): Promise<IFileStats> {
    if (this.statsCache.has(filePath)) {
      return this.statsCache.get(filePath)!;
    }

    const stats = await this.inner.stat(filePath);
    this.statsCache.set(filePath, stats);
    return stats;
  }

  async readdir(dirPath: string): Promise<string[]> {
    // Don't cache directory listings as they can change
    return this.inner.readdir(dirPath);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.inner.exists(filePath);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.statsCache.clear();
  }

  /**
   * Invalidate cache for a specific file
   */
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
    this.cache.delete(`${filePath}:utf-8`);
    this.statsCache.delete(filePath);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a file system based on options
 */
export function createFileSystem(options: {
  caching?: boolean;
} = {}): IFileSystem {
  let fs: IFileSystem = new NodeFileSystem();

  if (options.caching) {
    fs = new CachingFileSystem(fs);
  }

  return fs;
}

// ============================================================================
// Default Instance (for backwards compatibility during migration)
// ============================================================================

/**
 * Default filesystem instance
 * @deprecated Use dependency injection instead
 */
export const defaultFileSystem = new NodeFileSystem();
