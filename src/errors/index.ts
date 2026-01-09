/**
 * Custom error classes for dep-scope
 */

export class DepScopeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DepScopeError";
  }
}

export class ProjectNotFoundError extends DepScopeError {
  constructor(projectPath: string) {
    super(
      `Project not found: ${projectPath}`,
      "PROJECT_NOT_FOUND",
      { projectPath }
    );
    this.name = "ProjectNotFoundError";
  }
}

export class PackageJsonNotFoundError extends DepScopeError {
  constructor(projectPath: string) {
    super(
      `package.json not found in ${projectPath}. Is this a Node.js project?`,
      "PACKAGE_JSON_NOT_FOUND",
      { projectPath }
    );
    this.name = "PackageJsonNotFoundError";
  }
}

export class InvalidPackageJsonError extends DepScopeError {
  constructor(projectPath: string, parseError?: string) {
    super(
      `Invalid package.json in ${projectPath}: ${parseError ?? "Parse error"}`,
      "INVALID_PACKAGE_JSON",
      { projectPath, parseError }
    );
    this.name = "InvalidPackageJsonError";
  }
}

export class SourcePathNotFoundError extends DepScopeError {
  constructor(srcPath: string, projectPath: string) {
    super(
      `Source directory not found: ${srcPath} (in ${projectPath})`,
      "SOURCE_PATH_NOT_FOUND",
      { srcPath, projectPath }
    );
    this.name = "SourcePathNotFoundError";
  }
}

export class PackageNotFoundError extends DepScopeError {
  constructor(packageName: string, projectPath: string) {
    super(
      `Package "${packageName}" not found in dependencies or devDependencies`,
      "PACKAGE_NOT_FOUND",
      { packageName, projectPath }
    );
    this.name = "PackageNotFoundError";
  }
}

export class InvalidOptionError extends DepScopeError {
  constructor(option: string, value: unknown, validValues?: string[]) {
    const validStr = validValues ? `. Valid values: ${validValues.join(", ")}` : "";
    super(
      `Invalid value for --${option}: "${value}"${validStr}`,
      "INVALID_OPTION",
      { option, value, validValues }
    );
    this.name = "InvalidOptionError";
  }
}

export class FileParseError extends DepScopeError {
  constructor(filePath: string, error?: string) {
    super(
      `Failed to parse ${filePath}: ${error ?? "Unknown error"}`,
      "FILE_PARSE_ERROR",
      { filePath, error }
    );
    this.name = "FileParseError";
  }
}

export class ConfigLoadError extends DepScopeError {
  constructor(configPath: string, error?: string) {
    super(
      `Failed to load config from ${configPath}: ${error ?? "Unknown error"}`,
      "CONFIG_LOAD_ERROR",
      { configPath, error }
    );
    this.name = "ConfigLoadError";
  }
}

/**
 * Format error for CLI output
 */
export function formatError(error: unknown): string {
  if (error instanceof DepScopeError) {
    return `Error [${error.code}]: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

/**
 * Check if error is a known dep-scope error
 */
export function isDepScopeError(error: unknown): error is DepScopeError {
  return error instanceof DepScopeError;
}
