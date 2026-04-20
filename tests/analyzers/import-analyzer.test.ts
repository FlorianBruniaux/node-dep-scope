import { describe, it, expect, vi } from "vitest";
import { ImportAnalyzer } from "../../src/analyzers/import-analyzer.js";
import type { IFileSystem, IFileStats, IFileAnalysisCache, ICacheStats, ImportInfo } from "../../src/types/index.js";

describe("ImportAnalyzer", () => {
  const analyzer = new ImportAnalyzer();

  describe("extractPackageName", () => {
    it("should extract simple package name", () => {
      expect(analyzer.extractPackageName("lodash")).toBe("lodash");
    });

    it("should extract package name from subpath import", () => {
      expect(analyzer.extractPackageName("lodash/get")).toBe("lodash");
      expect(analyzer.extractPackageName("lodash/fp/get")).toBe("lodash");
    });

    it("should extract scoped package name", () => {
      expect(analyzer.extractPackageName("@tanstack/react-query")).toBe(
        "@tanstack/react-query"
      );
    });

    it("should extract scoped package name from subpath import", () => {
      expect(analyzer.extractPackageName("@tanstack/react-query/devtools")).toBe(
        "@tanstack/react-query"
      );
      expect(analyzer.extractPackageName("@radix-ui/react-dialog/dist/index")).toBe(
        "@radix-ui/react-dialog"
      );
    });

    it("should handle scoped package with only scope (edge case)", () => {
      expect(analyzer.extractPackageName("@types")).toBe("@types");
    });

    it("should handle deeply nested subpaths", () => {
      expect(analyzer.extractPackageName("package/a/b/c/d")).toBe("package");
      expect(analyzer.extractPackageName("@scope/pkg/a/b/c")).toBe("@scope/pkg");
    });
  });

  describe("determineImportStyle", () => {
    it("should identify barrel imports", () => {
      expect(analyzer.determineImportStyle("lodash", "lodash")).toBe("barrel");
      expect(analyzer.determineImportStyle("@tanstack/react-query", "@tanstack/react-query")).toBe("barrel");
    });

    it("should identify direct imports", () => {
      expect(analyzer.determineImportStyle("lodash/get", "lodash")).toBe("direct");
      expect(analyzer.determineImportStyle("@tanstack/react-query/devtools", "@tanstack/react-query")).toBe("direct");
    });
  });

  describe("analyzeContent", () => {
    const testFile = "/test/file.ts";

    describe("named imports", () => {
      it("should extract single named import", () => {
        const code = `import { useState } from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "react",
          symbol: "useState",
          importType: "named",
        });
      });

      it("should extract multiple named imports", () => {
        const code = `import { useState, useEffect, useCallback } from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(3);
        expect(imports.map((i) => i.symbol)).toEqual([
          "useState",
          "useEffect",
          "useCallback",
        ]);
        expect(imports.every((i) => i.importType === "named")).toBe(true);
      });

      it("should handle aliased imports (use original name)", () => {
        const code = `import { useState as useMyState } from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0].symbol).toBe("useState");
      });

      it("should extract named imports from subpath", () => {
        const code = `import { get } from "lodash/get";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "lodash",
          symbol: "get",
          importPath: "lodash/get",
        });
      });
    });

    describe("default imports", () => {
      it("should extract default import", () => {
        const code = `import React from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "react",
          symbol: "default",
          importType: "default",
        });
      });

      it("should handle default import with named imports", () => {
        const code = `import React, { useState, useEffect } from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(3);
        expect(imports.find((i) => i.importType === "default")?.symbol).toBe("default");
        expect(imports.filter((i) => i.importType === "named")).toHaveLength(2);
      });
    });

    describe("namespace imports", () => {
      it("should extract namespace import", () => {
        const code = `import * as React from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "react",
          symbol: "*",
          importType: "namespace",
        });
      });
    });

    describe("side-effect imports", () => {
      it("should extract side-effect import", () => {
        const code = `import "normalize.css";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "normalize.css",
          symbol: "*",
          importType: "side-effect",
        });
      });

      it("should handle side-effect import with subpath", () => {
        const code = `import "@fontsource/inter/400.css";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "@fontsource/inter",
          importPath: "@fontsource/inter/400.css",
          importType: "side-effect",
        });
      });
    });

    describe("relative imports (should be ignored)", () => {
      it("should ignore relative imports", () => {
        const code = `
          import { foo } from "./utils";
          import { bar } from "../lib/bar";
          import { baz } from "/absolute/path";
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(0);
      });
    });

    describe("scoped packages", () => {
      it("should extract imports from scoped packages", () => {
        const code = `import { useQuery } from "@tanstack/react-query";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "@tanstack/react-query",
          symbol: "useQuery",
        });
      });

      it("should extract imports from scoped package subpaths", () => {
        const code = `import { DevTools } from "@tanstack/react-query/devtools";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "@tanstack/react-query",
          importPath: "@tanstack/react-query/devtools",
          symbol: "DevTools",
        });
      });
    });

    describe("type imports", () => {
      it("should extract type imports", () => {
        const code = `import type { FC } from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "react",
          symbol: "FC",
          importType: "named",
        });
      });

      it("should handle inline type imports", () => {
        const code = `import { type FC, useState } from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(2);
        expect(imports.map((i) => i.symbol).sort()).toEqual(["FC", "useState"]);
      });
    });

    describe("multiple import statements", () => {
      it("should extract imports from multiple statements", () => {
        const code = `
          import React from "react";
          import { useState } from "react";
          import { useQuery } from "@tanstack/react-query";
          import lodash from "lodash";
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(4);
        expect(imports.filter((i) => i.packageName === "react")).toHaveLength(2);
        expect(imports.filter((i) => i.packageName === "@tanstack/react-query")).toHaveLength(1);
        expect(imports.filter((i) => i.packageName === "lodash")).toHaveLength(1);
      });
    });

    describe("edge cases", () => {
      it("should handle empty file", () => {
        const imports = analyzer.analyzeContent("", testFile);
        expect(imports).toHaveLength(0);
      });

      it("should handle file with no imports", () => {
        const code = `
          const x = 1;
          export const y = 2;
        `;
        const imports = analyzer.analyzeContent(code, testFile);
        expect(imports).toHaveLength(0);
      });

      it("should handle JSX syntax in .tsx files", () => {
        const code = `
          import React from "react";
          const Component = () => <div>Hello</div>;
        `;
        const imports = analyzer.analyzeContent(code, "/test/file.tsx");
        expect(imports).toHaveLength(1);
      });

      it("should handle JSX syntax in .jsx files", () => {
        const code = `
          import React from "react";
          const Component = () => <span>hi</span>;
        `;
        const imports = analyzer.analyzeContent(code, "/test/file.jsx");
        expect(imports).toHaveLength(1);
      });

      it("should parse .ts file with async generic arrow function", () => {
        // Regression: jsx: true was forced for all files, causing
        // `async <T>(x) => ...` to be parsed as JSX opening tag and fail with
        // "Unexpected token. Did you mean `{'>'}` or `&gt;`?"
        const code = `
          import { useState } from "react";
          export const fetcher = async <T>(url: string): Promise<T> => {
            const res = await fetch(url);
            return res.json() as T;
          };
        `;
        const imports = analyzer.analyzeContent(code, "/test/use-fetch.ts");
        expect(imports).toHaveLength(1);
        expect(imports[0].packageName).toBe("react");
      });

      it("should parse .ts file with non-async generic arrow function", () => {
        const code = `
          import { gzipSync } from "zlib";
          export const decompress = <T>(value: string): T[] => {
            return JSON.parse(value) as T[];
          };
        `;
        const imports = analyzer.analyzeContent(code, "/test/compression.ts");
        expect(imports).toHaveLength(1);
        expect(imports[0].packageName).toBe("zlib");
      });

      it("should return empty array for invalid syntax", () => {
        const code = `import { broken from "react"`;
        const imports = analyzer.analyzeContent(code, testFile);
        expect(imports).toHaveLength(0);
      });
    });

    describe("location tracking", () => {
      it("should track line and column for imports", () => {
        const code = `import { useState } from "react";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports[0].location).toMatchObject({
          file: testFile,
          line: 1,
          column: expect.any(Number),
        });
      });

      it("should track correct line for multi-line imports", () => {
        const code = `
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports[0].location.line).toBe(2);
        expect(imports[1].location.line).toBe(3);
      });
    });

    describe("dynamic imports", () => {
      it("should detect dynamic import with string literal", () => {
        const code = `const module = await import("lodash");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "lodash",
          importPath: "lodash",
          symbol: "*",
          importType: "namespace",
        });
      });

      it("should detect dynamic import with subpath", () => {
        const code = `const get = await import("lodash/get");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "lodash",
          importPath: "lodash/get",
        });
      });

      it("should detect dynamic import of scoped package", () => {
        const code = `const query = await import("@tanstack/react-query");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "@tanstack/react-query",
          importPath: "@tanstack/react-query",
        });
      });

      it("should ignore dynamic import with variable", () => {
        const code = `
          const moduleName = "lodash";
          const module = await import(moduleName);
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(0);
      });

      it("should ignore dynamic import of relative path", () => {
        const code = `const module = await import("./utils");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(0);
      });

      it("should detect dynamic import inside function", () => {
        const code = `
          async function loadModule() {
            const mod = await import("axios");
            return mod;
          }
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0].packageName).toBe("axios");
      });
    });

    describe("require calls", () => {
      it("should detect require with string literal", () => {
        const code = `const lodash = require("lodash");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "lodash",
          importPath: "lodash",
          symbol: "*",
          importType: "namespace",
        });
      });

      it("should detect require with subpath", () => {
        const code = `const get = require("lodash/get");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "lodash",
          importPath: "lodash/get",
        });
      });

      it("should detect require of scoped package", () => {
        const code = `const chalk = require("@scope/package");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0].packageName).toBe("@scope/package");
      });

      it("should ignore require with variable", () => {
        const code = `
          const moduleName = "lodash";
          const module = require(moduleName);
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(0);
      });

      it("should ignore require of relative path", () => {
        const code = `const utils = require("./utils");`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(0);
      });

      it("should detect require inside conditional", () => {
        const code = `
          if (condition) {
            const fs = require("fs");
          }
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0].packageName).toBe("fs");
      });

      it("should not treat non-require calls as imports", () => {
        const code = `
          const result = someFunction("lodash");
          const other = myRequire("axios");
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(0);
      });
    });

    describe("barrel file re-exports", () => {
      it("should detect named re-exports from npm packages", () => {
        const code = `export { formatDate, parseDate } from "date-fns";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(2);
        expect(imports[0]).toMatchObject({
          packageName: "date-fns",
          symbol: "formatDate",
          importType: "named",
        });
        expect(imports[1]).toMatchObject({
          packageName: "date-fns",
          symbol: "parseDate",
          importType: "named",
        });
      });

      it("should detect wildcard re-export from npm package", () => {
        const code = `export * from "date-fns";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "date-fns",
          symbol: "*",
          importType: "namespace",
        });
      });

      it("should detect re-export with alias", () => {
        const code = `export * as dateFns from "date-fns";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "date-fns",
          symbol: "*",
          importType: "namespace",
        });
      });

      it("should detect default re-export from npm package", () => {
        const code = `export { default } from "lodash";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
          packageName: "lodash",
          symbol: "default",
          importType: "default",
        });
      });

      it("should detect re-export from scoped package", () => {
        const code = `export { useQuery, useMutation } from "@tanstack/react-query";`;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(2);
        expect(imports[0].packageName).toBe("@tanstack/react-query");
        expect(imports[0].symbol).toBe("useQuery");
      });

      it("should ignore re-exports from relative paths", () => {
        const code = `
          export { formatDate } from "./utils";
          export * from "./helpers";
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(0);
      });

      it("should detect mix of imports and barrel re-exports", () => {
        const code = `
          import { add } from "date-fns";
          export { formatDate, parseDate } from "date-fns";
          export * from "lodash";
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(4);
        const dateFnsImports = imports.filter((i) => i.packageName === "date-fns");
        expect(dateFnsImports).toHaveLength(3);
        const lodashImports = imports.filter((i) => i.packageName === "lodash");
        expect(lodashImports).toHaveLength(1);
      });
    });

    describe("mixed import styles", () => {
      it("should detect all import types in same file", () => {
        const code = `
          import React from "react";
          import { useState } from "react";
          const lodash = require("lodash");
          async function load() {
            const axios = await import("axios");
          }
        `;
        const imports = analyzer.analyzeContent(code, testFile);

        expect(imports).toHaveLength(4);
        expect(imports.filter((i) => i.packageName === "react")).toHaveLength(2);
        expect(imports.find((i) => i.packageName === "lodash")).toBeDefined();
        expect(imports.find((i) => i.packageName === "axios")).toBeDefined();
      });
    });
  });

  describe("caching", () => {
    const createMockFileSystem = (
      content: string,
      mtime: Date = new Date()
    ): IFileSystem => ({
      readFile: vi.fn().mockResolvedValue(content),
      stat: vi.fn().mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime,
        size: content.length,
      } as IFileStats),
      readdir: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(true),
    });

    const createMockCache = (): IFileAnalysisCache & {
      getIfValid: ReturnType<typeof vi.fn>;
      setWithMtime: ReturnType<typeof vi.fn>;
    } => ({
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      size: 0,
      getIfValid: vi.fn().mockReturnValue(undefined),
      setWithMtime: vi.fn(),
      getStats: vi.fn().mockReturnValue({ hits: 0, misses: 0, size: 0, hitRate: 0 }),
    });

    it("should use cache when enabled", async () => {
      const mockCache = createMockCache();
      const cachedImports: ImportInfo[] = [
        {
          packageName: "react",
          symbol: "useState",
          importPath: "react",
          importType: "named",
          location: { file: "/test.ts", line: 1, column: 0 },
        },
      ];
      mockCache.getIfValid.mockReturnValue(cachedImports);

      const mockFs = createMockFileSystem(`import { useState } from "react";`);

      const analyzer = new ImportAnalyzer(
        { enableCache: true },
        { fileSystem: mockFs, cache: mockCache }
      );

      const result = await analyzer.analyzeFile("/test.ts");

      expect(mockCache.getIfValid).toHaveBeenCalled();
      expect(mockFs.readFile).not.toHaveBeenCalled(); // Should use cache, not read file
      expect(result).toEqual(cachedImports);
    });

    it("should store in cache on cache miss", async () => {
      const mockCache = createMockCache();
      mockCache.getIfValid.mockReturnValue(undefined); // Cache miss

      const content = `import { useState } from "react";`;
      const mtime = new Date("2024-01-01");
      const mockFs = createMockFileSystem(content, mtime);

      const analyzer = new ImportAnalyzer(
        { enableCache: true },
        { fileSystem: mockFs, cache: mockCache }
      );

      await analyzer.analyzeFile("/test.ts");

      expect(mockFs.readFile).toHaveBeenCalledWith("/test.ts", "utf-8");
      expect(mockCache.setWithMtime).toHaveBeenCalled();
      const [filePath, imports, storedMtime] = mockCache.setWithMtime.mock.calls[0];
      expect(filePath).toBe("/test.ts");
      expect(imports).toHaveLength(1);
      expect(imports[0].packageName).toBe("react");
      expect(storedMtime).toEqual(mtime);
    });

    it("should bypass cache when disabled", async () => {
      const mockCache = createMockCache();
      const content = `import { useState } from "react";`;
      const mockFs = createMockFileSystem(content);

      const analyzer = new ImportAnalyzer(
        { enableCache: false },
        { fileSystem: mockFs, cache: mockCache }
      );

      await analyzer.analyzeFile("/test.ts");

      expect(mockCache.getIfValid).not.toHaveBeenCalled();
      expect(mockCache.setWithMtime).not.toHaveBeenCalled();
      expect(mockFs.readFile).toHaveBeenCalled();
    });

    it("should expose cache stats", () => {
      const mockCache = createMockCache();
      mockCache.getStats.mockReturnValue({ hits: 5, misses: 2, size: 3, hitRate: 0.714 });

      const analyzer = new ImportAnalyzer({}, { cache: mockCache });
      const stats = analyzer.getCacheStats();

      expect(stats.hits).toBe(5);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.714, 2);
    });

    it("should allow clearing cache", () => {
      const mockCache = createMockCache();
      const analyzer = new ImportAnalyzer({}, { cache: mockCache });

      analyzer.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });
});
