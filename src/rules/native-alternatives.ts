/**
 * Native Alternatives Database
 * Maps library symbols to native JavaScript/TypeScript alternatives
 */

import type { NativeAlternative, SymbolUsage } from "../types/index.js";
import type { CustomNativeAlternative } from "../config/schema.js";
import { E18E_PACKAGES } from "./e18e-data.js";

interface AlternativeRule {
  native: string;
  example: string;
  minEcmaVersion?: string;
  caveats?: string[];
}

const NATIVE_ALTERNATIVES: Record<string, Record<string, AlternativeRule>> = {
  lodash: {
    get: {
      native: "Optional chaining (?.)",
      example: "obj?.a?.b?.c ?? defaultValue",
      minEcmaVersion: "ES2020",
      caveats: ["Doesn't support array notation like 'a[0].b'"],
    },
    set: {
      native: "Custom setter function",
      example: "const set = (obj, path, val) => { /* ... */ }",
      caveats: ["More verbose, consider keeping lodash.set if complex paths"],
    },
    debounce: {
      native: "Custom debounce function",
      example: `const debounce = (fn, ms) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};`,
      minEcmaVersion: "ES6",
    },
    throttle: {
      native: "Custom throttle or requestAnimationFrame",
      example: `const throttle = (fn, ms) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
};`,
      minEcmaVersion: "ES6",
    },
    cloneDeep: {
      native: "structuredClone()",
      example: "structuredClone(obj)",
      minEcmaVersion: "ES2022",
      caveats: ["Cannot clone functions", "Cannot clone DOM nodes"],
    },
    isEqual: {
      native: "JSON comparison or custom deep equal",
      example: "JSON.stringify(a) === JSON.stringify(b)",
      caveats: ["Order-dependent", "Cannot compare functions", "Fails on circular refs"],
    },
    merge: {
      native: "Object spread",
      example: "{ ...obj1, ...obj2 }",
      minEcmaVersion: "ES2018",
      caveats: ["Shallow merge only"],
    },
    omit: {
      native: "Object destructuring with rest",
      example: "const { unwanted, ...rest } = obj;",
      minEcmaVersion: "ES2018",
    },
    pick: {
      native: "Object destructuring",
      example: "const { a, b } = obj; const picked = { a, b };",
      minEcmaVersion: "ES6",
    },
    flatten: {
      native: "Array.prototype.flat()",
      example: "arr.flat(depth)",
      minEcmaVersion: "ES2019",
    },
    uniq: {
      native: "Set",
      example: "[...new Set(arr)]",
      minEcmaVersion: "ES6",
    },
    groupBy: {
      native: "Object.groupBy()",
      example: "Object.groupBy(arr, (item) => item.category)",
      minEcmaVersion: "ES2024",
      caveats: ["Very recent, may need polyfill"],
    },
    isEmpty: {
      native: "Length/size check",
      example: "arr.length === 0 || Object.keys(obj).length === 0",
      minEcmaVersion: "ES6",
    },
    default: {
      native: "Consider individual imports",
      example: "import get from 'lodash/get' (tree-shakable)",
      caveats: ["Barrel import includes entire library"],
    },
  },

  moment: {
    format: {
      native: "Intl.DateTimeFormat",
      example: `new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(date)`,
      minEcmaVersion: "ES2020",
    },
    fromNow: {
      native: "Intl.RelativeTimeFormat",
      example: `new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(-5, 'day')`,
      minEcmaVersion: "ES2020",
      caveats: ["Requires manual calculation of time difference"],
    },
    add: {
      native: "Date manipulation",
      example: "new Date(date.getTime() + days * 24 * 60 * 60 * 1000)",
      caveats: ["More verbose, consider date-fns for complex operations"],
    },
    subtract: {
      native: "Date manipulation",
      example: "new Date(date.getTime() - days * 24 * 60 * 60 * 1000)",
      caveats: ["More verbose, consider date-fns for complex operations"],
    },
    default: {
      native: "Consider date-fns (tree-shakable) or native Date/Intl",
      example: "import { format } from 'date-fns'",
      caveats: ["Moment is large and not tree-shakable"],
    },
  },

  axios: {
    get: {
      native: "fetch()",
      example: "const data = await fetch(url).then(r => r.json())",
      minEcmaVersion: "ES2017",
    },
    post: {
      native: "fetch() with options",
      example: `await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
}).then(r => r.json())`,
      minEcmaVersion: "ES2017",
    },
    put: {
      native: "fetch() with method PUT",
      example: "await fetch(url, { method: 'PUT', body: JSON.stringify(data) })",
      minEcmaVersion: "ES2017",
    },
    delete: {
      native: "fetch() with method DELETE",
      example: "await fetch(url, { method: 'DELETE' })",
      minEcmaVersion: "ES2017",
    },
    default: {
      native: "fetch() API",
      example: "Native fetch is available in all modern browsers and Node 18+",
      caveats: ["No automatic JSON transform", "No request/response interceptors"],
    },
  },

  uuid: {
    v4: {
      native: "crypto.randomUUID()",
      example: "crypto.randomUUID()",
      minEcmaVersion: "ES2021",
      caveats: ["Requires Node.js 19+ or modern browsers"],
    },
    default: {
      native: "crypto.randomUUID()",
      example: "crypto.randomUUID()",
      minEcmaVersion: "ES2021",
    },
  },

  classnames: {
    default: {
      native: "Template literals or clsx",
      example: "`${baseClass} ${condition ? 'active' : ''}`",
      caveats: ["clsx is smaller and faster if you need a library"],
    },
  },

  underscore: {
    default: {
      native: "Native ES6+ methods or lodash-es",
      example: "Array methods: map, filter, reduce, find, etc.",
      caveats: ["Underscore is largely superseded by ES6+"],
    },
  },

  "node-fetch": {
    default: {
      native: "Native fetch (Node 18+)",
      example: "fetch(url)",
      minEcmaVersion: "ES2017",
      caveats: ["Requires Node.js 18+"],
    },
  },

  ramda: {
    pipe: {
      native: "Function composition",
      example: "const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x)",
      minEcmaVersion: "ES6",
    },
    compose: {
      native: "Function composition",
      example: "const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x)",
      minEcmaVersion: "ES6",
    },
    default: {
      native: "Native array methods or lodash-es",
      example: "Most Ramda functions have native equivalents",
    },
  },

  // Lodash standalone packages (lodash.debounce, lodash.get, etc.)
  "lodash.debounce": {
    default: {
      native: "Custom debounce function",
      example: `const debounce = (fn, ms) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};`,
      minEcmaVersion: "ES6",
    },
  },

  "lodash.throttle": {
    default: {
      native: "Custom throttle or requestAnimationFrame",
      example: `const throttle = (fn, ms) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
};`,
      minEcmaVersion: "ES6",
    },
  },

  "lodash.get": {
    default: {
      native: "Optional chaining (?.)",
      example: "obj?.a?.b?.c ?? defaultValue",
      minEcmaVersion: "ES2020",
      caveats: ["Doesn't support array notation like 'a[0].b'"],
    },
  },

  "lodash.clonedeep": {
    default: {
      native: "structuredClone()",
      example: "structuredClone(obj)",
      minEcmaVersion: "ES2022",
      caveats: ["Cannot clone functions", "Cannot clone DOM nodes"],
    },
  },

  "lodash.merge": {
    default: {
      native: "Object spread",
      example: "{ ...obj1, ...obj2 }",
      minEcmaVersion: "ES2018",
      caveats: ["Shallow merge only"],
    },
  },

  "lodash.isequal": {
    default: {
      native: "JSON comparison or custom deep equal",
      example: "JSON.stringify(a) === JSON.stringify(b)",
      caveats: [
        "Order-dependent",
        "Cannot compare functions",
        "Fails on circular refs",
      ],
    },
  },

  "lodash.uniq": {
    default: {
      native: "Set",
      example: "[...new Set(arr)]",
      minEcmaVersion: "ES6",
    },
  },

  "lodash.flatten": {
    default: {
      native: "Array.prototype.flat()",
      example: "arr.flat(depth)",
      minEcmaVersion: "ES2019",
    },
  },

  // Additional common packages with native alternatives

  nanoid: {
    default: {
      native: "crypto.randomUUID()",
      example: "crypto.randomUUID().replace(/-/g, '').slice(0, 21)",
      minEcmaVersion: "ES2021",
      caveats: ["Different format than nanoid default", "Requires Node.js 19+"],
    },
  },

  slugify: {
    default: {
      native: "String methods",
      example:
        "str.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, '-').replace(/[^\\w-]/g, '')",
      minEcmaVersion: "ES6",
      caveats: ["May not handle all edge cases like the library"],
    },
  },

  "query-string": {
    parse: {
      native: "URLSearchParams",
      example: "Object.fromEntries(new URLSearchParams(str))",
      minEcmaVersion: "ES2019",
    },
    stringify: {
      native: "URLSearchParams",
      example: "new URLSearchParams(obj).toString()",
      minEcmaVersion: "ES2019",
    },
    default: {
      native: "URLSearchParams",
      example: "new URLSearchParams(str) / new URLSearchParams(obj).toString()",
      minEcmaVersion: "ES2019",
    },
  },

  qs: {
    parse: {
      native: "URLSearchParams",
      example: "Object.fromEntries(new URLSearchParams(str))",
      minEcmaVersion: "ES2019",
      caveats: ["Doesn't handle nested objects like qs"],
    },
    stringify: {
      native: "URLSearchParams",
      example: "new URLSearchParams(obj).toString()",
      minEcmaVersion: "ES2019",
      caveats: ["Doesn't handle nested objects like qs"],
    },
    default: {
      native: "URLSearchParams",
      example: "new URLSearchParams()",
      minEcmaVersion: "ES2019",
    },
  },

  "escape-html": {
    default: {
      native: "String replace",
      example:
        "str.replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'})[c])",
      minEcmaVersion: "ES6",
    },
  },

  "deep-equal": {
    default: {
      native: "JSON.stringify comparison",
      example: "JSON.stringify(a) === JSON.stringify(b)",
      caveats: ["Order-dependent", "Fails on circular refs", "Cannot compare functions"],
    },
  },

  "is-plain-object": {
    default: {
      native: "Object.prototype check",
      example: "obj?.constructor === Object",
      minEcmaVersion: "ES2020",
    },
  },

  "is-number": {
    default: {
      native: "typeof + isNaN check",
      example: "typeof val === 'number' && !Number.isNaN(val)",
      minEcmaVersion: "ES6",
    },
  },

  "is-string": {
    default: {
      native: "typeof check",
      example: "typeof val === 'string'",
      minEcmaVersion: "ES6",
    },
  },

  "is-array": {
    default: {
      native: "Array.isArray()",
      example: "Array.isArray(val)",
      minEcmaVersion: "ES5",
    },
  },

  "left-pad": {
    default: {
      native: "String.prototype.padStart()",
      example: "str.padStart(10, '0')",
      minEcmaVersion: "ES2017",
    },
  },

  "right-pad": {
    default: {
      native: "String.prototype.padEnd()",
      example: "str.padEnd(10, '0')",
      minEcmaVersion: "ES2017",
    },
  },

  ms: {
    default: {
      native: "Custom parser or constants",
      example: "const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }",
      minEcmaVersion: "ES6",
      caveats: ["Simple cases only, library handles complex strings"],
    },
  },

  "path-to-regexp": {
    default: {
      native: "URLPattern API",
      example: "new URLPattern({ pathname: '/users/:id' })",
      minEcmaVersion: "ES2022",
      caveats: ["URLPattern has different syntax", "Limited browser support"],
    },
  },
};

/**
 * Build a symbol→rule map for a package, merging built-in and custom rules.
 * Custom rules override built-ins symbol-by-symbol (fine-grained).
 */
const resolvePackageRules = (
  packageName: string,
  customAlternatives?: CustomNativeAlternative[]
): Record<string, AlternativeRule> | undefined => {
  const builtin = NATIVE_ALTERNATIVES[packageName];
  const custom = customAlternatives?.find((a) => a.package === packageName);

  if (!builtin && !custom) return undefined;
  if (!custom) return builtin;
  // Custom takes precedence on symbol collisions
  return { ...(builtin ?? {}), ...custom.symbols };
};

/**
 * Get native alternatives for symbols used from a package.
 * Optionally merges custom alternatives from user config.
 */
export const getNativeAlternatives = (
  packageName: string,
  symbolsUsed: SymbolUsage[],
  customAlternatives?: CustomNativeAlternative[]
): NativeAlternative[] => {
  const packageRules = resolvePackageRules(packageName, customAlternatives);
  const e18eEntry = E18E_PACKAGES[packageName];

  if (!packageRules && !e18eEntry) {
    return [];
  }

  const alternatives: NativeAlternative[] = [];

  for (const usage of symbolsUsed) {
    if (packageRules) {
      const rule = packageRules[usage.symbol] ?? packageRules["default"];
      if (rule) {
        alternatives.push({
          symbol: usage.symbol,
          native: rule.native,
          example: rule.example,
          minEcmaVersion: rule.minEcmaVersion,
          caveats: rule.caveats,
        });
        continue;
      }
    }
    // Fall through to e18e data for any unmatched symbol (covers single-purpose packages)
    if (e18eEntry) {
      alternatives.push({
        symbol: usage.symbol,
        native: e18eEntry.native,
        example: e18eEntry.native,
        minEcmaVersion: e18eEntry.minEcmaVersion,
        caveats: [],
      });
    }
  }

  return alternatives;
};

/**
 * Check if a package has any known alternatives (built-in, e18e, or custom)
 */
export const hasAlternatives = (
  packageName: string,
  customAlternatives?: CustomNativeAlternative[]
): boolean => {
  if (packageName in NATIVE_ALTERNATIVES) return true;
  if (packageName in E18E_PACKAGES) return true;
  return customAlternatives?.some((a) => a.package === packageName) ?? false;
};

/**
 * Get all packages with known alternatives (built-in + e18e + custom)
 */
export const getPackagesWithAlternatives = (): string[] => {
  return [...new Set([...Object.keys(NATIVE_ALTERNATIVES), ...Object.keys(E18E_PACKAGES)])];
};
