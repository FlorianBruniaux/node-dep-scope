# Programmatic API

```typescript
import {
  UsageAnalyzer,
  detectDuplicates,
  defineConfig,
  loadConfig,
  resolveConfig,
  DEFAULT_WELL_KNOWN_PATTERNS
} from '@florianbruniaux/dep-scope';

const analyzer = new UsageAnalyzer({
  srcPaths: ['./src', './app', './components'],
  threshold: 5,
  includeDev: false,
});

const dependencies = await analyzer.scanProject('./my-project');
const duplicates = detectDuplicates(dependencies);

const unused = dependencies.filter(d => d.verdict === 'REMOVE');

const recodable = dependencies.filter(d => d.verdict === 'RECODE_NATIVE');
recodable.forEach(dep => {
  console.log(`${dep.name}: ${dep.alternatives.map(a => a.native).join(', ')}`);
});

const investigate = dependencies.filter(d => d.verdict === 'INVESTIGATE');
investigate.forEach(dep => {
  console.log(`${dep.name}: ${dep.investigateReason}`);
});
```

## Using config files

```typescript
import { loadConfig, resolveConfig, UsageAnalyzer } from '@florianbruniaux/dep-scope';

const fileConfig = await loadConfig('./my-project');
const config = resolveConfig({ threshold: 10 }, fileConfig);
const analyzer = new UsageAnalyzer(config);
```

## defineConfig helper

For TypeScript config files with full autocomplete:

```typescript
// depscope.config.ts
import { defineConfig } from '@florianbruniaux/dep-scope';

export default defineConfig({
  extends: 'react',
  srcPaths: ['src', 'app', 'components'],
  threshold: 8,
  wellKnownPatterns: [
    { pattern: '@myorg/*', verdict: 'KEEP', reason: 'Internal packages' },
  ],
});
```
