const SHELL_SEPARATORS = /[\s&|;]+/;

/**
 * Extract candidate binary names from a npm script value.
 * Returns the first token of each command segment (before flags).
 */
export function extractBinariesFromScript(scriptValue: string): string[] {
  const segments = scriptValue
    .split(SHELL_SEPARATORS)
    .map((t) => t.trim())
    .filter(Boolean);

  const binaries: string[] = [];
  for (const token of segments) {
    // Skip shell built-ins, flags, paths, env assignments
    if (
      token.startsWith("-") ||
      token.startsWith(".") ||
      token.startsWith("/") ||
      token.includes("=") ||
      token.includes("$")
    ) {
      continue;
    }
    // npx/pnpx/yarn dlx run-prefix — skip the runner, pick the next real token
    if (["npx", "pnpx", "yarn", "dlx", "bunx"].includes(token)) continue;

    binaries.push(token);
  }

  return binaries;
}
