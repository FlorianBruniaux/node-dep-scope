/**
 * Migration template for moment
 * Covers the most commonly used symbols: format, fromNow, add, subtract,
 * isBefore, isAfter, diff, parse, startOf, endOf, plus a catch-all default.
 */

import type { MigrationTemplate } from "../types.js";

export const momentTemplate: MigrationTemplate = {
  packageName: "moment",

  symbols: {
    format: {
      symbol: "format",
      nativeReplacement: "Intl.DateTimeFormat (ES2020)",
      minEcmaVersion: "ES2020",
      caveats: [
        "Intl.DateTimeFormat uses locale-aware option objects, not moment's token strings (YYYY-MM-DD)",
        "For ISO 8601 output, use date.toISOString() directly — no formatter needed",
      ],
      example: `// moment(date).format('DD/MM/YYYY') →
const formatted = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(date);

// ISO 8601 (2024-01-15T10:30:00.000Z):
const iso = date.toISOString();

// Custom parts (year + month only):
const { year, month } = Object.fromEntries(
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit' })
    .formatToParts(date)
    .map((p) => [p.type, p.value])
);`,
    },

    fromNow: {
      symbol: "fromNow",
      nativeReplacement: "Intl.RelativeTimeFormat (ES2020)",
      minEcmaVersion: "ES2020",
      caveats: [
        "Requires manually computing the millisecond difference and choosing the right unit",
        "No single-call equivalent — wrap in a helper to keep call sites clean",
      ],
      example: `function fromNow(date: Date, locale = 'en'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = date.getTime() - Date.now();
  const absDiff = Math.abs(diffMs);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year',   365 * 24 * 60 * 60 * 1000],
    ['month',  30  * 24 * 60 * 60 * 1000],
    ['week',   7   * 24 * 60 * 60 * 1000],
    ['day',    24  * 60 * 60 * 1000],
    ['hour',   60  * 60 * 1000],
    ['minute', 60  * 1000],
    ['second', 1000],
  ];

  for (const [unit, ms] of units) {
    if (absDiff >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, 'second');
}

// Usage: fromNow(new Date('2024-01-01')) → "3 months ago"`,
    },

    add: {
      symbol: "add",
      nativeReplacement: "new Date(date.getTime() + n * ms) (ES6)",
      minEcmaVersion: "ES6",
      caveats: [
        "Native Date arithmetic is verbose for months/years — consider date-fns addMonths() for calendar-aware operations",
        "getTime() + milliseconds is reliable for days/hours/minutes/seconds only",
      ],
      example: `// moment(date).add(7, 'days') →
const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

// Generic helper for common units:
function addTime(date: Date, amount: number, unit: 'ms' | 's' | 'm' | 'h' | 'd'): Date {
  const multipliers: Record<string, number> = {
    ms: 1,
    s:  1_000,
    m:  60_000,
    h:  3_600_000,
    d:  86_400_000,
  };
  return new Date(date.getTime() + amount * multipliers[unit]);
}

// Usage:
const nextWeek = addTime(new Date(), 7, 'd');`,
    },

    subtract: {
      symbol: "subtract",
      nativeReplacement: "new Date(date.getTime() - n * ms) (ES6)",
      minEcmaVersion: "ES6",
      caveats: [
        "Same limitations as add — months/years require calendar awareness, use date-fns for those",
        "Use negative values with addTime() or a dedicated subtractTime() for symmetry",
      ],
      example: `// moment(date).subtract(3, 'hours') →
const subtractTime = (date: Date, amount: number, unit: 'ms' | 's' | 'm' | 'h' | 'd'): Date => {
  const multipliers: Record<string, number> = {
    ms: 1,
    s:  1_000,
    m:  60_000,
    h:  3_600_000,
    d:  86_400_000,
  };
  return new Date(date.getTime() - amount * multipliers[unit]);
};

// Usage:
const threeDaysAgo = subtractTime(new Date(), 3, 'd');`,
    },

    isBefore: {
      symbol: "isBefore",
      nativeReplacement: "< comparison or getTime() (ES6)",
      minEcmaVersion: "ES6",
      caveats: [],
      example: `// moment(a).isBefore(b) →
const isBefore = (a: Date, b: Date): boolean => a.getTime() < b.getTime();

// Inline (works when both are Date objects):
if (startDate < endDate) { /* ... */ }`,
    },

    isAfter: {
      symbol: "isAfter",
      nativeReplacement: "> comparison or getTime() (ES6)",
      minEcmaVersion: "ES6",
      caveats: [],
      example: `// moment(a).isAfter(b) →
const isAfter = (a: Date, b: Date): boolean => a.getTime() > b.getTime();

// Inline:
if (endDate > startDate) { /* ... */ }`,
    },

    diff: {
      symbol: "diff",
      nativeReplacement: "Math.abs(a.getTime() - b.getTime()) (ES6)",
      minEcmaVersion: "ES6",
      caveats: [
        "Returns milliseconds — divide by the appropriate constant to get other units",
        "Does not account for DST transitions or leap years for month/year diffs",
      ],
      example: `// moment(a).diff(b, 'days') →
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

// Generic version:
function diff(
  a: Date,
  b: Date,
  unit: 'ms' | 's' | 'm' | 'h' | 'd' = 'ms'
): number {
  const multipliers: Record<string, number> = {
    ms: 1,
    s:  1_000,
    m:  60_000,
    h:  3_600_000,
    d:  86_400_000,
  };
  return (a.getTime() - b.getTime()) / multipliers[unit];
}

// Usage:
const days = diff(new Date('2024-03-15'), new Date('2024-03-01'), 'd'); // 14`,
    },

    parse: {
      symbol: "parse",
      nativeReplacement: "new Date(str) (ES6)",
      minEcmaVersion: "ES6",
      caveats: [
        "new Date(str) reliably parses ISO 8601 strings only (e.g. '2024-01-15T10:30:00Z')",
        "Locale-specific or custom formats (DD/MM/YYYY) require manual splitting or a library",
        "Always validate: new Date('invalid') returns an Invalid Date — check isNaN(date.getTime())",
      ],
      example: `// moment('2024-01-15T10:30:00Z') →
const date = new Date('2024-01-15T10:30:00Z');

// Validate:
function parseISO(str: string): Date {
  const d = new Date(str);
  if (isNaN(d.getTime())) throw new Error(\`Invalid date string: \${str}\`);
  return d;
}

// Custom format (DD/MM/YYYY) — split manually:
function parseDDMMYYYY(str: string): Date {
  const [day, month, year] = str.split('/').map(Number);
  return new Date(year, month - 1, day);
}`,
    },

    startOf: {
      symbol: "startOf",
      nativeReplacement: "Custom startOf helper (ES6)",
      minEcmaVersion: "ES6",
      caveats: [
        "Sets time components to zero — result is in local time, not UTC",
        "For UTC boundaries, operate on getUTC* methods instead",
      ],
      example: `// moment(date).startOf('day') / 'month' / 'year' →
function startOf(date: Date, unit: 'day' | 'month' | 'year' | 'hour' | 'minute'): Date {
  const d = new Date(date);
  switch (unit) {
    case 'year':
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'month':
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'hour':
      d.setMinutes(0, 0, 0);
      break;
    case 'minute':
      d.setSeconds(0, 0);
      break;
  }
  return d;
}

// Usage:
const midnight = startOf(new Date(), 'day');
const firstOfMonth = startOf(new Date(), 'month');`,
    },

    endOf: {
      symbol: "endOf",
      nativeReplacement: "Custom endOf helper (ES6)",
      minEcmaVersion: "ES6",
      caveats: [
        "Sets time components to their maximum value — result is in local time",
        "Month-end calculation uses setDate(0) on the next month for robustness",
      ],
      example: `// moment(date).endOf('day') / 'month' / 'year' →
function endOf(date: Date, unit: 'day' | 'month' | 'year' | 'hour' | 'minute'): Date {
  const d = new Date(date);
  switch (unit) {
    case 'year':
      d.setMonth(11, 31);
      d.setHours(23, 59, 59, 999);
      break;
    case 'month':
      // Day 0 of next month = last day of current month
      d.setMonth(d.getMonth() + 1, 0);
      d.setHours(23, 59, 59, 999);
      break;
    case 'day':
      d.setHours(23, 59, 59, 999);
      break;
    case 'hour':
      d.setMinutes(59, 59, 999);
      break;
    case 'minute':
      d.setSeconds(59, 999);
      break;
  }
  return d;
}

// Usage:
const endOfDay   = endOf(new Date(), 'day');
const endOfMonth = endOf(new Date(), 'month');`,
    },

    // Catch-all for any other moment symbol
    default: {
      symbol: "default",
      nativeReplacement: "date-fns (tree-shakable) or dayjs (2kB)",
      minEcmaVersion: "ES6",
      caveats: [
        "For complex date logic (locales, timezones, complex formatting), date-fns or dayjs are better drop-in replacements than going fully native",
        "date-fns is tree-shakable — import only the functions you use",
        "dayjs has a moment-compatible API — migration is often a find-and-replace",
      ],
      example: `// Interim step — switch to date-fns:
import { format, addDays, differenceInDays } from 'date-fns';

// Or dayjs (near-identical API to moment):
import dayjs from 'dayjs';
const formatted = dayjs(date).format('YYYY-MM-DD');`,
    },
  },

  globalCaveats: [
    "Moment is mutable — native Date is too, but date-fns and dayjs are immutable",
    "If you use timezones heavily, consider keeping moment-timezone or switching to Luxon",
    "Run full test suite after each symbol — date formatting is locale-sensitive",
  ],
};
