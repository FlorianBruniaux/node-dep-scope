import { describe, it, expect, beforeEach } from "vitest";
import { PackageJsonReader } from "../../src/utils/package-json-reader.js";
import { MockFileSystem } from "../../src/utils/filesystem.js";
import { NullLogger } from "../../src/utils/logger.js";
import {
  PackageJsonNotFoundError,
  InvalidPackageJsonError,
} from "../../src/errors/index.js";

describe("PackageJsonReader", () => {
  let reader: PackageJsonReader;
  let mockFs: MockFileSystem;
  let nullLogger: NullLogger;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    nullLogger = new NullLogger();
    reader = new PackageJsonReader({
      fileSystem: mockFs,
      logger: nullLogger,
    });
  });

  const createPackageJson = (content: Record<string, unknown>) =>
    JSON.stringify(content, null, 2);

  describe("read", () => {
    it("should read and parse valid package.json", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          name: "test-project",
          version: "1.0.0",
          dependencies: { lodash: "^4.0.0" },
          devDependencies: { typescript: "^5.0.0" },
        })
      );

      const result = await reader.read("/project");

      expect(result.name).toBe("test-project");
      expect(result.version).toBe("1.0.0");
      expect(result.dependencies).toEqual({ lodash: "^4.0.0" });
      expect(result.devDependencies).toEqual({ typescript: "^5.0.0" });
    });

    it("should throw PackageJsonNotFoundError when file doesn't exist", async () => {
      await expect(reader.read("/nonexistent")).rejects.toThrow(
        PackageJsonNotFoundError
      );
    });

    it("should throw InvalidPackageJsonError for invalid JSON", async () => {
      mockFs.addFile("/project/package.json", "{ invalid json }");

      await expect(reader.read("/project")).rejects.toThrow(
        InvalidPackageJsonError
      );
    });

    it("should handle package.json with no dependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          name: "minimal-project",
          version: "0.0.1",
        })
      );

      const result = await reader.read("/project");

      expect(result.name).toBe("minimal-project");
      expect(result.dependencies).toBeUndefined();
      expect(result.devDependencies).toBeUndefined();
    });

    it("should handle package.json with peer dependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          name: "lib-project",
          peerDependencies: { react: "^18.0.0" },
        })
      );

      const result = await reader.read("/project");

      expect(result.peerDependencies).toEqual({ react: "^18.0.0" });
    });

    it("should cache package.json reads", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({ name: "test" })
      );

      // Read twice
      const result1 = await reader.read("/project");
      const result2 = await reader.read("/project");

      // Should return the same cached result
      expect(result1).toBe(result2);
    });

    it("should handle paths with trailing slashes", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({ name: "test" })
      );

      // Both should work and use the same cache
      const result1 = await reader.read("/project");
      const result2 = await reader.read("/project/");

      expect(result1.name).toBe("test");
      expect(result2.name).toBe("test");
    });
  });

  describe("getDependencies", () => {
    it("should return production dependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          dependencies: {
            lodash: "^4.0.0",
            express: "^4.0.0",
          },
        })
      );

      const deps = await reader.getDependencies("/project");

      expect(deps).toEqual({
        lodash: "^4.0.0",
        express: "^4.0.0",
      });
    });

    it("should return empty object when no dependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({ name: "no-deps" })
      );

      const deps = await reader.getDependencies("/project");

      expect(deps).toEqual({});
    });
  });

  describe("getDevDependencies", () => {
    it("should return dev dependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          devDependencies: {
            typescript: "^5.0.0",
            vitest: "^1.0.0",
          },
        })
      );

      const deps = await reader.getDevDependencies("/project");

      expect(deps).toEqual({
        typescript: "^5.0.0",
        vitest: "^1.0.0",
      });
    });

    it("should return empty object when no devDependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({ name: "no-dev-deps" })
      );

      const deps = await reader.getDevDependencies("/project");

      expect(deps).toEqual({});
    });
  });

  describe("getAllDependencies", () => {
    it("should return only production dependencies by default", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          dependencies: { lodash: "^4.0.0" },
          devDependencies: { typescript: "^5.0.0" },
        })
      );

      const deps = await reader.getAllDependencies("/project");

      expect(deps).toEqual({ lodash: "^4.0.0" });
    });

    it("should include dev dependencies when includeDev is true", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          dependencies: { lodash: "^4.0.0" },
          devDependencies: { typescript: "^5.0.0" },
        })
      );

      const deps = await reader.getAllDependencies("/project", true);

      expect(deps).toEqual({
        lodash: "^4.0.0",
        typescript: "^5.0.0",
      });
    });

    it("should handle overlapping dependencies (dev overrides prod)", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          dependencies: { lodash: "^3.0.0" },
          devDependencies: { lodash: "^4.0.0" },
        })
      );

      const deps = await reader.getAllDependencies("/project", true);

      // devDependencies should override (spread order)
      expect(deps.lodash).toBe("^4.0.0");
    });
  });

  describe("getPeerDependencies", () => {
    it("should return peer dependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({
          peerDependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
        })
      );

      const deps = await reader.getPeerDependencies("/project");

      expect(deps).toEqual({
        react: "^18.0.0",
        "react-dom": "^18.0.0",
      });
    });

    it("should return empty object when no peerDependencies", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({ name: "no-peer-deps" })
      );

      const deps = await reader.getPeerDependencies("/project");

      expect(deps).toEqual({});
    });
  });

  describe("clearCache", () => {
    it("should clear cached reads", async () => {
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({ name: "original" })
      );

      const result1 = await reader.read("/project");
      expect(result1.name).toBe("original");

      // Update the file
      mockFs.removeFile("/project/package.json");
      mockFs.addFile(
        "/project/package.json",
        createPackageJson({ name: "updated" })
      );

      // Should still return cached version
      const result2 = await reader.read("/project");
      expect(result2.name).toBe("original");

      // Clear cache
      reader.clearCache();

      // Now should return updated version
      const result3 = await reader.read("/project");
      expect(result3.name).toBe("updated");
    });
  });

  describe("error handling", () => {
    it("should include project path in PackageJsonNotFoundError", async () => {
      try {
        await reader.read("/missing/project");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(PackageJsonNotFoundError);
        expect((error as PackageJsonNotFoundError).details?.projectPath).toBe(
          "/missing/project"
        );
      }
    });

    it("should include parse error in InvalidPackageJsonError", async () => {
      mockFs.addFile("/project/package.json", "not valid json");

      try {
        await reader.read("/project");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPackageJsonError);
        expect((error as InvalidPackageJsonError).details?.parseError).toBeDefined();
      }
    });
  });

  describe("default instance", () => {
    it("should export a default instance", async () => {
      const { packageJsonReader } = await import(
        "../../src/utils/package-json-reader.js"
      );
      expect(packageJsonReader).toBeInstanceOf(PackageJsonReader);
    });
  });
});
