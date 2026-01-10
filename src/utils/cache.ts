/**
 * Cache Utilities
 * Phase 3.1 - Performance optimization through caching
 */

import type { ICache, IFileAnalysisCache, ILogger, ImportInfo } from "../types/index.js";
import { ConsoleLogger } from "./logger.js";

/**
 * Cache Dependencies
 */
export interface CacheDependencies {
  logger?: ILogger;
}

/**
 * Generic in-memory cache implementation
 */
export class MemoryCache<K, V> implements ICache<K, V> {
  private readonly cache = new Map<K, V>();
  private readonly logger: ILogger;

  constructor(deps: CacheDependencies = {}) {
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.logger.debug("Cache cleared");
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Cache entry with metadata for file analysis
 */
interface FileAnalysisCacheEntry {
  imports: ImportInfo[];
  mtime: number; // Unix timestamp for efficient comparison
}

/**
 * File analysis cache with mtime-based invalidation
 * Caches parsed import information to avoid re-parsing unchanged files
 */
export class FileAnalysisCache implements IFileAnalysisCache {
  private readonly cache = new Map<string, FileAnalysisCacheEntry>();
  private readonly logger: ILogger;
  private hits = 0;
  private misses = 0;

  constructor(deps: CacheDependencies = {}) {
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  /**
   * Get cached imports (basic get without invalidation check)
   */
  get(key: string): ImportInfo[] | undefined {
    const entry = this.cache.get(key);
    return entry?.imports;
  }

  /**
   * Set cached imports (basic set without mtime)
   */
  set(key: string, value: ImportInfo[]): void {
    this.cache.set(key, {
      imports: value,
      mtime: Date.now(),
    });
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete cached entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.logger.debug(`Cache cleared (${previousSize} entries removed)`);
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cached imports if still valid (file not modified)
   * @param filePath - Absolute path to the source file
   * @param mtime - Current modification time of the file
   * @returns Cached imports if valid, undefined otherwise
   */
  getIfValid(filePath: string, mtime: Date): ImportInfo[] | undefined {
    const entry = this.cache.get(filePath);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Compare timestamps - if file was modified after cache entry, invalidate
    const fileTimestamp = mtime.getTime();
    if (fileTimestamp > entry.mtime) {
      this.misses++;
      this.cache.delete(filePath);
      this.logger.debug(`Cache invalidated for ${filePath} (file modified)`);
      return undefined;
    }

    this.hits++;
    this.logger.debug(`Cache hit for ${filePath}`);
    return entry.imports;
  }

  /**
   * Set cached imports with modification time
   * @param filePath - Absolute path to the source file
   * @param imports - Analyzed imports to cache
   * @param mtime - Modification time of the file when analyzed
   */
  setWithMtime(filePath: string, imports: ImportInfo[], mtime: Date): void {
    this.cache.set(filePath, {
      imports,
      mtime: mtime.getTime(),
    });
    this.logger.debug(`Cached ${imports.length} imports for ${filePath}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Prune entries older than specified age
   * @param maxAgeMs - Maximum age in milliseconds
   * @returns Number of entries pruned
   */
  prune(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.mtime < cutoff) {
        this.cache.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      this.logger.debug(`Pruned ${pruned} stale cache entries`);
    }

    return pruned;
  }
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * LRU Cache implementation with size limit
 */
export class LRUCache<K, V> implements ICache<K, V> {
  private readonly cache = new Map<K, V>();
  private readonly maxSize: number;
  private readonly logger: ILogger;

  constructor(maxSize: number, deps: CacheDependencies = {}) {
    this.maxSize = maxSize;
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, delete it first (will be re-added at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.logger.debug(`LRU evicted entry`);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// Default Instances
// ============================================================================

/**
 * Default file analysis cache instance
 */
export const fileAnalysisCache = new FileAnalysisCache();

/**
 * Create a new file analysis cache
 */
export function createFileAnalysisCache(deps?: CacheDependencies): FileAnalysisCache {
  return new FileAnalysisCache(deps);
}

/**
 * Create a new LRU cache
 */
export function createLRUCache<K, V>(maxSize: number, deps?: CacheDependencies): LRUCache<K, V> {
  return new LRUCache<K, V>(maxSize, deps);
}
