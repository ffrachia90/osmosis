/**
 * Design System Scanner - Escanea y mapea sistema de diseño existente
 * CLAVE: Fuerza uso de componentes APROBADOS de la empresa
 */

import { promises as fs } from 'fs'
import path from 'path'
import { glob } from 'glob'

interface DesignSystemComponent {
  name: string
  filePath: string
  props: ComponentProp[]
  category: 'button' | 'input' | 'modal' | 'card' | 'table' | 'form' | 'layout' | 'other'
  examples?: string[]
  variants?: string[]
}

interface ComponentProp {
  name: string
  type: string
  required: boolean
  default?: string
  description?: string
}

interface DesignSystem {
  name: string
  version?: string
  components: DesignSystemComponent[]
  tokens?: DesignTokens
  patterns: DesignPattern[]
}

interface DesignTokens {
  colors: Record<string, string>
  spacing: Record<string, string>
  typography: Record<string, any>
  breakpoints: Record<string, string>
}

interface DesignPattern {
  name: string
  usage: string
  example: string
}

export class DesignSystemScanner {
  /**
   * Escanea el sistema de diseño del proyecto
   */
  async scan(projectPath: string): Promise<DesignSystem> {
    console.log('🎨 Escaneando sistema de diseño...')

    // 1. Detectar tipo de sistema
    const systemType = await this.detectSystemType(projectPath)
    console.log(`   Tipo: ${systemType}`)

    // 2. Encontrar componentes
    const components = await this.findComponents(projectPath, systemType)
    console.log(`   Componentes encontrados: ${components.length}`)

    // 3. Extraer tokens de diseño
    const tokens = await this.extractTokens(projectPath, systemType)

    // 4. Identificar patrones comunes
    const patterns = this.identifyPatterns(components)

    return {
      name: systemType,
      components,
      tokens,
      patterns
    }
  }

  /**
   * Detecta tipo de sistema de diseño
   */
  private async detectSystemType(projectPath: string): Promise<string> {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
      )

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

      // Detectar sistemas populares
      if (deps['@mui/material']) return 'Material-UI'
      if (deps['@chakra-ui/react']) return 'Chakra UI'
      if (deps['antd']) return 'Ant Design'
      if (await this.hasShadcn(projectPath)) return 'shadcn/ui'
      if (deps['tailwindcss']) return 'Tailwind CSS'
      
      return 'Custom'
    } catch {
      return 'Custom'
    }
  }

  /**
   * Verifica si usa shadcn/ui
   */
  private async hasShadcn(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'components', 'ui'))
      return true
    } catch {
      return false
    }
  }

  /**
   * Encuentra componentes del sistema
   */
  private async findComponents(
    projectPath: string,
    systemType: string
  ): Promise<DesignSystemComponent[]> {
    const components: DesignSystemComponent[] = []

    // Rutas típicas de componentes
    const searchPaths = [
      'components/**/*.{tsx,jsx}',
      'src/components/**/*.{tsx,jsx}',
      'ui/**/*.{tsx,jsx}',
      'src/ui/**/*.{tsx,jsx}'
    ]

    for (const pattern of searchPaths) {
      try {
        const files = await glob(pattern, { cwd: projectPath, absolute: true })

        for (const file of files) {
          const component = await this.parseComponent(file)
          if (component) {
            components.push(component)
          }
        }
      } catch (error) {
        // Ruta no existe, continuar
      }
    }

    return components
  }

  /**
   * Parsea un archivo de componente
   */
  private async parseComponent(filePath: string): Promise<DesignSystemComponent | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      
      // Extraer nombre del componente
      const nameMatch = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+(\w+))|(?:function\s+(\w+)\s*\()/)
      const name = nameMatch?.[1] || nameMatch?.[2] || path.basename(filePath, path.extname(filePath))

      // Extraer props (interfaz TypeScript)
      const props = this.extractProps(content)

      // Categorizar componente
      const category = this.categorizeComponent(name, content)

      // Extraer variants si existen
      const variants = this.extractVariants(content)

      return {
        name,
        filePath,
        props,
        category,
        variants
      }
    } catch (error) {
      console.warn(`Error parseando ${filePath}:`, error)
      return null
    }
  }

  /**
   * Extrae props de TypeScript interface
   */
  private extractProps(content: string): ComponentProp[] {
    const props: ComponentProp[] = []

    // Buscar interface Props
    const propsInterfaceMatch = content.match(/interface\s+\w+Props\s*{([^}]+)}/s)
    if (!propsInterfaceMatch) return props

    const propsContent = propsInterfaceMatch[1]
    
    // Parsear cada prop
    const propLines = propsContent.split('\n').filter(line => line.trim())

    for (const line of propLines) {
      const propMatch = line.match(/(\w+)(\?)?:\s*([^;]+)/)
      if (propMatch) {
        props.push({
          name: propMatch[1],
          type: propMatch[3].trim(),
          required: !propMatch[2] // No ? = required
        })
      }
    }

    return props
  }

  /**
   * Categoriza componente por nombre y contenido
   */
  private categorizeComponent(
    name: string,
    content: string
  ): DesignSystemComponent['category'] {
    const nameLower = name.toLowerCase()

    if (nameLower.includes('button')) return 'button'
    if (nameLower.includes('input') || nameLower.includes('field')) return 'input'
    if (nameLower.includes('modal') || nameLower.includes('dialog')) return 'modal'
    if (nameLower.includes('card')) return 'card'
    if (nameLower.includes('table') || nameLower.includes('grid')) return 'table'
    if (nameLower.includes('form')) return 'form'
    if (nameLower.includes('layout') || nameLower.includes('container')) return 'layout'

    return 'other'
  }

  /**
   * Extrae variantes del componente
   */
  private extractVariants(content: string): string[] {
    const variants: string[] = []

    // Buscar type con union types (variantes típicas)
    const variantMatch = content.match(/variant\??:\s*['"](\w+)['"](?:\s*\|\s*['"](\w+)['"])*/g)
    if (variantMatch) {
      variantMatch.forEach(match => {
        const matches = match.match(/['"](\w+)['"]/g)
        matches?.forEach(m => {
          const variant = m.replace(/['"]/g, '')
          if (!variants.includes(variant)) {
            variants.push(variant)
          }
        })
      })
    }

    return variants
  }

  /**
   * Extrae tokens de diseño
   */
  private async extractTokens(
    projectPath: string,
    systemType: string
  ): Promise<DesignTokens | undefined> {
    // Buscar archivos de configuración comunes
    const configFiles = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'theme.ts',
      'tokens.ts',
      'design-tokens.json'
    ]

    for (const file of configFiles) {
      try {
        const filePath = path.join(projectPath, file)
        const content = await fs.readFile(filePath, 'utf-8')

        // TODO: Parsear configuración real
        // Por ahora, retornar estructura vacía
        return {
          colors: {},
          spacing: {},
          typography: {},
          breakpoints: {}
        }
      } catch {
        continue
      }
    }

    return undefined
  }

  /**
   * Identifica patrones comunes
   */
  private identifyPatterns(components: DesignSystemComponent[]): DesignPattern[] {
    const patterns: DesignPattern[] = []

    // Identificar si usan composition pattern
    const hasComposition = components.some(c =>
      c.props.some(p => p.name === 'children')
    )

    if (hasComposition) {
      patterns.push({
        name: 'Composition Pattern',
        usage: 'Componentes que aceptan children para composición',
        example: '<Card><CardHeader>Title</CardHeader><CardContent>...</CardContent></Card>'
      })
    }

    // Identificar patrón de variantes
    const hasVariants = components.some(c => c.variants && c.variants.length > 0)

    if (hasVariants) {
      patterns.push({
        name: 'Variant Pattern',
        usage: 'Componentes con variantes predefinidas',
        example: '<Button variant="primary">Click</Button>'
      })
    }

    return patterns
  }

  /**
   * Busca componente por nombre
   */
  findComponent(
    designSystem: DesignSystem,
    name: string
  ): DesignSystemComponent | null {
    return designSystem.components.find(
      c => c.name.toLowerCase() === name.toLowerCase()
    ) || null
  }

  /**
   * Busca componentes por categoría
   */
  findComponentsByCategory(
    designSystem: DesignSystem,
    category: DesignSystemComponent['category']
  ): DesignSystemComponent[] {
    return designSystem.components.filter(c => c.category === category)
  }
}

// Singleton
export const designSystemScanner = new DesignSystemScanner()

export type { DesignSystemComponent, ComponentProp, DesignSystem, DesignTokens, DesignPattern }


