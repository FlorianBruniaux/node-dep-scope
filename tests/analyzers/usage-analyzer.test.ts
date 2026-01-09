import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UsageAnalyzer } from "../../src/analyzers/usage-analyzer.js";
import type { SymbolUsage, Verdict, PeerDependencyInfo } from "../../src/types/index.js";
import * as fs from "node:fs/promises";
import fg from "fast-glob";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("fast-glob");

// We need to test the private determineVerdict method indirectly
// or extract the logic for testing. For now, we'll create a testable subclass.
class TestableUsageAnalyzer extends UsageAnalyzer {
  // Expose private method for testing
  public testDetermineVerdict(
    packageName: string,
    symbolsUsed: SymbolUsage[],
    alternatives: { symbol: string; native: string; example: string }[],
    totalImports: number,
    peerDepInfo?: PeerDependencyInfo
  ): Verdict {
    // @ts-expect-error - accessing private method for testing
    const result = this.determineVerdict(packageName, symbolsUsed, alternatives, totalImports, peerDepInfo);
    // determineVerdict now returns an object { verdict, investigateReason?, wellKnownReason? }
    return result.verdict;
  }

  public testCalculateConfidence(
    verdict: Verdict,
    symbolsUsed: SymbolUsage[],
    alternatives: { symbol: string; native: string; example: string }[],
    peerDepInfo?: PeerDependencyInfo
  ): number {
    // @ts-expect-error - accessing private method for testing
    return this.calculateConfidence(verdict, symbolsUsed, alternatives, peerDepInfo);
  }
}

describe("UsageAnalyzer", () => {
  describe("determineVerdict", () => {
    const analyzer = new TestableUsageAnalyzer({ threshold: 5 });

    const makeSymbolUsage = (symbol: string, count = 1): SymbolUsage => ({
      symbol,
      importType: "named",
      locations: [{ file: "/test.ts", line: 1, column: 0 }],
      count,
    });

    describe("REMOVE verdict", () => {
      it("should return REMOVE when no imports and no peer deps", () => {
        const verdict = analyzer.testDetermineVerdict(
          "unused-package",
          [],
          [],
          0,
          undefined
        );
        expect(verdict).toBe("REMOVE");
      });

      it("should return REMOVE when no imports and empty requiredBy", () => {
        const verdict = analyzer.testDetermineVerdict(
          "unused-package",
          [],
          [],
          0,
          { requiredBy: [], onlyPeerDep: false, safeToRemoveFromPackageJson: false }
        );
        expect(verdict).toBe("REMOVE");
      });
    });

    describe("PEER_DEP verdict", () => {
      it("should return PEER_DEP when no imports but required by other packages", () => {
        const verdict = analyzer.testDetermineVerdict(
          "@ai-sdk/provider",
          [],
          [],
          0,
          {
            requiredBy: ["@ai-sdk/openai", "@ai-sdk/anthropic"],
            onlyPeerDep: true,
            safeToRemoveFromPackageJson: true,
          }
        );
        expect(verdict).toBe("PEER_DEP");
      });
    });

    describe("RECODE_NATIVE verdict", () => {
      it("should return RECODE_NATIVE when few symbols with alternatives", () => {
        const symbolsUsed = [makeSymbolUsage("v4")];
        const alternatives = [
          { symbol: "v4", native: "crypto.randomUUID()", example: "crypto.randomUUID()" },
        ];

        const verdict = analyzer.testDetermineVerdict(
          "uuid",
          symbolsUsed,
          alternatives,
          1,
          undefined
        );
        expect(verdict).toBe("RECODE_NATIVE");
      });

      it("should return RECODE_NATIVE when symbols <= threshold and 50%+ have alternatives", () => {
        const symbolsUsed = [
          makeSymbolUsage("get"),
          makeSymbolUsage("set"),
        ];
        const alternatives = [
          { symbol: "get", native: "Optional chaining", example: "obj?.a?.b" },
        ];

        const verdict = analyzer.testDetermineVerdict(
          "lodash",
          symbolsUsed,
          alternatives,
          2,
          undefined
        );
        expect(verdict).toBe("RECODE_NATIVE");
      });

      it("should NOT return RECODE_NATIVE when symbols > threshold", () => {
        const symbolsUsed = Array.from({ length: 6 }, (_, i) =>
          makeSymbolUsage(`symbol${i}`)
        );
        const alternatives = symbolsUsed.map((s) => ({
          symbol: s.symbol,
          native: "native",
          example: "example",
        }));

        const verdict = analyzer.testDetermineVerdict(
          "lodash",
          symbolsUsed,
          alternatives,
          6,
          undefined
        );
        expect(verdict).toBe("KEEP");
      });

      it("should NOT return RECODE_NATIVE when < 50% have alternatives", () => {
        const symbolsUsed = [
          makeSymbolUsage("get"),
          makeSymbolUsage("set"),
          makeSymbolUsage("merge"),
          makeSymbolUsage("cloneDeep"),
        ];
        const alternatives = [
          { symbol: "get", native: "Optional chaining", example: "obj?.a?.b" },
        ];

        const verdict = analyzer.testDetermineVerdict(
          "lodash",
          symbolsUsed,
          alternatives,
          4,
          undefined
        );
        // 1/4 = 25% < 50%, so should be KEEP
        expect(verdict).toBe("KEEP");
      });
    });

    describe("INVESTIGATE verdict", () => {
      it("should return INVESTIGATE when few symbols and no alternatives", () => {
        const symbolsUsed = [makeSymbolUsage("obscureFunction")];

        const verdict = analyzer.testDetermineVerdict(
          "some-package",
          symbolsUsed,
          [],
          1,
          undefined
        );
        expect(verdict).toBe("INVESTIGATE");
      });

      it("should return INVESTIGATE when 2 symbols and no alternatives", () => {
        const symbolsUsed = [
          makeSymbolUsage("func1"),
          makeSymbolUsage("func2"),
        ];

        const verdict = analyzer.testDetermineVerdict(
          "some-package",
          symbolsUsed,
          [],
          2,
          undefined
        );
        expect(verdict).toBe("INVESTIGATE");
      });
    });

    describe("KEEP verdict", () => {
      it("should return KEEP when many symbols used", () => {
        const symbolsUsed = Array.from({ length: 10 }, (_, i) =>
          makeSymbolUsage(`symbol${i}`)
        );

        const verdict = analyzer.testDetermineVerdict(
          "well-used-package",
          symbolsUsed,
          [],
          10,
          undefined
        );
        expect(verdict).toBe("KEEP");
      });

      it("should return KEEP when symbols > threshold even with some alternatives", () => {
        const symbolsUsed = Array.from({ length: 8 }, (_, i) =>
          makeSymbolUsage(`symbol${i}`)
        );
        const alternatives = [
          { symbol: "symbol0", native: "native", example: "example" },
        ];

        const verdict = analyzer.testDetermineVerdict(
          "package",
          symbolsUsed,
          alternatives,
          8,
          undefined
        );
        expect(verdict).toBe("KEEP");
      });

      it("should return KEEP when 3+ symbols with no alternatives", () => {
        const symbolsUsed = [
          makeSymbolUsage("func1"),
          makeSymbolUsage("func2"),
          makeSymbolUsage("func3"),
        ];

        const verdict = analyzer.testDetermineVerdict(
          "some-package",
          symbolsUsed,
          [],
          3,
          undefined
        );
        expect(verdict).toBe("KEEP");
      });
    });

    describe("threshold configuration", () => {
      it("should respect custom threshold", () => {
        const customAnalyzer = new TestableUsageAnalyzer({ threshold: 3 });
        const symbolsUsed = [
          makeSymbolUsage("a"),
          makeSymbolUsage("b"),
          makeSymbolUsage("c"),
          makeSymbolUsage("d"),
        ];
        const alternatives = symbolsUsed.map((s) => ({
          symbol: s.symbol,
          native: "native",
          example: "example",
        }));

        const verdict = customAnalyzer.testDetermineVerdict(
          "package",
          symbolsUsed,
          alternatives,
          4,
          undefined
        );
        // 4 symbols > threshold of 3, so KEEP
        expect(verdict).toBe("KEEP");
      });
    });
  });

  describe("calculateConfidence", () => {
    const analyzer = new TestableUsageAnalyzer();

    const makeSymbolUsage = (symbol: string): SymbolUsage => ({
      symbol,
      importType: "named",
      locations: [{ file: "/test.ts", line: 1, column: 0 }],
      count: 1,
    });

    it("should return 1.0 for REMOVE verdict", () => {
      const confidence = analyzer.testCalculateConfidence("REMOVE", [], []);
      expect(confidence).toBe(1.0);
    });

    it("should return 0.9 for KEEP verdict", () => {
      const confidence = analyzer.testCalculateConfidence(
        "KEEP",
        [makeSymbolUsage("a")],
        []
      );
      expect(confidence).toBe(0.9);
    });

    it("should return 0.5 for INVESTIGATE verdict", () => {
      const confidence = analyzer.testCalculateConfidence(
        "INVESTIGATE",
        [makeSymbolUsage("a")],
        []
      );
      expect(confidence).toBe(0.5);
    });

    it("should return high confidence for PEER_DEP with requiredBy", () => {
      const confidence = analyzer.testCalculateConfidence(
        "PEER_DEP",
        [],
        [],
        { requiredBy: ["pkg1"], onlyPeerDep: true, safeToRemoveFromPackageJson: true }
      );
      expect(confidence).toBe(0.95);
    });

    it("should return lower confidence for PEER_DEP without requiredBy", () => {
      const confidence = analyzer.testCalculateConfidence(
        "PEER_DEP",
        [],
        [],
        { requiredBy: [], onlyPeerDep: true, safeToRemoveFromPackageJson: true }
      );
      expect(confidence).toBe(0.7);
    });

    it("should scale RECODE_NATIVE confidence based on alternatives coverage", () => {
      const symbolsUsed = [makeSymbolUsage("a"), makeSymbolUsage("b")];
      const allAlternatives = [
        { symbol: "a", native: "n", example: "e" },
        { symbol: "b", native: "n", example: "e" },
      ];
      const halfAlternatives = [{ symbol: "a", native: "n", example: "e" }];

      const fullConfidence = analyzer.testCalculateConfidence(
        "RECODE_NATIVE",
        symbolsUsed,
        allAlternatives
      );
      const halfConfidence = analyzer.testCalculateConfidence(
        "RECODE_NATIVE",
        symbolsUsed,
        halfAlternatives
      );

      expect(fullConfidence).toBeGreaterThan(halfConfidence);
      expect(fullConfidence).toBe(1.0);
      expect(halfConfidence).toBe(0.75);
    });
  });

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
      setupMocks(
        mockPackageJson({ lodash: "^4.0.0" }, { typescript: "^5.0.0" }),
        [],
        ""
      );

      const analyzer = new UsageAnalyzer({
        includeDev: true,
        ignore: [],
        wellKnownPatterns: [], // Disable default patterns (typescript is in DEFAULT_WELL_KNOWN_PATTERNS as IGNORE)
      });

      const results = await analyzer.scanProject("/project");

      expect(results.map((r) => r.name)).toContain("typescript");
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
  });

  describe("analyzeSingleDependency", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should analyze a single package in detail", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.endsWith("package.json") && !path.includes("node_modules")) {
          return JSON.stringify({
            name: "test-project",
            dependencies: { lodash: "^4.17.21" },
          });
        }
        if (path.endsWith(".ts")) {
          return `
            import { get, set, debounce } from "lodash";
            const x = get(obj, "a.b");
          `;
        }
        throw new Error("ENOENT");
      });

      vi.mocked(fg).mockResolvedValue(["/project/src/index.ts", "/project/src/utils.ts"]);

      const analyzer = new UsageAnalyzer();
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
  });
});
