import { describe, it, expect, vi } from "vitest";
import * as path from "node:path";
import { TransitiveAnalyzer } from "../../src/analyzers/transitive-analyzer.js";

const FIXTURES = path.join(
  import.meta.dirname ?? __dirname,
  "../fixtures/transitive"
);

describe("TransitiveAnalyzer", () => {
  describe("simple (npm flat layout)", () => {
    it("finds e18e transitive package and attributes firstSeenVia correctly", async () => {
      const analyzer = new TransitiveAnalyzer();
      const findings = await analyzer.analyze(`${FIXTURES}/simple`, ["lodash"]);

      expect(findings).toHaveLength(1);
      expect(findings[0].package).toBe("is-string");
      expect(findings[0].firstSeenVia).toBe("lodash");
      expect(findings[0].nativeReplacement).toBeTruthy();
    });

    it("does not report direct dependencies as transitive echoes", async () => {
      // lodash itself has no e18e entry, only is-string does
      const analyzer = new TransitiveAnalyzer();
      const findings = await analyzer.analyze(`${FIXTURES}/simple`, ["lodash"]);

      const packages = findings.map((f) => f.package);
      expect(packages).not.toContain("lodash");
    });
  });

  describe("pnpm strict layout", () => {
    it("finds e18e transitive via .pnpm/ store when not hoisted", async () => {
      const analyzer = new TransitiveAnalyzer();
      // chalk is direct dep (hoisted symlink), has-flag is transitive in .pnpm/ only
      const findings = await analyzer.analyze(`${FIXTURES}/pnpm`, ["chalk"]);

      expect(findings).toHaveLength(1);
      expect(findings[0].package).toBe("has-flag");
      expect(findings[0].firstSeenVia).toBe("chalk");
    });
  });

  describe("cycle detection", () => {
    it("handles circular dependencies without infinite loop", async () => {
      const analyzer = new TransitiveAnalyzer();
      // pkg-a -> pkg-b -> pkg-a : neither is e18e so result is empty, but must not hang
      const findings = await analyzer.analyze(`${FIXTURES}/cycle`, ["pkg-a"]);
      expect(Array.isArray(findings)).toBe(true);
    });
  });

  describe("no node_modules", () => {
    it("throws a clear error when node_modules is missing", async () => {
      const analyzer = new TransitiveAnalyzer();
      await expect(
        analyzer.analyze(`${FIXTURES}/no-node-modules`, ["lodash"])
      ).rejects.toThrow(/node_modules not found/);
    });
  });

  describe("Yarn PnP", () => {
    it("returns empty array with a warning when .yarnrc.yml has pnpMode", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const analyzer = new TransitiveAnalyzer();
      const findings = await analyzer.analyze(`${FIXTURES}/yarn-pnp`, ["lodash"]);

      expect(findings).toHaveLength(0);
      warnSpy.mockRestore();
    });
  });

  describe("empty directDeps", () => {
    it("returns empty array when no direct deps provided", async () => {
      const analyzer = new TransitiveAnalyzer();
      const findings = await analyzer.analyze(`${FIXTURES}/simple`, []);
      expect(findings).toHaveLength(0);
    });
  });
});
