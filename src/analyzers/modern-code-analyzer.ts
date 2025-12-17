/**
 * Modern Code Analyzer
 * Analiza código moderno (React, Angular, Vue) para detectar:
 * - Malas prácticas
 * - Código obsoleto
 * - Anti-patrones
 * - Problemas de rendimiento
 * - Falta de accesibilidad
 * - Vulnerabilidades de seguridad
 */

export interface CodeIssue {
  type: 'bad-practice' | 'obsolete' | 'anti-pattern' | 'performance' | 'accessibility' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: {
    file: string;
    line: number;
    column?: number;
  };
  message: string;
  currentCode: string;
  suggestedFix: string;
  reference?: string; // Link a documentación
}

export interface ModernCodeAnalysis {
  framework: 'react' | 'angular' | 'vue' | 'svelte' | 'unknown';
  version: string;
  issues: CodeIssue[];
  score: number; // 0-100
  recommendations: string[];
}

export class ModernCodeAnalyzer {
  private readonly bestPracticesRules = {
    react: {
      // React Hooks Rules
      hooksRules: [
        {
          pattern: /class\s+\w+\s+extends\s+(React\.)?Component/g,
          type: 'obsolete' as const,
          severity: 'medium' as const,
          message: 'Componentes de clase están obsoletos. Usa componentes funcionales con hooks.',
          reference: 'https://react.dev/reference/react/Component'
        },
        {
          pattern: /componentDidMount|componentWillUnmount|componentDidUpdate/g,
          type: 'obsolete' as const,
          severity: 'medium' as const,
          message: 'Métodos de ciclo de vida obsoletos. Usa useEffect.',
          reference: 'https://react.dev/reference/react/useEffect'
        },
        {
          pattern: /defaultProps\s*=/g,
          type: 'obsolete' as const,
          severity: 'low' as const,
          message: 'defaultProps está deprecado. Usa destructuring con valores por defecto.',
          reference: 'https://react.dev/learn/passing-props-to-a-component'
        }
      ],
      
      // Performance
      performanceRules: [
        {
          pattern: /onClick=\{(?!useCallback|\w+Callback).*=>/g,
          type: 'performance' as const,
          severity: 'medium' as const,
          message: 'Funciones inline en eventos causan re-renders innecesarios. Usa useCallback.',
          reference: 'https://react.dev/reference/react/useCallback'
        },
        {
          pattern: /style=\{\{/g,
          type: 'performance' as const,
          severity: 'low' as const,
          message: 'Objetos de estilo inline causan re-renders. Define estilos fuera del componente.',
          reference: 'https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children'
        }
      ],

      // Security
      securityRules: [
        {
          pattern: /dangerouslySetInnerHTML/g,
          type: 'security' as const,
          severity: 'critical' as const,
          message: 'dangerouslySetInnerHTML puede causar XSS. Sanitiza el HTML o usa alternativas.',
          reference: 'https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html'
        },
        {
          pattern: /eval\(/g,
          type: 'security' as const,
          severity: 'critical' as const,
          message: 'eval() es inseguro y debe evitarse completamente.',
          reference: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval'
        }
      ],

      // Accessibility
      a11yRules: [
        {
          pattern: /<img(?![^>]*alt=)/g,
          type: 'accessibility' as const,
          severity: 'high' as const,
          message: 'Todas las imágenes deben tener atributo alt para accesibilidad.',
          reference: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
        },
        {
          pattern: /<button[^>]*onClick[^>]*>(?!.*aria-label)/g,
          type: 'accessibility' as const,
          severity: 'medium' as const,
          message: 'Botones sin texto visible deben tener aria-label.',
          reference: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html'
        }
      ],

      // Best Practices
      bestPractices: [
        {
          pattern: /useState\(\)\[0\]\s*===\s*undefined/g,
          type: 'bad-practice' as const,
          severity: 'low' as const,
          message: 'Define un valor inicial en useState.',
          reference: 'https://react.dev/reference/react/useState'
        },
        {
          pattern: /useEffect\(\(\)\s*=>\s*\{[^}]*\},\s*\[\]\)/g,
          type: 'bad-practice' as const,
          severity: 'medium' as const,
          message: 'useEffect con array vacío solo se ejecuta una vez. Considera si necesitas cleanup.',
          reference: 'https://react.dev/reference/react/useEffect'
        }
      ]
    },

    angular: {
      obsoletePatterns: [
        {
          pattern: /\$scope/g,
          type: 'obsolete' as const,
          severity: 'critical' as const,
          message: '$scope es de AngularJS (1.x). Migra a Angular moderno con componentes.',
          reference: 'https://angular.io/guide/upgrade'
        },
        {
          pattern: /ng-\w+=/g,
          type: 'obsolete' as const,
          severity: 'critical' as const,
          message: 'Directivas ng-* son de AngularJS. Usa sintaxis Angular moderna.',
          reference: 'https://angular.io/guide/template-syntax'
        }
      ]
    },

    vue: {
      obsoletePatterns: [
        {
          pattern: /Vue\.component\(/g,
          type: 'obsolete' as const,
          severity: 'medium' as const,
          message: 'Registro global de componentes. Usa Composition API o <script setup>.',
          reference: 'https://vuejs.org/guide/components/registration.html'
        },
        {
          pattern: /new Vue\(\{/g,
          type: 'obsolete' as const,
          severity: 'high' as const,
          message: 'new Vue() es de Vue 2. Migra a createApp() de Vue 3.',
          reference: 'https://vuejs.org/guide/essentials/application.html'
        }
      ]
    }
  };

  async analyzeCode(code: string, filePath: string): Promise<ModernCodeAnalysis> {
    const framework = this.detectFramework(code);
    const version = this.detectVersion(code, framework);
    const issues: CodeIssue[] = [];

    // Analizar según el framework detectado
    switch (framework) {
      case 'react':
        issues.push(...this.analyzeReact(code, filePath));
        break;
      case 'angular':
        issues.push(...this.analyzeAngular(code, filePath));
        break;
      case 'vue':
        issues.push(...this.analyzeVue(code, filePath));
        break;
    }

    // Análisis común para todos los frameworks
    issues.push(...this.analyzeCommonIssues(code, filePath));

    const score = this.calculateScore(issues);
    const recommendations = this.generateRecommendations(issues, framework);

    return {
      framework,
      version,
      issues,
      score,
      recommendations
    };
  }

  private detectFramework(code: string): ModernCodeAnalysis['framework'] {
    if (code.includes('from \'react\'') || code.includes('from "react"')) return 'react';
    if (code.includes('@angular/core')) return 'angular';
    if (code.includes('from \'vue\'') || code.includes('<script setup>')) return 'vue';
    if (code.includes('from \'svelte\'')) return 'svelte';
    return 'unknown';
  }

  private detectVersion(code: string, framework: string): string {
    // Detectar versión basado en patrones de código
    if (framework === 'react') {
      if (code.includes('createRoot')) return '18+';
      if (code.includes('useTransition')) return '18+';
      if (code.includes('Suspense')) return '16.6+';
      if (code.includes('useState')) return '16.8+';
      if (code.includes('class') && code.includes('extends Component')) return '< 16.8';
    }
    return 'unknown';
  }

  private analyzeReact(code: string, filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const rules = this.bestPracticesRules.react;

    // Aplicar todas las reglas de React
    [...rules.hooksRules, ...rules.performanceRules, ...rules.securityRules, 
     ...rules.a11yRules, ...rules.bestPractices].forEach(rule => {
      const matches = code.matchAll(rule.pattern);
      for (const match of matches) {
        const line = code.substring(0, match.index).split('\n').length;
        issues.push({
          type: rule.type,
          severity: rule.severity,
          location: { file: filePath, line },
          message: rule.message,
          currentCode: match[0],
          suggestedFix: this.generateFix(match[0], rule.type),
          reference: rule.reference
        });
      }
    });

    return issues;
  }

  private analyzeAngular(code: string, filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const rules = this.bestPracticesRules.angular;

    rules.obsoletePatterns.forEach(rule => {
      const matches = code.matchAll(rule.pattern);
      for (const match of matches) {
        const line = code.substring(0, match.index).split('\n').length;
        issues.push({
          type: rule.type,
          severity: rule.severity,
          location: { file: filePath, line },
          message: rule.message,
          currentCode: match[0],
          suggestedFix: 'Migrar a Angular moderno',
          reference: rule.reference
        });
      }
    });

    return issues;
  }

  private analyzeVue(code: string, filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const rules = this.bestPracticesRules.vue;

    rules.obsoletePatterns.forEach(rule => {
      const matches = code.matchAll(rule.pattern);
      for (const match of matches) {
        const line = code.substring(0, match.index).split('\n').length;
        issues.push({
          type: rule.type,
          severity: rule.severity,
          location: { file: filePath, line },
          message: rule.message,
          currentCode: match[0],
          suggestedFix: 'Usar Composition API',
          reference: rule.reference
        });
      }
    });

    return issues;
  }

  private analyzeCommonIssues(code: string, filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // TypeScript: uso de 'any'
    const anyPattern = /:\s*any\b/g;
    const anyMatches = code.matchAll(anyPattern);
    for (const match of anyMatches) {
      const line = code.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'bad-practice',
        severity: 'medium',
        location: { file: filePath, line },
        message: 'Evita usar "any". Define tipos específicos.',
        currentCode: match[0],
        suggestedFix: ': string | number | MyType',
        reference: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html'
      });
    }

    // console.log en producción
    const consolePattern = /console\.(log|debug|info)/g;
    const consoleMatches = code.matchAll(consolePattern);
    for (const match of consoleMatches) {
      const line = code.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'bad-practice',
        severity: 'low',
        location: { file: filePath, line },
        message: 'Remueve console.log antes de producción. Usa un logger apropiado.',
        currentCode: match[0],
        suggestedFix: '// logger.debug(...) o remover',
        reference: 'https://eslint.org/docs/rules/no-console'
      });
    }

    return issues;
  }

  private generateFix(code: string, type: string): string {
    // Generar sugerencias de fix específicas
    if (code.includes('class') && code.includes('Component')) {
      return 'function MyComponent() { ... }';
    }
    if (code.includes('componentDidMount')) {
      return 'useEffect(() => { ... }, [])';
    }
    return '// Ver referencia para solución completa';
  }

  private calculateScore(issues: CodeIssue[]): number {
    let score = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 10; break;
        case 'high': score -= 5; break;
        case 'medium': score -= 2; break;
        case 'low': score -= 1; break;
      }
    });
    return Math.max(0, score);
  }

  private generateRecommendations(issues: CodeIssue[], framework: string): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const securityCount = issues.filter(i => i.type === 'security').length;
    const a11yCount = issues.filter(i => i.type === 'accessibility').length;

    if (criticalCount > 0) {
      recommendations.push(`🚨 ${criticalCount} problemas críticos deben ser resueltos inmediatamente`);
    }
    if (securityCount > 0) {
      recommendations.push(`🔒 ${securityCount} vulnerabilidades de seguridad detectadas`);
    }
    if (a11yCount > 0) {
      recommendations.push(`♿ ${a11yCount} problemas de accesibilidad a resolver`);
    }

    // Recomendaciones específicas por framework
    if (framework === 'react') {
      recommendations.push('Considera migrar a React 18+ para mejor performance');
      recommendations.push('Usa TypeScript strict mode para mayor seguridad de tipos');
    }

    return recommendations;
  }
}



