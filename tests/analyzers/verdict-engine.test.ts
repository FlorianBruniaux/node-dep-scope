import { describe, it, expect, beforeEach } from "vitest";
import { VerdictEngine } from "../../src/analyzers/verdict-engine.js";
import { NullLogger } from "../../src/utils/logger.js";
import type { VerdictContext, SymbolUsage, NativeAlternative } from "../../src/types/index.js";

describe("VerdictEngine", () => {
  let engine: VerdictEngine;

  beforeEach(() => {
    engine = new VerdictEngine({
      logger: new NullLogger(),
    });
  });

  const createContext = (overrides: Partial<VerdictContext> = {}): VerdictContext => ({
    packageName: "test-package",
    symbolsUsed: [],
    alternatives: [],
    totalImports: 0,
    fileCount: 0,
    options: {
      threshold: 5,
      fileCountThreshold: 3,
      wellKnownPatterns: [],
    },
    ...overrides,
  });

  const createSymbol = (name: string, count: number = 1): SymbolUsage => ({
    symbol: name,
    importType: "named",
    locations: [{ file: "/test.ts", line: 1, column: 0 }],
    count,
  });

  const createAlternative = (symbol: string): NativeAlternative => ({
    symbol,
    native: "Native replacement",
    example: "example code",
  });

  describe("determineVerdict", () => {
    describe("REMOVE verdict", () => {
      it("should return REMOVE when no imports and no peer deps", () => {
        const context = createContext({
          totalImports: 0,
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("REMOVE");
      });

      it("should not return REMOVE when package is required by others", () => {
        const context = createContext({
          totalImports: 0,
          peerDepInfo: {
            requiredBy: ["other-package"],
            onlyPeerDep: true,
            safeToRemoveFromPackageJson: true,
          },
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("PEER_DEP");
      });
    });

    describe("PEER_DEP verdict", () => {
      it("should return PEER_DEP when no imports but required by other packages", () => {
        const context = createContext({
          totalImports: 0,
          peerDepInfo: {
            requiredBy: ["react-dom", "next"],
            onlyPeerDep: true,
            safeToRemoveFromPackageJson: true,
          },
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("PEER_DEP");
      });
    });

    describe("RECODE_NATIVE verdict", () => {
      it("should return RECODE_NATIVE when few symbols with alternatives", () => {
        const context = createContext({
          totalImports: 2,
          symbolsUsed: [createSymbol("debounce"), createSymbol("throttle")],
          alternatives: [
            createAlternative("debounce"),
            createAlternative("throttle"),
          ],
          fileCount: 1,
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("RECODE_NATIVE");
      });

      it("should require at least 50% alternatives coverage", () => {
        const context = createContext({
          totalImports: 4,
          symbolsUsed: [
            createSymbol("a"),
            createSymbol("b"),
            createSymbol("c"),
            createSymbol("d"),
          ],
          alternatives: [createAlternative("a")], // Only 25% coverage
          fileCount: 1,
        });

        const result = engine.determineVerdict(context);

        // Not enough alternatives, should be INVESTIGATE
        expect(result.verdict).not.toBe("RECODE_NATIVE");
      });

      it("should respect threshold option", () => {
        const context = createContext({
          totalImports: 10,
          symbolsUsed: Array(10)
            .fill(null)
            .map((_, i) => createSymbol(`sym${i}`)),
          alternatives: Array(10)
            .fill(null)
            .map((_, i) => createAlternative(`sym${i}`)),
          fileCount: 1,
          options: { threshold: 5, fileCountThreshold: 3, wellKnownPatterns: [] },
        });

        const result = engine.determineVerdict(context);

        // 10 symbols > threshold of 5, should be KEEP
        expect(result.verdict).toBe("KEEP");
      });
    });

    describe("KEEP verdict", () => {
      it("should return KEEP when used in many files", () => {
        const context = createContext({
          totalImports: 5,
          symbolsUsed: [createSymbol("render")],
          alternatives: [],
          fileCount: 5,
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("KEEP");
      });

      it("should return KEEP when many symbols are used", () => {
        const context = createContext({
          totalImports: 10,
          symbolsUsed: Array(10)
            .fill(null)
            .map((_, i) => createSymbol(`sym${i}`)),
          alternatives: [],
          fileCount: 2,
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("KEEP");
      });

      it("should return KEEP for wellKnown packages", () => {
        const context = createContext({
          totalImports: 1,
          symbolsUsed: [createSymbol("default")],
          alternatives: [],
          fileCount: 1,
          packageName: "@radix-ui/react-dialog",
          options: {
            threshold: 5,
            fileCountThreshold: 3,
            wellKnownPatterns: [
              { pattern: "@radix-ui/*", verdict: "KEEP", reason: "UI library" },
            ],
          },
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("KEEP");
        expect(result.wellKnownReason).toBe("UI library");
      });
    });

    describe("INVESTIGATE verdict", () => {
      it("should return INVESTIGATE with SINGLE_FILE_USAGE reason", () => {
        const context = createContext({
          totalImports: 1,
          symbolsUsed: [createSymbol("something")],
          alternatives: [],
          fileCount: 1,
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("INVESTIGATE");
        expect(result.investigateReason).toBe("SINGLE_FILE_USAGE");
      });

      it("should return INVESTIGATE with LOW_FILE_SPREAD reason", () => {
        const context = createContext({
          totalImports: 2,
          symbolsUsed: [createSymbol("a"), createSymbol("b")],
          alternatives: [],
          fileCount: 2,
        });

        const result = engine.determineVerdict(context);

        expect(result.verdict).toBe("INVESTIGATE");
        expect(result.investigateReason).toBe("LOW_FILE_SPREAD");
      });

      it("should return INVESTIGATE with LOW_SYMBOL_COUNT reason", () => {
        const context = createContext({
          totalImports: 2,
          symbolsUsed: [createSymbol("single")],
          alternatives: [],
          fileCount: 10, // Many files but low symbol count
          options: { threshold: 5, fileCountThreshold: 3, wellKnownPatterns: [] },
        });

        const result = engine.determineVerdict(context);

        // With fileCount >= fileThreshold, it should be KEEP
        expect(result.verdict).toBe("KEEP");
      });
    });
  });

  describe("calculateConfidence", () => {
    it("should return 1.0 for REMOVE verdict", () => {
      const context = createContext({ totalImports: 0 });
      const verdict = { verdict: "REMOVE" as const };

      const confidence = engine.calculateConfidence(context, verdict);

      expect(confidence).toBe(1.0);
    });

    it("should return high confidence for PEER_DEP with requiredBy", () => {
      const context = createContext({
        peerDepInfo: {
          requiredBy: ["other-pkg"],
          onlyPeerDep: true,
          safeToRemoveFromPackageJson: true,
        },
      });
      const verdict = { verdict: "PEER_DEP" as const };

      const confidence = engine.calculateConfidence(context, verdict);

      expect(confidence).toBe(0.95);
    });

    it("should return lower confidence for PEER_DEP without requiredBy", () => {
      const context = createContext({
        peerDepInfo: {
          requiredBy: [],
          onlyPeerDep: false,
          safeToRemoveFromPackageJson: false,
        },
      });
      const verdict = { verdict: "PEER_DEP" as const };

      const confidence = engine.calculateConfidence(context, verdict);

      expect(confidence).toBe(0.7);
    });

    it("should calculate RECODE_NATIVE confidence based on coverage", () => {
      const context = createContext({
        symbolsUsed: [createSymbol("a"), createSymbol("b")],
        alternatives: [createAlternative("a"), createAlternative("b")],
      });
      const verdict = { verdict: "RECODE_NATIVE" as const };

      const confidence = engine.calculateConfidence(context, verdict);

      // 100% coverage = 0.5 + 1.0 * 0.5 = 1.0
      expect(confidence).toBe(1.0);
    });

    it("should return 0.5 for INVESTIGATE verdict", () => {
      const context = createContext();
      const verdict = { verdict: "INVESTIGATE" as const };

      const confidence = engine.calculateConfidence(context, verdict);

      expect(confidence).toBe(0.5);
    });

    it("should return 0.9 for KEEP verdict", () => {
      const context = createContext();
      const verdict = { verdict: "KEEP" as const };

      const confidence = engine.calculateConfidence(context, verdict);

      expect(confidence).toBe(0.9);
    });

    it("should boost confidence when Knip confirms verdict", () => {
      const context = {
        ...createContext({ packageName: "unused-pkg" }),
        knipAnalysis: {
          unusedDependencies: new Set(["unused-pkg"]),
          unusedDevDependencies: new Set<string>(),
          available: true,
        },
      };
      const verdict = { verdict: "REMOVE" as const };

      const confidence = engine.calculateConfidence(context, verdict);

      // Base 1.0 + 0.05 boost, capped at 1.0
      expect(confidence).toBe(1.0);
    });
  });

  describe("isActionable", () => {
    it("should return false for KEEP", () => {
      expect(engine.isActionable("KEEP")).toBe(false);
    });

    it("should return true for all other verdicts", () => {
      expect(engine.isActionable("REMOVE")).toBe(true);
      expect(engine.isActionable("PEER_DEP")).toBe(true);
      expect(engine.isActionable("RECODE_NATIVE")).toBe(true);
      expect(engine.isActionable("CONSOLIDATE")).toBe(true);
      expect(engine.isActionable("INVESTIGATE")).toBe(true);
    });
  });

  describe("getVerdictPriority", () => {
    it("should return correct priority order", () => {
      expect(engine.getVerdictPriority("REMOVE")).toBe(0);
      expect(engine.getVerdictPriority("PEER_DEP")).toBe(1);
      expect(engine.getVerdictPriority("RECODE_NATIVE")).toBe(2);
      expect(engine.getVerdictPriority("CONSOLIDATE")).toBe(3);
      expect(engine.getVerdictPriority("INVESTIGATE")).toBe(4);
      expect(engine.getVerdictPriority("KEEP")).toBe(5);
    });
  });

  describe("compareVerdicts", () => {
    it("should sort REMOVE before KEEP", () => {
      expect(engine.compareVerdicts("REMOVE", "KEEP")).toBeLessThan(0);
    });

    it("should sort KEEP after INVESTIGATE", () => {
      expect(engine.compareVerdicts("KEEP", "INVESTIGATE")).toBeGreaterThan(0);
    });

    it("should return 0 for same verdicts", () => {
      expect(engine.compareVerdicts("KEEP", "KEEP")).toBe(0);
    });
  });

  describe("getInvestigateReasonDescription", () => {
    it("should return descriptions for all reasons", () => {
      expect(engine.getInvestigateReasonDescription("LOW_SYMBOL_COUNT")).toBeTruthy();
      expect(engine.getInvestigateReasonDescription("SINGLE_FILE_USAGE")).toBeTruthy();
      expect(engine.getInvestigateReasonDescription("LOW_FILE_SPREAD")).toBeTruthy();
      expect(engine.getInvestigateReasonDescription("UNKNOWN_PACKAGE")).toBeTruthy();
    });
  });

  describe("default instance", () => {
    it("should export a default instance", async () => {
      const { verdictEngine } = await import(
        "../../src/analyzers/verdict-engine.js"
      );
      expect(verdictEngine).toBeInstanceOf(VerdictEngine);
    });
  });
});
