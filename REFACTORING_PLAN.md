# Plan de Refactoring dep-scope v1.0

## Objectif
Corriger toutes les faiblesses architecturales avant publication npm.

**Effort total estimé**: 45-60 heures (6-8 semaines à temps partiel)

---

## Vue d'ensemble des phases

| Phase | Objectif | Effort | Dépendances |
|-------|----------|--------|-------------|
| **Phase 1** | Interfaces & Dependency Injection | 15-20h | - |
| **Phase 2** | Décomposition UsageAnalyzer | 12-15h | Phase 1 |
| **Phase 3** | Performance (parallélisation, cache) | 8-10h | Phase 2 |
| **Phase 4** | CLI & Reporters | 6-8h | Phases 1-2 |
| **Phase 5** | Tests | 6-8h | Phases 1-4 |

---

## Phase 1: Foundation - Interfaces & Dependency Injection

### Task 1.1: Définir les interfaces core
- **Effort**: 3h
- **Fichiers**: `src/types/interfaces.ts` (create), `src/types/index.ts` (modify)
- **Description**: Créer interfaces pour tous les analyzers, reporters, providers
- **Critères d'acceptation**:
  - [ ] `IImportAnalyzer` avec `analyzeFile()`, `analyzeContent()`
  - [ ] `IUsageAnalyzer` avec `scanProject()`, `analyzeSingleDependency()`
  - [ ] `IPeerDepAnalyzer` avec `analyzePeerDeps()`
  - [ ] `IReporter` avec méthodes pour chaque output
  - [ ] `INativeAlternativesProvider`, `IDuplicateCategoriesProvider`
  - [ ] Backward compatible

### Task 1.2: Créer abstraction Logger
- **Effort**: 2h
- **Fichiers**: `src/utils/logger.ts` (create)
- **Description**: Remplacer console.log/warn par logger injectable
- **Critères d'acceptation**:
  - [ ] `ILogger` interface avec `log()`, `warn()`, `error()`, `debug()`
  - [ ] `ConsoleLogger` implémentation par défaut
  - [ ] `NullLogger` pour mode silencieux
  - [ ] Support niveaux de verbosité

### Task 1.3: Créer abstraction FileSystem
- **Effort**: 2h
- **Fichiers**: `src/utils/filesystem.ts` (create)
- **Description**: Abstraire opérations fichiers pour testabilité
- **Critères d'acceptation**:
  - [ ] `IFileSystem` interface avec `readFile()`, `stat()`, `readdir()`
  - [ ] `NodeFileSystem` implémentation avec node:fs/promises
  - [ ] `MockFileSystem` pour tests

### Task 1.4: Créer Container DI
- **Effort**: 4h
- **Fichiers**: `src/container/index.ts` (create)
- **Description**: Container simple pour gérer dépendances
- **Critères d'acceptation**:
  - [ ] `Container` class avec `register()`, `resolve()`, `createScope()`
  - [ ] Support factory functions
  - [ ] Support singleton vs transient
  - [ ] Container par défaut avec toutes implémentations prod
  - [ ] Export `createContainer()` factory

### Task 1.5: Refactorer ImportAnalyzer pour DI
- **Effort**: 2h
- **Fichiers**: `src/analyzers/import-analyzer.ts` (modify)
- **Description**: Accepter dépendances via constructeur
- **Critères d'acceptation**:
  - [ ] Constructeur accepte `IFileSystem`, `ILogger`
  - [ ] Plus d'imports `fs` directs dans méthodes
  - [ ] Singleton `importAnalyzer` conservé pour rétrocompatibilité
  - [ ] Tous tests existants passent

### Task 1.6: Refactorer PeerDepAnalyzer pour DI
- **Effort**: 2h
- **Fichiers**: `src/analyzers/peer-dep-analyzer.ts` (modify)
- **Description**: Accepter dépendances via constructeur
- **Critères d'acceptation**:
  - [ ] Constructeur accepte `IFileSystem`, `ILogger`
  - [ ] Plus d'imports `fs` directs dans méthodes
  - [ ] Singleton conservé pour rétrocompatibilité
  - [ ] Tous tests existants passent

---

## Phase 2: Décomposition UsageAnalyzer

### Task 2.1: Extraire PackageJsonReader
- **Effort**: 2h
- **Fichiers**: `src/utils/package-json-reader.ts` (create)
- **Description**: Extraire logique lecture/validation package.json
- **Critères d'acceptation**:
  - [ ] `IPackageJsonReader` interface
  - [ ] `PackageJsonReader` avec `read()`, `getDependencies()`, `getDevDependencies()`
  - [ ] Réutilise erreurs de `src/errors/index.ts`
  - [ ] Tests unitaires

### Task 2.2: Extraire SourceFileScanner
- **Effort**: 2h
- **Fichiers**: `src/utils/source-file-scanner.ts` (create)
- **Description**: Extraire logique découverte fichiers sources
- **Critères d'acceptation**:
  - [ ] `ISourceFileScanner` interface
  - [ ] `SourceFileScanner` utilisant fast-glob
  - [ ] Méthodes: `scan()`, `validatePaths()`
  - [ ] Accepte glob patterns et ignore patterns
  - [ ] Tests unitaires

### Task 2.3: Extraire VerdictEngine
- **Effort**: 4h
- **Fichiers**: `src/analyzers/verdict-engine.ts` (create)
- **Description**: Extraire et simplifier logique détermination verdict (70+ lignes if/else)
- **Critères d'acceptation**:
  - [ ] `IVerdictEngine` interface
  - [ ] `VerdictEngine` avec `determineVerdict()`, `calculateConfidence()`
  - [ ] Remplacer if/else par strategy pattern ou decision table
  - [ ] Verdict rules configurables/extensibles
  - [ ] Tests unitaires pour chaque chemin verdict

### Task 2.4: Extraire ImportAggregator
- **Effort**: 2h
- **Fichiers**: `src/analyzers/import-aggregator.ts` (create)
- **Description**: Extraire logique groupage imports et agrégation symboles
- **Critères d'acceptation**:
  - [ ] `IImportAggregator` interface
  - [ ] `ImportAggregator` avec `groupByPackage()`, `aggregateSymbols()`
  - [ ] Tests unitaires

### Task 2.5: Refactorer UsageAnalyzer comme orchestrateur
- **Effort**: 4h
- **Fichiers**: `src/analyzers/usage-analyzer.ts` (modify)
- **Description**: Reconstruire UsageAnalyzer comme orchestrateur mince
- **Critères d'acceptation**:
  - [ ] Constructeur accepte toutes dépendances via DI
  - [ ] Classe délègue aux composants extraits
  - [ ] Classe < 200 lignes
  - [ ] Tous tests existants passent
  - [ ] API publique inchangée

---

## Phase 3: Performance

### Task 3.1: Implémenter pool traitement fichiers
- **Effort**: 3h
- **Fichiers**: `src/utils/parallel-processor.ts` (create)
- **Description**: Activer analyse fichiers parallèle avec p-limit
- **Critères d'acceptation**:
  - [ ] `IParallelProcessor` interface
  - [ ] `ParallelProcessor` avec concurrence configurable
  - [ ] `processFiles()` acceptant fonction de traitement
  - [ ] Respecte ressources système (défaut = CPU cores)
  - [ ] Benchmark montrant amélioration

### Task 3.2: Implémenter cache analyse
- **Effort**: 3h
- **Fichiers**: `src/utils/cache.ts` (create)
- **Description**: Cache résultats analyse basé sur hash/mtime fichier
- **Critères d'acceptation**:
  - [ ] `ICache<K, V>` interface
  - [ ] `FileAnalysisCache` implémentation
  - [ ] Clé cache = path + mtime (ou content hash)
  - [ ] Persistence cache sur disque optionnelle
  - [ ] Invalidation cache si fichier modifié
  - [ ] Limite taille cache configurable

### Task 3.3: Intégrer traitement parallèle dans UsageAnalyzer
- **Effort**: 2h
- **Fichiers**: `src/analyzers/usage-analyzer.ts` (modify)
- **Description**: Remplacer traitement séquentiel par parallèle
- **Critères d'acceptation**:
  - [ ] Analyse fichiers en parallèle via ParallelProcessor
  - [ ] Concurrence configurable via options
  - [ ] Tous tests existants passent
  - [ ] Amélioration perf mesurable sur projets 100+ fichiers

---

## Phase 4: CLI & Reporters

### Task 4.1: Extraire command handlers CLI
- **Effort**: 3h
- **Fichiers**: `src/cli/commands/scan.ts`, `analyze.ts`, `duplicates.ts`, `report.ts`, `init.ts` (create)
- **Description**: Splitter fichier CLI 575 lignes en handlers séparés
- **Critères d'acceptation**:
  - [ ] Chaque commande dans son fichier
  - [ ] `cli/index.ts` ne fait que wirer les commandes
  - [ ] Chaque fichier commande < 80 lignes
  - [ ] Logique validation partagée dans `cli/validation.ts`
  - [ ] Fonctionnalité CLI inchangée

### Task 4.2: Créer Reporter Factory
- **Effort**: 2h
- **Fichiers**: `src/reporters/factory.ts` (create), `src/reporters/index.ts` (create)
- **Description**: Implémenter factory pattern pour sélection reporter
- **Critères d'acceptation**:
  - [ ] `ReporterFactory` class
  - [ ] `createReporter(format: string): IReporter`
  - [ ] Facile d'ajouter nouveaux formats (HTML, SARIF)
  - [ ] Tests unitaires

### Task 4.3: Refactorer Reporters pour IReporter
- **Effort**: 2h
- **Fichiers**: `src/reporters/console-reporter.ts`, `markdown-reporter.ts` (modify)
- **Description**: Faire implémenter interface commune aux reporters
- **Critères d'acceptation**:
  - [ ] Les deux reporters implémentent `IReporter`
  - [ ] Signatures méthodes consistantes
  - [ ] Constantes dupliquées (VERDICT_COLOR, etc.) dans module partagé
  - [ ] Singletons conservés pour rétrocompatibilité

---

## Phase 5: Tests

### Task 5.1: Créer module utilitaires tests
- **Effort**: 2h
- **Fichiers**: `tests/utils/index.ts`, `mocks.ts`, `fixtures.ts` (create)
- **Description**: Créer utilitaires tests partagés et mocks
- **Critères d'acceptation**:
  - [ ] `MockFileSystem` implémentant `IFileSystem`
  - [ ] `MockLogger` implémentant `ILogger`
  - [ ] Helper `createTestContainer()`
  - [ ] Fixtures communes pour ImportInfo, DependencyAnalysis, etc.
  - [ ] Builder patterns pour données test

### Task 5.2: Refactorer tests UsageAnalyzer
- **Effort**: 3h
- **Fichiers**: `tests/analyzers/usage-analyzer.test.ts` (rewrite)
- **Description**: Supprimer vi.mock, TestableUsageAnalyzer, @ts-expect-error
- **Critères d'acceptation**:
  - [ ] Aucun appel `vi.mock()`
  - [ ] Aucun commentaire `@ts-expect-error`
  - [ ] Pas de subclass `TestableUsageAnalyzer`
  - [ ] Tests utilisent container DI avec mocks
  - [ ] Tests agnostiques de l'implémentation
  - [ ] 100% cas de test existants préservés

### Task 5.3: Ajouter tests nouveaux composants
- **Effort**: 2h
- **Fichiers**: `tests/analyzers/verdict-engine.test.ts`, `tests/utils/package-json-reader.test.ts`, `tests/utils/source-file-scanner.test.ts` (create)
- **Description**: Tests complets pour composants extraits
- **Critères d'acceptation**:
  - [ ] VerdictEngine: test chaque chemin verdict indépendamment
  - [ ] PackageJsonReader: test parsing, validation, error handling
  - [ ] SourceFileScanner: test glob patterns, ignore patterns
  - [ ] Tous composants ont >90% coverage

---

## Ordre d'implémentation

```
Phase 1 (Foundation) ─────────────────────────────────
│
├── 1.1 Interfaces ────────┐
├── 1.2 Logger ────────────┼── Parallélisable
├── 1.3 FileSystem ────────┤
├── 1.4 Container DI ──────┘
│           │
│           ▼
├── 1.5 ImportAnalyzer DI ─┬── Dépend de 1.1-1.4
└── 1.6 PeerDepAnalyzer DI ┘
            │
            ▼
Phase 2 (Decomposition) ──────────────────────────────
│
├── 2.1 PackageJsonReader ─┐
├── 2.2 SourceFileScanner ─┼── Parallélisable
├── 2.3 VerdictEngine ─────┤
├── 2.4 ImportAggregator ──┘
│           │
│           ▼
└── 2.5 UsageAnalyzer refactor ── Dépend de 2.1-2.4
            │
            ▼
Phase 3 (Performance) ────────────────────────────────
│
├── 3.1 Parallel Processor ┬── Parallélisable
├── 3.2 Analysis Cache ────┘
│           │
│           ▼
└── 3.3 Intégrer parallélisme
            │
            ▼
Phase 4 (CLI & Reporters) ── Peut démarrer après Phase 2
│
├── 4.1 CLI Commands ──────┐
├── 4.2 Reporter Factory ──┼── Parallélisable
└── 4.3 Refactor Reporters ┘
            │
            ▼
Phase 5 (Tests) ──────────────────────────────────────
│
├── 5.1 Test Utilities
│           │
│           ▼
├── 5.2 Refactor UsageAnalyzer Tests
└── 5.3 New Component Tests
```

---

## Garanties de rétrocompatibilité

Durant toutes les phases:

1. **Singletons exportés conservés**: `importAnalyzer`, `usageAnalyzer`, `peerDepAnalyzer`, `consoleReporter`, `markdownReporter`
2. **API publique inchangée**: Toutes signatures actuelles fonctionnent
3. **Types inchangés**: Tous types exportés de `types/index.ts` restent
4. **CLI inchangé**: Toutes commandes et flags fonctionnent identiquement
5. **Format config inchangé**: Tous fichiers config continuent de fonctionner

---

## Checklist finale avant npm publish

- [ ] Toutes les phases complétées
- [ ] 159+ tests passent
- [ ] Coverage > 80%
- [ ] Build sans erreur
- [ ] `npm pack` et test local
- [ ] README à jour
- [ ] CHANGELOG créé
- [ ] Version bump à 1.0.0
- [ ] Tag git v1.0.0
