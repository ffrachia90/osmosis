/**
 * TechDebtAnalyzer - Calculador de Deuda Técnica
 * Analiza archivos legacy y genera métricas de "toxicidad" del código
 * 
 * Score de 0 (Clean) a 100 (Toxic)
 */

export interface FileMetrics {
  score: number; // 0 (Clean) to 100 (Toxic)
  issues: string[]; // ["High Nesting (Depth 6)", "God Class (800 lines)"]
  estimatedRefactorHours: number;
  details: {
    maxIndentation: number;
    lineCount: number;
    todoCount: number;
    magicNumberCount: number;
    longMethodCount: number;
    duplicateCodeScore: number;
  };
}

export interface ProjectDebtReport {
  totalScore: number;
  totalFiles: number;
  toxicFiles: FileMetrics[];
  totalRefactorHours: number;
  recommendations: string[];
}

export class TechDebtAnalyzer {
  /**
   * Analiza un archivo y retorna métricas de deuda técnica
   */
  analyzeFile(content: string, filename: string): FileMetrics {
    const issues: string[] = [];
    let score = 0;
    
    const details = {
      maxIndentation: 0,
      lineCount: 0,
      todoCount: 0,
      magicNumberCount: 0,
      longMethodCount: 0,
      duplicateCodeScore: 0
    };

    // 1. SPAGHETTI INDENTATION (0-25 points)
    const indentationResult = this.analyzeIndentation(content);
    details.maxIndentation = indentationResult.maxDepth;
    
    if (indentationResult.maxDepth > 7) {
      score += 25;
      issues.push(`🔴 Spaghetti Infernal (Depth ${indentationResult.maxDepth})`);
    } else if (indentationResult.maxDepth > 5) {
      score += 15;
      issues.push(`🟠 High Nesting (Depth ${indentationResult.maxDepth})`);
    } else if (indentationResult.maxDepth > 4) {
      score += 8;
      issues.push(`🟡 Moderate Nesting (Depth ${indentationResult.maxDepth})`);
    }

    // 2. GOD CLASS DETECTION (0-25 points)
    const lines = content.split('\n');
    details.lineCount = lines.length;
    
    if (details.lineCount > 1000) {
      score += 25;
      issues.push(`🔴 God Class (${details.lineCount} lines) - Split immediately!`);
    } else if (details.lineCount > 600) {
      score += 15;
      issues.push(`🟠 Large File (${details.lineCount} lines) - Consider splitting`);
    } else if (details.lineCount > 400) {
      score += 8;
      issues.push(`🟡 Growing File (${details.lineCount} lines)`);
    }

    // 3. TODO/FIXME COUNT (0-20 points)
    const todoResult = this.analyzeTodos(content);
    details.todoCount = todoResult.count;
    
    if (todoResult.count > 10) {
      score += 20;
      issues.push(`🔴 Technical Debt Backlog (${todoResult.count} TODOs/FIXMEs/HACKs)`);
    } else if (todoResult.count > 5) {
      score += 12;
      issues.push(`🟠 Multiple TODOs (${todoResult.count} pending tasks)`);
    } else if (todoResult.count > 0) {
      score += 5;
      issues.push(`🟡 ${todoResult.count} TODO(s) found`);
    }

    // 4. MAGIC NUMBERS (0-15 points)
    const magicNumbersResult = this.analyzeMagicNumbers(content);
    details.magicNumberCount = magicNumbersResult.count;
    
    if (magicNumbersResult.count > 15) {
      score += 15;
      issues.push(`🔴 Magic Number Hell (${magicNumbersResult.count} hardcoded values)`);
    } else if (magicNumbersResult.count > 8) {
      score += 10;
      issues.push(`🟠 Too Many Magic Numbers (${magicNumbersResult.count})`);
    } else if (magicNumbersResult.count > 3) {
      score += 5;
      issues.push(`🟡 Some Magic Numbers (${magicNumbersResult.count})`);
    }

    // 5. LONG METHODS (0-15 points)
    const longMethodsResult = this.analyzeLongMethods(content);
    details.longMethodCount = longMethodsResult.count;
    
    if (longMethodsResult.count > 5) {
      score += 15;
      issues.push(`🔴 Multiple God Methods (${longMethodsResult.count} methods > 50 lines)`);
    } else if (longMethodsResult.count > 2) {
      score += 10;
      issues.push(`🟠 Long Methods (${longMethodsResult.count} methods > 50 lines)`);
    } else if (longMethodsResult.count > 0) {
      score += 5;
      issues.push(`🟡 ${longMethodsResult.count} Long Method(s)`);
    }

    // 6. DUPLICATE CODE DETECTION (Simple) (0-10 points)
    const duplicateResult = this.analyzeDuplicates(content);
    details.duplicateCodeScore = duplicateResult.score;
    
    if (duplicateResult.score > 7) {
      score += 10;
      issues.push(`🔴 High Code Duplication`);
    } else if (duplicateResult.score > 4) {
      score += 5;
      issues.push(`🟠 Some Code Duplication`);
    }

    // 7. BONUS PENALTIES (Legacy patterns específicos)
    const legacyPenalties = this.detectLegacyPatterns(content, filename);
    score += legacyPenalties.score;
    issues.push(...legacyPenalties.issues);

    // Calcular horas de refactor estimadas
    const estimatedRefactorHours = this.calculateRefactorHours(score, details);

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      score,
      issues,
      estimatedRefactorHours,
      details
    };
  }

  /**
   * Analiza profundidad de indentación (Spaghetti Code)
   */
  private analyzeIndentation(content: string): { maxDepth: number; avgDepth: number } {
    const lines = content.split('\n');
    let maxDepth = 0;
    let totalDepth = 0;
    let lineCount = 0;

    for (const line of lines) {
      // Ignorar líneas vacías o comentarios
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }

      // Contar espacios/tabs al inicio
      const leadingWhitespace = line.match(/^(\s+)/);
      if (leadingWhitespace) {
        // Asumir 2 espacios = 1 nivel (o 1 tab = 1 nivel)
        const spaces = leadingWhitespace[1].replace(/\t/g, '  ').length;
        const depth = Math.floor(spaces / 2);
        
        maxDepth = Math.max(maxDepth, depth);
        totalDepth += depth;
        lineCount++;
      }
    }

    return {
      maxDepth,
      avgDepth: lineCount > 0 ? totalDepth / lineCount : 0
    };
  }

  /**
   * Cuenta TODOs, FIXMEs, HACKs
   */
  private analyzeTodos(content: string): { count: number; items: string[] } {
    const patterns = [
      /\/\/\s*TODO/gi,
      /\/\/\s*FIXME/gi,
      /\/\/\s*HACK/gi,
      /\/\/\s*XXX/gi,
      /\/\*\s*TODO/gi,
      /\/\*\s*FIXME/gi,
    ];

    const items: string[] = [];
    let count = 0;

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
        items.push(...matches);
      }
    });

    return { count, items };
  }

  /**
   * Detecta Magic Numbers (números hardcodeados en condicionales)
   */
  private analyzeMagicNumbers(content: string): { count: number; numbers: number[] } {
    const numbers: number[] = [];
    
    // Buscar números en condicionales o asignaciones (excluir 0, 1, -1 que son comunes)
    const patterns = [
      /if\s*\([^)]*\b(\d{2,})\b/g,           // if (x > 100)
      /===?\s*(\d{2,})/g,                     // === 42
      /[<>]=?\s*(\d{2,})/g,                   // > 200
      /\[\s*(\d{2,})\s*\]/g,                  // array[42]
      /\{\s*\w+:\s*(\d{2,})\s*\}/g,          // { timeout: 5000 }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const num = parseInt(match[1], 10);
        if (num > 1 && num !== 100) { // Ignorar 0, 1, 100 (muy comunes)
          numbers.push(num);
        }
      }
    });

    return {
      count: numbers.length,
      numbers
    };
  }

  /**
   * Detecta métodos muy largos (> 50 líneas)
   */
  private analyzeLongMethods(content: string): { count: number; methods: string[] } {
    const methods: string[] = [];
    let count = 0;

    // Regex para detectar funciones/métodos
    const functionPatterns = [
      /function\s+(\w+)\s*\([^)]*\)\s*\{/g,           // function name()
      /(\w+)\s*:\s*function\s*\([^)]*\)\s*\{/g,       // name: function()
      /(\w+)\s*\([^)]*\)\s*\{/g,                      // name() { (ES6 method)
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,          // const name = () =>
      /(public|private|protected)\s+(\w+)\s*\([^)]*\)\s*\{/g, // Java/C# methods
    ];

    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const startIndex = match.index;
        const functionName = match[1] || match[2] || 'anonymous';
        
        // Contar líneas hasta el cierre de la función (aproximación simple)
        const remainingContent = content.slice(startIndex);
        let braceCount = 0;
        let endIndex = startIndex;
        let inFunction = false;
        
        for (let i = 0; i < remainingContent.length; i++) {
          if (remainingContent[i] === '{') {
            braceCount++;
            inFunction = true;
          } else if (remainingContent[i] === '}') {
            braceCount--;
            if (inFunction && braceCount === 0) {
              endIndex = startIndex + i;
              break;
            }
          }
        }
        
        const functionContent = content.slice(startIndex, endIndex);
        const lineCount = functionContent.split('\n').length;
        
        if (lineCount > 50) {
          count++;
          methods.push(`${functionName} (${lineCount} lines)`);
        }
      }
    });

    return { count, methods };
  }

  /**
   * Detecta código duplicado (heurística simple: líneas repetidas)
   */
  private analyzeDuplicates(content: string): { score: number } {
    const lines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 20 && !l.startsWith('//') && !l.startsWith('/*'));
    
    const lineFrequency = new Map<string, number>();
    
    lines.forEach(line => {
      lineFrequency.set(line, (lineFrequency.get(line) || 0) + 1);
    });
    
    let duplicateLines = 0;
    lineFrequency.forEach(count => {
      if (count > 1) {
        duplicateLines += count - 1;
      }
    });
    
    const duplicateRatio = lines.length > 0 ? duplicateLines / lines.length : 0;
    return { score: Math.min(Math.floor(duplicateRatio * 100), 10) };
  }

  /**
   * Detecta patrones legacy específicos
   */
  private detectLegacyPatterns(content: string, filename: string): { score: number; issues: string[] } {
    let score = 0;
    const issues: string[] = [];

    // jQuery Spaghetti
    if (/\$\(.*\)\..*\..*\./.test(content)) {
      score += 5;
      issues.push('🟠 jQuery Chaining Hell detected');
    }

    // Global variables
    const globalVars = content.match(/var\s+\w+\s*=/g);
    if (globalVars && globalVars.length > 10) {
      score += 8;
      issues.push(`🟠 Excessive Global Variables (${globalVars.length})`);
    }

    // No error handling
    const tryBlocks = (content.match(/try\s*\{/g) || []).length;
    const asyncCalls = (content.match(/\.then\(|await\s/g) || []).length;
    if (asyncCalls > 5 && tryBlocks === 0) {
      score += 10;
      issues.push('🔴 No Error Handling for async operations');
    }

    // eval() or dangerous patterns
    if (/\beval\s*\(/.test(content)) {
      score += 15;
      issues.push('🔴 eval() detected - CRITICAL SECURITY RISK');
    }

    // Commented code blocks
    const commentedCodeLines = content.match(/\/\/\s*[a-zA-Z]+\s*\(|\/\/\s*function|\/\/\s*const/g);
    if (commentedCodeLines && commentedCodeLines.length > 5) {
      score += 5;
      issues.push('🟡 Excessive commented-out code');
    }

    // File extension heuristics
    if (filename.endsWith('.jsp') || filename.endsWith('.php')) {
      // Mixed HTML/Code
      if (/<[a-z]+/i.test(content) && /<%|<\?php/.test(content)) {
        score += 5;
        issues.push('🟠 Mixed HTML/Logic (Violates Separation of Concerns)');
      }
    }

    return { score, issues };
  }

  /**
   * Calcula horas de refactor estimadas
   */
  private calculateRefactorHours(score: number, details: FileMetrics['details']): number {
    let hours = 0;

    // Base: Score directo
    hours += score * 0.5; // 50 points = 25 horas

    // Ajustes por métricas específicas
    if (details.lineCount > 1000) {
      hours += 20; // God class requiere mucho tiempo
    } else if (details.lineCount > 600) {
      hours += 10;
    }

    if (details.maxIndentation > 7) {
      hours += 15; // Refactorizar spaghetti es costoso
    }

    if (details.todoCount > 10) {
      hours += details.todoCount * 0.5; // Cada TODO ~30 min
    }

    return Math.round(hours);
  }

  /**
   * Analiza un proyecto completo
   */
  analyzeProject(files: Map<string, string>): ProjectDebtReport {
    const fileMetrics: FileMetrics[] = [];
    let totalScore = 0;
    let totalRefactorHours = 0;

    files.forEach((content, filename) => {
      const metrics = this.analyzeFile(content, filename);
      fileMetrics.push(metrics);
      totalScore += metrics.score;
      totalRefactorHours += metrics.estimatedRefactorHours;
    });

    // Archivos "tóxicos" (score > 60)
    const toxicFiles = fileMetrics
      .filter(m => m.score > 60)
      .sort((a, b) => b.score - a.score);

    const avgScore = files.size > 0 ? totalScore / files.size : 0;

    // Generar recomendaciones
    const recommendations = this.generateRecommendations(avgScore, toxicFiles.length, files.size);

    return {
      totalScore: Math.round(avgScore),
      totalFiles: files.size,
      toxicFiles,
      totalRefactorHours,
      recommendations
    };
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  private generateRecommendations(avgScore: number, toxicCount: number, totalFiles: number): string[] {
    const recommendations: string[] = [];

    if (avgScore > 70) {
      recommendations.push('🚨 CRÍTICO: Este proyecto requiere refactorización inmediata');
      recommendations.push('💡 Considera reescritura completa en lugar de refactorización incremental');
    } else if (avgScore > 50) {
      recommendations.push('⚠️ ALTO: Deuda técnica significativa');
      recommendations.push('💡 Prioriza refactorizar los archivos más tóxicos primero');
    } else if (avgScore > 30) {
      recommendations.push('🟡 MODERADO: Deuda técnica manejable');
      recommendations.push('💡 Implementa mejoras incrementales en cada sprint');
    } else {
      recommendations.push('✅ BAJO: Código relativamente limpio');
      recommendations.push('💡 Mantén las prácticas actuales');
    }

    if (toxicCount > 0) {
      const toxicRatio = (toxicCount / totalFiles) * 100;
      recommendations.push(`📊 ${toxicCount} archivos (${toxicRatio.toFixed(1)}%) necesitan atención urgente`);
    }

    recommendations.push('🔧 Usa Osmosis para automatizar la migración a código moderno');

    return recommendations;
  }
}

// Export singleton
export const techDebtAnalyzer = new TechDebtAnalyzer();

