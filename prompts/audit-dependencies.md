# Prompt: Audit des dépendances avec dep-scope

## Instructions

Tu vas auditer les dépendances de ce projet avec `dep-scope`, un outil d'analyse granulaire qui va au-delà du simple "utilisé/pas utilisé".

### Ce que dep-scope détecte

| Verdict | Signification |
|---------|---------------|
| ✗ REMOVE | Dépendance non importée dans le code → supprimer |
| ⊕ PEER_DEP | Installée via une autre dep, redondante dans package.json → supprimer de package.json |
| ↻ RECODE_NATIVE | Peu de symboles utilisés + alternative native JS existe → migrer vers natif |
| ⇄ CONSOLIDATE | Doublon fonctionnel avec une autre lib → consolider |
| ? INVESTIGATE | Usage faible, à vérifier manuellement |
| ✓ KEEP | Bien utilisée, rien à faire |

### Étape 1 : Lancer le scan

```bash
# Scan complet
dep-scope scan

# Si le projet a des sources ailleurs que ./src
dep-scope scan -s ./src ./app ./lib

# Pour un rapport markdown détaillé
dep-scope report -o ./dep-audit.md
```

### Étape 2 : Analyser les résultats

Pour chaque catégorie, voici comment interpréter :

**REMOVE (✗)** - Vérifier avant suppression :
- Est-ce un import dynamique ? (`await import('pkg')`)
- Est-ce un import CSS ? (`@import 'pkg'` dans CSS/SCSS)
- Est-ce utilisé dans un config ? (tailwind.config, next.config, etc.)
- Si aucun de ces cas → `npm uninstall <pkg>`

**PEER_DEP (⊕)** - Généralement safe à supprimer :
- La dep est requise par une autre, elle restera installée via node_modules
- Supprimer de package.json allège la maintenance
- Vérifier que les versions sont compatibles

**RECODE_NATIVE (↻)** - Évaluer l'effort :
- `uuid.v4` → `crypto.randomUUID()` (trivial)
- `lodash.get` → `?.` optional chaining (trivial)
- `axios` → `fetch()` (modéré si interceptors utilisés)
- `moment` → `Intl.DateTimeFormat` (effort significatif)

**CONSOLIDATE (⇄)** - Doublons fonctionnels :
- Icons : garder la lib la plus utilisée, migrer les autres
- Date : `date-fns` (tree-shakable) > `moment` (deprecated)
- CSS utils : `clsx` (le plus léger) ou `tailwind-merge` (si Tailwind)

**INVESTIGATE (?)** - Prioriser par impact :
- Beaucoup de `@radix-ui/*` ? Normal si shadcn/ui → ignorer
- Libs avec 1-2 symboles dans 1 fichier → candidats à natif/suppression
- Libs critiques (auth, DB) → garder même si faible usage apparent

### Étape 3 : Produire le récapitulatif

Structure ton analyse ainsi :

```markdown
## Audit Dépendances - [Nom du projet]

### Résumé
- Total : X dépendances
- Actions recommandées : Y
- Économie estimée : ~ZKB gzip

### Actions Immédiates (Quick Wins)
Changements safe, effort minimal :
1. `npm uninstall <pkg>` - Raison
2. ...

### Migrations Recommandées
Effort modéré, bénéfice clair :
1. Remplacer X par Y - Raison + estimation effort
2. ...

### Consolidations
Doublons à fusionner :
1. Catégorie : garder X, migrer Y et Z
2. ...

### À Investiguer
Vérification manuelle requise :
1. Pkg - Pourquoi c'est flaggé, quoi vérifier
2. ...

### Ignorés (False Positives)
Deps correctement détectées comme peu utilisées mais à garder :
- Pkg - Raison (config, runtime, etc.)
```

### Étape 4 : Plan d'action priorisé

Propose un plan en 3 phases :

**Phase 1 - Quick Wins (< 30 min)**
- Suppressions safe
- Peer deps à retirer de package.json

**Phase 2 - Migrations Simples (1-2h)**
- `uuid` → `crypto.randomUUID()`
- `classnames` → template literals ou `clsx`
- Consolidation d'une catégorie de libs

**Phase 3 - Refactoring (planifier)**
- Migrations complexes (axios → fetch avec interceptors)
- Consolidation icons si beaucoup de fichiers à toucher

### Commandes utiles

```bash
# Analyser une dep spécifique en détail
dep-scope analyze lodash

# Voir uniquement les doublons
dep-scope duplicates

# Ignorer certains packages
dep-scope scan --ignore @radix-ui/* @clerk/*

# Inclure les devDependencies
dep-scope scan -d
```

### Limitations à connaître

dep-scope ne détecte PAS :
- `await import('pkg')` - imports dynamiques
- `@import 'pkg'` - imports CSS
- Plugins dans configs (tailwind, babel, eslint)
- Runtime-only (fonts, polyfills chargés via CDN)

Si une dep est marquée REMOVE mais utilisée dans ces contextes → ajouter à `--ignore`.
