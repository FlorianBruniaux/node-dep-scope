import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UsageAnalyzer } from "../../src/analyzers/usage-analyzer.js";
import type { SymbolUsage, Verdict, PeerDependencyInfo } from "../../src/types/index.js";
import * as fs from "node:fs/promises";
import fg from "fast-glob";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("fast-glob");

describe("UsageAnalyzer", () => {
  describe("constructor options", () => {
    it("should use default options when not provided", () => {
      const analyzer = new UsageAnalyzer();
      // Options are private, so we test indirectly
      expect(analyzer).toBeInstanceOf(UsageAnalyzer);
    });

    it("should merge provided options with defaults", () => {
      const analyzer = new UsageAnalyzer({
        srcPaths: ["./custom"],
        threshold: 10,
      });
      expect(analyzer).toBeInstanceOf(UsageAnalyzer);
    });

    it("should accept custom dependencies", () => {
      const mockLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        setVerbose: vi.fn(),
        isVerbose: vi.fn(() => false),
      };

      const analyzer = new UsageAnalyzer({}, { logger: mockLogger });
      expect(analyzer).toBeInstanceOf(UsageAnalyzer);
    });
  });

  describe("scanProject", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const mockPackageJson = (deps: Record<string, string>, devDeps?: Record<string, string>) =>
      JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: deps,
        devDependencies: devDeps,
      });

    // Helper to setup common mocks
    const setupMocks = (
      packageJson: string,
      sourceFiles: string[],
      sourceContent: string
    ) => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.endsWith("package.json") && !path.includes("node_modules")) {
          return packageJson;
        }
        if (path.includes("node_modules")) {
          return JSON.stringify({ name: "package", version: "1.0.0" });
        }
        if (path.endsWith(".ts")) {
          return sourceContent;
        }
        throw new Error("ENOENT");
      });

      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any);

      vi.mocked(fg).mockResolvedValue(sourceFiles);
    };

    it("should scan project and return dependency analyses", async () => {
      setupMocks(
        mockPackageJson({ lodash: "^4.0.0", uuid: "^9.0.0" }),
        ["/project/src/index.ts"],
        `import { get } from "lodash";\nimport { v4 } from "uuid";`
      );

      const analyzer = new UsageAnalyzer({
        srcPaths: ["./src"],
        ignore: [],
      });

      const results = await analyzer.scanProject("/project");

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(2);
      expect(results.map((r) => r.name).sort()).toEqual(["lodash", "uuid"]);
    });

    it("should exclude ignored packages", async () => {
      setupMocks(
        mockPackageJson({
          lodash: "^4.0.0",
          react: "^18.0.0",
          "react-dom": "^18.0.0",
        }),
        [],
        ""
      );

      const analyzer = new UsageAnalyzer({
        ignore: ["react", "react-dom"],
      });

      const results = await analyzer.scanProject("/project");

      expect(results.map((r) => r.name)).not.toContain("react");
      expect(results.map((r) => r.name)).not.toContain("react-dom");
    });

    it("should include devDependencies when includeDev is true", async () => {
      const mockPackageJsonReader = {
        read: vi.fn().mockResolvedValue({
          name: "test-project",
          dependencies: { lodash: "^4.0.0" },
          devDependencies: { "custom-dev": "^5.0.0" },
        }),
        getDependencies: vi.fn().mockResolvedValue({ lodash: "^4.0.0" }),
        getDevDependencies: vi.fn().mockResolvedValue({ "custom-dev": "^5.0.0" }),
      };

      const mockSourceFileScanner = {
        scan: vi.fn().mockResolvedValue([]),
        validatePaths: vi.fn().mockResolvedValue(["./src"]),
      };

      const mockPeerDepAnalyzer = {
        analyzePeerDeps: vi.fn().mockResolvedValue(new Map()),
        checkPackagePeerDeps: vi.fn(),
        clearCache: vi.fn(),
      };

      const analyzer = new UsageAnalyzer(
        {
          includeDev: true,
          ignore: [],
          wellKnownPatterns: [], // Disable default patterns
        },
        {
          packageJsonReader: mockPackageJsonReader,
          sourceFileScanner: mockSourceFileScanner,
          peerDepAnalyzer: mockPeerDepAnalyzer,
        }
      );

      const results = await analyzer.scanProject("/project");

      expect(results.map((r) => r.name)).toContain("custom-dev");
    });

    it("should sort results by verdict priority", async () => {
      setupMocks(
        mockPackageJson({
          "unused-pkg": "^1.0.0",
          "well-used": "^1.0.0",
          uuid: "^9.0.0",
        }),
        ["/project/src/index.ts"],
        `
          import { a, b, c, d, e, f } from "well-used";
          import { v4 } from "uuid";
        `
      );

      const analyzer = new UsageAnalyzer({ ignore: [] });
      const results = await analyzer.scanProject("/project");

      // REMOVE should come first, then RECODE_NATIVE, then KEEP
      const verdicts = results.map((r) => r.verdict);
      const removeIndex = verdicts.indexOf("REMOVE");
      const keepIndex = verdicts.indexOf("KEEP");

      if (removeIndex !== -1 && keepIndex !== -1) {
        expect(removeIndex).toBeLessThan(keepIndex);
      }
    });

    it("should support glob patterns in ignore", async () => {
      setupMocks(
        mockPackageJson({
          "@types/node": "^20.0.0",
          "@types/react": "^18.0.0",
          lodash: "^4.0.0",
        }),
        [],
        ""
      );

      const analyzer = new UsageAnalyzer({
        ignore: ["@types/*"],
      });

      const results = await analyzer.scanProject("/project");

      expect(results.map((r) => r.name)).not.toContain("@types/node");
      expect(results.map((r) => r.name)).not.toContain("@types/react");
      expect(results.map((r) => r.name)).toContain("lodash");
    });

    it("should delegate to injected components", async () => {
      const mockImportAnalyzer = {
        analyzeFile: vi.fn().mockResolvedValue([]),
        analyzeContent: vi.fn().mockReturnValue([]),
        extractPackageName: vi.fn(),
        determineImportStyle: vi.fn(),
      };

      setupMocks(
        mockPackageJson({ lodash: "^4.0.0" }),
        ["/project/src/index.ts"],
        `import { get } from "lodash";`
      );

      const analyzer = new UsageAnalyzer(
        { ignore: [] },
        { importAnalyzer: mockImportAnalyzer }
      );

      await analyzer.scanProject("/project");

      expect(mockImportAnalyzer.analyzeFile).toHaveBeenCalled();
    });

    it("should use wellKnownPatterns from options", async () => {
      const mockPackageJsonReader = {
        read: vi.fn().mockResolvedValue({
          name: "test-project",
          dependencies: {
            "@custom/internal": "^1.0.0",
            lodash: "^4.0.0",
          },
        }),
        getDependencies: vi.fn().mockResolvedValue({
          "@custom/internal": "^1.0.0",
          lodash: "^4.0.0",
        }),
        getDevDependencies: vi.fn().mockResolvedValue({}),
      };

      const mockSourceFileScanner = {
        scan: vi.fn().mockResolvedValue(["/project/src/index.ts"]),
        validatePaths: vi.fn().mockResolvedValue(["./src"]),
      };

      const mockPeerDepAnalyzer = {
        analyzePeerDeps: vi.fn().mockResolvedValue(new Map()),
        checkPackagePeerDeps: vi.fn(),
        clearCache: vi.fn(),
      };

      const mockImportAnalyzer = {
        analyzeFile: vi.fn().mockResolvedValue([
          {
            packageName: "@custom/internal",
            symbol: "x",
            importPath: "@custom/internal",
            importType: "named",
            location: { file: "/project/src/index.ts", line: 1, column: 0 },
          },
        ]),
        analyzeContent: vi.fn(),
        extractPackageName: vi.fn(),
        determineImportStyle: vi.fn(),
      };

      const analyzer = new UsageAnalyzer(
        {
          ignore: [],
          wellKnownPatterns: [
            { pattern: "@custom/*", verdict: "KEEP", reason: "Internal packages" },
          ],
        },
        {
          packageJsonReader: mockPackageJsonReader,
          sourceFileScanner: mockSourceFileScanner,
          peerDepAnalyzer: mockPeerDepAnalyzer,
          importAnalyzer: mockImportAnalyzer,
        }
      );

      const results = await analyzer.scanProject("/project");
      const customPkg = results.find((r) => r.name === "@custom/internal");

      expect(customPkg?.verdict).toBe("KEEP");
      expect(customPkg?.wellKnownReason).toBe("Internal packages");
    });
  });

  describe("analyzeSingleDependency", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should analyze a single package in detail", async () => {
      const mockPackageJsonReader = {
        read: vi.fn().mockResolvedValue({
          name: "test-project",
          dependencies: { lodash: "^4.17.21" },
          devDependencies: {},
        }),
        getDependencies: vi.fn().mockResolvedValue({ lodash: "^4.17.21" }),
        getDevDependencies: vi.fn().mockResolvedValue({}),
      };

      const mockSourceFileScanner = {
        scan: vi.fn().mockResolvedValue(["/project/src/index.ts", "/project/src/utils.ts"]),
        validatePaths: vi.fn().mockResolvedValue(["./src"]),
      };

      const mockImportAnalyzer = {
        analyzeFile: vi.fn().mockResolvedValue([
          {
            packageName: "lodash",
            symbol: "get",
            importPath: "lodash",
            importType: "named",
            location: { file: "/project/src/index.ts", line: 1, column: 0 },
          },
          {
            packageName: "lodash",
            symbol: "set",
            importPath: "lodash",
            importType: "named",
            location: { file: "/project/src/index.ts", line: 1, column: 0 },
          },
          {
            packageName: "lodash",
            symbol: "debounce",
            importPath: "lodash",
            importType: "named",
            location: { file: "/project/src/utils.ts", line: 1, column: 0 },
          },
        ]),
        analyzeContent: vi.fn(),
        extractPackageName: vi.fn(),
        determineImportStyle: vi.fn(),
      };

      const mockPeerDepAnalyzer = {
        analyzePeerDeps: vi.fn().mockResolvedValue(new Map()),
        checkPackagePeerDeps: vi.fn(),
        clearCache: vi.fn(),
      };

      const analyzer = new UsageAnalyzer(
        { ignore: [] },
        {
          packageJsonReader: mockPackageJsonReader,
          sourceFileScanner: mockSourceFileScanner,
          importAnalyzer: mockImportAnalyzer,
          peerDepAnalyzer: mockPeerDepAnalyzer,
        }
      );
      const result = await analyzer.analyzeSingleDependency("/project", "lodash");

      expect(result.name).toBe("lodash");
      expect(result.symbolsUsed.length).toBeGreaterThan(0);
      expect(result.symbolsUsed.map((s) => s.symbol)).toContain("get");
    });

    it("should throw error for packages not in package.json", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.endsWith("package.json")) {
          return JSON.stringify({
            name: "test-project",
            dependencies: {},
          });
        }
        return "";
      });

      vi.mocked(fg).mockResolvedValue([]);

      const analyzer = new UsageAnalyzer();

      await expect(
        analyzer.analyzeSingleDependency("/project", "unknown-pkg")
      ).rejects.toThrow('Package "unknown-pkg" not found');
    });

    it("should find package in devDependencies", async () => {
      const mockPackageJsonReader = {
        read: vi.fn().mockResolvedValue({
          name: "test-project",
          dependencies: {},
          devDependencies: { vitest: "^1.0.0" },
        }),
        getDependencies: vi.fn().mockResolvedValue({}),
        getDevDependencies: vi.fn().mockResolvedValue({ vitest: "^1.0.0" }),
      };

      const mockSourceFileScanner = {
        scan: vi.fn().mockResolvedValue(["/project/src/test.ts"]),
        validatePaths: vi.fn().mockResolvedValue(["./src"]),
      };

      const mockImportAnalyzer = {
        analyzeFile: vi.fn().mockResolvedValue([
          {
            packageName: "vitest",
            symbol: "describe",
            importPath: "vitest",
            importType: "named",
            location: { file: "/project/src/test.ts", line: 1, column: 0 },
          },
        ]),
        analyzeContent: vi.fn(),
        extractPackageName: vi.fn(),
        determineImportStyle: vi.fn(),
      };

      const analyzer = new UsageAnalyzer(
        {},
        {
          packageJsonReader: mockPackageJsonReader,
          sourceFileScanner: mockSourceFileScanner,
          importAnalyzer: mockImportAnalyzer,
        }
      );

      const result = await analyzer.analyzeSingleDependency("/project", "vitest");

      expect(result.name).toBe("vitest");
    });
  });

  describe("Knip integration", () => {
    it("should expose isKnipFlaggedUnused method", () => {
      const analyzer = new UsageAnalyzer();
      expect(typeof analyzer.isKnipFlaggedUnused).toBe("function");
    });

    it("should return false when Knip is not enabled", () => {
      const analyzer = new UsageAnalyzer({ withKnip: false });
      expect(analyzer.isKnipFlaggedUnused("any-package")).toBe(false);
    });

    it("should expose getKnipAnalysis method", () => {
      const analyzer = new UsageAnalyzer();
      expect(typeof analyzer.getKnipAnalysis).toBe("function");
    });

    it("should return null when Knip is not run", () => {
      const analyzer = new UsageAnalyzer();
      expect(analyzer.getKnipAnalysis()).toBeNull();
    });
  });

  describe("dependency injection", () => {
    it("should accept all dependencies via constructor", () => {
      const mockLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        setVerbose: vi.fn(),
        isVerbose: vi.fn(() => false),
      };

      const mockImportAnalyzer = {
        analyzeFile: vi.fn().mockResolvedValue([]),
        analyzeContent: vi.fn().mockReturnValue([]),
        extractPackageName: vi.fn(),
        determineImportStyle: vi.fn(),
      };

      const mockPeerDepAnalyzer = {
        analyzePeerDeps: vi.fn().mockResolvedValue(new Map()),
        checkPackagePeerDeps: vi.fn().mockResolvedValue({
          requiredBy: [],
          onlyPeerDep: false,
          safeToRemoveFromPackageJson: false,
        }),
        clearCache: vi.fn(),
      };

      const mockVerdictEngine = {
        determineVerdict: vi.fn().mockReturnValue({ verdict: "KEEP" }),
        calculateConfidence: vi.fn().mockReturnValue(0.9),
        isActionable: vi.fn().mockReturnValue(false),
        getVerdictPriority: vi.fn().mockReturnValue(5),
        compareVerdicts: vi.fn().mockReturnValue(0),
        getInvestigateReasonDescription: vi.fn().mockReturnValue(""),
      };

      const mockPackageJsonReader = {
        read: vi.fn().mockResolvedValue({
          name: "test",
          dependencies: { lodash: "^4.0.0" },
        }),
        getDependencies: vi.fn().mockResolvedValue({ lodash: "^4.0.0" }),
        getDevDependencies: vi.fn().mockResolvedValue({}),
      };

      const mockSourceFileScanner = {
        scan: vi.fn().mockResolvedValue([]),
        validatePaths: vi.fn().mockResolvedValue(["./src"]),
      };

      const mockImportAggregator = {
        groupByPackage: vi.fn().mockReturnValue(new Map()),
        aggregateSymbols: vi.fn().mockReturnValue([]),
        getUniqueFiles: vi.fn().mockReturnValue([]),
        determineImportStyle: vi.fn().mockReturnValue("barrel" as const),
      };

      const analyzer = new UsageAnalyzer(
        {},
        {
          logger: mockLogger,
          importAnalyzer: mockImportAnalyzer,
          peerDepAnalyzer: mockPeerDepAnalyzer,
          verdictEngine: mockVerdictEngine,
          packageJsonReader: mockPackageJsonReader,
          sourceFileScanner: mockSourceFileScanner,
          importAggregator: mockImportAggregator,
        }
      );

      expect(analyzer).toBeInstanceOf(UsageAnalyzer);
    });
  });

  describe("default instance", () => {
    it("should export a default instance", async () => {
      const { usageAnalyzer } = await import("../../src/analyzers/usage-analyzer.js");
      expect(usageAnalyzer).toBeInstanceOf(UsageAnalyzer);
    });
  });
});
