import type { ILogger } from "./interfaces.js";

export type StringRefKind =
  | "config-plugin"
  | "config-loader"
  | "script-binary"
  | "config-env"
  | "string-import";

export interface StringReference {
  packageName: string;
  kind: StringRefKind;
  detector: string;
  location: { file: string; line: number; column: number };
  rawValue: string;
  evidence?: string;
}

export interface DetectorContext {
  projectPath: string;
  installedPackages: Set<string>;
  logger: ILogger;
}

export interface IStringReferenceDetector {
  readonly id: string;
  readonly label: string;
  readonly filePatterns: string[];
  detect(filePath: string, ctx: DetectorContext): Promise<StringReference[]>;
}

export interface IStringReferenceAnalyzer {
  collect(
    projectPath: string,
    installedPackages: Set<string>
  ): Promise<import("./index.js").ImportInfo[]>;
}

export function defineDetector(
  d: IStringReferenceDetector
): IStringReferenceDetector {
  return d;
}
