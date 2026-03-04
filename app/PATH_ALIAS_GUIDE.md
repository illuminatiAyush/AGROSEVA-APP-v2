# Path Alias Configuration Guide

## Overview

This project uses the `@/` path alias to enable clean, absolute imports from the `src/` directory.

**Canonical mapping:** `@/` → `<project-root>/src/`

## Configuration Files

### TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Purpose:** Enables TypeScript to understand `@/` imports for:
- Type checking
- IDE autocomplete and navigation
- Compile-time validation

### Babel (`babel.config.js`)

```javascript
plugins: [
  [
    'module-resolver',
    {
      root: ['./'],
      alias: {
        '@': './src',
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
  ],
]
```

**Purpose:** Enables Metro bundler (Expo's bundler) to resolve `@/` imports at runtime.

## Critical Rule: Keep Them In Sync

**TypeScript and Babel MUST always match!**

- If you change `tsconfig.json` paths → Update `babel.config.js` alias
- If you change `babel.config.js` alias → Update `tsconfig.json` paths
- If they don't match → Build errors will occur

## Usage

### ✅ Correct (Absolute Imports)

```typescript
import { Colors } from '@/utils/colors';
import { usePHStore } from '@/store/usePHStore';
import { Card } from '@/components/Card';
import { PHData } from '@/models/PHData';
```

### ❌ Incorrect (Relative Imports)

```typescript
// DON'T USE - These are harder to maintain
import { Colors } from '../../../utils/colors';
import { usePHStore } from '../store/usePHStore';
```

## After Changing Alias Configuration

### 1. Clear Expo Cache (MANDATORY)

Metro bundler caches module resolution. After changing Babel config:

```bash
# Stop current server (Ctrl+C)
# Clear cache and restart
expo start -c
# or
npm start -- --clear
```

### 2. Restart TypeScript Server

For proper IDE autocomplete:

**VS Code:**
- `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

**Other IDEs:**
- Restart the IDE or reload the window

## Troubleshooting

### "Unable to resolve @/..."

**Checklist:**
1. ✅ `tsconfig.json` has `baseUrl: "."` and `paths: { "@/*": ["src/*"] }`
2. ✅ `babel.config.js` has `module-resolver` plugin configured
3. ✅ `babel-plugin-module-resolver` is installed in `devDependencies`
4. ✅ Restarted Expo dev server with `-c` flag
5. ✅ Restarted TypeScript server in IDE

### TypeScript errors but app runs

- **Problem:** TypeScript config is wrong
- **Fix:** Check `tsconfig.json` paths configuration

### App crashes but TypeScript is happy

- **Problem:** Babel config is wrong or cache issue
- **Fix:** Check `babel.config.js` and restart with `expo start -c`

### Aliases work in some files but not others

- **Problem:** Mixed import styles or cache issue
- **Fix:** 
  1. Ensure ALL files use `@/` imports (no relative imports)
  2. Clear cache: `expo start -c`
  3. Restart TypeScript server

## File Structure

All imports from `src/` should use `@/`:

```
src/
├── components/     → @/components/*
├── screens/        → @/screens/*
├── services/       → @/services/*
├── store/          → @/store/*
├── models/         → @/models/*
├── utils/          → @/utils/*
├── theme/          → @/theme/*
└── hardware/       → @/hardware/*
```

## Examples

### Importing Components
```typescript
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
```

### Importing Stores
```typescript
import { usePHStore } from '@/store/usePHStore';
import { useStore } from '@/store/useStore';
```

### Importing Utilities
```typescript
import { Colors } from '@/utils/colors';
import { formatDate } from '@/utils/formatters';
```

### Importing Models
```typescript
import { PHData } from '@/models/PHData';
import { SoilData } from '@/models/SoilData';
```

### Importing Services
```typescript
import { phService } from '@/services/PHService';
import { soilService } from '@/services/SoilService';
```

## Best Practices

1. **Always use `@/` for imports from `src/`**
2. **Never mix relative and absolute imports**
3. **Keep TypeScript and Babel configs in sync**
4. **Clear cache after changing alias configuration**
5. **Restart TypeScript server after config changes**

## Verification

To verify the alias is working:

1. **TypeScript:** Hover over an `@/` import - should show correct path
2. **IDE:** Autocomplete should work for `@/` imports
3. **Build:** App should build without "Unable to resolve" errors
4. **Runtime:** App should run without module resolution errors

## Future Files

All new files automatically work with `@/` imports - no additional configuration needed!

Just use:
```typescript
import { Something } from '@/path/to/something';
```

---

**Remember:** If aliases break, the fix is always:
1. Check both config files are in sync
2. Clear Expo cache: `expo start -c`
3. Restart TypeScript server

