import { describe, it, expect, beforeEach } from "vitest";
import { ImportAggregator } from "../../src/utils/import-aggregator.js";
import { NullLogger } from "../../src/utils/logger.js";
import type { ImportInfo } from "../../src/types/index.js";

describe("ImportAggregator", () => {
  let aggregator: ImportAggregator;

  beforeEach(() => {
    aggregator = new ImportAggregator({
      logger: new NullLogger(),
    });
  });

  const createImport = (
    packageName: string,
    symbol: string,
    file: string = "/test.ts",
    importPath?: string
  ): ImportInfo => ({
    packageName,
    symbol,
    importPath: importPath ?? packageName,
    importType: "named",
    location: { file, line: 1, column: 0 },
  });

  describe("groupByPackage", () => {
    it("should group imports by package name", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "debounce"),
        createImport("lodash", "throttle"),
        createImport("react", "useState"),
      ];

      const grouped = aggregator.groupByPackage(imports);

      expect(grouped.size).toBe(2);
      expect(grouped.get("lodash")).toHaveLength(2);
      expect(grouped.get("react")).toHaveLength(1);
    });

    it("should return empty map for empty imports", () => {
      const grouped = aggregator.groupByPackage([]);

      expect(grouped.size).toBe(0);
    });

    it("should handle single package", () => {
      const imports: ImportInfo[] = [
        createImport("react", "useState"),
        createImport("react", "useEffect"),
        createImport("react", "useCallback"),
      ];

      const grouped = aggregator.groupByPackage(imports);

      expect(grouped.size).toBe(1);
      expect(grouped.get("react")).toHaveLength(3);
    });

    it("should preserve import order within package", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "first"),
        createImport("lodash", "second"),
        createImport("lodash", "third"),
      ];

      const grouped = aggregator.groupByPackage(imports);
      const lodashImports = grouped.get("lodash")!;

      expect(lodashImports[0].symbol).toBe("first");
      expect(lodashImports[1].symbol).toBe("second");
      expect(lodashImports[2].symbol).toBe("third");
    });
  });

  describe("aggregateSymbols", () => {
    it("should aggregate symbol usage with counts", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "debounce", "/a.ts"),
        createImport("lodash", "debounce", "/b.ts"),
        createImport("lodash", "throttle", "/c.ts"),
      ];

      const symbols = aggregator.aggregateSymbols(imports);

      expect(symbols).toHaveLength(2);
      const debounce = symbols.find((s) => s.symbol === "debounce");
      expect(debounce?.count).toBe(2);
      expect(debounce?.locations).toHaveLength(2);
    });

    it("should sort by count descending", () => {
      const imports: ImportInfo[] = [
        createImport("pkg", "rarely"),
        createImport("pkg", "often", "/a.ts"),
        createImport("pkg", "often", "/b.ts"),
        createImport("pkg", "often", "/c.ts"),
      ];

      const symbols = aggregator.aggregateSymbols(imports);

      expect(symbols[0].symbol).toBe("often");
      expect(symbols[0].count).toBe(3);
      expect(symbols[1].symbol).toBe("rarely");
      expect(symbols[1].count).toBe(1);
    });

    it("should return empty array for empty imports", () => {
      const symbols = aggregator.aggregateSymbols([]);

      expect(symbols).toHaveLength(0);
    });

    it("should preserve import type", () => {
      const imports: ImportInfo[] = [
        {
          packageName: "pkg",
          symbol: "default",
          importPath: "pkg",
          importType: "default",
          location: { file: "/test.ts", line: 1, column: 0 },
        },
      ];

      const symbols = aggregator.aggregateSymbols(imports);

      expect(symbols[0].importType).toBe("default");
    });
  });

  describe("getUniqueFiles", () => {
    it("should return unique file paths", () => {
      const imports: ImportInfo[] = [
        createImport("pkg", "a", "/file1.ts"),
        createImport("pkg", "b", "/file1.ts"),
        createImport("pkg", "c", "/file2.ts"),
      ];

      const files = aggregator.getUniqueFiles(imports);

      expect(files).toHaveLength(2);
      expect(files).toContain("/file1.ts");
      expect(files).toContain("/file2.ts");
    });

    it("should return empty array for empty imports", () => {
      const files = aggregator.getUniqueFiles([]);

      expect(files).toHaveLength(0);
    });
  });

  describe("determineImportStyle", () => {
    it("should detect barrel imports", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "debounce", "/test.ts", "lodash"),
      ];

      const style = aggregator.determineImportStyle(imports, "lodash");

      expect(style).toBe("barrel");
    });

    it("should detect direct imports", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "debounce", "/test.ts", "lodash/debounce"),
      ];

      const style = aggregator.determineImportStyle(imports, "lodash");

      expect(style).toBe("direct");
    });

    it("should detect mixed imports", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "debounce", "/a.ts", "lodash"),
        createImport("lodash", "throttle", "/b.ts", "lodash/throttle"),
      ];

      const style = aggregator.determineImportStyle(imports, "lodash");

      expect(style).toBe("mixed");
    });
  });

  describe("getImportStats", () => {
    it("should return comprehensive statistics", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "debounce", "/a.ts"),
        createImport("lodash", "debounce", "/b.ts"),
        createImport("lodash", "throttle", "/c.ts"),
      ];

      const stats = aggregator.getImportStats(imports, "lodash");

      expect(stats.totalImports).toBe(3);
      expect(stats.uniqueSymbols).toBe(2);
      expect(stats.fileCount).toBe(3);
      expect(stats.importStyle).toBe("barrel");
    });
  });

  describe("filterToInstalled", () => {
    it("should filter to only installed packages", () => {
      const imports: ImportInfo[] = [
        createImport("lodash", "debounce"),
        createImport("react", "useState"),
        createImport("unknown-pkg", "something"),
      ];

      const filtered = aggregator.filterToInstalled(imports, ["lodash", "react"]);

      expect(filtered.size).toBe(2);
      expect(filtered.has("lodash")).toBe(true);
      expect(filtered.has("react")).toBe(true);
      expect(filtered.has("unknown-pkg")).toBe(false);
    });

    it("should return empty map when no packages match", () => {
      const imports: ImportInfo[] = [createImport("unknown", "something")];

      const filtered = aggregator.filterToInstalled(imports, ["lodash"]);

      expect(filtered.size).toBe(0);
    });
  });

  describe("merge", () => {
    it("should merge multiple import arrays", () => {
      const arr1: ImportInfo[] = [createImport("a", "x")];
      const arr2: ImportInfo[] = [createImport("b", "y")];
      const arr3: ImportInfo[] = [createImport("c", "z")];

      const merged = aggregator.merge(arr1, arr2, arr3);

      expect(merged).toHaveLength(3);
      expect(merged[0].packageName).toBe("a");
      expect(merged[1].packageName).toBe("b");
      expect(merged[2].packageName).toBe("c");
    });

    it("should handle empty arrays", () => {
      const arr1: ImportInfo[] = [];
      const arr2: ImportInfo[] = [createImport("a", "x")];

      const merged = aggregator.merge(arr1, arr2);

      expect(merged).toHaveLength(1);
    });
  });

  describe("default instance", () => {
    it("should export a default instance", async () => {
      const { importAggregator } = await import(
        "../../src/utils/import-aggregator.js"
      );
      expect(importAggregator).toBeInstanceOf(ImportAggregator);
    });
  });
});
