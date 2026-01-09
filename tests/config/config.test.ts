import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs/promises";

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

import { loadConfig, mergeConfig, type DepScopeConfig } from "../../src/config/index.js";

describe("Config", () => {
  const mockAccess = fs.access as ReturnType<typeof vi.fn>;
  const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;

  // Helper to set up mocks for a successful config read
  const setupSuccessfulConfigRead = (configContent: string) => {
    mockAccess.mockImplementation(async () => undefined);
    mockReadFile.mockImplementation(async () => configContent);
  };

  beforeEach(() => {
    // Reset to default empty mock state
    mockAccess.mockReset();
    mockReadFile.mockReset();
  });

  describe("loadConfig", () => {
    it("should return null when no config file exists", async () => {
      mockAccess.mockImplementation(async () => {
        throw new Error("ENOENT");
      });

      const config = await loadConfig("/project");

      expect(config).toBeNull();
    });

    it("should load .depscoperc.json config", async () => {
      // Mock: first file (.depscoperc) doesn't exist, second (.depscoperc.json) does
      let callCount = 0;
      mockAccess.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("ENOENT");
        }
        return undefined;
      });
      mockReadFile.mockImplementation(async () =>
        JSON.stringify({
          srcPaths: ["./lib"],
          threshold: 10,
        })
      );

      const config = await loadConfig("/project");

      expect(config).toEqual({
        srcPaths: ["./lib"],
        threshold: 10,
      });
    });

    it("should validate srcPaths is array of strings", async () => {
      setupSuccessfulConfigRead(
        JSON.stringify({
          srcPaths: [1, 2, 3], // Invalid
        })
      );

      await expect(loadConfig("/project")).rejects.toThrow("Invalid config");
    });

    it("should validate threshold is number in range", async () => {
      setupSuccessfulConfigRead(
        JSON.stringify({
          threshold: 200, // Invalid - too high
        })
      );

      await expect(loadConfig("/project")).rejects.toThrow("Invalid config");
    });

    it("should validate format is valid value", async () => {
      setupSuccessfulConfigRead(
        JSON.stringify({
          format: "invalid",
        })
      );

      await expect(loadConfig("/project")).rejects.toThrow("Invalid config");
    });

    it("should validate includeDev is boolean", async () => {
      setupSuccessfulConfigRead(
        JSON.stringify({
          includeDev: "yes", // Invalid
        })
      );

      await expect(loadConfig("/project")).rejects.toThrow("Invalid config");
    });

    it("should validate ignore is array of strings", async () => {
      setupSuccessfulConfigRead(
        JSON.stringify({
          ignore: "react", // Invalid - not array
        })
      );

      await expect(loadConfig("/project")).rejects.toThrow("Invalid config");
    });

    it("should throw on invalid JSON", async () => {
      setupSuccessfulConfigRead("{ invalid json }");

      await expect(loadConfig("/project")).rejects.toThrow("Failed to load config");
    });

    it("should throw if config is not an object", async () => {
      setupSuccessfulConfigRead('"string"');

      await expect(loadConfig("/project")).rejects.toThrow("Invalid config");
    });

    it("should accept valid complete config", async () => {
      setupSuccessfulConfigRead(
        JSON.stringify({
          srcPaths: ["./src", "./lib"],
          threshold: 8,
          includeDev: true,
          ignore: ["lodash", "moment"],
          ignorePatterns: ["@types/*"],
          format: "markdown",
          output: "./report.md",
          verbose: true,
        })
      );

      const config = await loadConfig("/project");

      expect(config).toEqual({
        srcPaths: ["./src", "./lib"],
        threshold: 8,
        includeDev: true,
        ignore: ["lodash", "moment"],
        ignorePatterns: ["@types/*"],
        format: "markdown",
        output: "./report.md",
        verbose: true,
      });
    });
  });

  describe("mergeConfig", () => {
    it("should return CLI options when no file config", () => {
      const cliOptions: Partial<DepScopeConfig> = {
        srcPaths: ["./src"],
        threshold: 5,
      };

      const result = mergeConfig(cliOptions, null);

      expect(result).toEqual(cliOptions);
    });

    it("should merge CLI options over file config", () => {
      const cliOptions: Partial<DepScopeConfig> = {
        threshold: 10, // Override
      };

      const fileConfig: DepScopeConfig = {
        srcPaths: ["./lib"],
        threshold: 5,
        format: "json",
      };

      const result = mergeConfig(cliOptions, fileConfig);

      expect(result.threshold).toBe(10); // CLI wins
      expect(result.srcPaths).toEqual(["./lib"]); // From file
      expect(result.format).toBe("json"); // From file
    });

    it("should merge ignore arrays", () => {
      const cliOptions: Partial<DepScopeConfig> = {
        ignore: ["lodash"],
      };

      const fileConfig: DepScopeConfig = {
        ignore: ["react"],
        ignorePatterns: ["@types/*"],
      };

      const result = mergeConfig(cliOptions, fileConfig);

      expect(result.ignore).toContain("react");
      expect(result.ignore).toContain("lodash");
      expect(result.ignore).toContain("@types/*");
    });

    it("should deduplicate ignore entries", () => {
      const cliOptions: Partial<DepScopeConfig> = {
        ignore: ["react", "lodash"],
      };

      const fileConfig: DepScopeConfig = {
        ignore: ["react", "moment"], // react is duplicate
      };

      const result = mergeConfig(cliOptions, fileConfig);

      const reactCount = result.ignore?.filter((i) => i === "react").length;
      expect(reactCount).toBe(1);
    });
  });
});
