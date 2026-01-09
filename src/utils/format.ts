/**
 * Format utilities for dep-scope
 */

/**
 * Pluralize a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  if (count === 1) return singular;
  return plural ?? `${singular}s`;
}

/**
 * Format count with proper pluralization
 * @example formatCount(1, "symbol") => "1 symbol"
 * @example formatCount(2, "symbol") => "2 symbols"
 * @example formatCount(0, "file") => "0 files"
 */
export function formatCount(
  count: number,
  singular: string,
  plural?: string
): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
