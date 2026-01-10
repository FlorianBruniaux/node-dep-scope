/**
 * Dependency Injection Container
 * Phase 1.4 - Simple container for managing dependencies
 */

import type {
  IFileSystem,
  ILogger,
  IImportAnalyzer,
  IPeerDepAnalyzer,
  INativeAlternativesProvider,
  IDuplicateCategoriesProvider,
} from "../types/interfaces.js";

import { ConsoleLogger, NullLogger, createLogger, LogLevel } from "../utils/logger.js";
import { NodeFileSystem, MockFileSystem, createFileSystem } from "../utils/filesystem.js";

// ============================================================================
// Service Keys (type-safe identifiers for services)
// ============================================================================

export const SERVICE_KEYS = {
  Logger: Symbol.for("Logger"),
  FileSystem: Symbol.for("FileSystem"),
  ImportAnalyzer: Symbol.for("ImportAnalyzer"),
  PeerDepAnalyzer: Symbol.for("PeerDepAnalyzer"),
  NativeAlternativesProvider: Symbol.for("NativeAlternativesProvider"),
  DuplicateCategoriesProvider: Symbol.for("DuplicateCategoriesProvider"),
} as const;

export type ServiceKey = (typeof SERVICE_KEYS)[keyof typeof SERVICE_KEYS];

// ============================================================================
// Service Map Types
// ============================================================================

/**
 * Maps service keys to their types for type-safe resolution
 */
export interface ServiceMap {
  [SERVICE_KEYS.Logger]: ILogger;
  [SERVICE_KEYS.FileSystem]: IFileSystem;
  [SERVICE_KEYS.ImportAnalyzer]: IImportAnalyzer;
  [SERVICE_KEYS.PeerDepAnalyzer]: IPeerDepAnalyzer;
  [SERVICE_KEYS.NativeAlternativesProvider]: INativeAlternativesProvider;
  [SERVICE_KEYS.DuplicateCategoriesProvider]: IDuplicateCategoriesProvider;
}

// ============================================================================
// Registration Types
// ============================================================================

type Factory<T> = (container: Container) => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

// ============================================================================
// Container Implementation
// ============================================================================

/**
 * Simple Dependency Injection Container
 *
 * Features:
 * - Type-safe service registration and resolution
 * - Singleton and transient lifetimes
 * - Factory function support
 * - Scoped containers for isolated contexts
 */
export class Container {
  private readonly registrations = new Map<symbol, Registration<unknown>>();
  private readonly parent?: Container;

  constructor(parent?: Container) {
    this.parent = parent;
  }

  /**
   * Register a service as singleton (one instance per container)
   */
  registerSingleton<K extends keyof ServiceMap>(
    key: K,
    factory: Factory<ServiceMap[K]>
  ): this {
    this.registrations.set(key as symbol, {
      factory: factory as Factory<unknown>,
      singleton: true,
    });
    return this;
  }

  /**
   * Register a service as transient (new instance each resolution)
   */
  registerTransient<K extends keyof ServiceMap>(
    key: K,
    factory: Factory<ServiceMap[K]>
  ): this {
    this.registrations.set(key as symbol, {
      factory: factory as Factory<unknown>,
      singleton: false,
    });
    return this;
  }

  /**
   * Register an existing instance directly
   */
  registerInstance<K extends keyof ServiceMap>(
    key: K,
    instance: ServiceMap[K]
  ): this {
    this.registrations.set(key as symbol, {
      factory: () => instance,
      singleton: true,
      instance,
    });
    return this;
  }

  /**
   * Resolve a service by key
   * @throws Error if service not registered
   */
  resolve<K extends keyof ServiceMap>(key: K): ServiceMap[K] {
    const registration = this.registrations.get(key as symbol) as Registration<ServiceMap[K]> | undefined;

    if (!registration) {
      // Check parent container
      if (this.parent) {
        return this.parent.resolve(key);
      }
      throw new Error(`Service not registered: ${String(key)}`);
    }

    if (registration.singleton) {
      if (registration.instance === undefined) {
        registration.instance = registration.factory(this);
      }
      return registration.instance as ServiceMap[K];
    }

    return registration.factory(this);
  }

  /**
   * Try to resolve a service (returns undefined if not registered)
   */
  tryResolve<K extends keyof ServiceMap>(key: K): ServiceMap[K] | undefined {
    try {
      return this.resolve(key);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a service is registered
   */
  has(key: keyof ServiceMap): boolean {
    if (this.registrations.has(key as symbol)) {
      return true;
    }
    return this.parent?.has(key) ?? false;
  }

  /**
   * Create a scoped container (child container)
   * Child can override parent registrations but inherits unoverridden ones
   */
  createScope(): Container {
    return new Container(this);
  }

  /**
   * Clear all singleton instances (useful for testing)
   */
  clearInstances(): void {
    for (const registration of this.registrations.values()) {
      if (registration.singleton) {
        registration.instance = undefined;
      }
    }
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.registrations.clear();
  }
}

// ============================================================================
// Default Container Factory
// ============================================================================

/**
 * Create a container with default production registrations
 */
export function createContainer(options: {
  verbose?: boolean;
  silent?: boolean;
  caching?: boolean;
} = {}): Container {
  const container = new Container();

  // Register Logger
  container.registerSingleton(SERVICE_KEYS.Logger, () => {
    if (options.silent) {
      return new NullLogger();
    }
    return createLogger({
      verbose: options.verbose,
      level: options.verbose ? LogLevel.DEBUG : LogLevel.INFO,
    });
  });

  // Register FileSystem
  container.registerSingleton(SERVICE_KEYS.FileSystem, () => {
    return createFileSystem({ caching: options.caching });
  });

  // Note: ImportAnalyzer, PeerDepAnalyzer, and providers will be registered
  // after Phase 1.5/1.6 refactoring when classes accept dependencies via constructor

  return container;
}

/**
 * Create a container for testing with mock implementations
 */
export function createTestContainer(): Container {
  const container = new Container();

  // Register NullLogger for silent tests
  container.registerSingleton(SERVICE_KEYS.Logger, () => new NullLogger());

  // Register MockFileSystem
  container.registerSingleton(SERVICE_KEYS.FileSystem, () => new MockFileSystem());

  return container;
}

// ============================================================================
// Global Default Container (for backwards compatibility during migration)
// ============================================================================

let defaultContainer: Container | null = null;

/**
 * Get the default container instance
 * Creates one if it doesn't exist
 * @deprecated Use explicit container creation and injection instead
 */
export function getDefaultContainer(): Container {
  if (!defaultContainer) {
    defaultContainer = createContainer();
  }
  return defaultContainer;
}

/**
 * Set a custom default container (useful for testing)
 * @deprecated Use explicit container creation and injection instead
 */
export function setDefaultContainer(container: Container | null): void {
  defaultContainer = container;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  // Logger
  ConsoleLogger,
  NullLogger,
  createLogger,
  LogLevel,
  // FileSystem
  NodeFileSystem,
  MockFileSystem,
  createFileSystem,
};
