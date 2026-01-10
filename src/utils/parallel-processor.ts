/**
 * Parallel Processor
 * Phase 3.2 - Parallel file processing for performance optimization
 */

import { cpus } from "node:os";
import type { IParallelProcessor, ILogger } from "../types/index.js";
import { ConsoleLogger } from "./logger.js";

/**
 * Parallel Processor Dependencies
 */
export interface ParallelProcessorDependencies {
  logger?: ILogger;
}

/**
 * Parallel Processor Options
 */
export interface ParallelProcessorOptions {
  /** Default concurrency level (defaults to CPU count) */
  defaultConcurrency?: number;
  /** Maximum concurrency cap */
  maxConcurrency?: number;
  /** Minimum concurrency floor */
  minConcurrency?: number;
}

/**
 * Processing result with metadata
 */
export interface ProcessingResult<T> {
  file: string;
  result: T | null;
  error?: Error;
  durationMs: number;
}

/**
 * Batch processing statistics
 */
export interface BatchStats {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  avgDurationMs: number;
  concurrency: number;
}

/**
 * Parallel file processor implementation
 * Uses p-limit-style concurrency control without external dependencies
 */
export class ParallelProcessor implements IParallelProcessor {
  private readonly logger: ILogger;
  private readonly defaultConcurrency: number;
  private readonly maxConcurrency: number;
  private readonly minConcurrency: number;

  constructor(
    options: ParallelProcessorOptions = {},
    deps: ParallelProcessorDependencies = {}
  ) {
    this.logger = deps.logger ?? new ConsoleLogger();
    this.minConcurrency = options.minConcurrency ?? 1;
    this.maxConcurrency = options.maxConcurrency ?? 32;
    this.defaultConcurrency = Math.min(
      Math.max(options.defaultConcurrency ?? this.getOptimalConcurrency(), this.minConcurrency),
      this.maxConcurrency
    );
  }

  /**
   * Process files in parallel with concurrency control
   * @param files - Array of file paths to process
   * @param processor - Async function to process each file
   * @param concurrency - Max concurrent operations (defaults to optimal)
   * @returns Array of results in same order as input files
   */
  async processFiles<T>(
    files: string[],
    processor: (file: string) => Promise<T>,
    concurrency?: number
  ): Promise<T[]> {
    const effectiveConcurrency = Math.min(
      Math.max(concurrency ?? this.defaultConcurrency, this.minConcurrency),
      this.maxConcurrency,
      files.length || 1
    );

    this.logger.debug(
      `Processing ${files.length} files with concurrency ${effectiveConcurrency}`
    );

    if (files.length === 0) {
      return [];
    }

    // For single file or concurrency of 1, process sequentially
    if (files.length === 1 || effectiveConcurrency === 1) {
      const results: T[] = [];
      for (const file of files) {
        results.push(await processor(file));
      }
      return results;
    }

    // Parallel processing with concurrency limit
    return this.processWithConcurrencyLimit(files, processor, effectiveConcurrency);
  }

  /**
   * Process files with detailed results including errors and timing
   */
  async processFilesWithDetails<T>(
    files: string[],
    processor: (file: string) => Promise<T>,
    concurrency?: number
  ): Promise<ProcessingResult<T>[]> {
    const effectiveConcurrency = Math.min(
      Math.max(concurrency ?? this.defaultConcurrency, this.minConcurrency),
      this.maxConcurrency,
      files.length || 1
    );

    this.logger.debug(
      `Processing ${files.length} files with details (concurrency: ${effectiveConcurrency})`
    );

    if (files.length === 0) {
      return [];
    }

    const wrappedProcessor = async (file: string): Promise<ProcessingResult<T>> => {
      const start = Date.now();
      try {
        const result = await processor(file);
        return {
          file,
          result,
          durationMs: Date.now() - start,
        };
      } catch (error) {
        return {
          file,
          result: null,
          error: error instanceof Error ? error : new Error(String(error)),
          durationMs: Date.now() - start,
        };
      }
    };

    return this.processWithConcurrencyLimit(files, wrappedProcessor, effectiveConcurrency);
  }

  /**
   * Get optimal concurrency based on system resources
   * Uses CPU count as a baseline, with adjustments for I/O-bound operations
   */
  getOptimalConcurrency(): number {
    const cpuCount = cpus().length;
    // For I/O-bound operations like file reading/parsing, use 2x CPU count
    // but cap at reasonable maximum
    const optimal = Math.min(cpuCount * 2, 16);
    return Math.max(optimal, this.minConcurrency);
  }

  /**
   * Get batch processing statistics
   */
  getStats<T>(results: ProcessingResult<T>[]): BatchStats {
    const successCount = results.filter((r) => r.result !== null && !r.error).length;
    const errorCount = results.filter((r) => r.error).length;
    const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

    return {
      totalFiles: results.length,
      successCount,
      errorCount,
      totalDurationMs,
      avgDurationMs: results.length > 0 ? totalDurationMs / results.length : 0,
      concurrency: this.defaultConcurrency,
    };
  }

  /**
   * Internal: Process with concurrency limit using Promise-based semaphore
   */
  private async processWithConcurrencyLimit<T>(
    files: string[],
    processor: (file: string) => Promise<T>,
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = new Array(files.length);
    let currentIndex = 0;
    let activeCount = 0;
    let resolveAll: () => void;

    const allDone = new Promise<void>((resolve) => {
      resolveAll = resolve;
    });

    const processNext = async (): Promise<void> => {
      while (currentIndex < files.length) {
        const index = currentIndex++;
        const file = files[index];

        activeCount++;
        try {
          results[index] = await processor(file);
        } catch (error) {
          // Re-throw to preserve error semantics
          throw error;
        } finally {
          activeCount--;
        }
      }
    };

    // Start initial batch of workers
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, files.length); i++) {
      workers.push(processNext());
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    return results;
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default parallel processor instance
 */
export const parallelProcessor = new ParallelProcessor();

/**
 * Create a new parallel processor with custom options
 */
export function createParallelProcessor(
  options?: ParallelProcessorOptions,
  deps?: ParallelProcessorDependencies
): ParallelProcessor {
  return new ParallelProcessor(options, deps);
}
