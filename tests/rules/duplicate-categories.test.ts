import { describe, it, expect } from "vitest";
import {
  detectDuplicates,
  getCategoryForPackage,
} from "../../src/rules/duplicate-categories.js";
import type { DependencyAnalysis } from "../../src/types/index.js";

describe("duplicate-categories", () => {
  const makeDependencyAnalysis = (
    name: string,
    fileCount: number,
    symbolCount: number = 1
  ): DependencyAnalysis => ({
    name,
    version: "1.0.0",
    importStyle: "barrel",
    symbolsUsed: Array.from({ length: symbolCount }, (_, i) => ({
      symbol: `symbol${i}`,
      importType: "named" as const,
      locations: [{ file: `/test${i}.ts`, line: 1, column: 0 }],
      count: 1,
    })),
    totalSymbolsUsed: symbolCount,
    verdict: "KEEP",
    confidence: 0.9,
    alternatives: [],
    files: Array.from({ length: fileCount }, (_, i) => `/file${i}.ts`),
    fileCount,
  });

  describe("detectDuplicates", () => {
    describe("icon libraries", () => {
      it("should detect multiple icon libraries", () => {
        const analyses = [
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("react-icons", 20),
          makeDependencyAnalysis("@radix-ui/react-icons", 10),
        ];

        const duplicates = detectDuplicates(analyses);

        expect(duplicates).toHaveLength(1);
        expect(duplicates[0].category).toBe("icons");
        expect(duplicates[0].libraries).toHaveLength(3);
      });

      it("should recommend keeping the most used icon library", () => {
        const analyses = [
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("react-icons", 20),
        ];

        const duplicates = detectDuplicates(analyses);
        const iconGroup = duplicates[0];

        expect(iconGroup.recommendation.keep).toBe("lucide-react");
        expect(iconGroup.recommendation.migrate).toContain("react-icons");
      });

      it("should recommend removing unused icon libraries", () => {
        const analyses = [
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("react-icons", 0),
        ];

        const duplicates = detectDuplicates(analyses);
        const iconGroup = duplicates[0];

        expect(iconGroup.recommendation.remove).toContain("react-icons");
      });
    });

    describe("date libraries", () => {
      it("should detect multiple date libraries", () => {
        const analyses = [
          makeDependencyAnalysis("date-fns", 50),
          makeDependencyAnalysis("dayjs", 5),
          makeDependencyAnalysis("moment", 2),
        ];

        const duplicates = detectDuplicates(analyses);

        expect(duplicates).toHaveLength(1);
        expect(duplicates[0].category).toBe("date");
        expect(duplicates[0].libraries).toHaveLength(3);
      });

      it("should prefer date-fns over moment", () => {
        const analyses = [
          makeDependencyAnalysis("moment", 50),
          makeDependencyAnalysis("date-fns", 10),
        ];

        const duplicates = detectDuplicates(analyses);
        const dateGroup = duplicates[0];

        // date-fns is in preferredOrder, so it should be kept
        expect(dateGroup.recommendation.keep).toBe("date-fns");
        expect(dateGroup.recommendation.migrate).toContain("moment");
      });
    });

    describe("CSS utilities", () => {
      it("should detect multiple CSS class utilities", () => {
        const analyses = [
          makeDependencyAnalysis("classnames", 30),
          makeDependencyAnalysis("clsx", 10),
          makeDependencyAnalysis("tailwind-merge", 5),
        ];

        const duplicates = detectDuplicates(analyses);

        expect(duplicates).toHaveLength(1);
        expect(duplicates[0].category).toBe("cssUtils");
      });
    });

    describe("no duplicates", () => {
      it("should return empty array when only one library per category", () => {
        const analyses = [
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("date-fns", 50),
          makeDependencyAnalysis("clsx", 30),
        ];

        const duplicates = detectDuplicates(analyses);

        expect(duplicates).toHaveLength(0);
      });

      it("should return empty array for non-categorized packages", () => {
        const analyses = [
          makeDependencyAnalysis("react", 100),
          makeDependencyAnalysis("next", 50),
          makeDependencyAnalysis("@tanstack/react-query", 30),
        ];

        const duplicates = detectDuplicates(analyses);

        expect(duplicates).toHaveLength(0);
      });
    });

    describe("multiple categories", () => {
      it("should detect duplicates in multiple categories", () => {
        const analyses = [
          // Icons
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("react-icons", 20),
          // Dates
          makeDependencyAnalysis("date-fns", 50),
          makeDependencyAnalysis("moment", 10),
          // CSS
          makeDependencyAnalysis("classnames", 30),
          makeDependencyAnalysis("clsx", 10),
        ];

        const duplicates = detectDuplicates(analyses);

        expect(duplicates).toHaveLength(3);
        expect(duplicates.map((d) => d.category).sort()).toEqual([
          "cssUtils",
          "date",
          "icons",
        ]);
      });
    });

    describe("potential savings", () => {
      it("should calculate bundle savings", () => {
        const analyses = [
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("react-icons", 20),
        ];

        const duplicates = detectDuplicates(analyses);

        expect(duplicates[0].potentialSavings.bundleKb).toBeGreaterThan(0);
        expect(duplicates[0].potentialSavings.dependencyCount).toBe(1);
      });

      it("should count dependencies to remove", () => {
        const analyses = [
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("react-icons", 20),
          makeDependencyAnalysis("@radix-ui/react-icons", 0),
        ];

        const duplicates = detectDuplicates(analyses);

        // One to keep (lucide-react), one to migrate (react-icons), one to remove (@radix-ui)
        expect(duplicates[0].potentialSavings.dependencyCount).toBe(2);
      });
    });

    describe("sorting", () => {
      it("should sort libraries by file count (most used first)", () => {
        const analyses = [
          makeDependencyAnalysis("react-icons", 20),
          makeDependencyAnalysis("lucide-react", 100),
          makeDependencyAnalysis("@radix-ui/react-icons", 50),
        ];

        const duplicates = detectDuplicates(analyses);
        const libraries = duplicates[0].libraries;

        expect(libraries[0].name).toBe("lucide-react");
        expect(libraries[1].name).toBe("@radix-ui/react-icons");
        expect(libraries[2].name).toBe("react-icons");
      });
    });
  });

  describe("getCategoryForPackage", () => {
    it("should return category for icon packages", () => {
      expect(getCategoryForPackage("lucide-react")).toBe("icons");
      expect(getCategoryForPackage("react-icons")).toBe("icons");
      expect(getCategoryForPackage("@heroicons/react")).toBe("icons");
    });

    it("should return category for date packages", () => {
      expect(getCategoryForPackage("date-fns")).toBe("date");
      expect(getCategoryForPackage("moment")).toBe("date");
      expect(getCategoryForPackage("dayjs")).toBe("date");
    });

    it("should return category for CSS utilities", () => {
      expect(getCategoryForPackage("classnames")).toBe("cssUtils");
      expect(getCategoryForPackage("clsx")).toBe("cssUtils");
      expect(getCategoryForPackage("tailwind-merge")).toBe("cssUtils");
    });

    it("should return category for state management", () => {
      expect(getCategoryForPackage("zustand")).toBe("state");
      expect(getCategoryForPackage("jotai")).toBe("state");
      expect(getCategoryForPackage("redux")).toBe("state");
    });

    it("should return category for validation libraries", () => {
      expect(getCategoryForPackage("zod")).toBe("validation");
      expect(getCategoryForPackage("yup")).toBe("validation");
      expect(getCategoryForPackage("joi")).toBe("validation");
    });

    it("should return undefined for uncategorized packages", () => {
      expect(getCategoryForPackage("react")).toBeUndefined();
      expect(getCategoryForPackage("next")).toBeUndefined();
      expect(getCategoryForPackage("unknown-package")).toBeUndefined();
    });
  });
});
