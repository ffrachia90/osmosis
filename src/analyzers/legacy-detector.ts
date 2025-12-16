/**
 * Legacy Detector - Identifica tecnología antigua desde screenshots
 * Detecta jQuery, PHP, Java Swing, Visual Basic, Angular.js, etc.
 */

interface LegacyTechnology {
  name: string
  confidence: number // 0-1
  indicators: string[]
  migrationComplexity: 'low' | 'medium' | 'high'
}

interface LegacyDetectionResult {
  technologies: LegacyTechnology[]
  primary: LegacyTechnology | null
  era: '1990s' | '2000s' | '2010s' | 'modern'
  estimatedAge: number // años
  recommendations: string[]
}

export class LegacyDetector {
  /**
   * Detecta tecnología legacy desde un directorio de código
   */
  async detectFromCode(projectDir: string): Promise<string[]> {
    const fs = await import('fs');
    const path = await import('path');
    const technologies: string[] = [];

    // Escanear tipos de archivos
    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile()) {
          // Detectar por extensión
          if (file.endsWith('.jsp')) technologies.push('jsp');
          if (file.endsWith('.php')) technologies.push('php');
          if (file.endsWith('.aspx') || file.endsWith('.ascx')) technologies.push('asp.net');
          if (file.endsWith('.cfm') || file.endsWith('.cfc')) technologies.push('coldfusion');
          if (file.endsWith('.pl')) technologies.push('perl');
        }
      }
    };

    scanDir(projectDir);
    
    // Eliminar duplicados
    return [...new Set(technologies)];
  }

  /**
   * Detecta tecnología legacy desde análisis de código (MÉTODO RECOMENDADO)
   * Analiza el contenido de archivos para detectar patterns específicos
   */
  async detectFromCodebase(projectDir: string): Promise<LegacyDetectionResult> {
    console.log('🔍 Analizando codebase para detectar tecnologías...');
    
    const fs = await import('fs');
    const path = await import('path');
    const technologies: LegacyTechnology[] = [];
    const fileContents = new Map<string, string>();
    
    // Escanear archivos y leer contenido
    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile()) {
          // Leer archivos relevantes
          const ext = path.extname(file);
          if (['.js', '.jsx', '.ts', '.tsx', '.jsp', '.php', '.aspx', '.html'].includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              fileContents.set(fullPath, content);
            } catch (error) {
              // Ignorar archivos que no se puedan leer
            }
          }
        }
      }
    };
    
    scanDir(projectDir);
    
    // Detectar jQuery
    const jqueryIndicators = this.detectJQueryFromCode(fileContents);
    if (jqueryIndicators.length > 0) {
      technologies.push({
        name: 'jQuery',
        confidence: Math.min(0.9, jqueryIndicators.length * 0.2),
        indicators: jqueryIndicators,
        migrationComplexity: 'medium'
      });
    }
    
    // Detectar AngularJS
    const ng1Indicators = this.detectAngularJSFromCode(fileContents);
    if (ng1Indicators.length > 0) {
      technologies.push({
        name: 'AngularJS (v1)',
        confidence: Math.min(0.9, ng1Indicators.length * 0.25),
        indicators: ng1Indicators,
        migrationComplexity: 'medium'
      });
    }
    
    // Detectar JSP
    const jspIndicators = this.detectJSPFromCode(fileContents);
    if (jspIndicators.length > 0) {
      technologies.push({
        name: 'JSP (JavaServer Pages)',
        confidence: 0.95,
        indicators: jspIndicators,
        migrationComplexity: 'high'
      });
    }
    
    // Detectar PHP Legacy
    const phpIndicators = this.detectPHPFromCode(fileContents);
    if (phpIndicators.length > 0) {
      technologies.push({
        name: 'PHP Legacy',
        confidence: 0.9,
        indicators: phpIndicators,
        migrationComplexity: 'medium'
      });
    }
    
    // Detectar ASP.NET Legacy
    const aspIndicators = this.detectASPFromCode(fileContents);
    if (aspIndicators.length > 0) {
      technologies.push({
        name: 'ASP.NET WebForms',
        confidence: 0.95,
        indicators: aspIndicators,
        migrationComplexity: 'high'
      });
    }
    
    // Determinar tecnología principal
    const primary = technologies.length > 0
      ? technologies.reduce((a, b) => a.confidence > b.confidence ? a : b)
      : null;
    
    // Estimar era
    const era = this.estimateEra(technologies);
    const estimatedAge = this.estimateAge(era);
    
    // Generar recomendaciones
    const recommendations = this.generateRecommendations(technologies);
    
    console.log(`✅ Detectado: ${primary?.name || 'Moderno'} (${technologies.length} tecnologías legacy)`);
    
    return {
      technologies,
      primary,
      era,
      estimatedAge,
      recommendations
    };
  }
  
  /**
   * Detecta jQuery analizando código real
   */
  private detectJQueryFromCode(files: Map<string, string>): string[] {
    const indicators: string[] = [];
    let jqueryUsageCount = 0;
    
    for (const [filePath, content] of files.entries()) {
      // Detectar jQuery selectors
      if (content.includes('$("') || content.includes("$('") || content.includes('jQuery(')) {
        jqueryUsageCount++;
      }
      
      // Detectar jQuery UI
      if (content.includes('.dialog(') || content.includes('.datepicker(') || content.includes('.accordion(')) {
        indicators.push(`jQuery UI widgets en ${filePath.split('/').pop()}`);
      }
      
      // Detectar AJAX jQuery
      if (content.includes('$.ajax') || content.includes('$.get') || content.includes('$.post')) {
        indicators.push(`jQuery AJAX calls en ${filePath.split('/').pop()}`);
      }
    }
    
    if (jqueryUsageCount > 5) {
      indicators.push(`jQuery usado en ${jqueryUsageCount} archivos`);
    }
    
    return indicators;
  }
  
  /**
   * Detecta AngularJS (v1) analizando código real
   */
  private detectAngularJSFromCode(files: Map<string, string>): string[] {
    const indicators: string[] = [];
    
    for (const [filePath, content] of files.entries()) {
      // Detectar AngularJS module definition
      if (content.includes('angular.module(')) {
        indicators.push(`AngularJS modules en ${filePath.split('/').pop()}`);
      }
      
      // Detectar controladores
      if (content.includes('.controller(') || content.includes('$scope')) {
        indicators.push(`AngularJS controllers en ${filePath.split('/').pop()}`);
      }
      
      // Detectar directivas ng-
      if (content.includes('ng-repeat') || content.includes('ng-if') || content.includes('ng-model')) {
        indicators.push(`AngularJS directives en ${filePath.split('/').pop()}`);
      }
    }
    
    return indicators;
  }
  
  /**
   * Detecta JSP analizando código real
   */
  private detectJSPFromCode(files: Map<string, string>): string[] {
    const indicators: string[] = [];
    
    for (const [filePath, content] of files.entries()) {
      if (filePath.endsWith('.jsp')) {
        indicators.push(`Archivo JSP: ${filePath.split('/').pop()}`);
        
        // Detectar scriptlets
        if (content.includes('<%') && content.includes('%>')) {
          indicators.push(`JSP scriptlets detectados`);
        }
        
        // Detectar JSTL tags
        if (content.includes('<c:') || content.includes('<fmt:')) {
          indicators.push(`JSTL tags detectados`);
        }
      }
    }
    
    return indicators;
  }
  
  /**
   * Detecta PHP Legacy analizando código real
   */
  private detectPHPFromCode(files: Map<string, string>): string[] {
    const indicators: string[] = [];
    
    for (const [filePath, content] of files.entries()) {
      if (filePath.endsWith('.php')) {
        indicators.push(`Archivo PHP: ${filePath.split('/').pop()}`);
        
        // Detectar funciones inseguras legacy
        if (content.includes('mysql_query') || content.includes('mysql_connect')) {
          indicators.push(`MySQL legacy functions (inseguras)`);
        }
        
        // Detectar globals
        if (content.includes('$_GET') || content.includes('$_POST') || content.includes('$_REQUEST')) {
          indicators.push(`PHP superglobals usage`);
        }
      }
    }
    
    return indicators;
  }
  
  /**
   * Detecta ASP.NET Legacy analizando código real
   */
  private detectASPFromCode(files: Map<string, string>): string[] {
    const indicators: string[] = [];
    
    for (const [filePath, content] of files.entries()) {
      if (filePath.endsWith('.aspx') || filePath.endsWith('.ascx')) {
        indicators.push(`ASP.NET WebForms: ${filePath.split('/').pop()}`);
        
        // Detectar server controls
        if (content.includes('runat="server"')) {
          indicators.push(`ASP.NET Server Controls detectados`);
        }
        
        // Detectar ViewState
        if (content.includes('ViewState')) {
          indicators.push(`ViewState usage (anti-pattern moderno)`);
        }
      }
    }
    
    return indicators;
  }

  /**
   * Estima era de la aplicación basándose en las tecnologías detectadas
   */
  private estimateEra(technologies: LegacyTechnology[]): '1990s' | '2000s' | '2010s' | 'modern' {
    // 1990s: JSP original, ASP clásico, Visual Basic
    if (technologies.some(t => 
      t.name.includes('Visual Basic') || 
      t.name.includes('Java Swing') ||
      t.name.includes('ASP.NET WebForms')
    )) {
      return '1990s';
    }

    // 2000s: jQuery, PHP sin frameworks, JSP maduro
    if (technologies.some(t => 
      t.name.includes('jQuery') || 
      t.name.includes('JSP') ||
      t.name.includes('PHP Legacy')
    )) {
      return '2000s';
    }

    // 2010s: AngularJS (v1)
    if (technologies.some(t => t.name.includes('AngularJS'))) {
      return '2010s';
    }

    return 'modern';
  }

  /**
   * Estima edad en años
   */
  private estimateAge(era: string): number {
    const currentYear = new Date().getFullYear()
    
    switch (era) {
      case '1990s': return currentYear - 1995 // ~30 años
      case '2000s': return currentYear - 2005 // ~20 años
      case '2010s': return currentYear - 2013 // ~12 años
      default: return 0
    }
  }

  /**
   * Genera recomendaciones de migración basadas en tecnologías detectadas
   */
  private generateRecommendations(technologies: LegacyTechnology[]): string[] {
    const recommendations: string[] = [];
    const seen = new Set<string>();

    for (const tech of technologies) {
      let techRecommendations: string[] = [];
      
      if (tech.name.includes('jQuery')) {
        techRecommendations = [
          'Migrar jQuery a React hooks nativos',
          'Reemplazar jQuery UI con componentes modernos (shadcn/ui, MUI)',
          'Eliminar manipulación directa del DOM',
          'Refactorizar AJAX a fetch/axios con React Query'
        ];
      } else if (tech.name.includes('JSP')) {
        techRecommendations = [
          'Separar lógica de negocio del frontend (API REST)',
          'Migrar templates JSP a componentes React',
          'Modernizar backend Java (Spring Boot)',
          'Implementar autenticación moderna (JWT)'
        ];
      } else if (tech.name.includes('PHP')) {
        techRecommendations = [
          'Migrar a arquitectura API-first (REST o GraphQL)',
          'Frontend moderno (React/Vue) + PHP backend',
          'Actualizar a PHP 8+ y Laravel/Symfony si aplica',
          'Eliminar funciones inseguras (mysql_*, eval)'
        ];
      } else if (tech.name.includes('ASP.NET')) {
        techRecommendations = [
          'Migrar de WebForms a SPA (React)',
          'Modernizar backend a ASP.NET Core',
          'Eliminar ViewState y postbacks',
          'Implementar API REST para frontend desacoplado'
        ];
      } else if (tech.name.includes('Java Swing')) {
        techRecommendations = [
          'Migración completa a web (React)',
          'Considerar Progressive Web App para distribución',
          'Evaluar microservicios para backend Java existente'
        ];
      } else if (tech.name.includes('Visual Basic')) {
        techRecommendations = [
          'Reescritura completa recomendada',
          'Documentar lógica de negocio antes de migrar',
          'Considerar .NET Core + React si hay inversión en .NET'
        ];
      } else if (tech.name.includes('AngularJS')) {
        techRecommendations = [
          'Migrar a React o Angular moderno',
          'Refactorizar controladores a componentes funcionales',
          'Modernizar bundling (de Grunt/Gulp a Vite)',
          'Reemplazar $scope con state management moderno'
        ];
      }
      
      // Agregar recomendaciones sin duplicar
      for (const rec of techRecommendations) {
        if (!seen.has(rec)) {
          recommendations.push(rec);
          seen.add(rec);
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Aplicación moderna - considerar mejoras incrementales');
      recommendations.push('Revisar performance y accesibilidad');
      recommendations.push('Actualizar dependencias a versiones LTS');
    }

    return recommendations;
  }
}

// Singleton
export const legacyDetector = new LegacyDetector()

export type { LegacyTechnology, LegacyDetectionResult }


