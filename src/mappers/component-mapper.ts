/**
 * Component Mapper - Mapea UI legacy a componentes modernos
 * FUERZA uso de componentes aprobados del Design System
 */

import type { DesignSystem, DesignSystemComponent } from './design-system-scanner'
import type { UIElement } from '../analyzers/behavior-extractor'

interface ComponentMapping {
  legacyElement: UIElement
  modernComponent: DesignSystemComponent
  propsMapping: Record<string, any>
  confidence: number
  reasoning: string
}

interface MappingStrategy {
  approach: 'exact_match' | 'similar_match' | 'compose' | 'custom'
  components: DesignSystemComponent[]
  explanation: string
}

export class ComponentMapper {
  /**
   * Mapea elementos legacy a componentes modernos
   */
  mapElements(
    legacyElements: UIElement[],
    designSystem: DesignSystem
  ): ComponentMapping[] {
    console.log('🗺️  Mapeando elementos legacy a componentes modernos...')

    const mappings: ComponentMapping[] = []

    for (const element of legacyElements) {
      const mapping = this.mapSingleElement(element, designSystem)
      if (mapping) {
        mappings.push(mapping)
      }
    }

    console.log(`✅ ${mappings.length} elementos mapeados`)
    return mappings
  }

  /**
   * Mapea un elemento individual
   */
  private mapSingleElement(
    element: UIElement,
    designSystem: DesignSystem
  ): ComponentMapping | null {
    // Buscar componente exacto por tipo
    const exactMatch = this.findExactMatch(element, designSystem)
    if (exactMatch) {
      return {
        legacyElement: element,
        modernComponent: exactMatch.component,
        propsMapping: exactMatch.props,
        confidence: 0.95,
        reasoning: 'Coincidencia exacta de tipo de componente'
      }
    }

    // Buscar componente similar
    const similarMatch = this.findSimilarMatch(element, designSystem)
    if (similarMatch) {
      return {
        legacyElement: element,
        modernComponent: similarMatch.component,
        propsMapping: similarMatch.props,
        confidence: 0.75,
        reasoning: 'Componente similar encontrado'
      }
    }

    // Como último recurso, sugerir composición
    const compositionMatch = this.suggestComposition(element, designSystem)
    if (compositionMatch) {
      return {
        legacyElement: element,
        modernComponent: compositionMatch.component,
        propsMapping: compositionMatch.props,
        confidence: 0.6,
        reasoning: 'Requiere composición de múltiples componentes'
      }
    }

    return null
  }

  /**
   * Busca coincidencia exacta
   */
  private findExactMatch(
    element: UIElement,
    designSystem: DesignSystem
  ): { component: DesignSystemComponent; props: Record<string, any> } | null {
    const componentsByCategory = designSystem.components.filter(
      c => c.category === element.type
    )

    if (componentsByCategory.length > 0) {
      const component = componentsByCategory[0]
      const props = this.inferProps(element, component)
      return { component, props }
    }

    return null
  }

  /**
   * Busca coincidencia similar
   */
  private findSimilarMatch(
    element: UIElement,
    designSystem: DesignSystem
  ): { component: DesignSystemComponent; props: Record<string, any> } | null {
    // Mapeo de tipos legacy a categorías modernas
    const similarityMap: Record<string, DesignSystemComponent['category'][]> = {
      button: ['button'],
      input: ['input', 'form'],
      modal: ['modal', 'card'],
      table: ['table', 'card'],
      form: ['form', 'input'],
      menu: ['button', 'layout']
    }

    const possibleCategories = similarityMap[element.type] || []

    for (const category of possibleCategories) {
      const components = designSystem.components.filter(c => c.category === category)
      if (components.length > 0) {
        const component = components[0]
        const props = this.inferProps(element, component)
        return { component, props }
      }
    }

    return null
  }

  /**
   * Sugiere composición de componentes
   */
  private suggestComposition(
    element: UIElement,
    designSystem: DesignSystem
  ): { component: DesignSystemComponent; props: Record<string, any> } | null {
    // Para elementos complejos, sugerir usar layout + otros componentes
    const layouts = designSystem.components.filter(c => c.category === 'layout')
    
    if (layouts.length > 0) {
      return {
        component: layouts[0],
        props: {
          children: '// Componer con otros componentes'
        }
      }
    }

    return null
  }

  /**
   * Infiere props desde elemento legacy
   */
  private inferProps(
    element: UIElement,
    component: DesignSystemComponent
  ): Record<string, any> {
    const props: Record<string, any> = {}

    // Mapear texto si existe
    if (element.text && component.props.some(p => p.name === 'children' || p.name === 'label')) {
      if (component.props.some(p => p.name === 'children')) {
        props.children = element.text
      } else if (component.props.some(p => p.name === 'label')) {
        props.label = element.text
      }
    }

    // Inferir variant si aplica
    if (component.variants && component.variants.length > 0) {
      props.variant = component.variants[0] // Default al primer variant
    }

    // Props comunes según tipo
    switch (component.category) {
      case 'button':
        props.onClick = '() => {}'
        break
      case 'input':
        props.onChange = '(e) => {}'
        props.value = ''
        break
      case 'modal':
        props.open = false
        props.onClose = '() => {}'
        break
    }

    return props
  }

  /**
   * Genera estrategia de migración para un componente complejo
   */
  generateStrategy(
    componentName: string,
    elements: UIElement[],
    designSystem: DesignSystem
  ): MappingStrategy {
    const mappings = this.mapElements(elements, designSystem)

    // Si todos los elementos tienen coincidencias exactas
    const allExact = mappings.every(m => m.confidence >= 0.9)
    if (allExact) {
      return {
        approach: 'exact_match',
        components: mappings.map(m => m.modernComponent),
        explanation: 'Todos los elementos tienen equivalentes exactos en el Design System'
      }
    }

    // Si la mayoría son similares
    const mostSimilar = mappings.filter(m => m.confidence >= 0.7).length > mappings.length * 0.7
    if (mostSimilar) {
      return {
        approach: 'similar_match',
        components: mappings.map(m => m.modernComponent),
        explanation: 'La mayoría de elementos tienen equivalentes similares que requieren ajustes menores'
      }
    }

    // Si requiere composición
    const needsComposition = mappings.some(m => m.reasoning.includes('composición'))
    if (needsComposition) {
      return {
        approach: 'compose',
        components: [...new Set(mappings.map(m => m.modernComponent))],
        explanation: 'Requiere componer múltiples componentes del Design System'
      }
    }

    // Custom implementation needed
    return {
      approach: 'custom',
      components: [],
      explanation: 'Requiere implementación custom - no hay componentes equivalentes en el Design System'
    }
  }

  /**
   * Valida que el mapeo solo use componentes aprobados
   */
  validate(
    mappings: ComponentMapping[],
    designSystem: DesignSystem
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const mapping of mappings) {
      // Verificar que el componente existe en el design system
      const exists = designSystem.components.some(
        c => c.name === mapping.modernComponent.name
      )

      if (!exists) {
        errors.push(
          `Componente ${mapping.modernComponent.name} no existe en el Design System aprobado`
        )
      }

      // Verificar que las props son válidas
      for (const propName of Object.keys(mapping.propsMapping)) {
        const propExists = mapping.modernComponent.props.some(p => p.name === propName)
        
        if (!propExists && propName !== 'children') {
          errors.push(
            `Prop '${propName}' no existe en ${mapping.modernComponent.name}`
          )
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Singleton
export const componentMapper = new ComponentMapper()

export type { ComponentMapping, MappingStrategy }



