/**
 * Transitive Dependency Analyzer
 * Walks the node_modules dependency graph (BFS) to find transitive packages
 * that have native JS alternatives in the e18e database.
 *
 * Supports: npm, pnpm (strict + non-strict), Bun (flat layout = npm-compatible)
 * Unsupported: Yarn PnP (warning + graceful skip)
 */

import * as path from "node:path";
import * as fs from "node:fs";
import type { IPackageJsonReader, TransitiveEchoFinding, ILogger } from "../types/index.js";
import { E18E_PACKAGES } from "../rules/e18e-data.js";
import { PackageJsonReader } from "../utils/package-json-reader.js";
import { ConsoleLogger } from "../utils/logger.js";

export interface TransitiveAnalyzerDependencies {
  packageJsonReader?: IPackageJsonReader;
  logger?: ILogger;
}

export class TransitiveAnalyzer {
  private readonly reader: IPackageJsonReader;
  private readonly logger: ILogger;

  constructor(deps: TransitiveAnalyzerDependencies = {}) {
    this.reader = deps.packageJsonReader ?? new PackageJsonReader();
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  /**
   * Walk the transitive dependency graph and return packages that have
   * native alternatives in the e18e database.
   */
  async analyze(
    projectPath: string,
    directDeps: string[]
  ): Promise<TransitiveEchoFinding[]> {
    if (directDeps.length === 0) return [];

    const nodeModulesPath = path.join(projectPath, "node_modules");

    // Guard: Yarn PnP detection — check before node_modules existence
    const yarnRcPath = path.join(projectPath, ".yarnrc.yml");
    if (fs.existsSync(yarnRcPath)) {
      try {
        const yarnRc = fs.readFileSync(yarnRcPath, "utf-8");
        if (yarnRc.includes("pnpMode") || yarnRc.includes("nodeLinker: pnp")) {
          this.logger.warn(
            "[dep-scope] Yarn PnP detected — transitive analysis not supported. Skipping."
          );
          return [];
        }
      } catch {}
    }

    // Guard: node_modules must exist (after PnP check)
    if (!fs.existsSync(nodeModulesPath)) {
      throw new Error(
        `node_modules not found at ${nodeModulesPath}. Run your package manager install first.`
      );
    }

    const pnpmStorePath = path.join(nodeModulesPath, ".pnpm");
    const isPnpm = fs.existsSync(pnpmStorePath);

    // BFS: track which root direct dep introduced each transitive
    const visited = new Set<string>(directDeps);
    const firstSeenVia = new Map<string, string>(); // transitivePackage -> directDep
    const queue: Array<{ name: string; root: string }> = directDeps.map((d) => ({
      name: d,
      root: d,
    }));

    while (queue.length > 0) {
      const entry = queue.shift()!;
      const { name, root } = entry;

      const pkgDir = this.resolvePackageDir(nodeModulesPath, pnpmStorePath, name, isPnpm);
      if (!pkgDir) continue;

      const pkgJson = await this.reader.readFrom(pkgDir);
      if (!pkgJson) continue;

      const deps = Object.keys(pkgJson.dependencies ?? {});
      for (const dep of deps) {
        if (visited.has(dep)) continue;
        visited.add(dep);
        firstSeenVia.set(dep, root);
        queue.push({ name: dep, root });
      }
    }

    // Collect e18e matches from transitive packages (not in directDeps)
    const findings: TransitiveEchoFinding[] = [];
    for (const [pkg, via] of firstSeenVia.entries()) {
      const e18eEntry = E18E_PACKAGES[pkg];
      if (!e18eEntry) continue;
      findings.push({
        package: pkg,
        nativeReplacement: e18eEntry.native,
        minEcmaVersion: e18eEntry.minEcmaVersion,
        firstSeenVia: via,
      });
    }

    // Sort by firstSeenVia then package name for stable output
    findings.sort((a, b) =>
      a.firstSeenVia.localeCompare(b.firstSeenVia) || a.package.localeCompare(b.package)
    );

    return findings;
  }

  /**
   * Resolve the absolute directory of a package in node_modules.
   * Handles both flat (npm/Bun) and pnpm strict layouts.
   */
  private resolvePackageDir(
    nodeModulesPath: string,
    pnpmStorePath: string,
    packageName: string,
    isPnpm: boolean
  ): string | null {
    // Top-level first (works for npm, Bun, and pnpm hoisted direct deps)
    const topLevel = path.join(nodeModulesPath, packageName);
    if (fs.existsSync(path.join(topLevel, "package.json"))) {
      return topLevel;
    }

    // pnpm: scan .pnpm/<name>@<ver>/node_modules/<name>/
    if (isPnpm) {
      const lookup = packageName.startsWith("@")
        ? packageName.replace("/", "+")
        : packageName;
      try {
        const entries = fs.readdirSync(pnpmStorePath).filter((e) =>
          e.startsWith(lookup + "@")
        );
        if (entries.length > 0) {
          const candidate = path.join(
            pnpmStorePath,
            entries[0],
            "node_modules",
            packageName
          );
          if (fs.existsSync(path.join(candidate, "package.json"))) {
            return candidate;
          }
        }
      } catch {
        // .pnpm dir not readable, skip
      }
    }

    return null;
  }
}

