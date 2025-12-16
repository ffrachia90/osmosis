/**
 * ContextInjector - Inyecta contexto semántico en prompts
 * Usa búsqueda vectorial para encontrar código relevante
 */

import { KnowledgeGraph } from './KnowledgeGraph.js';
import { ExtractedEntity } from './EntityExtractor.js';
import path from 'path';

export interface MigrationContext {
  fileName: string;
  filePath: string;
  sourceCode: string;
  legacyLanguage: string;
  targetFramework: string;
}

export class ContextInjector {
  constructor(private knowledgeGraph: KnowledgeGraph) {}
  
  /**
   * Enriquece un prompt con contexto semántico del proyecto
   */
  async enrichPrompt(basePrompt: string, context: MigrationContext): Promise<string> {
    const sections: string[] = [basePrompt];
    
    // 1. Buscar componentes similares (evitar duplicación)
    const similarComponents = await this.findSimilarComponents(context);
    if (similarComponents.length > 0) {
      sections.push(this.buildSimilarComponentsSection(similarComponents, context));
    }
    
    // 2. Buscar utilities relevantes
    const relevantUtils = await this.findRelevantUtilities(context);
    if (relevantUtils.length > 0) {
      sections.push(this.buildUtilitiesSection(relevantUtils));
    }
    
    // 3. Buscar hooks y patterns
    const relevantHooks = await this.findRelevantHooks(context);
    if (relevantHooks.length > 0) {
      sections.push(this.buildHooksSection(relevantHooks));
    }
    
    // 4. Restricciones del proyecto
    sections.push(this.getProjectConstraints());
    
    return sections.join('\n\n');
  }
  
  /**
   * Encuentra componentes similares (evita duplicación)
   */
  private async findSimilarComponents(context: MigrationContext): Promise<ExtractedEntity[]> {
    const baseName = path.basename(context.fileName, path.extname(context.fileName));
    const similar = await this.knowledgeGraph.findSimilarComponents(
      baseName,
      context.sourceCode.substring(0, 500) // Primeras líneas para contexto
    );
    
    // Filtrar componentes muy similares (> 80% similarity)
    return similar.slice(0, 3);
  }
  
  /**
   * Encuentra utilities relevantes
   */
  private async findRelevantUtilities(context: MigrationContext): Promise<ExtractedEntity[]> {
    const relevant = await this.knowledgeGraph.findRelevant(context.sourceCode, 10);
    return relevant.filter(e => e.type === 'function' || e.type === 'constant');
  }
  
  /**
   * Encuentra hooks y patterns relevantes
   */
  private async findRelevantHooks(context: MigrationContext): Promise<ExtractedEntity[]> {
    const relevant = await this.knowledgeGraph.findRelevant(context.sourceCode, 10);
    return relevant.filter(e => e.type === 'hook');
  }
  
  /**
   * Construye sección de componentes similares
   */
  private buildSimilarComponentsSection(components: ExtractedEntity[], context: MigrationContext): string {
    const lines = [
      '## 🔍 COMPONENTES SIMILARES EXISTENTES',
      '',
      '⚠️  **IMPORTANTE**: Los siguientes componentes ya existen en el proyecto.',
      '**NO crees componentes duplicados**. Reutiliza estos o extiéndelos si es necesario.',
      ''
    ];
    
    components.forEach((comp, idx) => {
      lines.push(`### ${idx + 1}. \`${comp.id}\` (${path.relative(path.dirname(context.filePath), comp.filePath)})`);
      
      if (comp.docstring) {
        lines.push(`   **Descripción**: ${comp.docstring}`);
      }
      
      if (comp.signature) {
        lines.push(`   **Signature**: \`${comp.signature}\``);
      }
      
      // Mostrar primeras líneas del código
      const codePreview = comp.sourceCode.split('\n').slice(0, 5).join('\n');
      lines.push('```typescript');
      lines.push(codePreview);
      lines.push('...');
      lines.push('```');
      lines.push('');
    });
    
    return lines.join('\n');
  }
  
  /**
   * Construye sección de utilities
   */
  private buildUtilitiesSection(utilities: ExtractedEntity[]): string {
    const lines = [
      '## ⚙️  UTILIDADES DISPONIBLES',
      '',
      'Las siguientes funciones/constantes están disponibles y pueden ser útiles:',
      ''
    ];
    
    utilities.slice(0, 5).forEach(util => {
      lines.push(`- **\`${util.id}\`** (\`${util.filePath}\`)`);
      
      if (util.docstring) {
        lines.push(`  ${util.docstring}`);
      }
      
      if (util.signature) {
        lines.push(`  \`${util.signature}\``);
      }
      
      lines.push('');
    });
    
    return lines.join('\n');
  }
  
  /**
   * Construye sección de hooks
   */
  private buildHooksSection(hooks: ExtractedEntity[]): string {
    const lines = [
      '## 🪝 HOOKS Y PATTERNS DISPONIBLES',
      '',
      'Usa estos hooks en lugar de implementar desde cero:',
      ''
    ];
    
    hooks.slice(0, 5).forEach(hook => {
      lines.push(`- **\`${hook.id}\`** (\`${hook.filePath}\`)`);
      
      if (hook.docstring) {
        lines.push(`  ${hook.docstring}`);
      }
      
      if (hook.signature) {
        lines.push(`  \`${hook.signature}\``);
      }
      
      lines.push('');
    });
    
    return lines.join('\n');
  }
  
  /**
   * Restricciones del proyecto
   */
  private getProjectConstraints(): string {
    return `
## ⚠️  RESTRICCIONES DEL PROYECTO

1. **NO crear componentes desde cero** si existe uno similar (revisa sección anterior)
2. **NO usar colores hardcodeados** - usar theme tokens si existen
3. **NO usar Class Components** - solo Functional Components + Hooks
4. **NO usar 'any'** en TypeScript - siempre tipar correctamente
5. **Accesibilidad OBLIGATORIA** - todos los elementos interactivos necesitan aria-labels
6. **Performance** - memoizar callbacks y componentes costosos
7. **Seguridad** - sanitizar SIEMPRE input del usuario (DOMPurify)
`;
  }
  
  /**
   * Enriquece prompt para refactorización
   */
  async enrichRefactorPrompt(basePrompt: string, filePath: string, issues: string[]): Promise<string> {
    const sections: string[] = [basePrompt];
    
    sections.push('\n## 🔧 ISSUES DETECTADOS:\n');
    issues.forEach(issue => {
      sections.push(`- ${issue}`);
    });
    
    sections.push('\n## ✅ SOLUCIONES RECOMENDADAS:\n');
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
      return 'Eliminar eval() - usar alternativas seguras';
    }
    
    if (issue.includes('Inline function')) {
      return 'Extraer a useCallback para evitar re-renders innecesarios';
    }
    
    if (issue.includes('Magic Number')) {
      return 'Extraer a constantes con nombres descriptivos';
    }
    
    return null;
  }
}
