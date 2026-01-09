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
    it("should return true for packages with alternatives", () => {
      expect(hasAlternatives("lodash")).toBe(true);
      expect(hasAlternatives("moment")).toBe(true);
      expect(hasAlternatives("axios")).toBe(true);
      expect(hasAlternatives("uuid")).toBe(true);
    });

    it("should return false for packages without alternatives", () => {
      expect(hasAlternatives("react")).toBe(false);
      expect(hasAlternatives("@tanstack/react-query")).toBe(false);
      expect(hasAlternatives("unknown-package")).toBe(false);
    });
  });

  describe("getPackagesWithAlternatives", () => {
    it("should return list of all packages with alternatives", () => {
      const packages = getPackagesWithAlternatives();

      expect(packages).toContain("lodash");
      expect(packages).toContain("moment");
      expect(packages).toContain("axios");
      expect(packages).toContain("uuid");
      expect(packages).toContain("classnames");
      expect(packages).toContain("underscore");
      expect(packages).toContain("ramda");
      expect(packages).toContain("node-fetch");
    });

    it("should return an array", () => {
      const packages = getPackagesWithAlternatives();
      expect(Array.isArray(packages)).toBe(true);
      expect(packages.length).toBeGreaterThan(0);
    });
  });
});
