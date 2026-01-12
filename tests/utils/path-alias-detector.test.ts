import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  isPathAlias,
  createPathAliasChecker,
  readTsConfigPaths,
  pathAliasToRegex,
} from "../../src/utils/path-alias-detector.js";

describe("path-alias-detector", () => {
  describe("isPathAlias", () => {
    describe("common patterns", () => {
      it("should detect @/ as path alias", () => {
        expect(isPathAlias("@/components/Button")).toBe(true);
        expect(isPathAlias("@/utils/helpers")).toBe(true);
        expect(isPathAlias("@/hooks/useAuth")).toBe(true);
      });

      it("should detect ~/ as path alias", () => {
        expect(isPathAlias("~/components/Button")).toBe(true);
        expect(isPathAlias("~/utils/helpers")).toBe(true);
      });

      it("should detect #/ as path alias", () => {
        expect(isPathAlias("#/components/Button")).toBe(true);
      });

      it("should detect word-based aliases", () => {
        expect(isPathAlias("@app/components")).toBe(true);
        expect(isPathAlias("@lib/utils")).toBe(true);
        expect(isPathAlias("@components/Button")).toBe(true);
        expect(isPathAlias("@utils/format")).toBe(true);
        expect(isPathAlias("@hooks/useUser")).toBe(true);
        expect(isPathAlias("@services/api")).toBe(true);
        expect(isPathAlias("@store/auth")).toBe(true);
        expect(isPathAlias("@features/auth")).toBe(true);
      });

      it("should NOT detect npm scoped packages as path aliases", () => {
        // Real npm packages
        expect(isPathAlias("@types/node")).toBe(false);
        expect(isPathAlias("@types/react")).toBe(false);
        expect(isPathAlias("@prisma/client")).toBe(false);
        expect(isPathAlias("@tanstack/react-query")).toBe(false);
        expect(isPathAlias("@radix-ui/react-dialog")).toBe(false);
        expect(isPathAlias("@trpc/server")).toBe(false);
      });

      it("should NOT detect regular packages as path aliases", () => {
        expect(isPathAlias("lodash")).toBe(false);
        expect(isPathAlias("react")).toBe(false);
        expect(isPathAlias("zod")).toBe(false);
        expect(isPathAlias("next")).toBe(false);
      });
    });
  });

  describe("pathAliasToRegex", () => {
    it("should convert simple alias to regex", () => {
      const regex = pathAliasToRegex("@/*");
      expect(regex.test("@/components")).toBe(true);
      expect(regex.test("@/utils/helpers")).toBe(true);
      expect(regex.test("@prisma/client")).toBe(false);
    });

    it("should escape special regex characters", () => {
      const regex = pathAliasToRegex("@app/*");
      expect(regex.test("@app/components")).toBe(true);
      expect(regex.test("@application/foo")).toBe(false);
    });

    it("should handle paths without wildcards", () => {
      const regex = pathAliasToRegex("@/src");
      expect(regex.test("@/src")).toBe(true);
      expect(regex.test("@/src/utils")).toBe(true); // Prefix match
    });
  });

  describe("readTsConfigPaths", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dep-scope-test-"));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("should read paths from tsconfig.json", () => {
      const tsconfig = {
        compilerOptions: {
          paths: {
            "@/*": ["./src/*"],
            "@lib/*": ["./lib/*"],
          },
        },
      };
      fs.writeFileSync(
        path.join(tempDir, "tsconfig.json"),
        JSON.stringify(tsconfig)
      );

      const paths = readTsConfigPaths(tempDir);
      expect(paths).toEqual({
        "@/*": ["./src/*"],
        "@lib/*": ["./lib/*"],
      });
    });

    it("should return empty object if tsconfig.json doesn't exist", () => {
      const paths = readTsConfigPaths(tempDir);
      expect(paths).toEqual({});
    });

    it("should return empty object if compilerOptions.paths is missing", () => {
      const tsconfig = { compilerOptions: {} };
      fs.writeFileSync(
        path.join(tempDir, "tsconfig.json"),
        JSON.stringify(tsconfig)
      );

      const paths = readTsConfigPaths(tempDir);
      expect(paths).toEqual({});
    });

    it("should handle tsconfig with comments", () => {
      const tsconfigWithComments = `{
        // This is a comment
        "compilerOptions": {
          /* Another comment */
          "paths": {
            "@/*": ["./src/*"]
          }
        }
      }`;
      fs.writeFileSync(
        path.join(tempDir, "tsconfig.json"),
        tsconfigWithComments
      );

      const paths = readTsConfigPaths(tempDir);
      expect(paths).toEqual({ "@/*": ["./src/*"] });
    });
  });

  describe("createPathAliasChecker", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dep-scope-test-"));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("should check common patterns without tsconfig", () => {
      const checker = createPathAliasChecker(tempDir);

      expect(checker("@/components")).toBe(true);
      expect(checker("~/utils")).toBe(true);
      expect(checker("lodash")).toBe(false);
      expect(checker("@prisma/client")).toBe(false);
    });

    it("should check project-specific paths from tsconfig", () => {
      const tsconfig = {
        compilerOptions: {
          paths: {
            "@custom/*": ["./custom/*"],
          },
        },
      };
      fs.writeFileSync(
        path.join(tempDir, "tsconfig.json"),
        JSON.stringify(tsconfig)
      );

      const checker = createPathAliasChecker(tempDir);

      // Common patterns
      expect(checker("@/components")).toBe(true);

      // Custom paths from tsconfig
      expect(checker("@custom/utils")).toBe(true);

      // Not an alias
      expect(checker("@prisma/client")).toBe(false);
    });
  });
});
