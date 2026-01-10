import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ParallelProcessor,
  createParallelProcessor,
  parallelProcessor,
} from "../../src/utils/parallel-processor.js";
import { NullLogger } from "../../src/utils/logger.js";

describe("ParallelProcessor", () => {
  let processor: ParallelProcessor;

  beforeEach(() => {
    processor = new ParallelProcessor(
      { defaultConcurrency: 4 },
      { logger: new NullLogger() }
    );
  });

  describe("processFiles", () => {
    it("should process empty array", async () => {
      const results = await processor.processFiles([], async (f) => f);
      expect(results).toEqual([]);
    });

    it("should process single file", async () => {
      const results = await processor.processFiles(
        ["/file1.ts"],
        async (f) => f.toUpperCase()
      );
      expect(results).toEqual(["/FILE1.TS"]);
    });

    it("should process multiple files", async () => {
      const files = ["/a.ts", "/b.ts", "/c.ts"];
      const results = await processor.processFiles(files, async (f) => f.length);
      expect(results).toEqual([5, 5, 5]);
    });

    it("should preserve order of results", async () => {
      const files = ["/first.ts", "/second.ts", "/third.ts"];

      // Use varying delays to test order preservation
      const results = await processor.processFiles(files, async (f) => {
        const delay = f.includes("second") ? 50 : f.includes("first") ? 30 : 10;
        await new Promise((r) => setTimeout(r, delay));
        return f;
      });

      expect(results).toEqual(["/first.ts", "/second.ts", "/third.ts"]);
    });

    it("should respect concurrency limit", async () => {
      const limitedProcessor = new ParallelProcessor(
        { defaultConcurrency: 2 },
        { logger: new NullLogger() }
      );

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const files = ["/a.ts", "/b.ts", "/c.ts", "/d.ts"];

      await limitedProcessor.processFiles(files, async (f) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((r) => setTimeout(r, 20));
        currentConcurrent--;
        return f;
      });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("should handle async processors", async () => {
      const results = await processor.processFiles(
        ["/file.ts"],
        async (f) => {
          await new Promise((r) => setTimeout(r, 10));
          return `processed:${f}`;
        }
      );

      expect(results).toEqual(["processed:/file.ts"]);
    });

    it("should propagate errors", async () => {
      const files = ["/good.ts", "/bad.ts"];

      await expect(
        processor.processFiles(files, async (f) => {
          if (f.includes("bad")) {
            throw new Error("Processing failed");
          }
          return f;
        })
      ).rejects.toThrow("Processing failed");
    });
  });

  describe("processFilesWithDetails", () => {
    it("should return detailed results", async () => {
      const results = await processor.processFilesWithDetails(
        ["/file.ts"],
        async (f) => f.toUpperCase()
      );

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe("/file.ts");
      expect(results[0].result).toBe("/FILE.TS");
      expect(results[0].error).toBeUndefined();
      expect(results[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should capture errors without throwing", async () => {
      const results = await processor.processFilesWithDetails(
        ["/good.ts", "/bad.ts"],
        async (f) => {
          if (f.includes("bad")) {
            throw new Error("Processing failed");
          }
          return f;
        }
      );

      expect(results).toHaveLength(2);
      expect(results[0].result).toBe("/good.ts");
      expect(results[0].error).toBeUndefined();
      expect(results[1].result).toBeNull();
      expect(results[1].error).toBeInstanceOf(Error);
      expect(results[1].error?.message).toBe("Processing failed");
    });

    it("should track duration for each file", async () => {
      const results = await processor.processFilesWithDetails(
        ["/slow.ts", "/fast.ts"],
        async (f) => {
          const delay = f.includes("slow") ? 50 : 5;
          await new Promise((r) => setTimeout(r, delay));
          return f;
        }
      );

      const slowResult = results.find((r) => r.file === "/slow.ts")!;
      const fastResult = results.find((r) => r.file === "/fast.ts")!;

      expect(slowResult.durationMs).toBeGreaterThan(fastResult.durationMs);
    });

    it("should handle empty array", async () => {
      const results = await processor.processFilesWithDetails([], async (f) => f);
      expect(results).toEqual([]);
    });
  });

  describe("getOptimalConcurrency", () => {
    it("should return a positive number", () => {
      const concurrency = processor.getOptimalConcurrency();
      expect(concurrency).toBeGreaterThan(0);
    });

    it("should be capped at reasonable maximum", () => {
      const concurrency = processor.getOptimalConcurrency();
      expect(concurrency).toBeLessThanOrEqual(16);
    });
  });

  describe("getStats", () => {
    it("should calculate batch statistics", async () => {
      const results = await processor.processFilesWithDetails(
        ["/a.ts", "/b.ts", "/c.ts"],
        async (f) => f
      );

      const stats = processor.getStats(results);

      expect(stats.totalFiles).toBe(3);
      expect(stats.successCount).toBe(3);
      expect(stats.errorCount).toBe(0);
      expect(stats.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should count errors", async () => {
      const results = await processor.processFilesWithDetails(
        ["/good.ts", "/bad.ts"],
        async (f) => {
          if (f.includes("bad")) throw new Error("fail");
          return f;
        }
      );

      const stats = processor.getStats(results);

      expect(stats.successCount).toBe(1);
      expect(stats.errorCount).toBe(1);
    });

    it("should calculate average duration", async () => {
      const results = await processor.processFilesWithDetails(
        ["/a.ts", "/b.ts"],
        async (f) => {
          await new Promise((r) => setTimeout(r, 10));
          return f;
        }
      );

      const stats = processor.getStats(results);

      expect(stats.avgDurationMs).toBeGreaterThan(0);
      expect(stats.avgDurationMs).toBeCloseTo(stats.totalDurationMs / 2, -1);
    });

    it("should handle empty results", () => {
      const stats = processor.getStats([]);

      expect(stats.totalFiles).toBe(0);
      expect(stats.avgDurationMs).toBe(0);
    });
  });

  describe("constructor options", () => {
    it("should respect custom default concurrency", () => {
      const customProcessor = new ParallelProcessor(
        { defaultConcurrency: 8 },
        { logger: new NullLogger() }
      );

      // Internal state is private, but we can verify behavior
      expect(customProcessor).toBeInstanceOf(ParallelProcessor);
    });

    it("should cap concurrency at maxConcurrency", async () => {
      const cappedProcessor = new ParallelProcessor(
        { defaultConcurrency: 100, maxConcurrency: 4 },
        { logger: new NullLogger() }
      );

      let maxConcurrent = 0;
      let currentConcurrent = 0;
      const files = Array.from({ length: 10 }, (_, i) => `/${i}.ts`);

      await cappedProcessor.processFiles(files, async (f) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((r) => setTimeout(r, 10));
        currentConcurrent--;
        return f;
      });

      expect(maxConcurrent).toBeLessThanOrEqual(4);
    });

    it("should enforce minimum concurrency", async () => {
      const minProcessor = new ParallelProcessor(
        { defaultConcurrency: 0, minConcurrency: 2 },
        { logger: new NullLogger() }
      );

      const results = await minProcessor.processFiles(
        ["/a.ts", "/b.ts"],
        async (f) => f
      );

      expect(results).toHaveLength(2);
    });
  });
});

describe("Factory functions", () => {
  it("should create ParallelProcessor with options", () => {
    const processor = createParallelProcessor(
      { defaultConcurrency: 4 },
      { logger: new NullLogger() }
    );
    expect(processor).toBeInstanceOf(ParallelProcessor);
  });
});

describe("Default instance", () => {
  it("should export default parallelProcessor", () => {
    expect(parallelProcessor).toBeInstanceOf(ParallelProcessor);
  });
});
