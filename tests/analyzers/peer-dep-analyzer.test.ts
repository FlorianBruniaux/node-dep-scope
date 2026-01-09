import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PeerDepAnalyzer } from "../../src/analyzers/peer-dep-analyzer.js";
import * as fs from "node:fs/promises";

// Mock fs module
vi.mock("node:fs/promises");

describe("PeerDepAnalyzer", () => {
  let analyzer: PeerDepAnalyzer;

  beforeEach(() => {
    analyzer = new PeerDepAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    analyzer.clearCache();
  });

  const mockPackageJson = (
    name: string,
    deps: {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    } = {}
  ) => {
    return JSON.stringify({
      name,
      version: "1.0.0",
      ...deps,
    });
  };

  describe("analyzePeerDeps", () => {
    it("should detect when package is required by another package as dependency", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("@ai-sdk/openai")) {
          return mockPackageJson("@ai-sdk/openai", {
            dependencies: { "@ai-sdk/provider": "^1.0.0" },
          });
        }
        if (path.includes("@ai-sdk/provider")) {
          return mockPackageJson("@ai-sdk/provider");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.analyzePeerDeps("/project", [
        "@ai-sdk/openai",
        "@ai-sdk/provider",
      ]);

      const providerInfo = result.get("@ai-sdk/provider");
      expect(providerInfo).toBeDefined();
      expect(providerInfo?.requiredBy).toContain("@ai-sdk/openai");
      expect(providerInfo?.safeToRemoveFromPackageJson).toBe(true);
    });

    it("should detect when package is required as peerDependency", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("react-dom")) {
          return mockPackageJson("react-dom", {
            peerDependencies: { react: "^18.0.0" },
          });
        }
        if (path.includes("react")) {
          return mockPackageJson("react");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.analyzePeerDeps("/project", [
        "react",
        "react-dom",
      ]);

      const reactInfo = result.get("react");
      expect(reactInfo?.requiredBy).toContain("react-dom");
    });

    it("should detect multiple packages requiring the same dependency", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("@ai-sdk/openai")) {
          return mockPackageJson("@ai-sdk/openai", {
            dependencies: { "@ai-sdk/provider": "^1.0.0" },
          });
        }
        if (path.includes("@ai-sdk/anthropic")) {
          return mockPackageJson("@ai-sdk/anthropic", {
            dependencies: { "@ai-sdk/provider": "^1.0.0" },
          });
        }
        if (path.includes("@ai-sdk/google")) {
          return mockPackageJson("@ai-sdk/google", {
            peerDependencies: { "@ai-sdk/provider": "^1.0.0" },
          });
        }
        if (path.includes("@ai-sdk/provider")) {
          return mockPackageJson("@ai-sdk/provider");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.analyzePeerDeps("/project", [
        "@ai-sdk/openai",
        "@ai-sdk/anthropic",
        "@ai-sdk/google",
        "@ai-sdk/provider",
      ]);

      const providerInfo = result.get("@ai-sdk/provider");
      expect(providerInfo?.requiredBy).toHaveLength(3);
      expect(providerInfo?.requiredBy).toContain("@ai-sdk/openai");
      expect(providerInfo?.requiredBy).toContain("@ai-sdk/anthropic");
      expect(providerInfo?.requiredBy).toContain("@ai-sdk/google");
    });

    it("should return empty requiredBy for packages not required by others", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("lodash")) {
          return mockPackageJson("lodash");
        }
        if (path.includes("express")) {
          return mockPackageJson("express");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.analyzePeerDeps("/project", [
        "lodash",
        "express",
      ]);

      const lodashInfo = result.get("lodash");
      expect(lodashInfo?.requiredBy).toHaveLength(0);
      expect(lodashInfo?.safeToRemoveFromPackageJson).toBe(false);
    });

    it("should handle packages that cannot be read", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("existing-pkg")) {
          return mockPackageJson("existing-pkg");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.analyzePeerDeps("/project", [
        "existing-pkg",
        "missing-pkg",
      ]);

      expect(result.has("existing-pkg")).toBe(true);
      expect(result.has("missing-pkg")).toBe(true);
    });

    it("should handle optionalDependencies", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("main-pkg")) {
          return mockPackageJson("main-pkg", {
            optionalDependencies: { "optional-dep": "^1.0.0" },
          });
        }
        if (path.includes("optional-dep")) {
          return mockPackageJson("optional-dep");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.analyzePeerDeps("/project", [
        "main-pkg",
        "optional-dep",
      ]);

      const optionalInfo = result.get("optional-dep");
      expect(optionalInfo?.requiredBy).toContain("main-pkg");
    });
  });

  describe("checkPackagePeerDeps", () => {
    it("should check if a single package is required by others", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("pkg-a")) {
          return mockPackageJson("pkg-a", {
            dependencies: { "target-pkg": "^1.0.0" },
          });
        }
        if (path.includes("pkg-b")) {
          return mockPackageJson("pkg-b", {
            peerDependencies: { "target-pkg": "^1.0.0" },
          });
        }
        if (path.includes("target-pkg")) {
          return mockPackageJson("target-pkg");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.checkPackagePeerDeps(
        "/project",
        "target-pkg",
        ["pkg-a", "pkg-b", "target-pkg"]
      );

      expect(result.requiredBy).toHaveLength(2);
      expect(result.requiredBy).toContain("pkg-a");
      expect(result.requiredBy).toContain("pkg-b");
      expect(result.safeToRemoveFromPackageJson).toBe(true);
    });

    it("should not include the package itself in requiredBy", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("self-referencing")) {
          return mockPackageJson("self-referencing", {
            dependencies: { "self-referencing": "^1.0.0" },
          });
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.checkPackagePeerDeps(
        "/project",
        "self-referencing",
        ["self-referencing"]
      );

      expect(result.requiredBy).not.toContain("self-referencing");
    });

    it("should return empty requiredBy when no packages depend on target", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        if (path.includes("independent-pkg")) {
          return mockPackageJson("independent-pkg");
        }
        if (path.includes("other-pkg")) {
          return mockPackageJson("other-pkg");
        }
        throw new Error("ENOENT");
      });

      const result = await analyzer.checkPackagePeerDeps(
        "/project",
        "independent-pkg",
        ["independent-pkg", "other-pkg"]
      );

      expect(result.requiredBy).toHaveLength(0);
      expect(result.safeToRemoveFromPackageJson).toBe(false);
    });
  });

  describe("caching", () => {
    it("should cache package.json reads", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(mockPackageJson("test-pkg"));

      await analyzer.analyzePeerDeps("/project", ["test-pkg"]);
      await analyzer.analyzePeerDeps("/project", ["test-pkg"]);

      // Should only read once due to caching
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it("should clear cache when clearCache is called", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(mockPackageJson("test-pkg"));

      await analyzer.analyzePeerDeps("/project", ["test-pkg"]);
      analyzer.clearCache();
      await analyzer.analyzePeerDeps("/project", ["test-pkg"]);

      // Should read twice because cache was cleared
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it("should cache null for missing packages", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      await analyzer.analyzePeerDeps("/project", ["missing-pkg"]);
      await analyzer.analyzePeerDeps("/project", ["missing-pkg"]);

      // Should only attempt to read once
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe("scoped packages", () => {
    it("should handle scoped package paths correctly", async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const path = filePath.toString();
        // Check that path is correctly constructed for scoped packages
        expect(path).toContain("@scope/package");
        return mockPackageJson("@scope/package");
      });

      await analyzer.analyzePeerDeps("/project", ["@scope/package"]);

      expect(fs.readFile).toHaveBeenCalled();
    });
  });
});
