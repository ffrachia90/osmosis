/**
 * CodeSafeGuard - Validación empresarial de código generado
 * Usa TypeScript Compiler API para validación sintáctica real
 */

import * as ts from 'typescript';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class CodeSafeGuard {
  /**
   * Valida código generado
   */
  static validate(code: string, targetTech: 'react' | 'angular' | 'vue'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validación sintáctica con TypeScript Compiler
    const syntaxErrors = this.validateSyntax(code);
    errors.push(...syntaxErrors);

    // 2. Validación de patrones obsoletos
    const obsoletePatterns = this.detectObsoletePatterns(code, targetTech);
    errors.push(...obsoletePatterns);

    // 3. Validación de seguridad
    const securityIssues = this.detectSecurityIssues(code);
    errors.push(...securityIssues);

    // 4. Validación de performance
    const performanceIssues = this.detectPerformanceIssues(code);
    warnings.push(...performanceIssues);

    // 5. Validación de accesibilidad
    const a11yIssues = this.detectAccessibilityIssues(code);
    warnings.push(...a11yIssues);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validación sintáctica con TypeScript Compiler API
   */
  private static validateSyntax(code: string): string[] {
    const errors: string[] = [];

    try {
      const sourceFile = ts.createSourceFile(
        'temp.tsx',
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      // Crear programa para obtener diagnósticos
      const options: ts.CompilerOptions = {
        noEmit: true,
        strict: true,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext
      };

      const host = ts.createCompilerHost(options);
      host.getSourceFile = (fileName) => {
        if (fileName === 'temp.tsx') return sourceFile;
        return undefined;
      };

      const program = ts.createProgram(['temp.tsx'], options, host);
      const diagnostics = ts.getPreEmitDiagnostics(program);

      diagnostics.forEach(diagnostic => {
        if (diagnostic.file && diagnostic.start !== undefined) {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          errors.push(`Syntax Error: ${message}`);
        }
      });

    } catch (error) {
      errors.push(`Failed to parse code: ${error}`);
    }

    return errors;
  }

  /**
   * Detecta patrones obsoletos
   */
  private static detectObsoletePatterns(code: string, targetTech: string): string[] {
    const errors: string[] = [];

    if (targetTech === 'react') {
      // Class Components
      if (/class\s+\w+\s+extends\s+(React\.)?Component/g.test(code)) {
        errors.push('Class Component detected (use Functional Component + Hooks)');
      }

      // componentDidMount, etc.
      if (/componentDidMount|componentWillMount|componentWillReceiveProps/g.test(code)) {
        errors.push('Legacy lifecycle methods detected (use useEffect)');
      }

      // createRef
      if (/React\.createRef|createRef/g.test(code)) {
        errors.push('createRef detected (use useRef)');
      }
    }

    if (targetTech === 'angular') {
      // NgModule cuando debería usar standalone
      if (/@NgModule/g.test(code)) {
        errors.push('NgModule detected (use standalone: true)');
      }

      // Old control flow
      if (/\*ngIf|\*ngFor/g.test(code)) {
        errors.push('Old control flow detected (use @if, @for)');
      }
    }

    return errors;
  }

  /**
   * Detecta problemas de seguridad
   */
  private static detectSecurityIssues(code: string): string[] {
    const errors: string[] = [];

    // XSS vulnerabilities
    if (/dangerouslySetInnerHTML/.test(code) && !/DOMPurify/.test(code)) {
      errors.push('dangerouslySetInnerHTML without DOMPurify (XSS risk)');
    }

    // eval()
    if (/\beval\s*\(/.test(code)) {
      errors.push('eval() detected (security risk)');
    }

    // Function constructor
    if (/new\s+Function\s*\(/.test(code)) {
      errors.push('Function constructor detected (security risk)');
    }

    // innerHTML
    if (/\.innerHTML\s*=/.test(code)) {
      errors.push('innerHTML assignment without sanitization (XSS risk)');
    }

    return errors;
  }

  /**
   * Detecta problemas de performance
   */
  private static detectPerformanceIssues(code: string): string[] {
    const warnings: string[] = [];

    // Inline functions en JSX
    if (/onClick=\{.*?=>.*?\}/g.test(code)) {
      warnings.push('Inline arrow functions in JSX (consider useCallback)');
    }

    // Array.map sin key
    if (/\.map\(.*?=>\s*</.test(code) && !/key=/g.test(code)) {
      warnings.push('Array.map without key prop');
    }

    return warnings;
  }

  /**
   * Detecta problemas de accesibilidad
   */
  private static detectAccessibilityIssues(code: string): string[] {
    const warnings: string[] = [];

    // img sin alt
    if (/<img[^>]*src=/g.test(code) && !/<img[^>]*alt=/g.test(code)) {
      warnings.push('img tag without alt attribute');
    }

    // button sin aria-label cuando solo tiene icono
    if (/<button[^>]*>\s*<(?:Icon|Svg|i)/g.test(code) && !/<button[^>]*aria-label=/g.test(code)) {
      warnings.push('Icon button without aria-label');
    }

    // div con onClick pero sin role
    if (/<div[^>]*onClick/g.test(code) && !/<div[^>]*role=/g.test(code)) {
      warnings.push('Interactive div without role attribute');
    }

    return warnings;
  }

  /**
   * Genera prompt de reparación
   */
  static generateRepairPrompt(code: string, errors: string[]): string {
    return `# 🔧 REPAIR REQUIRED

El código generado tiene los siguientes problemas:

${errors.map((e, i) => `${i + 1}. ❌ ${e}`).join('\n')}

## Código Original:

\`\`\`typescript
${code}
\`\`\`

## Instrucciones:

Corrige TODOS los problemas listados arriba. Responde SOLO con el código corregido, sin explicaciones.

## Código Corregido:

\`\`\`typescript
// Tu código aquí
\`\`\``;
  }
}
