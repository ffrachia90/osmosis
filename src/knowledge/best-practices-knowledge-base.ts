/**
 * Best Practices Knowledge Base
 * Fuentes de verdad para las mejores prácticas de desarrollo moderno
 * 
 * OSMOSIS se nutre de:
 * 1. Documentación oficial de cada framework
 * 2. RFCs y propuestas de nuevas features
 * 3. Patterns de empresas líderes (Vercel, Meta, Google, Netflix, Airbnb)
 * 4. ESLint rules y community standards
 * 5. Web Vitals y performance benchmarks
 * 6. WCAG 2.1+ para accesibilidad
 * 7. OWASP Top 10 para seguridad
 */

export interface BestPracticeSource {
  id: string;
  name: string;
  url: string;
  category: 'official' | 'community' | 'enterprise' | 'security' | 'performance' | 'accessibility';
  framework?: string;
  lastUpdated?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class BestPracticesKnowledgeBase {
  /**
   * Fuentes oficiales de documentación
   */
  static readonly OFFICIAL_SOURCES: BestPracticeSource[] = [
    {
      id: 'react-docs',
      name: 'React Official Documentation',
      url: 'https://react.dev',
      category: 'official',
      framework: 'react',
      priority: 'critical'
    },
    {
      id: 'react-18-upgrade',
      name: 'React 18 Upgrade Guide',
      url: 'https://react.dev/blog/2022/03/08/react-18-upgrade-guide',
      category: 'official',
      framework: 'react',
      priority: 'high'
    },
    {
      id: 'angular-docs',
      name: 'Angular Official Documentation',
      url: 'https://angular.io/docs',
      category: 'official',
      framework: 'angular',
      priority: 'critical'
    },
    {
      id: 'vue-docs',
      name: 'Vue 3 Official Documentation',
      url: 'https://vuejs.org/guide/introduction.html',
      category: 'official',
      framework: 'vue',
      priority: 'critical'
    },
    {
      id: 'typescript-handbook',
      name: 'TypeScript Handbook',
      url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
      category: 'official',
      priority: 'critical'
    }
  ];

  /**
   * Guías de estilo y patrones de empresas líderes
   */
  static readonly ENTERPRISE_PATTERNS: BestPracticeSource[] = [
    {
      id: 'airbnb-react',
      name: 'Airbnb React/JSX Style Guide',
      url: 'https://github.com/airbnb/javascript/tree/master/react',
      category: 'enterprise',
      framework: 'react',
      priority: 'high'
    },
    {
      id: 'google-typescript',
      name: 'Google TypeScript Style Guide',
      url: 'https://google.github.io/styleguide/tsguide.html',
      category: 'enterprise',
      priority: 'high'
    },
    {
      id: 'netflix-microfrontends',
      name: 'Netflix Micro Frontend Architecture',
      url: 'https://netflixtechblog.com',
      category: 'enterprise',
      priority: 'medium'
    },
    {
      id: 'vercel-patterns',
      name: 'Vercel Next.js Patterns',
      url: 'https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts',
      category: 'enterprise',
      framework: 'react',
      priority: 'high'
    }
  ];

  /**
   * Seguridad
   */
  static readonly SECURITY_SOURCES: BestPracticeSource[] = [
    {
      id: 'owasp-top10',
      name: 'OWASP Top 10',
      url: 'https://owasp.org/www-project-top-ten/',
      category: 'security',
      priority: 'critical'
    },
    {
      id: 'react-security',
      name: 'React Security Best Practices',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/React_Security_Cheat_Sheet.html',
      category: 'security',
      framework: 'react',
      priority: 'critical'
    },
    {
      id: 'csp',
      name: 'Content Security Policy',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
      category: 'security',
      priority: 'high'
    }
  ];

  /**
   * Performance
   */
  static readonly PERFORMANCE_SOURCES: BestPracticeSource[] = [
    {
      id: 'web-vitals',
      name: 'Web Vitals',
      url: 'https://web.dev/vitals/',
      category: 'performance',
      priority: 'critical'
    },
    {
      id: 'react-perf',
      name: 'React Performance Optimization',
      url: 'https://react.dev/learn/render-and-commit',
      category: 'performance',
      framework: 'react',
      priority: 'high'
    },
    {
      id: 'lighthouse',
      name: 'Lighthouse Performance Auditing',
      url: 'https://developer.chrome.com/docs/lighthouse/overview/',
      category: 'performance',
      priority: 'high'
    }
  ];

  /**
   * Accesibilidad
   */
  static readonly ACCESSIBILITY_SOURCES: BestPracticeSource[] = [
    {
      id: 'wcag-2.1',
      name: 'WCAG 2.1 Guidelines',
      url: 'https://www.w3.org/WAI/WCAG21/quickref/',
      category: 'accessibility',
      priority: 'critical'
    },
    {
      id: 'aria-practices',
      name: 'ARIA Authoring Practices',
      url: 'https://www.w3.org/WAI/ARIA/apg/',
      category: 'accessibility',
      priority: 'critical'
    },
    {
      id: 'react-a11y',
      name: 'React Accessibility',
      url: 'https://react.dev/learn/accessibility',
      category: 'accessibility',
      framework: 'react',
      priority: 'high'
    }
  ];

  /**
   * Patrones modernos específicos
   */
  static readonly MODERN_PATTERNS = {
    react: {
      hooks: {
        useState: {
          bestPractice: 'Siempre proporciona un valor inicial',
          pattern: 'const [state, setState] = useState<Type>(initialValue)',
          avoid: 'const [state, setState] = useState()',
          reference: 'https://react.dev/reference/react/useState'
        },
        useEffect: {
          bestPractice: 'Siempre retorna función de cleanup si hay subscripciones',
          pattern: 'useEffect(() => { const sub = subscribe(); return () => sub.unsubscribe(); }, [deps])',
          avoid: 'useEffect sin cleanup o con deps incorrectas',
          reference: 'https://react.dev/reference/react/useEffect'
        },
        useCallback: {
          bestPractice: 'Usa para funciones pasadas a componentes memoizados',
          pattern: 'const handler = useCallback(() => {}, [deps])',
          avoid: 'Inline functions en props de componentes pesados',
          reference: 'https://react.dev/reference/react/useCallback'
        },
        useMemo: {
          bestPractice: 'Usa solo para cálculos costosos',
          pattern: 'const value = useMemo(() => heavyComputation(), [deps])',
          avoid: 'Usar para todo sin medir el impacto',
          reference: 'https://react.dev/reference/react/useMemo'
        }
      },
      modernApproach: {
        components: 'Functional Components con Hooks (no Class Components)',
        state: 'useState + useReducer para estado local',
        sideEffects: 'useEffect con cleanup apropiado',
        performance: 'React.memo, useCallback, useMemo cuando sea necesario',
        errorHandling: 'Error Boundaries',
        dataFetching: 'React Query, SWR, o Suspense',
        routing: 'React Router v6+ con data loaders',
        styling: 'CSS Modules, Styled Components, Tailwind CSS',
        forms: 'React Hook Form + Zod/Yup',
        testing: 'React Testing Library + Vitest/Jest'
      }
    },
    
    angular: {
      modernApproach: {
        components: 'Standalone Components (Angular 14+)',
        state: 'Signals (Angular 16+)',
        reactivity: 'Signals en lugar de RxJS cuando sea posible',
        routing: 'Functional Guards',
        forms: 'Reactive Forms con Typed Forms',
        httpClient: 'HttpClient con interceptors',
        testing: 'Jest + Angular Testing Library'
      }
    },
    
    vue: {
      modernApproach: {
        components: '<script setup> con Composition API',
        state: 'ref, reactive, computed',
        lifecycle: 'onMounted, onUnmounted en lugar de Options API',
        routing: 'Vue Router 4+',
        stateManagement: 'Pinia (no Vuex)',
        forms: 'Vuelidate o VeeValidate',
        testing: 'Vitest + Vue Test Utils'
      }
    }
  };

  /**
   * Anti-patrones a evitar
   */
  static readonly ANTI_PATTERNS = {
    react: [
      {
        antiPattern: 'Class Components',
        modernAlternative: 'Functional Components con Hooks',
        reason: 'Hooks son más simples, composables y performantes'
      },
      {
        antiPattern: 'componentDidMount, componentWillUnmount',
        modernAlternative: 'useEffect',
        reason: 'Hooks unifican el lifecycle'
      },
      {
        antiPattern: 'defaultProps',
        modernAlternative: 'Destructuring con default values',
        reason: 'defaultProps está deprecado en React 18.3+'
      },
      {
        antiPattern: 'findDOMNode()',
        modernAlternative: 'useRef',
        reason: 'findDOMNode está deprecado'
      },
      {
        antiPattern: 'Inline functions en render',
        modernAlternative: 'useCallback',
        reason: 'Previene re-renders innecesarios'
      },
      {
        antiPattern: 'Index como key en listas',
        modernAlternative: 'ID único del item',
        reason: 'El index puede causar bugs en re-ordenamiento'
      },
      {
        antiPattern: 'Modificar state directamente',
        modernAlternative: 'setState o dispatch',
        reason: 'React no detecta mutaciones directas'
      }
    ],
    
    angular: [
      {
        antiPattern: 'NgModules para todo',
        modernAlternative: 'Standalone Components',
        reason: 'Standalone reduce boilerplate y mejora tree-shaking'
      },
      {
        antiPattern: 'Usar Vuex en Vue 3',
        modernAlternative: 'Pinia',
        reason: 'Pinia es más simple y tiene mejor TypeScript support'
      }
    ],
    
    security: [
      {
        antiPattern: 'dangerouslySetInnerHTML sin sanitizar',
        modernAlternative: 'DOMPurify + dangerouslySetInnerHTML',
        reason: 'Previene XSS'
      },
      {
        antiPattern: 'eval()',
        modernAlternative: 'JSON.parse() o alternativas seguras',
        reason: 'eval es extremadamente inseguro'
      },
      {
        antiPattern: 'Tokens en localStorage',
        modernAlternative: 'httpOnly cookies',
        reason: 'localStorage es vulnerable a XSS'
      }
    ],
    
    performance: [
      {
        antiPattern: 'Inline styles en render',
        modernAlternative: 'CSS Modules o styled-components',
        reason: 'Inline styles causan re-renders'
      },
      {
        antiPattern: 'Demasiados re-renders',
        modernAlternative: 'React.memo, useMemo, useCallback',
        reason: 'Optimización de performance'
      },
      {
        antiPattern: 'Bundles gigantes',
        modernAlternative: 'Code splitting, lazy loading',
        reason: 'Mejora tiempo de carga inicial'
      }
    ]
  };

  /**
   * Obtiene todas las fuentes
   */
  static getAllSources(): BestPracticeSource[] {
    return [
      ...this.OFFICIAL_SOURCES,
      ...this.ENTERPRISE_PATTERNS,
      ...this.SECURITY_SOURCES,
      ...this.PERFORMANCE_SOURCES,
      ...this.ACCESSIBILITY_SOURCES
    ];
  }

  /**
   * Obtiene fuentes por categoría
   */
  static getSourcesByCategory(category: BestPracticeSource['category']): BestPracticeSource[] {
    return this.getAllSources().filter(source => source.category === category);
  }

  /**
   * Obtiene fuentes por framework
   */
  static getSourcesByFramework(framework: string): BestPracticeSource[] {
    return this.getAllSources().filter(source => source.framework === framework);
  }

  /**
   * Obtiene patrones modernos para un framework
   */
  static getModernPatterns(framework: 'react' | 'angular' | 'vue') {
    return this.MODERN_PATTERNS[framework];
  }

  /**
   * Obtiene anti-patrones para una categoría
   */
  static getAntiPatterns(category: keyof typeof BestPracticesKnowledgeBase.ANTI_PATTERNS) {
    return this.ANTI_PATTERNS[category];
  }
}


