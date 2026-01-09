import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "node:child_process";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import {
  isKnipAvailable,
  runKnipAnalysis,
  formatKnipSummary,
  type KnipAnalysis,
} from "../../src/integrations/knip.js";

describe("Knip Integration", () => {
  const mockExecSync = execSync as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecSync.mockReset();
  });

  describe("isKnipAvailable", () => {
    it("should return true when Knip is installed", () => {
      mockExecSync.mockReturnValue("5.0.0");

      const result = isKnipAvailable("/project");

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith("npx knip --version", expect.any(Object));
    });

    it("should return false when Knip is not installed", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const result = isKnipAvailable("/project");

      expect(result).toBe(false);
    });
  });

  describe("runKnipAnalysis", () => {
    it("should parse Knip JSON output with unused dependencies", async () => {
      // First call: version check
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) {
          return "5.0.0";
        }
        // Second call: actual analysis
        return JSON.stringify({
          files: [],
          issues: [
            {
              file: "package.json",
              dependencies: [{ name: "moment" }, { name: "axios" }],
              devDependencies: [{ name: "jest" }],
              optionalPeerDependencies: [],
              unlisted: [{ name: "chalk" }],
              binaries: [],
              unresolved: [],
            },
          ],
        });
      });

      const result = await runKnipAnalysis("/project");

      expect(result.available).toBe(true);
      expect(result.unusedDependencies.has("moment")).toBe(true);
      expect(result.unusedDependencies.has("axios")).toBe(true);
      expect(result.unusedDevDependencies.has("jest")).toBe(true);
      expect(result.unlistedDependencies.has("chalk")).toBe(true);
    });

    it("should return empty sets when no issues found", async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) {
          return "5.0.0";
        }
        return JSON.stringify({ files: [], issues: [] });
      });

      const result = await runKnipAnalysis("/project");

      expect(result.available).toBe(true);
      expect(result.unusedDependencies.size).toBe(0);
      expect(result.unusedDevDependencies.size).toBe(0);
    });

    it("should handle Knip not being installed", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const result = await runKnipAnalysis("/project");

      expect(result.available).toBe(false);
      expect(result.error).toContain("not installed");
    });

    it("should handle multiple issues from different files", async () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) {
          return "5.0.0";
        }
        return JSON.stringify({
          files: [],
          issues: [
            {
              file: "package.json",
              dependencies: [{ name: "lodash" }],
              devDependencies: [],
              optionalPeerDependencies: [],
              unlisted: [],
              binaries: [],
              unresolved: [],
            },
            {
              file: "src/index.ts",
              dependencies: [{ name: "moment" }],
              devDependencies: [],
              optionalPeerDependencies: [],
              unlisted: [],
              binaries: [],
              unresolved: [],
            },
          ],
        });
      });

      const result = await runKnipAnalysis("/project");

      expect(result.unusedDependencies.has("lodash")).toBe(true);
      expect(result.unusedDependencies.has("moment")).toBe(true);
    });
  });

  describe("formatKnipSummary", () => {
    it("should format summary with unused dependencies", () => {
      const analysis: KnipAnalysis = {
        unusedDependencies: new Set(["lodash", "moment"]),
        unusedDevDependencies: new Set(["jest"]),
        unlistedDependencies: new Set(),
        unresolvedImports: new Set(),
        available: true,
      };

      const summary = formatKnipSummary(analysis);

      expect(summary).toContain("2 unused dependencies");
      expect(summary).toContain("1 unused devDependencies");
    });

    it("should show 'no issues' when empty", () => {
      const analysis: KnipAnalysis = {
        unusedDependencies: new Set(),
        unusedDevDependencies: new Set(),
        unlistedDependencies: new Set(),
        unresolvedImports: new Set(),
        available: true,
      };

      const summary = formatKnipSummary(analysis);

      expect(summary).toContain("No issues found");
    });

    it("should show error when not available", () => {
      const analysis: KnipAnalysis = {
        unusedDependencies: new Set(),
        unusedDevDependencies: new Set(),
        unlistedDependencies: new Set(),
        unresolvedImports: new Set(),
        available: false,
        error: "Knip is not installed",
      };

      const summary = formatKnipSummary(analysis);

      expect(summary).toContain("not available");
      expect(summary).toContain("Knip is not installed");
    });
  });
});
