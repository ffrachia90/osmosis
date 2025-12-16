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
   * Detecta tecnología legacy desde análisis visual
   */
  async detect(screenshots: Buffer[]): Promise<LegacyDetectionResult> {
    console.log('🔍 Detectando tecnología legacy...')

    const technologies: LegacyTechnology[] = []

    // TODO: Usar Claude Vision para análisis más sofisticado
    // Por ahora, heurísticas basadas en patrones visuales comunes

    // Detectar jQuery por patrones UI típicos
    const jqueryIndicators = this.detectJQuery(screenshots)
    if (jqueryIndicators.length > 0) {
      technologies.push({
        name: 'jQuery',
        confidence: 0.8,
        indicators: jqueryIndicators,
        migrationComplexity: 'medium'
      })
    }

    // Detectar Java Swing por look & feel característico
    const swingIndicators = this.detectJavaSwing(screenshots)
    if (swingIndicators.length > 0) {
      technologies.push({
        name: 'Java Swing',
        confidence: 0.9,
        indicators: swingIndicators,
        migrationComplexity: 'high'
      })
    }

    // Detectar Visual Basic por controles típicos
    const vbIndicators = this.detectVisualBasic(screenshots)
    if (vbIndicators.length > 0) {
      technologies.push({
        name: 'Visual Basic',
        confidence: 0.85,
        indicators: vbIndicators,
        migrationComplexity: 'high'
      })
    }

    // Detectar Angular.js (v1) por patrones
    const ng1Indicators = this.detectAngularJS(screenshots)
    if (ng1Indicators.length > 0) {
      technologies.push({
        name: 'AngularJS (v1)',
        confidence: 0.7,
        indicators: ng1Indicators,
        migrationComplexity: 'medium'
      })
    }

    // Determinar tecnología principal
    const primary = technologies.length > 0
      ? technologies.reduce((a, b) => a.confidence > b.confidence ? a : b)
      : null

    // Estimar era
    const era = this.estimateEra(technologies)
    const estimatedAge = this.estimateAge(era)

    // Generar recomendaciones
    const recommendations = this.generateRecommendations(technologies)

    console.log(`✅ Detectado: ${primary?.name || 'Desconocido'}`)

    return {
      technologies,
      primary,
      era,
      estimatedAge,
      recommendations
    }
  }

  /**
   * Detecta jQuery por patrones visuales típicos
   */
  private detectJQuery(screenshots: Buffer[]): string[] {
    const indicators: string[] = []

    // TODO: Analizar screenshots con CV
    // Indicadores comunes: jQuery UI widgets, datepickers, accordions
    
    // Placeholder - en producción usaríamos CV o Claude Vision
    if (Math.random() > 0.5) {
      indicators.push('jQuery UI widgets detectados')
      indicators.push('Datepicker característico de jQuery UI')
    }

    return indicators
  }

  /**
   * Detecta Java Swing por look & feel
   */
  private detectJavaSwing(screenshots: Buffer[]): string[] {
    const indicators: string[] = []

    // Swing tiene un look muy característico:
    // - Metal theme (gris característico)
    // - Botones con bevel específico
    // - Fuentes anti-aliased de forma particular

    // TODO: Implementar detección real
    return indicators
  }

  /**
   * Detecta Visual Basic por controles típicos
   */
  private detectVisualBasic(screenshots: Buffer[]): string[] {
    const indicators: string[] = []

    // VB tiene controles muy característicos:
    // - Botones 3D típicos de Windows 95/2000
    // - ComboBox con estilo clásico
    // - DataGridView con look específico

    // TODO: Implementar detección real
    return indicators
  }

  /**
   * Detecta AngularJS (v1)
   */
  private detectAngularJS(screenshots: Buffer[]): string[] {
    const indicators: string[] = []

    // Angular.js tiene patrones típicos:
    // - Bootstrap 3 (muy común con ng1)
    // - Ciertos patrones de layout
    
    // TODO: Implementar detección real
    return indicators
  }

  /**
   * Estima era de la aplicación
   */
  private estimateEra(technologies: LegacyTechnology[]): '1990s' | '2000s' | '2010s' | 'modern' {
    if (technologies.some(t => t.name.includes('Visual Basic') || t.name.includes('Java Swing'))) {
      return '1990s'
    }

    if (technologies.some(t => t.name.includes('jQuery') && !t.name.includes('AngularJS'))) {
      return '2000s'
    }

    if (technologies.some(t => t.name.includes('AngularJS'))) {
      return '2010s'
    }

    return 'modern'
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
   * Genera recomendaciones de migración
   */
  private generateRecommendations(technologies: LegacyTechnology[]): string[] {
    const recommendations: string[] = []

    for (const tech of technologies) {
      switch (tech.name) {
        case 'jQuery':
          recommendations.push('Migrar jQuery a React hooks nativos')
          recommendations.push('Reemplazar jQuery UI con componentes modernos')
          recommendations.push('Eliminar manipulación directa del DOM')
          break

        case 'Java Swing':
          recommendations.push('Migración completa a web (React)')
          recommendations.push('Considerar Progressive Web App para distribución')
          recommendations.push('Evaluar microservicios para backend Java existente')
          break

        case 'Visual Basic':
          recommendations.push('Reescritura completa recomendada')
          recommendations.push('Documentar lógica de negocio antes de migrar')
          recommendations.push('Considerar .NET Core + React si hay inversión en .NET')
          break

        case 'AngularJS (v1)':
          recommendations.push('Migrar a React o Angular moderno')
          recommendations.push('Refactorizar controladores a componentes funcionales')
          recommendations.push('Modernizar bundling (de Grunt/Gulp a Vite)')
          break
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Aplicación moderna - considerar mejoras incrementales')
    }

    return recommendations
  }
}

// Singleton
export const legacyDetector = new LegacyDetector()

export type { LegacyTechnology, LegacyDetectionResult }


