import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MemoryCache,
  FileAnalysisCache,
  LRUCache,
  createFileAnalysisCache,
  createLRUCache,
  fileAnalysisCache,
} from "../../src/utils/cache.js";
import { NullLogger } from "../../src/utils/logger.js";
import type { ImportInfo } from "../../src/types/index.js";

describe("MemoryCache", () => {
  let cache: MemoryCache<string, number>;

  beforeEach(() => {
    cache = new MemoryCache({ logger: new NullLogger() });
  });

  describe("basic operations", () => {
    it("should set and get values", () => {
      cache.set("key1", 42);
      expect(cache.get("key1")).toBe(42);
    });

    it("should return undefined for missing keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should check if key exists", () => {
      cache.set("exists", 1);
      expect(cache.has("exists")).toBe(true);
      expect(cache.has("missing")).toBe(false);
    });

    it("should delete values", () => {
      cache.set("toDelete", 100);
      expect(cache.has("toDelete")).toBe(true);
      cache.delete("toDelete");
      expect(cache.has("toDelete")).toBe(false);
    });

    it("should clear all values", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      expect(cache.size).toBe(3);
      cache.clear();
      expect(cache.size).toBe(0);
    });

    it("should track size", () => {
      expect(cache.size).toBe(0);
      cache.set("a", 1);
      expect(cache.size).toBe(1);
      cache.set("b", 2);
      expect(cache.size).toBe(2);
    });

    it("should overwrite existing values", () => {
      cache.set("key", 1);
      cache.set("key", 2);
      expect(cache.get("key")).toBe(2);
      expect(cache.size).toBe(1);
    });
  });
});

describe("FileAnalysisCache", () => {
  let cache: FileAnalysisCache;

  const createImport = (pkg: string, symbol: string): ImportInfo => ({
    packageName: pkg,
    symbol,
    importPath: pkg,
    importType: "named",
    location: { file: "/test.ts", line: 1, column: 0 },
  });

  beforeEach(() => {
    cache = new FileAnalysisCache({ logger: new NullLogger() });
  });

  describe("basic cache operations", () => {
    it("should set and get imports", () => {
      const imports = [createImport("lodash", "get")];
      cache.set("/path/to/file.ts", imports);
      expect(cache.get("/path/to/file.ts")).toEqual(imports);
    });

    it("should return undefined for missing files", () => {
      expect(cache.get("/nonexistent.ts")).toBeUndefined();
    });

    it("should check if file is cached", () => {
      cache.set("/cached.ts", []);
      expect(cache.has("/cached.ts")).toBe(true);
      expect(cache.has("/not-cached.ts")).toBe(false);
    });

    it("should delete cached entries", () => {
      cache.set("/to-delete.ts", []);
      cache.delete("/to-delete.ts");
      expect(cache.has("/to-delete.ts")).toBe(false);
    });

    it("should clear all entries", () => {
      cache.set("/a.ts", []);
      cache.set("/b.ts", []);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe("mtime-based invalidation", () => {
    it("should return cached value when file not modified", () => {
      const imports = [createImport("react", "useState")];
      const mtime = new Date("2024-01-01T10:00:00Z");

      cache.setWithMtime("/file.ts", imports, mtime);

      // Same mtime - should return cached value
      const result = cache.getIfValid("/file.ts", mtime);
      expect(result).toEqual(imports);
    });

    it("should return cached value when file mtime is older", () => {
      const imports = [createImport("react", "useState")];
      const cacheTime = new Date("2024-01-01T10:00:00Z");
      const olderTime = new Date("2024-01-01T09:00:00Z");

      cache.setWithMtime("/file.ts", imports, cacheTime);

      // Older mtime - should still return cached value
      const result = cache.getIfValid("/file.ts", olderTime);
      expect(result).toEqual(imports);
    });

    it("should invalidate when file is modified", () => {
      const imports = [createImport("react", "useState")];
      const cacheTime = new Date("2024-01-01T10:00:00Z");
      const newerTime = new Date("2024-01-01T11:00:00Z");

      cache.setWithMtime("/file.ts", imports, cacheTime);

      // Newer mtime - should invalidate
      const result = cache.getIfValid("/file.ts", newerTime);
      expect(result).toBeUndefined();
      expect(cache.has("/file.ts")).toBe(false);
    });

    it("should return undefined for uncached files", () => {
      const mtime = new Date();
      expect(cache.getIfValid("/not-cached.ts", mtime)).toBeUndefined();
    });
  });

  describe("statistics", () => {
    it("should track cache hits", () => {
      const imports = [createImport("pkg", "x")];
      const mtime = new Date("2024-01-01T10:00:00Z");

      cache.setWithMtime("/file.ts", imports, mtime);
      cache.getIfValid("/file.ts", mtime);
      cache.getIfValid("/file.ts", mtime);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it("should track cache misses", () => {
      const mtime = new Date();

      cache.getIfValid("/not-cached.ts", mtime);
      cache.getIfValid("/also-not-cached.ts", mtime);

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it("should calculate hit rate", () => {
      const imports = [createImport("pkg", "x")];
      const mtime = new Date("2024-01-01T10:00:00Z");

      cache.setWithMtime("/file.ts", imports, mtime);
      cache.getIfValid("/file.ts", mtime); // hit
      cache.getIfValid("/file.ts", mtime); // hit
      cache.getIfValid("/missing.ts", mtime); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.666, 2);
    });

    it("should return 0 hit rate when no accesses", () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it("should reset stats on clear", () => {
      const imports = [createImport("pkg", "x")];
      const mtime = new Date("2024-01-01T10:00:00Z");

      cache.setWithMtime("/file.ts", imports, mtime);
      cache.getIfValid("/file.ts", mtime);
      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("pruning", () => {
    it("should prune entries older than max age", () => {
      const oldTime = new Date(Date.now() - 60000); // 1 minute ago
      const newTime = new Date();

      cache.setWithMtime("/old.ts", [], oldTime);
      cache.setWithMtime("/new.ts", [], newTime);

      const pruned = cache.prune(30000); // 30 seconds

      expect(pruned).toBe(1);
      expect(cache.has("/old.ts")).toBe(false);
      expect(cache.has("/new.ts")).toBe(true);
    });

    it("should return 0 when nothing to prune", () => {
      const newTime = new Date();
      cache.setWithMtime("/file.ts", [], newTime);

      const pruned = cache.prune(60000);
      expect(pruned).toBe(0);
    });
  });
});

describe("LRUCache", () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache(3, { logger: new NullLogger() });
  });

  describe("basic operations", () => {
    it("should set and get values", () => {
      cache.set("a", 1);
      expect(cache.get("a")).toBe(1);
    });

    it("should respect max size", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      cache.set("d", 4); // Should evict "a"

      expect(cache.size).toBe(3);
      expect(cache.has("a")).toBe(false);
      expect(cache.has("b")).toBe(true);
      expect(cache.has("c")).toBe(true);
      expect(cache.has("d")).toBe(true);
    });

    it("should update access order on get", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      // Access "a" to make it most recently used
      cache.get("a");

      // Add new item - should evict "b" (least recently used)
      cache.set("d", 4);

      expect(cache.has("a")).toBe(true);
      expect(cache.has("b")).toBe(false);
      expect(cache.has("c")).toBe(true);
      expect(cache.has("d")).toBe(true);
    });

    it("should update existing keys without increasing size", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("a", 10); // Update existing

      expect(cache.size).toBe(2);
      expect(cache.get("a")).toBe(10);
    });

    it("should handle delete", () => {
      cache.set("a", 1);
      cache.delete("a");
      expect(cache.has("a")).toBe(false);
    });

    it("should handle clear", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
});

describe("Factory functions", () => {
  it("should create FileAnalysisCache", () => {
    const cache = createFileAnalysisCache({ logger: new NullLogger() });
    expect(cache).toBeInstanceOf(FileAnalysisCache);
  });

  it("should create LRUCache", () => {
    const cache = createLRUCache<string, number>(10, { logger: new NullLogger() });
    expect(cache).toBeInstanceOf(LRUCache);
  });
});

describe("Default instance", () => {
  it("should export default fileAnalysisCache", () => {
    expect(fileAnalysisCache).toBeInstanceOf(FileAnalysisCache);
  });
});
