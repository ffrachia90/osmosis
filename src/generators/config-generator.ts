/**
 * Config Generator
 * Genera archivos de configuración modernos para el proyecto
 * 
 * - package.json actualizado con dependencias modernas
 * - tsconfig.json con configuración estricta
 * - vite.config.ts si se migra de webpack
 * - eslint.config.js (flat config)
 * - .prettierrc
 */

import fs from 'fs';
import path from 'path';
import { ProposedStack, ConfigUpdates, ConfigFile } from '../core/architecture/ArchitectureManifest';
import { DeepPatternAnalysis } from '../core/architecture/DeepPatternScanner';

// ============================================================================
// DEPENDENCY MAPS
// ============================================================================

const MODERN_DEPENDENCIES: Record<string, Record<string, string>> = {
  // State Management
  'zustand': {
    'zustand': '^5.0.0'
  },
  'redux-toolkit': {
    '@reduxjs/toolkit': '^2.3.0',
    'react-redux': '^9.1.0'
  },
  'jotai': {
    'jotai': '^2.10.0'
  },
  
  // Data Fetching
  'tanstack-query': {
    '@tanstack/react-query': '^5.60.0',
    '@tanstack/react-query-devtools': '^5.60.0'
  },
  'swr': {
    'swr': '^2.2.0'
  },
  'rtk-query': {
    '@reduxjs/toolkit': '^2.3.0'
  },
  
  // Routing
  'react-router-v7': {
    'react-router': '^7.0.0',
    'react-router-dom': '^7.0.0'
  },
  'react-router-v6': {
    'react-router-dom': '^6.28.0'
  },
  'tanstack-router': {
    '@tanstack/react-router': '^1.80.0'
  },
  
  // Styling
  'tailwind': {
    'tailwindcss': '^3.4.0',
    'autoprefixer': '^10.4.0',
    'postcss': '^8.4.0'
  },
  'styled-components': {
    'styled-components': '^6.1.0'
  },
  'emotion': {
    '@emotion/react': '^11.13.0',
    '@emotion/styled': '^11.13.0'
  },
  
  // Forms
  'react-hook-form': {
    'react-hook-form': '^7.53.0',
    'zod': '^3.23.0',
    '@hookform/resolvers': '^3.9.0'
  },
  'formik': {
    'formik': '^2.4.0',
    'yup': '^1.4.0'
  },
  
  // Testing
  'vitest': {
    'vitest': '^2.1.0',
    '@testing-library/react': '^16.0.0',
    '@testing-library/jest-dom': '^6.6.0',
    '@testing-library/user-event': '^14.5.0',
    'jsdom': '^25.0.0'
  },
  'jest': {
    'jest': '^29.7.0',
    '@testing-library/react': '^16.0.0',
    '@testing-library/jest-dom': '^6.6.0',
    'jest-environment-jsdom': '^29.7.0'
  }
};

const DEPRECATED_PACKAGES = [
  // Redux legacy
  'redux',
  'redux-thunk',
  'redux-saga',
  'react-redux', // Se mantiene si se usa RTK
  
  // Routing legacy
  'react-router', // versiones < 6
  'history',
  
  // Testing legacy
  'enzyme',
  'enzyme-adapter-react-16',
  'enzyme-to-json',
  
  // Other
  'prop-types',
  'recompose',
  'create-react-class'
];

// ============================================================================
// MAIN CLASS
// ============================================================================

export class ConfigGenerator {
  /**
   * Genera todas las actualizaciones de configuración necesarias
   */
  static generate(
    analysis: DeepPatternAnalysis,
    proposedStack: ProposedStack,
    projectRoot: string
  ): ConfigUpdates {
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};
    const removePackages: string[] = [];
    const scripts: Record<string, string> = {};
    const configFiles: ConfigFile[] = [];
    
    // 1. Agregar dependencias del stack propuesto
    this.addStackDependencies(proposedStack, dependencies, devDependencies);
    
    // 2. Detectar paquetes a eliminar
    this.detectPackagesToRemove(analysis, proposedStack, removePackages);
    
    // 3. Generar scripts modernos
    this.generateScripts(proposedStack, scripts);
    
    // 4. Generar archivos de configuración
    configFiles.push(
      this.generateTsConfig(projectRoot),
      this.generateESLintConfig(proposedStack),
      this.generatePrettierConfig()
    );
    
    // 5. Configuración específica de styling
    if (proposedStack.styling.library === 'tailwind') {
      configFiles.push(
        this.generateTailwindConfig(),
        this.generatePostCSSConfig()
      );
    }
    
    // 6. Configuración de testing
    if (proposedStack.testing.library === 'vitest') {
      configFiles.push(this.generateVitestConfig());
    }
    
    // 7. React Query Provider setup
    if (proposedStack.dataFetching.library === 'tanstack-query') {
      configFiles.push(this.generateQueryClientSetup());
    }
    
    return {
      dependencies,
      devDependencies,
      removePackages,
      scripts,
      configFiles
    };
  }
  
  // --------------------------------------------------------------------------
  // DEPENDENCIES
  // --------------------------------------------------------------------------
  
  private static addStackDependencies(
    stack: ProposedStack,
    deps: Record<string, string>,
    devDeps: Record<string, string>
  ): void {
    // State
    if (stack.stateManagement.library !== 'none') {
      Object.assign(deps, MODERN_DEPENDENCIES[stack.stateManagement.library] || {});
    }
    
    // Fetching
    if (stack.dataFetching.library !== 'manual') {
      Object.assign(deps, MODERN_DEPENDENCIES[stack.dataFetching.library] || {});
    }
    
    // Routing
    Object.assign(deps, MODERN_DEPENDENCIES[stack.routing.library] || {});
    
    // Styling
    const stylingDeps = MODERN_DEPENDENCIES[stack.styling.library] || {};
    if (stack.styling.library === 'tailwind') {
      Object.assign(devDeps, stylingDeps);
    } else {
      Object.assign(deps, stylingDeps);
    }
    
    // Forms
    if (stack.forms.library !== 'native') {
      Object.assign(deps, MODERN_DEPENDENCIES[stack.forms.library] || {});
    }
    
    // Testing (siempre devDeps)
    Object.assign(devDeps, MODERN_DEPENDENCIES[stack.testing.library] || {});
    
    // Core dependencies
    Object.assign(deps, {
      'react': '^18.3.0',
      'react-dom': '^18.3.0'
    });
    
    Object.assign(devDeps, {
      'typescript': '^5.6.0',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0'
    });
  }
  
  private static detectPackagesToRemove(
    analysis: DeepPatternAnalysis,
    stack: ProposedStack,
    toRemove: string[]
  ): void {
    // Si migramos de Redux legacy a algo moderno
    if (analysis.summary.primaryStateLib === 'redux-legacy' &&
        stack.stateManagement.library !== 'redux-toolkit') {
      toRemove.push('redux', 'redux-thunk', 'redux-saga', 'react-redux');
    }
    
    // Si detectamos enzyme, siempre remover
    if (analysis.components.classComponents > 0) {
      toRemove.push('enzyme', 'enzyme-adapter-react-16');
    }
    
    // PropTypes si vamos a TypeScript estricto
    toRemove.push('prop-types');
    
    // Eliminar duplicados
    const unique = [...new Set(toRemove)];
    toRemove.length = 0;
    toRemove.push(...unique);
  }
  
  // --------------------------------------------------------------------------
  // SCRIPTS
  // --------------------------------------------------------------------------
  
  private static generateScripts(
    stack: ProposedStack,
    scripts: Record<string, string>
  ): void {
    scripts['dev'] = 'vite';
    scripts['build'] = 'tsc && vite build';
    scripts['preview'] = 'vite preview';
    scripts['lint'] = 'eslint . --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0';
    scripts['lint:fix'] = 'eslint . --ext .ts,.tsx --fix';
    scripts['format'] = 'prettier --write "src/**/*.{ts,tsx,css}"';
    scripts['typecheck'] = 'tsc --noEmit';
    
    if (stack.testing.library === 'vitest') {
      scripts['test'] = 'vitest';
      scripts['test:coverage'] = 'vitest run --coverage';
      scripts['test:ui'] = 'vitest --ui';
    } else {
      scripts['test'] = 'jest';
      scripts['test:coverage'] = 'jest --coverage';
      scripts['test:watch'] = 'jest --watch';
    }
  }
  
  // --------------------------------------------------------------------------
  // CONFIG FILES
  // --------------------------------------------------------------------------
  
  private static generateTsConfig(projectRoot: string): ConfigFile {
    // Verificar si ya existe y preservar algunas opciones
    let existingPaths = {};
    const existingTsConfig = path.join(projectRoot, 'tsconfig.json');
    if (fs.existsSync(existingTsConfig)) {
      try {
        const existing = JSON.parse(fs.readFileSync(existingTsConfig, 'utf-8'));
        existingPaths = existing.compilerOptions?.paths || {};
      } catch (e) {}
    }
    
    const config = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        
        /* Bundler mode */
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        
        /* Linting - Strict */
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        noUncheckedIndexedAccess: true,
        
        /* Paths */
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
          ...existingPaths
        }
      },
      include: ['src'],
      exclude: ['node_modules', 'dist', 'build']
    };
    
    return {
      path: 'tsconfig.json',
      content: JSON.stringify(config, null, 2),
      overwrite: true
    };
  }
  
  private static generateESLintConfig(stack: ProposedStack): ConfigFile {
    const config = `import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'build', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // TypeScript strict
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // React best practices
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
`;
    
    return {
      path: 'eslint.config.js',
      content: config,
      overwrite: true
    };
  }
  
  private static generatePrettierConfig(): ConfigFile {
    const config = {
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      tabWidth: 2,
      useTabs: false,
      printWidth: 100,
      bracketSpacing: true,
      arrowParens: 'avoid',
      endOfLine: 'lf',
      plugins: ['prettier-plugin-tailwindcss']
    };
    
    return {
      path: '.prettierrc',
      content: JSON.stringify(config, null, 2),
      overwrite: false // No sobrescribir si existe
    };
  }
  
  private static generateTailwindConfig(): ConfigFile {
    const config = `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Agregar colores del design system aquí
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
`;
    
    return {
      path: 'tailwind.config.ts',
      content: config,
      overwrite: false
    };
  }
  
  private static generatePostCSSConfig(): ConfigFile {
    const config = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
    
    return {
      path: 'postcss.config.js',
      content: config,
      overwrite: false
    };
  }
  
  private static generateVitestConfig(): ConfigFile {
    const config = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
`;
    
    return {
      path: 'vitest.config.ts',
      content: config,
      overwrite: true
    };
  }
  
  private static generateQueryClientSetup(): ConfigFile {
    const content = `/**
 * TanStack Query Client Setup
 * Configuración centralizada del QueryClient
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo antes de considerar datos "stale"
      staleTime: 1000 * 60 * 5, // 5 minutos
      
      // Tiempo que los datos inactivos permanecen en cache
      gcTime: 1000 * 60 * 30, // 30 minutos
      
      // Reintentos en caso de error
      retry: (failureCount, error) => {
        // No reintentar en errores 4xx
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        return failureCount < 3;
      },
      
      // No refetch automático en focus (opcional)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Reintentos para mutaciones
      retry: 1,
    },
  },
});

/**
 * Ejemplo de uso en App.tsx:
 * 
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
 * import { queryClient } from './lib/query-client';
 * 
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <Router />
 *       <ReactQueryDevtools initialIsOpen={false} />
 *     </QueryClientProvider>
 *   );
 * }
 */
`;
    
    return {
      path: 'src/lib/query-client.ts',
      content,
      overwrite: false
    };
  }
  
  // --------------------------------------------------------------------------
  // APPLY CONFIG UPDATES
  // --------------------------------------------------------------------------
  
  /**
   * Aplica las actualizaciones de configuración al proyecto
   */
  static async apply(
    projectRoot: string,
    updates: ConfigUpdates
  ): Promise<{ created: string[]; updated: string[]; skipped: string[] }> {
    const result = {
      created: [] as string[],
      updated: [] as string[],
      skipped: [] as string[]
    };
    
    // 1. Actualizar package.json
    await this.updatePackageJson(projectRoot, updates, result);
    
    // 2. Escribir archivos de configuración
    for (const file of updates.configFiles) {
      const filePath = path.join(projectRoot, file.path);
      const exists = fs.existsSync(filePath);
      
      if (exists && !file.overwrite) {
        result.skipped.push(file.path);
        continue;
      }
      
      // Crear directorio si no existe
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, file.content, 'utf-8');
      
      if (exists) {
        result.updated.push(file.path);
      } else {
        result.created.push(file.path);
      }
    }
    
    return result;
  }
  
  private static async updatePackageJson(
    projectRoot: string,
    updates: ConfigUpdates,
    result: { created: string[]; updated: string[]; skipped: string[] }
  ): Promise<void> {
    const pkgPath = path.join(projectRoot, 'package.json');
    
    if (!fs.existsSync(pkgPath)) {
      result.skipped.push('package.json (no existe)');
      return;
    }
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    // Agregar nuevas dependencias
    pkg.dependencies = { ...pkg.dependencies, ...updates.dependencies };
    pkg.devDependencies = { ...pkg.devDependencies, ...updates.devDependencies };
    
    // Eliminar paquetes obsoletos
    for (const pkgName of updates.removePackages) {
      delete pkg.dependencies?.[pkgName];
      delete pkg.devDependencies?.[pkgName];
    }
    
    // Actualizar scripts
    pkg.scripts = { ...pkg.scripts, ...updates.scripts };
    
    // Ordenar dependencias alfabéticamente
    pkg.dependencies = this.sortObject(pkg.dependencies);
    pkg.devDependencies = this.sortObject(pkg.devDependencies);
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    result.updated.push('package.json');
  }
  
  private static sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {} as Record<string, string>);
  }
  
  // --------------------------------------------------------------------------
  // SETUP FILE GENERATORS
  // --------------------------------------------------------------------------
  
  /**
   * Genera el archivo de setup para tests
   */
  static generateTestSetup(): ConfigFile {
    const content = `import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Mock de matchMedia (requerido por algunos componentes)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
`;
    
    return {
      path: 'src/test/setup.ts',
      content,
      overwrite: false
    };
  }
  
  /**
   * Genera un archivo de utilidades para tests
   */
  static generateTestUtils(): ConfigFile {
    const content = `import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Query client para tests (sin retry, sin cache persistente)
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

interface WrapperProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-exportar todo de testing-library
export * from '@testing-library/react';
export { customRender as render };
`;
    
    return {
      path: 'src/test/test-utils.tsx',
      content,
      overwrite: false
    };
  }
}
