/**
 * Node.js preset - optimized for Node.js backend projects
 */

import type { DepScopeConfig } from "../schema.js";

export const nodePreset: Partial<DepScopeConfig> = {
  wellKnownPatterns: [
    // Node.js types
    { pattern: "@types/node", verdict: "IGNORE", reason: "Node.js type definitions" },
    { pattern: "@types/express", verdict: "IGNORE", reason: "Express types" },

    // Express ecosystem
    { pattern: "express", verdict: "KEEP", reason: "Express framework" },
    { pattern: "cors", verdict: "KEEP", reason: "Express middleware" },
    { pattern: "helmet", verdict: "KEEP", reason: "Security middleware" },
    { pattern: "morgan", verdict: "KEEP", reason: "Logging middleware" },
    { pattern: "compression", verdict: "KEEP", reason: "Compression middleware" },
    { pattern: "body-parser", verdict: "KEEP", reason: "Body parsing middleware" },
    { pattern: "cookie-parser", verdict: "KEEP", reason: "Cookie middleware" },
    { pattern: "express-*", verdict: "KEEP", reason: "Express plugins" },

    // Fastify ecosystem
    { pattern: "fastify", verdict: "KEEP", reason: "Fastify framework" },
    { pattern: "@fastify/*", verdict: "KEEP", reason: "Fastify ecosystem" },

    // Database clients
    { pattern: "pg", verdict: "KEEP", reason: "PostgreSQL client" },
    { pattern: "mysql2", verdict: "KEEP", reason: "MySQL client" },
    { pattern: "mongodb", verdict: "KEEP", reason: "MongoDB client" },
    { pattern: "redis", verdict: "KEEP", reason: "Redis client" },
    { pattern: "ioredis", verdict: "KEEP", reason: "Redis client" },
    { pattern: "better-sqlite3", verdict: "KEEP", reason: "SQLite client" },

    // Process management - config only
    { pattern: "nodemon", verdict: "IGNORE", reason: "Dev tool" },
    { pattern: "ts-node", verdict: "IGNORE", reason: "TypeScript runner" },
    { pattern: "tsx", verdict: "IGNORE", reason: "TypeScript runner" },
    { pattern: "pm2", verdict: "IGNORE", reason: "Process manager" },
  ],
};
