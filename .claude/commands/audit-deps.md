# Audit des dépendances avec dep-scope

Analyse les dépendances de ce projet avec `dep-scope` pour identifier les opportunités d'optimisation.

## Instructions

### 1. Lancer le scan

```bash
dep-scope scan
```

Si sources ailleurs que `./src` :
```bash
dep-scope scan -s ./src ./app ./lib
```

### 2. Interpréter les verdicts

| Verdict | Action |
|---------|--------|
| ✗ REMOVE | Supprimer (vérifier : import dynamique ? CSS ? config ?) |
| ⊕ PEER_DEP | Retirer de package.json (restera via peer deps) |
| ↻ RECODE_NATIVE | Migrer vers JS natif (`uuid.v4` → `crypto.randomUUID()`) |
| ⇄ CONSOLIDATE | Fusionner les doublons (garder la lib la plus utilisée) |
| ? INVESTIGATE | Vérifier manuellement |
| ✓ KEEP | RAS |

### 3. Produire le rapport

Structure :

```markdown
## Audit Dépendances - [Projet]

### Résumé
- Total : X deps | Actions : Y | Économie : ~ZKB

### Quick Wins (< 30 min)
- [ ] `npm uninstall pkg` - raison

### Migrations Recommandées
- [ ] pkg → alternative - effort estimé

### Consolidations (doublons)
- [ ] Catégorie : garder X, migrer Y/Z

### À Investiguer
- [ ] pkg - quoi vérifier

### False Positives (à ignorer)
- pkg - utilisé dans config/runtime/CSS
```

### 4. Plan d'action

**Phase 1 - Quick Wins** : Suppressions safe, peer deps
**Phase 2 - Migrations Simples** : uuid→natif, classnames→clsx
**Phase 3 - Refactoring** : Consolidation icons, axios→fetch

### Limitations

Non détectés : `await import()`, `@import` CSS, plugins config (tailwind, babel, eslint).