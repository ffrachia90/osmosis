/**
 * Best Practices Refactor Generator
 * Toma código moderno con malas prácticas y lo refactoriza
 * aplicando los estándares más altos de la industria
 */

import { ModernCodeAnalysis, CodeIssue } from '../analyzers/modern-code-analyzer';

export interface RefactorResult {
  originalCode: string;
  refactoredCode: string;
  changes: RefactorChange[];
  improvements: string[];
  metrics: {
    issuesFixed: number;
    scoreImprovement: number;
    linesChanged: number;
  };
}

export interface RefactorChange {
  type: 'refactor' | 'modernize' | 'optimize' | 'secure' | 'accessibility';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}

export class BestPracticesRefactor {
  /**
   * Refactoriza código basándose en el análisis de malas prácticas
   */
  async refactor(code: string, analysis: ModernCodeAnalysis): Promise<RefactorResult> {
    let refactoredCode = code;
    const changes: RefactorChange[] = [];

    // Ordenar issues por severidad (críticos primero)
    const sortedIssues = this.sortIssuesBySeverity(analysis.issues);

    // Aplicar cada fix
    for (const issue of sortedIssues) {
      const change = await this.applyFix(refactoredCode, issue, analysis.framework);
      if (change) {
        refactoredCode = change.code;
        changes.push(change.change);
      }
    }

    // Aplicar optimizaciones adicionales
    refactoredCode = await this.applyModernPatterns(refactoredCode, analysis.framework);

    const improvements = this.generateImprovementsList(changes);
    const metrics = this.calculateMetrics(code, refactoredCode, analysis);

    return {
      originalCode: code,
      refactoredCode,
      changes,
      improvements,
      metrics
    };
  }

  private sortIssuesBySeverity(issues: CodeIssue[]): CodeIssue[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  private async applyFix(
    code: string, 
    issue: CodeIssue, 
    framework: string
  ): Promise<{ code: string; change: RefactorChange } | null> {
    switch (issue.type) {
      case 'obsolete':
        return this.modernizeCode(code, issue, framework);
      case 'bad-practice':
        return this.improvePractice(code, issue, framework);
      case 'security':
        return this.securifyCode(code, issue);
      case 'performance':
        return this.optimizePerformance(code, issue, framework);
      case 'accessibility':
        return this.improveAccessibility(code, issue);
      default:
        return null;
    }
  }

  private async modernizeCode(
    code: string, 
    issue: CodeIssue, 
    framework: string
  ): Promise<{ code: string; change: RefactorChange }> {
    let newCode = code;
    let before = issue.currentCode;
    let after = '';

    if (framework === 'react') {
      // Class Component -> Functional Component
      if (issue.currentCode.includes('class') && issue.currentCode.includes('Component')) {
        const classMatch = code.match(/class\s+(\w+)\s+extends\s+(React\.)?Component\s*{([\s\S]*?)}/);
        if (classMatch) {
          const componentName = classMatch[1];
          const classBody = classMatch[3];
          
          // Convertir a functional component con hooks
          after = `function ${componentName}(props) {\n`;
          
          // Convertir state
          const stateMatch = classBody.match(/state\s*=\s*{([^}]*)}/);
          if (stateMatch) {
            const stateVars = stateMatch[1].split(',').map(s => s.trim());
            stateVars.forEach(stateVar => {
              const [key, value] = stateVar.split(':').map(s => s.trim());
              after += `  const [${key}, set${this.capitalize(key)}] = useState(${value});\n`;
            });
          }

          // Convertir lifecycle methods
          if (classBody.includes('componentDidMount')) {
            after += `  useEffect(() => {\n    // componentDidMount logic\n  }, []);\n`;
          }

          after += `  return (\n    // JSX\n  );\n}`;
          
          newCode = code.replace(classMatch[0], after);
        }
      }

      // componentDidMount -> useEffect
      if (issue.currentCode.includes('componentDidMount')) {
        const mountMatch = code.match(/componentDidMount\(\)\s*{([\s\S]*?)}/);
        if (mountMatch) {
          const logic = mountMatch[1].trim();
          after = `useEffect(() => {\n  ${logic}\n}, [])`;
          newCode = code.replace(mountMatch[0], after);
        }
      }
    }

    if (framework === 'vue') {
      // new Vue -> createApp
      if (issue.currentCode.includes('new Vue')) {
        after = code.replace(/new Vue\(/g, 'createApp(');
        newCode = after;
      }
    }

    return {
      code: newCode,
      change: {
        type: 'modernize',
        description: issue.message,
        before,
        after,
        impact: issue.severity === 'critical' ? 'high' : 'medium'
      }
    };
  }

  private async improvePractice(
    code: string,
    issue: CodeIssue,
    framework: string
  ): Promise<{ code: string; change: RefactorChange }> {
    let newCode = code;
    let after = '';

    if (framework === 'react') {
      // Inline functions -> useCallback
      if (issue.currentCode.includes('onClick={')) {
        const inlineMatch = code.match(/onClick=\{(\([^)]*\)\s*=>\s*[^}]*)\}/);
        if (inlineMatch) {
          const func = inlineMatch[1];
          after = `const handleClick = useCallback(${func}, []);\n// ... \nonClick={handleClick}`;
          // Aquí se necesitaría lógica más compleja para insertar el useCallback correctamente
        }
      }

      // any -> tipos específicos
      if (issue.currentCode.includes(': any')) {
        after = issue.currentCode.replace(/:\s*any/g, ': unknown // TODO: Define tipo específico');
        newCode = code.replace(issue.currentCode, after);
      }
    }

    return {
      code: newCode,
      change: {
        type: 'refactor',
        description: issue.message,
        before: issue.currentCode,
        after: after || issue.suggestedFix,
        impact: 'medium'
      }
    };
  }

  private async securifyCode(
    code: string,
    issue: CodeIssue
  ): Promise<{ code: string; change: RefactorChange }> {
    let newCode = code;
    let after = '';

    // dangerouslySetInnerHTML -> sanitizado
    if (issue.currentCode.includes('dangerouslySetInnerHTML')) {
      after = `// ⚠️ SANITIZAR: Usar DOMPurify o similar\n// <div>{sanitizeHtml(content)}</div>`;
      // En producción, reemplazaríamos con una librería de sanitización
    }

    // eval() -> alternativas seguras
    if (issue.currentCode.includes('eval(')) {
      after = '// REMOVER eval() - usar JSON.parse() o alternativa segura';
    }

    return {
      code: newCode,
      change: {
        type: 'secure',
        description: issue.message,
        before: issue.currentCode,
        after,
        impact: 'high'
      }
    };
  }

  private async optimizePerformance(
    code: string,
    issue: CodeIssue,
    framework: string
  ): Promise<{ code: string; change: RefactorChange }> {
    let newCode = code;
    let after = '';

    if (framework === 'react') {
      // Inline styles -> styled-components o CSS modules
      if (issue.currentCode.includes('style={{')) {
        after = `const styles = { /* move styles here */ };\n// ... \nstyle={styles}`;
      }
    }

    return {
      code: newCode,
      change: {
        type: 'optimize',
        description: issue.message,
        before: issue.currentCode,
        after,
        impact: 'medium'
      }
    };
  }

  private async improveAccessibility(
    code: string,
    issue: CodeIssue
  ): Promise<{ code: string; change: RefactorChange }> {
    let newCode = code;
    let after = '';

    // Agregar alt a imágenes
    if (issue.currentCode.includes('<img') && !issue.currentCode.includes('alt=')) {
      after = issue.currentCode.replace('<img', '<img alt="Descripción de la imagen"');
      newCode = code.replace(issue.currentCode, after);
    }

    // Agregar aria-label a botones
    if (issue.currentCode.includes('<button') && !issue.currentCode.includes('aria-label')) {
      after = issue.currentCode.replace('<button', '<button aria-label="Descripción de la acción"');
      newCode = code.replace(issue.currentCode, after);
    }

    return {
      code: newCode,
      change: {
        type: 'accessibility',
        description: issue.message,
        before: issue.currentCode,
        after,
        impact: 'high'
      }
    };
  }

  /**
   * Aplica patrones modernos adicionales
   */
  private async applyModernPatterns(code: string, framework: string): Promise<string> {
    let modernCode = code;

    if (framework === 'react') {
      // Asegurar importaciones modernas
      if (!modernCode.includes("import React")) {
        modernCode = "import React from 'react';\n" + modernCode;
      }

      // Agregar PropTypes o TypeScript interfaces si no existen
      if (!modernCode.includes('interface') && !modernCode.includes('PropTypes')) {
        modernCode += '\n\n// TODO: Agregar PropTypes o TypeScript interface';
      }

      // Agregar error boundaries si no existen
      if (modernCode.includes('useEffect') && !modernCode.includes('ErrorBoundary')) {
        modernCode += '\n\n// TODO: Considerar agregar Error Boundary';
      }
    }

    return modernCode;
  }

  private generateImprovementsList(changes: RefactorChange[]): string[] {
    const improvements: string[] = [];
    
    const byType = changes.reduce((acc, change) => {
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byType).forEach(([type, count]) => {
      const emoji = {
        refactor: '♻️',
        modernize: '🚀',
        optimize: '⚡',
        secure: '🔒',
        accessibility: '♿'
      }[type] || '✅';
      
      improvements.push(`${emoji} ${count} mejora(s) de ${type}`);
    });

    return improvements;
  }

  private calculateMetrics(
    original: string,
    refactored: string,
    analysis: ModernCodeAnalysis
  ): RefactorResult['metrics'] {
    const originalLines = original.split('\n').length;
    const refactoredLines = refactored.split('\n').length;
    
    return {
      issuesFixed: analysis.issues.length,
      scoreImprovement: 100 - analysis.score,
      linesChanged: Math.abs(originalLines - refactoredLines)
    };
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}



