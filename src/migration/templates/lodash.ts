/**
 * Migration template for lodash
 * Covers the 4 most commonly used symbols: debounce, throttle, cloneDeep, isEqual
 */

import type { MigrationTemplate } from "../types.js";

export const lodashTemplate: MigrationTemplate = {
  packageName: "lodash",

  symbols: {
    debounce: {
      symbol: "debounce",
      nativeReplacement: "Custom debounce (ES6)",
      minEcmaVersion: "ES6",
      caveats: [],
      example: `const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};`,
    },

    throttle: {
      symbol: "throttle",
      nativeReplacement: "Custom throttle (ES6)",
      minEcmaVersion: "ES6",
      caveats: ["Leading-edge only by default — adjust to match lodash behavior if needed"],
      example: `const throttle = <T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): ((...args: Parameters<T>) => void) => {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
};`,
    },

    cloneDeep: {
      symbol: "cloneDeep",
      nativeReplacement: "structuredClone() (ES2022)",
      minEcmaVersion: "ES2022",
      caveats: ["Cannot clone functions", "Cannot clone DOM nodes", "Throws on circular references with some runtimes"],
      example: "const copy = structuredClone(original);",
      polyfillFallback: `// Target below ES2022 — use JSON round-trip (limited) or keep lodash.cloneDeep
const copy = JSON.parse(JSON.stringify(original));
// ⚠️ Loses: undefined values, functions, Date objects, special types`,
    },

    isEqual: {
      symbol: "isEqual",
      nativeReplacement: "JSON.stringify comparison",
      minEcmaVersion: "ES6",
      caveats: [
        "Order-dependent for object keys",
        "Cannot compare functions",
        "Fails on circular references",
        "Loses undefined values and special types",
        "For complex equality, keep lodash.isEqual or add a minimal deepEqual utility",
      ],
      example: `// Simple cases only:
JSON.stringify(a) === JSON.stringify(b)

// More robust (no deps):
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null) return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  );
};`,
    },

    merge: {
      symbol: "merge",
      nativeReplacement: "Object spread (shallow) or custom deep merge",
      minEcmaVersion: "ES2018",
      caveats: ["Object spread is shallow only — use custom function for deep merge"],
      example: `// Shallow (most cases):
const merged = { ...obj1, ...obj2 };

// Deep merge utility:
const deepMerge = <T extends object>(target: T, source: Partial<T>): T =>
  Object.fromEntries(
    Object.entries({ ...target, ...source }).map(([k, v]) => [
      k,
      v && typeof v === "object" && !Array.isArray(v) && k in target
        ? deepMerge((target as Record<string, unknown>)[k] as object, v as object)
        : v,
    ])
  ) as T;`,
    },

    omit: {
      symbol: "omit",
      nativeReplacement: "Object destructuring with rest",
      minEcmaVersion: "ES2018",
      caveats: ["Only works for statically-known keys"],
      example: `// Static keys (preferred):
const { unwanted, alsoUnwanted, ...rest } = obj;

// Dynamic keys:
const omit = <T extends object>(obj: T, keys: (keyof T)[]): Partial<T> => {
  const result = { ...obj };
  for (const k of keys) delete result[k];
  return result;
};`,
    },

    pick: {
      symbol: "pick",
      nativeReplacement: "Object destructuring or Object.fromEntries",
      minEcmaVersion: "ES2019",
      caveats: [],
      example: `// Static keys:
const { a, b } = obj;
const picked = { a, b };

// Dynamic keys:
const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>;`,
    },

    uniq: {
      symbol: "uniq",
      nativeReplacement: "Set spread",
      minEcmaVersion: "ES6",
      caveats: ["Primitive values only — objects compared by reference"],
      example: "const unique = [...new Set(arr)];",
    },

    flatten: {
      symbol: "flatten",
      nativeReplacement: "Array.prototype.flat()",
      minEcmaVersion: "ES2019",
      caveats: [],
      example: "const flat = arr.flat(); // one level\nconst deepFlat = arr.flat(Infinity);",
    },

    get: {
      symbol: "get",
      nativeReplacement: "Optional chaining (?.)",
      minEcmaVersion: "ES2020",
      caveats: ["Does not support array-index notation like 'a[0].b' — use 'a?.[0]?.b' instead"],
      example: `// _.get(obj, 'a.b.c', defaultVal)
const value = obj?.a?.b?.c ?? defaultVal;`,
    },

    groupBy: {
      symbol: "groupBy",
      nativeReplacement: "Object.groupBy() (ES2024) or reduce",
      minEcmaVersion: "ES2024",
      caveats: ["Object.groupBy() is very recent — use reduce for broader compatibility"],
      example: `// ES2024 (modern environments):
const grouped = Object.groupBy(arr, (item) => item.category);

// Compatible fallback:
const grouped = arr.reduce<Record<string, typeof arr>>((acc, item) => {
  (acc[item.category] ??= []).push(item);
  return acc;
}, {});`,
    },

    isEmpty: {
      symbol: "isEmpty",
      nativeReplacement: "Length / size check",
      minEcmaVersion: "ES6",
      caveats: ["lodash.isEmpty handles strings, Maps, Sets, and objects — match the types you need"],
      example: `const isEmpty = (val: unknown): boolean => {
  if (val == null) return true;
  if (Array.isArray(val) || typeof val === "string") return val.length === 0;
  if (val instanceof Map || val instanceof Set) return val.size === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
};`,
    },

    // Catch-all for any other symbol
    default: {
      symbol: "default",
      nativeReplacement: "Individual lodash sub-package or native equivalent",
      minEcmaVersion: "ES6",
      caveats: ["Barrel import pulls the entire library — consider individual imports as interim step"],
      example: `// Interim step (tree-shakable):
import debounce from 'lodash/debounce';

// Then migrate to native when ready.`,
    },
  },

  globalCaveats: [
    "Run your full test suite after each symbol replacement — do not batch all changes without testing",
    "TypeScript types may need adjustment since native implementations aren't typed as precisely as lodash",
  ],
};
