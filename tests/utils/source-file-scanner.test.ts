import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourceFileScanner } from "../../src/utils/source-file-scanner.js";
import { MockFileSystem } from "../../src/utils/filesystem.js";
import { NullLogger } from "../../src/utils/logger.js";
import { SourcePathNotFoundError } from "../../src/errors/index.js";
import fg from "fast-glob";

// Mock fast-glob
vi.mock("fast-glob");

describe("SourceFileScanner", () => {
  let scanner: SourceFileScanner;
  let mockFs: MockFileSystem;
  let nullLogger: NullLogger;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    nullLogger = new NullLogger();
    scanner = new SourceFileScanner({
      fileSystem: mockFs,
      logger: nullLogger,
    });
    vi.clearAllMocks();
  });

  describe("scan", () => {
    it("should scan for source files with correct patterns", async () => {
      vi.mocked(fg).mockResolvedValue([
        "/project/src/index.ts",
        "/project/src/utils.ts",
      ]);

      const files = await scanner.scan("/project", ["./src"], ["dist"]);

      expect(files).toEqual(["/project/src/index.ts", "/project/src/utils.ts"]);
      // path.join normalizes ./src to src
      expect(fg).toHaveBeenCalledWith(
        ["/project/src/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
        expect.objectContaining({
          ignore: ["**/node_modules/**", "**/dist/**"],
          absolute: true,
          onlyFiles: true,
        })
      );
    });

    it("should handle multiple source paths", async () => {
      vi.mocked(fg).mockResolvedValue([
        "/project/src/app.ts",
        "/project/lib/util.ts",
      ]);

      const files = await scanner.scan(
        "/project",
        ["./src", "./lib"],
        ["dist"]
      );

      expect(files).toHaveLength(2);
      // path.join normalizes paths
      expect(fg).toHaveBeenCalledWith(
        [
          "/project/src/**/*.{ts,tsx,js,jsx,mjs,cjs}",
          "/project/lib/**/*.{ts,tsx,js,jsx,mjs,cjs}",
        ],
        expect.anything()
      );
    });

    it("should always ignore node_modules", async () => {
      vi.mocked(fg).mockResolvedValue([]);

      await scanner.scan("/project", ["./src"], []);

      expect(fg).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ignore: expect.arrayContaining(["**/node_modules/**"]),
        })
      );
    });

    it("should not duplicate node_modules in ignore patterns", async () => {
      vi.mocked(fg).mockResolvedValue([]);

      await scanner.scan("/project", ["./src"], ["node_modules", "dist"]);

      const call = vi.mocked(fg).mock.calls[0];
      const ignorePatterns = call[1]?.ignore as string[];

      // Should have node_modules only once
      const nodeModulesCount = ignorePatterns.filter(
        (p) => p.includes("node_modules")
      ).length;
      expect(nodeModulesCount).toBe(1);
    });

    it("should return empty array when no files found", async () => {
      vi.mocked(fg).mockResolvedValue([]);

      const files = await scanner.scan("/project", ["./src"], []);

      expect(files).toEqual([]);
    });
  });

  describe("validatePaths", () => {
    it("should return valid paths when directories exist", async () => {
      mockFs.addDirectory("/project/src");
      mockFs.addDirectory("/project/lib");

      const validPaths = await scanner.validatePaths("/project", [
        "./src",
        "./lib",
      ]);

      expect(validPaths).toEqual(["./src", "./lib"]);
    });

    it("should throw SourcePathNotFoundError when path does not exist", async () => {
      await expect(
        scanner.validatePaths("/project", ["./nonexistent"])
      ).rejects.toThrow(SourcePathNotFoundError);
    });

    it("should filter non-existent paths in autoDetect mode", async () => {
      mockFs.addDirectory("/project/src");
      // lib does not exist

      const validPaths = await scanner.validatePaths(
        "/project",
        ["./src", "./lib"],
        { autoDetectWorkspace: true }
      );

      expect(validPaths).toEqual(["./src"]);
    });

    it("should throw when no valid paths even in autoDetect mode", async () => {
      await expect(
        scanner.validatePaths("/project", ["./nonexistent1", "./nonexistent2"], {
          autoDetectWorkspace: true,
        })
      ).rejects.toThrow(SourcePathNotFoundError);
    });

    it("should reject files (not directories)", async () => {
      mockFs.addFile("/project/src.ts", "content");

      await expect(
        scanner.validatePaths("/project", ["./src.ts"])
      ).rejects.toThrow(SourcePathNotFoundError);
    });
  });

  describe("scanWithValidation", () => {
    it("should validate and scan in one operation", async () => {
      mockFs.addDirectory("/project/src");
      vi.mocked(fg).mockResolvedValue(["/project/src/index.ts"]);

      const result = await scanner.scanWithValidation(
        "/project",
        ["./src"],
        ["dist"]
      );

      expect(result.validPaths).toEqual(["./src"]);
      expect(result.files).toEqual(["/project/src/index.ts"]);
    });

    it("should only scan validated paths", async () => {
      mockFs.addDirectory("/project/src");
      // lib does not exist
      vi.mocked(fg).mockResolvedValue(["/project/src/index.ts"]);

      const result = await scanner.scanWithValidation(
        "/project",
        ["./src", "./lib"],
        ["dist"],
        { autoDetectWorkspace: true }
      );

      expect(result.validPaths).toEqual(["./src"]);
      // fast-glob should only be called with valid paths (path.join normalizes)
      expect(fg).toHaveBeenCalledWith(
        ["/project/src/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
        expect.anything()
      );
    });
  });

  describe("isValidSourcePath", () => {
    it("should return true for existing directories", async () => {
      mockFs.addDirectory("/project/src");

      const isValid = await scanner.isValidSourcePath("/project", "./src");

      expect(isValid).toBe(true);
    });

    it("should return false for non-existent paths", async () => {
      const isValid = await scanner.isValidSourcePath(
        "/project",
        "./nonexistent"
      );

      expect(isValid).toBe(false);
    });

    it("should return false for files", async () => {
      mockFs.addFile("/project/file.ts", "content");

      const isValid = await scanner.isValidSourcePath("/project", "./file.ts");

      expect(isValid).toBe(false);
    });
  });

  describe("countFiles", () => {
    it("should return file count without exposing paths", async () => {
      vi.mocked(fg).mockResolvedValue([
        "/project/src/a.ts",
        "/project/src/b.ts",
        "/project/src/c.ts",
      ]);

      const count = await scanner.countFiles("/project", ["./src"], []);

      expect(count).toBe(3);
    });

    it("should return 0 for empty directories", async () => {
      vi.mocked(fg).mockResolvedValue([]);

      const count = await scanner.countFiles("/project", ["./src"], []);

      expect(count).toBe(0);
    });
  });

  describe("default instance", () => {
    it("should export a default instance", async () => {
      const { sourceFileScanner } = await import(
        "../../src/utils/source-file-scanner.js"
      );
      expect(sourceFileScanner).toBeInstanceOf(SourceFileScanner);
    });
  });

  describe("ignore patterns", () => {
    it("should convert ignore patterns to glob format", async () => {
      vi.mocked(fg).mockResolvedValue([]);

      await scanner.scan("/project", ["./src"], ["dist", "coverage", ".next"]);

      expect(fg).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ignore: [
            "**/node_modules/**",
            "**/dist/**",
            "**/coverage/**",
            "**/.next/**",
          ],
        })
      );
    });
  });
});
