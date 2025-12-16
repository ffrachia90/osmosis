/**
 * ContextInjector - Inyecta contexto del Knowledge Graph en prompts
 * Hace que el LLM entienda el proyecto completo
 */

import { KnowledgeGraph, CodeEntity } from './KnowledgeGraph.js';
import path from 'path';

export interface MigrationContext {
  fileName: string;
  filePath: string;
  sourceCode: string;
  dependencies: string[];
  detectedPatterns: string[];
  isComponent: boolean;
}

export class ContextInjector {
  constructor(private knowledgeGraph: KnowledgeGraph) {}
  
  /**
   * Genera un prompt enriquecido con contexto del Knowledge Graph
   */
  enrichPrompt(basePrompt: string, context: MigrationContext): string {
    const sections: string[] = [basePrompt];
    
    // 1. Contexto relevante del proyecto
    const relevantContext = this.knowledgeGraph.getRelevantContext(
      context.filePath,
      context.dependencies
    );
    
    if (relevantContext) {
      sections.push('\n## 📚 Contexto del Proyecto:\n');
      sections.push(relevantContext);
    }
    
    // 2. Recomendaciones específicas
    const recommendations = this.knowledgeGraph.generateRecommendations(context);
    
    if (recommendations.length > 0) {
      sections.push('\n## 💡 Recomendaciones:\n');
      recommendations.forEach(rec => {
        sections.push(`${rec}\n`);
      });
    }
    
    // 3. Componentes similares existentes
    if (context.isComponent) {
      const similarComponents = this.findSimilarComponents(context.fileName);
      if (similarComponents.length > 0) {
        sections.push('\n## 🔍 Componentes Similares Existentes:\n');
        similarComponents.forEach(comp => {
          sections.push(`- ${comp.name}: ${path.relative(path.dirname(context.filePath), comp.filePath)}`);
          if (comp.description) {
            sections.push(`  Descripción: ${comp.description}`);
          }
        });
      }
    }
    
    // 4. Patrones detectados y mejores prácticas
    if (context.detectedPatterns.length > 0) {
      sections.push('\n## 🎯 Patrones Detectados y Mejores Prácticas:\n');
      context.detectedPatterns.forEach(pattern => {
        const bestPractice = this.getBestPracticeForPattern(pattern);
        if (bestPractice) {
          sections.push(`- ${pattern}: ${bestPractice}\n`);
        }
      });
    }
    
    // 5. Restricciones del proyecto
    sections.push(this.getProjectConstraints());
    
    return sections.join('\n');
  }
  
  /**
   * Encuentra componentes similares para evitar duplicación
   */
  private findSimilarComponents(fileName: string): CodeEntity[] {
    const baseName = path.basename(fileName, path.extname(fileName));
    return this.knowledgeGraph.findSimilarComponents(baseName);
  }
  
  /**
   * Obtiene mejores prácticas para un patrón detectado
   */
  private getBestPracticeForPattern(pattern: string): string | null {
    const practices: Record<string, string> = {
      'auth': 'Usar hook existente useAuth() en lugar de implementar desde cero',
      'fetch': 'Usar useQuery() o useFetch() para llamadas API con manejo de loading/error',
      'form': 'Usar useForm() o React Hook Form para validación y manejo de estado',
      'router': 'Usar React Router v6 con hooks (useNavigate, useParams)',
      'state': 'Preferir useState para estado local, useContext para estado compartido',
      'effect': 'useEffect con cleanup function para evitar memory leaks',
      'callback': 'useCallback para funciones que se pasan como props',
      'memo': 'useMemo para cálculos costosos, React.memo para componentes'
    };
    
    return practices[pattern] || null;
  }
  
  /**
   * Genera restricciones del proyecto
   */
  private getProjectConstraints(): string {
    return `
## ⚠️ Restricciones del Proyecto:

1. **NO crear componentes desde cero** si existe uno similar en el Design System
2. **NO usar colores hardcodeados** - usar theme tokens
3. **NO usar Class Components** - solo Functional Components + Hooks
4. **NO usar 'any'** en TypeScript - siempre tipar correctamente
5. **Accesibilidad OBLIGATORIA** - todos los elementos interactivos necesitan aria-labels
6. **Performance** - memoizar callbacks y componentes costosos
7. **Seguridad** - sanitizar SIEMPRE input del usuario (DOMPurify)
`;
  }
  
  /**
   * Genera contexto para refactorización (no migración)
   */
  enrichRefactorPrompt(basePrompt: string, filePath: string, issues: string[]): string {
    const sections: string[] = [basePrompt];
    
    sections.push('\n## 🔧 Issues Detectados:\n');
    issues.forEach(issue => {
      sections.push(`- ${issue}`);
    });
    
    sections.push('\n## ✅ Soluciones Recomendadas:\n');
    issues.forEach(issue => {
      const solution = this.getSolutionForIssue(issue);
      if (solution) {
        sections.push(`- ${solution}`);
      }
    });
    
    return sections.join('\n');
  }
  
  /**
   * Soluciones para issues comunes
   */
  private getSolutionForIssue(issue: string): string | null {
    if (issue.includes('Class Component')) {
      return 'Convertir a Functional Component con hooks (useState, useEffect)';
    }
    
    if (issue.includes('dangerouslySetInnerHTML')) {
      return 'Sanitizar con DOMPurify antes de renderizar HTML';
    }
    
    if (issue.includes('eval()')) {
      return 'Eliminar eval() - usar alternativas seguras (Function constructor no recomendado)';
    }
    
    if (issue.includes('Inline function')) {
      return 'Extraer a useCallback para evitar re-renders innecesarios';
    }
    
    if (issue.includes('Magic Number')) {
      return 'Extraer a constantes con nombres descriptivos';
    }
    
    if (issue.includes('Missing alt')) {
      return 'Agregar alt descriptivo a todas las imágenes';
    }
    
    return null;
  }
  
  /**
   * Genera contexto para generación de tests
   */
  enrichTestPrompt(basePrompt: string, componentPath: string): string {
    const entity = this.knowledgeGraph.search(path.basename(componentPath, path.extname(componentPath)))[0];
    
    const sections: string[] = [basePrompt];
    
    if (entity) {
      sections.push('\n## 📋 Información del Componente:\n');
      sections.push(`- Tipo: ${entity.type}`);
      
      if (entity.props && Object.keys(entity.props).length > 0) {
        sections.push('\n### Props:');
        Object.entries(entity.props).forEach(([name, type]) => {
          sections.push(`- ${name}: ${type}`);
        });
      }
      
      sections.push('\n## ✅ Tests Requeridos:\n');
      sections.push('1. Renderizado básico (smoke test)');
      sections.push('2. Props rendering correctamente');
      sections.push('3. Interacciones de usuario (clicks, inputs)');
      sections.push('4. Edge cases y error states');
      sections.push('5. Accesibilidad (aria-labels, keyboard navigation)');
    }
    
    return sections.join('\n');
  }
}

