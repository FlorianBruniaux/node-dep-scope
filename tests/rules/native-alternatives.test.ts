import { describe, it, expect } from "vitest";
import {
  getNativeAlternatives,
  hasAlternatives,
  getPackagesWithAlternatives,
} from "../../src/rules/native-alternatives.js";
import type { SymbolUsage } from "../../src/types/index.js";

describe("native-alternatives", () => {
  const makeSymbolUsage = (symbol: string): SymbolUsage => ({
    symbol,
    importType: "named",
    locations: [{ file: "/test.ts", line: 1, column: 0 }],
    count: 1,
  });

  describe("getNativeAlternatives", () => {
    describe("lodash", () => {
      it("should return alternative for lodash.get", () => {
        const symbols = [makeSymbolUsage("get")];
        const alternatives = getNativeAlternatives("lodash", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0]).toMatchObject({
          symbol: "get",
          native: "Optional chaining (?.)",
          minEcmaVersion: "ES2020",
        });
      });

      it("should return alternative for lodash.cloneDeep", () => {
        const symbols = [makeSymbolUsage("cloneDeep")];
        const alternatives = getNativeAlternatives("lodash", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0]).toMatchObject({
          symbol: "cloneDeep",
          native: "structuredClone()",
        });
        expect(alternatives[0].caveats).toContain("Cannot clone functions");
      });

      it("should return alternatives for multiple symbols", () => {
        const symbols = [
          makeSymbolUsage("get"),
          makeSymbolUsage("debounce"),
          makeSymbolUsage("uniq"),
        ];
        const alternatives = getNativeAlternatives("lodash", symbols);

        expect(alternatives).toHaveLength(3);
        expect(alternatives.map((a) => a.symbol)).toEqual(["get", "debounce", "uniq"]);
      });

      it("should use default rule for unknown symbols", () => {
        const symbols = [makeSymbolUsage("someObscureFunction")];
        const alternatives = getNativeAlternatives("lodash", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0].native).toContain("individual imports");
      });
    });

    describe("uuid", () => {
      it("should return crypto.randomUUID for v4", () => {
        const symbols = [makeSymbolUsage("v4")];
        const alternatives = getNativeAlternatives("uuid", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0]).toMatchObject({
          symbol: "v4",
          native: "crypto.randomUUID()",
          example: "crypto.randomUUID()",
        });
      });

      it("should return default for default import", () => {
        const symbols = [makeSymbolUsage("default")];
        const alternatives = getNativeAlternatives("uuid", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0].native).toBe("crypto.randomUUID()");
      });
    });

    describe("axios", () => {
      it("should return fetch alternatives for HTTP methods", () => {
        const symbols = [
          makeSymbolUsage("get"),
          makeSymbolUsage("post"),
          makeSymbolUsage("put"),
          makeSymbolUsage("delete"),
        ];
        const alternatives = getNativeAlternatives("axios", symbols);

        expect(alternatives).toHaveLength(4);
        alternatives.forEach((alt) => {
          expect(alt.native).toContain("fetch");
        });
      });
    });

    describe("moment", () => {
      it("should return Intl alternatives for formatting", () => {
        const symbols = [makeSymbolUsage("format")];
        const alternatives = getNativeAlternatives("moment", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0].native).toBe("Intl.DateTimeFormat");
      });

      it("should suggest date-fns in default", () => {
        const symbols = [makeSymbolUsage("default")];
        const alternatives = getNativeAlternatives("moment", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0].native).toContain("date-fns");
        expect(alternatives[0].caveats).toContain("Moment is large and not tree-shakable");
      });
    });

    describe("e18e packages", () => {
      it("should return alternative for has-flag (micro-utility)", () => {
        const symbols = [makeSymbolUsage("hasFlag")];
        const alternatives = getNativeAlternatives("has-flag", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0]).toMatchObject({
          symbol: "hasFlag",
          native: "process.argv.includes('--flag')",
          minEcmaVersion: "ES6",
        });
      });

      it("should return alternative for array-includes (native polyfill)", () => {
        const symbols = [makeSymbolUsage("default")];
        const alternatives = getNativeAlternatives("array-includes", symbols);

        expect(alternatives).toHaveLength(1);
        expect(alternatives[0].native).toContain("Array.prototype.includes");
        expect(alternatives[0].minEcmaVersion).toBe("ES2016");
      });

      it("should handle any symbol imported from an e18e package", () => {
        const symbols = [makeSymbolUsage("isEven"), makeSymbolUsage("default")];
        const alternatives = getNativeAlternatives("is-even", symbols);

        expect(alternatives).toHaveLength(2);
        expect(alternatives[0].native).toContain("% 2");
      });
    });

    describe("unknown packages", () => {
      it("should return empty array for unknown package", () => {
        const symbols = [makeSymbolUsage("something")];
        const alternatives = getNativeAlternatives("unknown-package", symbols);

        expect(alternatives).toHaveLength(0);
      });
    });

    describe("empty symbols", () => {
      it("should return empty array when no symbols provided", () => {
        const alternatives = getNativeAlternatives("lodash", []);
        expect(alternatives).toHaveLength(0);
      });
    });
  });

  describe("hasAlternatives", () => {
    it("should return true for built-in packages", () => {
      expect(hasAlternatives("lodash")).toBe(true);
      expect(hasAlternatives("moment")).toBe(true);
      expect(hasAlternatives("axios")).toBe(true);
      expect(hasAlternatives("uuid")).toBe(true);
    });

    it("should return true for e18e packages", () => {
      expect(hasAlternatives("has-flag")).toBe(true);
      expect(hasAlternatives("array-includes")).toBe(true);
      expect(hasAlternatives("is-even")).toBe(true);
      expect(hasAlternatives("left-pad")).toBe(true);
      expect(hasAlternatives("object-assign")).toBe(true);
    });

    it("should return false for packages without alternatives", () => {
      expect(hasAlternatives("react")).toBe(false);
      expect(hasAlternatives("@tanstack/react-query")).toBe(false);
      expect(hasAlternatives("unknown-package")).toBe(false);
    });
  });

  describe("getPackagesWithAlternatives", () => {
    it("should include built-in packages", () => {
      const packages = getPackagesWithAlternatives();

      expect(packages).toContain("lodash");
      expect(packages).toContain("moment");
      expect(packages).toContain("axios");
      expect(packages).toContain("uuid");
      expect(packages).toContain("classnames");
      expect(packages).toContain("underscore");
      expect(packages).toContain("ramda");
    });

    it("should include e18e packages", () => {
      const packages = getPackagesWithAlternatives();

      expect(packages).toContain("has-flag");
      expect(packages).toContain("array-includes");
      expect(packages).toContain("left-pad");
      expect(packages).toContain("object-assign");
      expect(packages).toContain("is-windows");
    });

    it("should return at least 150 packages after e18e integration", () => {
      const packages = getPackagesWithAlternatives();
      expect(packages.length).toBeGreaterThanOrEqual(150);
    });

    it("should return no duplicates", () => {
      const packages = getPackagesWithAlternatives();
      expect(new Set(packages).size).toBe(packages.length);
    });
  });
});
