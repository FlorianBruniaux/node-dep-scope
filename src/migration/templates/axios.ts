/**
 * Migration template for axios
 * Covers the most commonly used symbols: get, post, put, patch, delete,
 * create, interceptors, plus a catch-all default.
 */

import type { MigrationTemplate } from "../types.js";

export const axiosTemplate: MigrationTemplate = {
  packageName: "axios",

  symbols: {
    get: {
      symbol: "get",
      nativeReplacement: "fetch() with error check (ES2017)",
      minEcmaVersion: "ES2017",
      caveats: [
        "fetch() does not throw on 4xx/5xx — always check response.ok before calling .json()",
        "No automatic JSON parsing — explicitly call await response.json()",
      ],
      example: `// axios.get<User>('/api/users/1') →
async function get<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return response.json() as Promise<T>;
}

// Usage:
const user = await get<User>('/api/users/1');`,
    },

    post: {
      symbol: "post",
      nativeReplacement: "fetch() with POST method and JSON body (ES2017)",
      minEcmaVersion: "ES2017",
      caveats: [
        "Must manually set Content-Type: application/json when sending JSON",
        "No automatic serialization — wrap body in JSON.stringify()",
      ],
      example: `// axios.post<User>('/api/users', data) →
async function post<T>(
  url: string,
  data: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return response.json() as Promise<T>;
}

// Usage:
const newUser = await post<User>('/api/users', { name: 'Alice', email: 'alice@example.com' });`,
    },

    put: {
      symbol: "put",
      nativeReplacement: "fetch() with PUT method and JSON body (ES2017)",
      minEcmaVersion: "ES2017",
      caveats: [
        "PUT replaces the entire resource — make sure the payload is complete",
        "Same fetch() error-checking pattern applies",
      ],
      example: `// axios.put<User>('/api/users/1', data) →
async function put<T>(
  url: string,
  data: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return response.json() as Promise<T>;
}

// Usage:
const updated = await put<User>('/api/users/1', { name: 'Alice', email: 'alice@example.com' });`,
    },

    patch: {
      symbol: "patch",
      nativeReplacement: "fetch() with PATCH method and partial JSON body (ES2017)",
      minEcmaVersion: "ES2017",
      caveats: [
        "PATCH sends only the fields to update — partial payload is intentional",
      ],
      example: `// axios.patch<User>('/api/users/1', partialData) →
async function patch<T>(
  url: string,
  data: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return response.json() as Promise<T>;
}

// Usage:
const patched = await patch<User>('/api/users/1', { name: 'Alice Updated' });`,
    },

    delete: {
      symbol: "delete",
      nativeReplacement: "fetch() with DELETE method (ES2017)",
      minEcmaVersion: "ES2017",
      caveats: [
        "Many DELETE endpoints return 204 No Content — skip .json() in that case",
      ],
      example: `// axios.delete('/api/users/1') →
async function del(url: string, headers?: Record<string, string>): Promise<void> {
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  // 204 No Content — nothing to parse
}

// If the endpoint returns a body:
async function deleteWithBody<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  return response.json() as Promise<T>;
}

// Usage:
await del('/api/users/1');`,
    },

    create: {
      symbol: "create",
      nativeReplacement: "Custom fetch wrapper factory (ES2017)",
      minEcmaVersion: "ES2017",
      caveats: [
        "Recreates the axios.create() pattern — baseURL prefix and default headers are applied to every request",
        "For complex scenarios (auth token refresh, retry logic), consider a dedicated http-client module",
      ],
      example: `// const api = axios.create({ baseURL: '/api/v1', headers: { Authorization: 'Bearer token' } }) →
interface FetchClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
}

function createFetchClient(defaults: FetchClientOptions = {}) {
  const { baseURL = '', headers: defaultHeaders = {} } = defaults;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const response = await fetch(\`\${baseURL}\${path}\`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    return response.json() as Promise<T>;
  }

  return {
    get:    <T>(path: string) => request<T>('GET', path),
    post:   <T>(path: string, data: unknown) => request<T>('POST', path, data),
    put:    <T>(path: string, data: unknown) => request<T>('PUT', path, data),
    patch:  <T>(path: string, data: unknown) => request<T>('PATCH', path, data),
    delete: (path: string) => request<void>('DELETE', path),
  };
}

// Usage — drop-in for axios.create():
const api = createFetchClient({ baseURL: '/api/v1', headers: { Authorization: 'Bearer token' } });
const users = await api.get<User[]>('/users');`,
    },

    interceptors: {
      symbol: "interceptors",
      nativeReplacement: "No direct native equivalent — refactor to wrapper functions",
      minEcmaVersion: "ES2017",
      caveats: [
        "fetch() has no interceptor concept — logic must be inlined in wrapper functions",
        "Request interceptors (e.g. adding auth headers) → move to the fetch wrapper factory's defaults",
        "Response interceptors (e.g. token refresh on 401) → add explicit error handling in the wrapper",
        "Error interceptors → catch block inside the wrapper or a higher-order function",
      ],
      example: `// axios.interceptors.request.use(config => { config.headers.Authorization = getToken(); return config; })
// axios.interceptors.response.use(null, err => { if (err.response?.status === 401) refreshToken(); })
// → Inline this logic inside a shared fetch wrapper:

async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // --- request interceptor logic ---
  const token = getToken(); // your auth helper
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', \`Bearer \${token}\`);

  const response = await fetch(url, { ...options, headers });

  // --- response interceptor logic ---
  if (response.status === 401) {
    await refreshToken(); // your refresh helper
    // Retry once after refresh:
    const retried = await fetch(url, { ...options, headers });
    if (!retried.ok) throw new Error(\`HTTP \${retried.status}: \${retried.statusText}\`);
    return retried.json() as Promise<T>;
  }

  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return response.json() as Promise<T>;
}`,
    },

    // Catch-all for any other axios symbol
    default: {
      symbol: "default",
      nativeReplacement: "fetch() or a lightweight alternative (ky, ofetch)",
      minEcmaVersion: "ES2017",
      caveats: [
        "fetch() covers 90% of axios use cases but requires more boilerplate for error handling and JSON",
        "ky (3kB) and ofetch (both on npm) wrap fetch with axios-like ergonomics — good interim step",
        "axios-specific features (upload progress, cancel tokens, automatic transforms) have no direct native equivalent",
      ],
      example: `// Minimal fetch wrapper covering common axios patterns:
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  method: Method,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(\`HTTP \${response.status}: \${text}\`);
  }
  // 204 No Content — return undefined cast to T
  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

export const http = {
  get:    <T>(url: string) => request<T>('GET', url),
  post:   <T>(url: string, data: unknown) => request<T>('POST', url, data),
  put:    <T>(url: string, data: unknown) => request<T>('PUT', url, data),
  patch:  <T>(url: string, data: unknown) => request<T>('PATCH', url, data),
  delete: (url: string) => request<void>('DELETE', url),
};`,
    },
  },

  globalCaveats: [
    "fetch() does not throw on 4xx/5xx — always check response.ok",
    "No automatic JSON parsing — add .then(r => r.json()) or await r.json()",
    "No request/response interceptors natively — refactor to wrappers if needed",
    "fetch() timeout requires AbortController — add if your axios calls have timeouts",
    "Cookies/credentials: add credentials: 'include' if axios withCredentials was used",
  ],
};
