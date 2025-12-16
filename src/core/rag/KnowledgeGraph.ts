/**
 * KnowledgeGraph - Grafo de Conocimiento del Codebase
 * Indexa componentes, funciones, constantes, types para contexto RAG
 */

import * as ts from 'typescript';
import fs from 'fs';
import path from 'path';

export type EntityType = 
  | 'component' 
  | 'function' 
  | 'constant' 
  | 'type' 
  | 'interface' 
  | 'class'
  | 'hook'
  | 'utility';

export interface CodeEntity {
  id: string; // Unique identifier
  name: string; // Entity name
  type: EntityType;
  filePath: string;
  exported: boolean;
  signature?: string; // Type signature or function signature
  description?: string; // JSDoc comment
  dependencies: string[]; // Other entities it depends on
  props?: Record<string, string>; // For React components: prop types
  returnType?: string; // For functions
  tags?: string[]; // Custom tags (design-system, utility, etc.)
}

export interface DesignSystemInfo {
  components: Map<string, CodeEntity>;
  theme: {
    colors?: Map<string, string>;
    spacing?: Map<string, string>;
    typography?: Map<string, string>;
  };
  patterns: Map<string, CodeEntity>; // Common patterns (auth, fetching, etc.)
}

export class KnowledgeGraph {
  private entities: Map<string, CodeEntity> = new Map();
  private designSystem: DesignSystemInfo = {
    components: new Map(),
    theme: {
      colors: new Map(),
      spacing: new Map(),
      typography: new Map()
    },
    patterns: new Map()
  };
  
  /**
   * Agrega una entidad al grafo
   */
  addEntity(entity: CodeEntity): void {
    this.entities.set(entity.id, entity);
    
    // Si es un componente, agregarlo al design system
    if (entity.type === 'component' && entity.exported) {
      this.designSystem.components.set(entity.name, entity);
    }
    
    // Si es una constante de tema, agregarlo
    if (entity.type === 'constant' && this.isThemeRelated(entity)) {
      this.categorizeThemeConstant(entity);
    }
    
    // Si es un patrón común, agregarlo
    if (this.isCommonPattern(entity)) {
      this.designSystem.patterns.set(entity.name, entity);
    }
  }
  
  /**
   * Busca entidades por nombre
   */
  search(query: string): CodeEntity[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.entities.values()).filter(entity => 
      entity.name.toLowerCase().includes(lowerQuery) ||
      entity.description?.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * Busca componentes similares
   */
  findSimilarComponents(componentName: string): CodeEntity[] {
    const components = Array.from(this.designSystem.components.values());
    
    // Simple similarity: same prefix/suffix or contains similar words
    const nameLower = componentName.toLowerCase();
    
    return components.filter(comp => {
      const compNameLower = comp.name.toLowerCase();
      
      // Same prefix (Button, ButtonPrimary, ButtonSecondary)
      if (nameLower.startsWith(compNameLower) || compNameLower.startsWith(nameLower)) {
        return true;
      }
      
      // Contains similar words
      const words = nameLower.split(/(?=[A-Z])/);
      return words.some(word => compNameLower.includes(word.toLowerCase()));
    });
  }
  
  /**
   * Obtiene contexto relevante para un archivo
   */
  getRelevantContext(filePath: string, dependencies: string[]): string {
    const context: string[] = [];
    
    // 1. Componentes del design system disponibles
    if (this.designSystem.components.size > 0) {
      context.push('\n## 🎨 Design System Components:');
      this.designSystem.components.forEach((comp, name) => {
        context.push(`- ${name}: ${path.relative(path.dirname(filePath), comp.filePath)}`);
        if (comp.props && Object.keys(comp.props).length > 0) {
          context.push(`  Props: ${Object.keys(comp.props).join(', ')}`);
        }
      });
    }
    
    // 2. Theme tokens disponibles
    if (this.designSystem.theme.colors && this.designSystem.theme.colors.size > 0) {
      context.push('\n## 🎨 Theme Colors:');
      this.designSystem.theme.colors.forEach((value, name) => {
        context.push(`- ${name}: ${value}`);
      });
    }
    
    // 3. Patrones comunes
    if (this.designSystem.patterns.size > 0) {
      context.push('\n## 🔧 Common Patterns:');
      this.designSystem.patterns.forEach((pattern, name) => {
        context.push(`- ${name}: ${pattern.description || 'Standard pattern'}`);
      });
    }
    
    // 4. Entidades relacionadas con las dependencias
    const relatedEntities = this.getRelatedEntities(dependencies);
    if (relatedEntities.length > 0) {
      context.push('\n## 🔗 Related Entities:');
      relatedEntities.forEach(entity => {
        context.push(`- ${entity.name} (${entity.type}): ${entity.signature || ''}`);
      });
    }
    
    return context.join('\n');
  }
  
  /**
   * Genera recomendaciones basadas en lo que se está migrando
   */
  generateRecommendations(migrationContext: {
    fileName: string;
    detectedPatterns: string[];
    isComponent: boolean;
  }): string[] {
    const recommendations: string[] = [];
    
    // Si es un componente, recomendar usar el design system
    if (migrationContext.isComponent && this.designSystem.components.size > 0) {
      recommendations.push(
        `✅ Design System disponible con ${this.designSystem.components.size} componentes. ` +
        `Usar estos en lugar de HTML nativo.`
      );
    }
    
    // Si detectamos un patrón de autenticación
    if (migrationContext.detectedPatterns.includes('auth')) {
      const authPattern = this.designSystem.patterns.get('useAuth');
      if (authPattern) {
        recommendations.push(
          `✅ Patrón de autenticación disponible: ${authPattern.filePath}. ` +
          `Usar este hook en lugar de implementar desde cero.`
        );
      }
    }
    
    // Si detectamos fetch/API calls
    if (migrationContext.detectedPatterns.includes('fetch')) {
      const fetchPattern = this.designSystem.patterns.get('useFetch') || 
                          this.designSystem.patterns.get('useQuery');
      if (fetchPattern) {
        recommendations.push(
          `✅ Patrón de fetching disponible: ${fetchPattern.name}. ` +
          `Usar este para llamadas API.`
        );
      }
    }
    
    // Si hay theme tokens, recomendar usarlos
    if (this.designSystem.theme.colors && this.designSystem.theme.colors.size > 0) {
      recommendations.push(
        `✅ Theme tokens disponibles. Usar variables de tema en lugar de colores hardcodeados.`
      );
    }
    
    return recommendations;
  }
  
  /**
   * Obtiene estadísticas del grafo
   */
  getStats(): {
    totalEntities: number;
    byType: Record<string, number>;
    designSystem: {
      components: number;
      themeTokens: number;
      patterns: number;
    };
  } {
    const byType: Record<string, number> = {};
    
    this.entities.forEach(entity => {
      byType[entity.type] = (byType[entity.type] || 0) + 1;
    });
    
    return {
      totalEntities: this.entities.size,
      byType,
      designSystem: {
        components: this.designSystem.components.size,
        themeTokens: 
          (this.designSystem.theme.colors?.size || 0) +
          (this.designSystem.theme.spacing?.size || 0) +
          (this.designSystem.theme.typography?.size || 0),
        patterns: this.designSystem.patterns.size
      }
    };
  }
  
  /**
   * Exporta el grafo a JSON
   */
  toJSON(): string {
    return JSON.stringify({
      entities: Array.from(this.entities.entries()),
      designSystem: {
        components: Array.from(this.designSystem.components.entries()),
        theme: {
          colors: Array.from(this.designSystem.theme.colors?.entries() || []),
          spacing: Array.from(this.designSystem.theme.spacing?.entries() || []),
          typography: Array.from(this.designSystem.theme.typography?.entries() || [])
        },
        patterns: Array.from(this.designSystem.patterns.entries())
      }
    }, null, 2);
  }
  
  /**
   * Carga el grafo desde JSON
   */
  static fromJSON(json: string): KnowledgeGraph {
    const data = JSON.parse(json);
    const graph = new KnowledgeGraph();
    
    // Restaurar entities
    data.entities.forEach(([id, entity]: [string, CodeEntity]) => {
      graph.entities.set(id, entity);
    });
    
    // Restaurar design system
    if (data.designSystem) {
      data.designSystem.components.forEach(([name, comp]: [string, CodeEntity]) => {
        graph.designSystem.components.set(name, comp);
      });
      
      if (data.designSystem.theme.colors) {
        data.designSystem.theme.colors.forEach(([name, value]: [string, string]) => {
          graph.designSystem.theme.colors!.set(name, value);
        });
      }
    }
    
    return graph;
  }
  
  // Private helpers
  
  private getRelatedEntities(dependencies: string[]): CodeEntity[] {
    const related: CodeEntity[] = [];
    
    dependencies.forEach(dep => {
      const entity = this.entities.get(dep);
      if (entity) {
        related.push(entity);
      }
    });
    
    return related;
  }
  
  private isThemeRelated(entity: CodeEntity): boolean {
    const themKeywords = ['color', 'spacing', 'font', 'size', 'theme', 'palette'];
    const nameLower = entity.name.toLowerCase();
    return themKeywords.some(keyword => nameLower.includes(keyword));
  }
  
  private categorizeThemeConstant(entity: CodeEntity): void {
    const nameLower = entity.name.toLowerCase();
    
    if (nameLower.includes('color') || nameLower.includes('palette')) {
      this.designSystem.theme.colors!.set(entity.name, entity.signature || '');
    } else if (nameLower.includes('spacing') || nameLower.includes('margin') || nameLower.includes('padding')) {
      this.designSystem.theme.spacing!.set(entity.name, entity.signature || '');
    } else if (nameLower.includes('font') || nameLower.includes('text') || nameLower.includes('typography')) {
      this.designSystem.theme.typography!.set(entity.name, entity.signature || '');
    }
  }
  
  private isCommonPattern(entity: CodeEntity): boolean {
    const patternKeywords = ['useAuth', 'useFetch', 'useQuery', 'useApi', 'useForm', 'useRouter'];
    return patternKeywords.some(keyword => entity.name.includes(keyword));
  }
}

