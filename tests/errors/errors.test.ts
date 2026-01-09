import { describe, it, expect } from "vitest";
import {
  DepScopeError,
  ProjectNotFoundError,
  PackageJsonNotFoundError,
  InvalidPackageJsonError,
  SourcePathNotFoundError,
  PackageNotFoundError,
  InvalidOptionError,
  FileParseError,
  ConfigLoadError,
  formatError,
  isDepScopeError,
} from "../../src/errors/index.js";

describe("Custom Errors", () => {
  describe("DepScopeError", () => {
    it("should create error with code and details", () => {
      const error = new DepScopeError("Test message", "TEST_CODE", { key: "value" });

      expect(error.message).toBe("Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.details).toEqual({ key: "value" });
      expect(error.name).toBe("DepScopeError");
    });

    it("should work without details", () => {
      const error = new DepScopeError("Test message", "TEST_CODE");

      expect(error.message).toBe("Test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.details).toBeUndefined();
    });
  });

  describe("ProjectNotFoundError", () => {
    it("should create error with project path", () => {
      const error = new ProjectNotFoundError("/path/to/project");

      expect(error.message).toContain("/path/to/project");
      expect(error.code).toBe("PROJECT_NOT_FOUND");
      expect(error.details?.projectPath).toBe("/path/to/project");
      expect(error.name).toBe("ProjectNotFoundError");
    });
  });

  describe("PackageJsonNotFoundError", () => {
    it("should create error with project path", () => {
      const error = new PackageJsonNotFoundError("/path/to/project");

      expect(error.message).toContain("package.json");
      expect(error.message).toContain("/path/to/project");
      expect(error.code).toBe("PACKAGE_JSON_NOT_FOUND");
      expect(error.name).toBe("PackageJsonNotFoundError");
    });
  });

  describe("InvalidPackageJsonError", () => {
    it("should create error with parse error", () => {
      const error = new InvalidPackageJsonError("/path/to/project", "Unexpected token");

      expect(error.message).toContain("Invalid package.json");
      expect(error.message).toContain("Unexpected token");
      expect(error.code).toBe("INVALID_PACKAGE_JSON");
      expect(error.details?.parseError).toBe("Unexpected token");
    });

    it("should use default message without parse error", () => {
      const error = new InvalidPackageJsonError("/path/to/project");

      expect(error.message).toContain("Parse error");
    });
  });

  describe("SourcePathNotFoundError", () => {
    it("should create error with source path and project path", () => {
      const error = new SourcePathNotFoundError("./lib", "/path/to/project");

      expect(error.message).toContain("./lib");
      expect(error.message).toContain("/path/to/project");
      expect(error.code).toBe("SOURCE_PATH_NOT_FOUND");
      expect(error.details?.srcPath).toBe("./lib");
    });
  });

  describe("PackageNotFoundError", () => {
    it("should create error with package name", () => {
      const error = new PackageNotFoundError("lodash", "/path/to/project");

      expect(error.message).toContain("lodash");
      expect(error.message).toContain("not found");
      expect(error.code).toBe("PACKAGE_NOT_FOUND");
      expect(error.details?.packageName).toBe("lodash");
    });
  });

  describe("InvalidOptionError", () => {
    it("should create error with option and value", () => {
      const error = new InvalidOptionError("format", "invalid", ["console", "json"]);

      expect(error.message).toContain("--format");
      expect(error.message).toContain('"invalid"');
      expect(error.message).toContain("console, json");
      expect(error.code).toBe("INVALID_OPTION");
    });

    it("should work without valid values", () => {
      const error = new InvalidOptionError("threshold", "abc");

      expect(error.message).toContain("--threshold");
      expect(error.message).toContain('"abc"');
    });
  });

  describe("FileParseError", () => {
    it("should create error with file path and error", () => {
      const error = new FileParseError("/path/to/file.ts", "Syntax error");

      expect(error.message).toContain("/path/to/file.ts");
      expect(error.message).toContain("Syntax error");
      expect(error.code).toBe("FILE_PARSE_ERROR");
    });
  });

  describe("ConfigLoadError", () => {
    it("should create error with config path", () => {
      const error = new ConfigLoadError("/path/.depscoperc", "Invalid JSON");

      expect(error.message).toContain("/path/.depscoperc");
      expect(error.message).toContain("Invalid JSON");
      expect(error.code).toBe("CONFIG_LOAD_ERROR");
    });
  });
});

describe("formatError", () => {
  it("should format DepScopeError with code", () => {
    const error = new PackageJsonNotFoundError("/project");
    const formatted = formatError(error);

    expect(formatted).toContain("[PACKAGE_JSON_NOT_FOUND]");
    expect(formatted).toContain("package.json");
  });

  it("should format generic Error", () => {
    const error = new Error("Something went wrong");
    const formatted = formatError(error);

    expect(formatted).toBe("Error: Something went wrong");
  });

  it("should format non-Error values", () => {
    const formatted = formatError("string error");

    expect(formatted).toBe("Error: string error");
  });
});

describe("isDepScopeError", () => {
  it("should return true for DepScopeError", () => {
    const error = new DepScopeError("Test", "TEST");
    expect(isDepScopeError(error)).toBe(true);
  });

  it("should return true for derived errors", () => {
    const error = new PackageJsonNotFoundError("/project");
    expect(isDepScopeError(error)).toBe(true);
  });

  it("should return false for generic Error", () => {
    const error = new Error("Generic");
    expect(isDepScopeError(error)).toBe(false);
  });

  it("should return false for non-Error", () => {
    expect(isDepScopeError("string")).toBe(false);
    expect(isDepScopeError(null)).toBe(false);
    expect(isDepScopeError(undefined)).toBe(false);
  });
});
