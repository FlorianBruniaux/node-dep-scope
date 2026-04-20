/**
 * e18e (Ecosystem Performance) — static data extracted from module-replacements@2.11.0
 * Source: https://e18e.dev / https://github.com/es-tooling/module-replacements
 * Maps single-purpose npm packages to their native JS/Node equivalents.
 *
 * These packages are wholesale utilities where the entire package has a native equivalent.
 * Any symbol imported from them will be flagged as RECODE_NATIVE with the replacement shown.
 */

export interface E18eEntry {
  /** The native replacement (API name or short code snippet) */
  native: string;
  /** Minimum ECMAScript version required for the native replacement */
  minEcmaVersion: string;
  /** Source manifest category */
  category: "native" | "micro";
}

/** 169 packages mapped to their native JavaScript equivalents */
export const E18E_PACKAGES: Record<string, E18eEntry> = {
  // ── Array methods ──────────────────────────────────────────────────────
  "array-buffer-byte-length": { native: "ArrayBuffer.prototype.byteLength", minEcmaVersion: "ES5", category: "native" },
  "array-every": { native: "Array.prototype.every", minEcmaVersion: "ES5", category: "native" },
  "array-includes": { native: "Array.prototype.includes", minEcmaVersion: "ES2016", category: "native" },
  "array-map": { native: "Array.prototype.map", minEcmaVersion: "ES5", category: "native" },
  "array.from": { native: "Array.from", minEcmaVersion: "ES2015", category: "native" },
  "array.of": { native: "Array.of", minEcmaVersion: "ES2015", category: "native" },
  "array.prototype.at": { native: "Array.prototype.at", minEcmaVersion: "ES2021", category: "native" },
  "array.prototype.concat": { native: "Array.prototype.concat", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.copywithin": { native: "Array.prototype.copyWithin", minEcmaVersion: "ES2015", category: "native" },
  "array.prototype.entries": { native: "Array.prototype.entries", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.every": { native: "Array.prototype.every", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.filter": { native: "Array.prototype.filter", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.find": { native: "Array.prototype.find", minEcmaVersion: "ES2015", category: "native" },
  "array.prototype.findindex": { native: "Array.prototype.findIndex", minEcmaVersion: "ES2015", category: "native" },
  "array.prototype.flat": { native: "Array.prototype.flat", minEcmaVersion: "ES2018", category: "native" },
  "array.prototype.flatmap": { native: "Array.prototype.flatMap", minEcmaVersion: "ES2018", category: "native" },
  "array.prototype.foreach": { native: "Array.prototype.forEach", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.indexof": { native: "Array.prototype.indexOf", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.join": { native: "Array.prototype.join", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.keys": { native: "Array.prototype.keys", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.lastindexof": { native: "Array.prototype.lastIndexOf", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.map": { native: "Array.prototype.map", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.push": { native: "Array.prototype.push", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.reduce": { native: "Array.prototype.reduce", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.reduceright": { native: "Array.prototype.reduceRight", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.slice": { native: "Array.prototype.slice", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.some": { native: "Array.prototype.some", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.splice": { native: "Array.prototype.splice", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.unshift": { native: "Array.prototype.unshift", minEcmaVersion: "ES5", category: "native" },
  "array.prototype.values": { native: "Array.prototype.values", minEcmaVersion: "ES2018", category: "native" },
  "arraybuffer.prototype.slice": { native: "ArrayBuffer.prototype.slice", minEcmaVersion: "ES5", category: "native" },
  "concat-map": { native: "Array.prototype.flatMap", minEcmaVersion: "ES2018", category: "native" },
  "filter-array": { native: "Array.prototype.filter", minEcmaVersion: "ES5", category: "native" },
  "index-of": { native: "Array.prototype.indexOf", minEcmaVersion: "ES5", category: "native" },
  "last-index-of": { native: "Array.prototype.lastIndexOf", minEcmaVersion: "ES5", category: "native" },

  // ── Object methods ─────────────────────────────────────────────────────
  "object-assign": { native: "Object.assign", minEcmaVersion: "ES2015", category: "native" },
  "object-is": { native: "Object.is", minEcmaVersion: "ES5", category: "native" },
  "object-keys": { native: "Object.keys(obj)", minEcmaVersion: "ES5", category: "native" },
  "object.assign": { native: "Object.assign", minEcmaVersion: "ES2015", category: "native" },
  "object.defineproperties": { native: "Object.defineProperties", minEcmaVersion: "ES5", category: "native" },
  "object.entries": { native: "Object.entries", minEcmaVersion: "ES2016", category: "native" },
  "object.fromentries": { native: "Object.fromEntries", minEcmaVersion: "ES2019", category: "native" },
  "object.getownpropertydescriptors": { native: "Object.getOwnPropertyDescriptors", minEcmaVersion: "ES2016", category: "native" },
  "object.getprototypeof": { native: "Object.getPrototypeOf", minEcmaVersion: "ES5", category: "native" },
  "object.hasown": { native: "Object.hasOwn", minEcmaVersion: "ES2021", category: "native" },
  "object.keys": { native: "Object.keys(obj)", minEcmaVersion: "ES5", category: "native" },
  "object.values": { native: "Object.values", minEcmaVersion: "ES2016", category: "native" },
  "define-accessor-property": { native: "Object.defineProperty", minEcmaVersion: "ES5", category: "native" },
  "define-data-property": { native: "Object.defineProperty", minEcmaVersion: "ES5", category: "native" },
  "define-properties": { native: "Object.defineProperties", minEcmaVersion: "ES5", category: "native" },
  "es-define-property": { native: "Object.defineProperty", minEcmaVersion: "ES5", category: "native" },
  "gopd": { native: "Object.getOwnPropertyDescriptor", minEcmaVersion: "ES5", category: "native" },

  // ── String methods ─────────────────────────────────────────────────────
  "left-pad": { native: "String.prototype.padStart", minEcmaVersion: "ES2017", category: "native" },
  "pad-left": { native: "String.prototype.padStart", minEcmaVersion: "ES2017", category: "native" },
  "string.prototype.at": { native: "String.prototype.at", minEcmaVersion: "ES2021", category: "native" },
  "string.prototype.lastindexof": { native: "String.prototype.lastIndexOf", minEcmaVersion: "ES5", category: "native" },
  "string.prototype.matchall": { native: "String.prototype.matchAll", minEcmaVersion: "ES2019", category: "native" },
  "string.prototype.padend": { native: "String.prototype.padEnd", minEcmaVersion: "ES2017", category: "native" },
  "string.prototype.padleft": { native: "String.prototype.padStart", minEcmaVersion: "ES2017", category: "native" },
  "string.prototype.padright": { native: "String.prototype.padEnd", minEcmaVersion: "ES2017", category: "native" },
  "string.prototype.padstart": { native: "String.prototype.padStart", minEcmaVersion: "ES2017", category: "native" },
  "string.prototype.replaceall": { native: "String.prototype.replaceAll", minEcmaVersion: "ES2020", category: "native" },
  "string.prototype.split": { native: "String.prototype.split", minEcmaVersion: "ES5", category: "native" },
  "string.prototype.substr": { native: "String.prototype.substr", minEcmaVersion: "ES5", category: "native" },
  "string.prototype.trim": { native: "String.prototype.trim", minEcmaVersion: "ES5", category: "native" },
  "string.prototype.trimend": { native: "String.prototype.trimEnd", minEcmaVersion: "ES2018", category: "native" },
  "string.prototype.trimleft": { native: "String.prototype.trimLeft", minEcmaVersion: "ES2018", category: "native" },
  "string.prototype.trimright": { native: "String.prototype.trimRight", minEcmaVersion: "ES2018", category: "native" },
  "string.prototype.trimstart": { native: "String.prototype.trimStart", minEcmaVersion: "ES2018", category: "native" },
  "string.raw": { native: "String.raw", minEcmaVersion: "ES2015", category: "native" },

  // ── Number / Math ──────────────────────────────────────────────────────
  "is-nan": { native: "Number.isNaN", minEcmaVersion: "ES5", category: "native" },
  "math.acosh": { native: "Math.acosh", minEcmaVersion: "ES5", category: "native" },
  "math.atanh": { native: "Math.atanh", minEcmaVersion: "ES5", category: "native" },
  "math.cbrt": { native: "Math.cbrt", minEcmaVersion: "ES5", category: "native" },
  "math.clz32": { native: "Math.clz32", minEcmaVersion: "ES5", category: "native" },
  "math.f16round": { native: "Math.f16round", minEcmaVersion: "ES5", category: "native" },
  "math.fround": { native: "Math.fround", minEcmaVersion: "ES5", category: "native" },
  "math.imul": { native: "Math.imul", minEcmaVersion: "ES5", category: "native" },
  "math.log10": { native: "Math.log10", minEcmaVersion: "ES5", category: "native" },
  "math.log1p": { native: "Math.log1p", minEcmaVersion: "ES5", category: "native" },
  "math.sign": { native: "Math.sign", minEcmaVersion: "ES5", category: "native" },
  "number.isfinite": { native: "Number.isFinite", minEcmaVersion: "ES5", category: "native" },
  "number.isinteger": { native: "Number.isInteger", minEcmaVersion: "ES5", category: "native" },
  "number.isnan": { native: "Number.isNaN", minEcmaVersion: "ES5", category: "native" },
  "number.issafeinteger": { native: "Number.isSafeInteger", minEcmaVersion: "ES5", category: "native" },
  "number.parsefloat": { native: "Number.parseFloat", minEcmaVersion: "ES5", category: "native" },
  "number.parseint": { native: "Number.parseInt", minEcmaVersion: "ES5", category: "native" },
  "number.prototype.toexponential": { native: "Number.prototype.toExponential", minEcmaVersion: "ES5", category: "native" },
  "parseint": { native: "parseInt", minEcmaVersion: "ES5", category: "native" },

  // ── Object prototype / property helpers ───────────────────────────────
  "has": { native: "Object.hasOwn(obj, prop) — or Object.prototype.hasOwnProperty.call(obj, prop)", minEcmaVersion: "ES5", category: "native" },
  "has-own-prop": { native: "Object.hasOwn(obj, prop) — or Object.prototype.hasOwnProperty.call(obj, prop)", minEcmaVersion: "ES5", category: "native" },
  "hasown": { native: "Object.hasOwn(obj, prop) — or Object.prototype.hasOwnProperty.call(obj, prop)", minEcmaVersion: "ES5", category: "native" },
  "has-proto": { native: "Object.getPrototypeOf (always available)", minEcmaVersion: "ES5", category: "native" },
  "has-symbols": { native: "Symbol (always available in ES2015+)", minEcmaVersion: "ES5", category: "native" },
  "has-tostringtag": { native: "Symbol.toStringTag (always available)", minEcmaVersion: "ES2016", category: "native" },

  // ── Prototype / class helpers ──────────────────────────────────────────
  "function-bind": { native: "Function.prototype.bind", minEcmaVersion: "ES5", category: "native" },
  "function.prototype.name": { native: "fn.name property", minEcmaVersion: "ES5", category: "native" },
  "functions-have-names": { native: "Always true — no polyfill needed", minEcmaVersion: "ES5", category: "native" },
  "inherits": { native: "Native class extends syntax", minEcmaVersion: "ES2016", category: "native" },
  "get-symbol-description": { native: "Symbol.prototype.description", minEcmaVersion: "ES2018", category: "native" },
  "symbol.prototype.description": { native: "Symbol.prototype.description", minEcmaVersion: "ES2018", category: "native" },
  "regexp.prototype.flags": { native: "RegExp.prototype.flags (e.g. /foo/g.flags)", minEcmaVersion: "ES2016", category: "native" },

  // ── Global / environment ──────────────────────────────────────────────
  "global": { native: "globalThis", minEcmaVersion: "ES2019", category: "native" },
  "globalthis": { native: "globalThis", minEcmaVersion: "ES2019", category: "native" },
  "date": { native: "Date (built-in)", minEcmaVersion: "ES5", category: "native" },

  // ── Error / Promise helpers ────────────────────────────────────────────
  "error-cause": { native: "new Error('msg', { cause: err }) — native since Node 16.9", minEcmaVersion: "ES2021", category: "native" },
  "es-aggregate-error": { native: "AggregateError (built-in)", minEcmaVersion: "ES2020", category: "native" },
  "es-errors": { native: "Error / EvalError / RangeError / ReferenceError / SyntaxError / TypeError / URIError", minEcmaVersion: "ES5", category: "native" },
  "promise.allsettled": { native: "Promise.allSettled", minEcmaVersion: "ES2019", category: "native" },
  "promise.any": { native: "Promise.any", minEcmaVersion: "ES2020", category: "native" },
  "promise.prototype.finally": { native: "Promise.prototype.finally", minEcmaVersion: "ES2018", category: "native" },

  // ── Reflect / Symbol ───────────────────────────────────────────────────
  "reflect.getprototypeof": { native: "Reflect.getPrototypeOf", minEcmaVersion: "ES2016", category: "native" },
  "reflect.ownkeys": { native: "Reflect.ownKeys", minEcmaVersion: "ES2016", category: "native" },
  "es-shim-unscopables": { native: "Array.prototype[Symbol.unscopables]", minEcmaVersion: "ES5", category: "native" },
  "es-set-tostringtag": { native: "Object.defineProperty(target, Symbol.toStringTag, { value, configurable: true })", minEcmaVersion: "ES6", category: "micro" },
  "es-create-array-iterator": { native: "Array.prototype.{ entries, keys, values, [Symbol.iterator] }", minEcmaVersion: "ES5", category: "native" },
  "es-string-html-methods": { native: "String.prototype deprecated HTML methods (anchor, bold, etc.)", minEcmaVersion: "ES5", category: "native" },

  // ── Object extension ───────────────────────────────────────────────────
  "defaults": { native: "Object.assign — or structuredClone for deep clones", minEcmaVersion: "ES2015", category: "native" },
  "extend-shallow": { native: "Object.assign — or structuredClone for deep clones", minEcmaVersion: "ES2015", category: "native" },
  "node.extend": { native: "Object.assign — or structuredClone for deep clones", minEcmaVersion: "ES2015", category: "native" },
  "xtend": { native: "Object.assign — or structuredClone for deep clones", minEcmaVersion: "ES2015", category: "native" },

  // ── Typed arrays / DataView ────────────────────────────────────────────
  "data-view-buffer": { native: "DataView.prototype.buffer", minEcmaVersion: "ES5", category: "native" },
  "data-view-byte-length": { native: "DataView.prototype.byteLength", minEcmaVersion: "ES5", category: "native" },
  "data-view-byte-offset": { native: "DataView.prototype.byteOffset", minEcmaVersion: "ES5", category: "native" },
  "typed-array-buffer": { native: "%TypedArray%.prototype.buffer", minEcmaVersion: "ES5", category: "native" },
  "typed-array-byte-length": { native: "%TypedArray%.prototype.byteLength", minEcmaVersion: "ES5", category: "native" },
  "typed-array-byte-offset": { native: "%TypedArray%.prototype.byteOffset", minEcmaVersion: "ES5", category: "native" },
  "typed-array-length": { native: "%TypedArray%.prototype.length", minEcmaVersion: "ES5", category: "native" },
  "typedarray.prototype.slice": { native: "%TypedArray%.prototype.slice", minEcmaVersion: "ES2015", category: "native" },

  // ── Iteration ─────────────────────────────────────────────────────────
  "for-each": { native: "for...of — or Object.entries() for objects", minEcmaVersion: "ES5", category: "native" },
  "iterate-iterator": { native: "for...of", minEcmaVersion: "ES5", category: "native" },
  "iterate-value": { native: "for...of", minEcmaVersion: "ES5", category: "native" },
  "es-get-iterator": { native: "v[Symbol.iterator]?.()", minEcmaVersion: "ES6", category: "micro" },

  // ── Micro-utilities (array) ────────────────────────────────────────────
  "arr-diff": { native: "a.filter((item) => !b.includes(item))", minEcmaVersion: "ES6", category: "micro" },
  "array-last": { native: "arr.at(-1) — or arr[arr.length - 1]", minEcmaVersion: "ES6", category: "micro" },
  "array-union": { native: "[...new Set([...a, ...b])]", minEcmaVersion: "ES6", category: "micro" },
  "array-uniq": { native: "[...new Set(arr)]", minEcmaVersion: "ES6", category: "micro" },
  "array-unique": { native: "[...new Set(arr)]", minEcmaVersion: "ES6", category: "micro" },
  "uniq": { native: "[...new Set(arr)]", minEcmaVersion: "ES6", category: "micro" },
  "arrify": { native: "v == null ? [] : Array.isArray(v) ? v : [v]", minEcmaVersion: "ES6", category: "micro" },

  // ── Micro-utilities (string) ───────────────────────────────────────────
  "lower-case": { native: "str.toLocaleLowerCase() — or str.toLowerCase()", minEcmaVersion: "ES6", category: "micro" },
  "upper-case": { native: "str.toLocaleUpperCase() — or str.toUpperCase()", minEcmaVersion: "ES6", category: "micro" },
  "repeat-string": { native: "str.repeat(n)", minEcmaVersion: "ES6", category: "micro" },
  "split-lines": { native: "str.split(/\\r?\\n/)", minEcmaVersion: "ES6", category: "micro" },
  "slash": { native: "path.replace(/\\\\/g, '/')", minEcmaVersion: "ES6", category: "micro" },
  "is-whitespace": { native: "str.trim() === '' — or /^\\s*$/.test(str)", minEcmaVersion: "ES6", category: "micro" },

  // ── Micro-utilities (object) ───────────────────────────────────────────
  "filter-obj": { native: "Object.fromEntries(Object.entries(obj).filter(fn))", minEcmaVersion: "ES6", category: "micro" },
  "clone-regexp": { native: "new RegExp(regexpToCopy)", minEcmaVersion: "ES6", category: "micro" },

  // ── Micro-utilities (type checks) ─────────────────────────────────────
  "call-bind": { native: "Function.call.bind(v)", minEcmaVersion: "ES6", category: "micro" },
  "has-flag": { native: "process.argv.includes('--flag')", minEcmaVersion: "ES6", category: "micro" },
  "is-array-buffer": { native: "v instanceof ArrayBuffer (or Object.prototype.toString.call(v) for cross-realm)", minEcmaVersion: "ES6", category: "micro" },
  "is-boolean-object": { native: "Object.prototype.toString.call(v) === \"[object Boolean]\"", minEcmaVersion: "ES6", category: "micro" },
  "is-ci": { native: "Boolean(process.env.CI)", minEcmaVersion: "ES6", category: "micro" },
  "is-date-object": { native: "v instanceof Date (or Object.prototype.toString.call(v) for cross-realm)", minEcmaVersion: "ES6", category: "micro" },
  "is-even": { native: "(n % 2) === 0", minEcmaVersion: "ES6", category: "micro" },
  "is-finite": { native: "Number.isFinite(v)", minEcmaVersion: "ES6", category: "micro" },
  "is-negative": { native: "(n) => n < 0", minEcmaVersion: "ES6", category: "micro" },
  "is-negative-zero": { native: "Object.is(v, -0)", minEcmaVersion: "ES6", category: "micro" },
  "is-npm": { native: "process.env.npm_config_user_agent?.startsWith('npm')", minEcmaVersion: "ES6", category: "micro" },
  "is-number": { native: "typeof v === 'number' — or Number.isFinite(+v) for string→number coercion", minEcmaVersion: "ES6", category: "micro" },
  "is-number-object": { native: "Object.prototype.toString.call(v) === \"[object Number]\"", minEcmaVersion: "ES6", category: "micro" },
  "is-odd": { native: "(n % 2) === 1", minEcmaVersion: "ES6", category: "micro" },
  "is-plain-object": { native: "v && typeof v === 'object' && (Object.getPrototypeOf(v) === null || Object.getPrototypeOf(v) === Object.prototype)", minEcmaVersion: "ES6", category: "micro" },
  "is-primitive": { native: "v === null || (typeof v !== 'function' && typeof v !== 'object')", minEcmaVersion: "ES6", category: "micro" },
  "is-regexp": { native: "v instanceof RegExp (or Object.prototype.toString.call(v) for cross-realm)", minEcmaVersion: "ES6", category: "micro" },
  "is-string": { native: "typeof str === 'string'", minEcmaVersion: "ES6", category: "micro" },
  "is-travis": { native: "'TRAVIS' in process.env", minEcmaVersion: "ES6", category: "micro" },
  "is-windows": { native: "process.platform === 'win32'", minEcmaVersion: "ES6", category: "micro" },
  "kind-of": { native: "typeof v — or Object.prototype.toString.call(v) for the internal [[Class]]", minEcmaVersion: "ES6", category: "micro" },
};
