/**
 * JSP Parser - Parse legacy JSP code
 * Extrae lógica, APIs, rutas, componentes
 */

import { promises as fs } from 'fs'
import path from 'path'
import { glob } from 'glob'

interface ParsedJSP {
  filePath: string
  route?: string
  imports: string[]
  javaCode: JavaCodeBlock[]
  htmlStructure: HTMLElement[]
  formActions: FormAction[]
  apiCalls: APICall[]
  variables: Variable[]
  includes: string[]
}

interface JavaCodeBlock {
  type: 'scriptlet' | 'expression' | 'declaration'
  code: string
  lineStart: number
  lineEnd: number
}

interface HTMLElement {
  tag: string
  attributes: Record<string, string>
  children: HTMLElement[]
  text?: string
}

interface FormAction {
  action: string
  method: 'GET' | 'POST'
  fields: FormField[]
}

interface FormField {
  name: string
  type: string
  required: boolean
  validation?: string
}

interface APICall {
  url: string
  method: string
  parameters: string[]
  responseType?: string
}

interface Variable {
  name: string
  type?: string
  value?: string
  scope: 'page' | 'request' | 'session' | 'application'
}

interface JSPProject {
  files: ParsedJSP[]
  routes: RouteMap[]
  sharedComponents: string[]
  dependencies: string[]
}

interface RouteMap {
  path: string
  jspFile: string
  parameters?: string[]
}

export class JSPParser {
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
  }

  /**
   * Parsea proyecto JSP completo
   */
  async parseProject(): Promise<JSPProject> {
    console.log('📖 Parseando proyecto JSP...')

    // 1. Encontrar todos los archivos JSP
    const jspFiles = await glob('**/*.jsp', {
      cwd: this.projectPath,
      ignore: ['**/WEB-INF/lib/**', '**/node_modules/**'],
      absolute: true
    })

    console.log(`   Encontrados ${jspFiles.length} archivos JSP`)

    // 2. Parsear cada archivo
    const parsedFiles: ParsedJSP[] = []
    for (const file of jspFiles) {
      try {
        const parsed = await this.parseFile(file)
        parsedFiles.push(parsed)
      } catch (error) {
        console.warn(`⚠️  Error parseando ${file}:`, error)
      }
    }

    // 3. Extraer rutas desde web.xml
    const routes = await this.extractRoutes()

    // 4. Identificar componentes compartidos
    const sharedComponents = this.identifySharedComponents(parsedFiles)

    // 5. Extraer dependencias
    const dependencies = await this.extractDependencies()

    console.log('✅ Proyecto parseado completamente')
    console.log(`   - ${parsedFiles.length} archivos`)
    console.log(`   - ${routes.length} rutas`)
    console.log(`   - ${sharedComponents.length} componentes compartidos`)

    return {
      files: parsedFiles,
      routes,
      sharedComponents,
      dependencies
    }
  }

  /**
   * Parsea un archivo JSP individual
   */
  async parseFile(filePath: string): Promise<ParsedJSP> {
    const content = await fs.readFile(filePath, 'utf-8')

    return {
      filePath,
      route: this.inferRoute(filePath),
      imports: this.extractImports(content),
      javaCode: this.extractJavaCode(content),
      htmlStructure: this.extractHTML(content),
      formActions: this.extractForms(content),
      apiCalls: this.extractAPICalls(content),
      variables: this.extractVariables(content),
      includes: this.extractIncludes(content)
    }
  }

  /**
   * Extrae imports y directivas
   */
  private extractImports(content: string): string[] {
    const imports: string[] = []

    // <%@ page import="..." %>
    const pageImports = content.match(/<%@\s*page\s+import="([^"]+)"\s*%>/g)
    if (pageImports) {
      pageImports.forEach(imp => {
        const match = imp.match(/import="([^"]+)"/)
        if (match) imports.push(match[1])
      })
    }

    // <%@ taglib ... %>
    const taglibs = content.match(/<%@\s*taglib[^>]+%>/g)
    if (taglibs) {
      imports.push(...taglibs)
    }

    return imports
  }

  /**
   * Extrae bloques de código Java
   */
  private extractJavaCode(content: string): JavaCodeBlock[] {
    const blocks: JavaCodeBlock[] = []
    const lines = content.split('\n')

    // Scriptlets: <% ... %>
    const scriptletRegex = /<%([^@=][^%]*)%>/gs
    let match
    while ((match = scriptletRegex.exec(content)) !== null) {
      const code = match[1]
      const lineStart = content.substring(0, match.index).split('\n').length
      const lineEnd = lineStart + code.split('\n').length

      blocks.push({
        type: 'scriptlet',
        code: code.trim(),
        lineStart,
        lineEnd
      })
    }

    // Expressions: <%= ... %>
    const expressionRegex = /<%=([^%]+)%>/g
    while ((match = expressionRegex.exec(content)) !== null) {
      blocks.push({
        type: 'expression',
        code: match[1].trim(),
        lineStart: content.substring(0, match.index).split('\n').length,
        lineEnd: content.substring(0, match.index).split('\n').length
      })
    }

    // Declarations: <%! ... %>
    const declarationRegex = /<%!([^%]+)%>/gs
    while ((match = declarationRegex.exec(content)) !== null) {
      blocks.push({
        type: 'declaration',
        code: match[1].trim(),
        lineStart: content.substring(0, match.index).split('\n').length,
        lineEnd: content.substring(0, match.index).split('\n').length + match[1].split('\n').length
      })
    }

    return blocks
  }

  /**
   * Extrae estructura HTML
   */
  private extractHTML(content: string): HTMLElement[] {
    // Remover JSP tags para parsear HTML
    const htmlOnly = content
      .replace(/<%@[^%]*%>/g, '')
      .replace(/<%[^%]*%>/g, '')
      .replace(/\${[^}]+}/g, '')

    // TODO: Implementar parser HTML real (usar cheerio o similar)
    // Por ahora, extraer tags principales
    const elements: HTMLElement[] = []

    const tagRegex = /<(\w+)([^>]*)>/g
    let match
    while ((match = tagRegex.exec(htmlOnly)) !== null) {
      elements.push({
        tag: match[1],
        attributes: this.parseAttributes(match[2]),
        children: []
      })
    }

    return elements
  }

  /**
   * Parsea atributos HTML
   */
  private parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {}
    const attrRegex = /(\w+)="([^"]*)"/g
    let match

    while ((match = attrRegex.exec(attrString)) !== null) {
      attrs[match[1]] = match[2]
    }

    return attrs
  }

  /**
   * Extrae formularios y sus campos
   */
  private extractForms(content: string): FormAction[] {
    const forms: FormAction[] = []
    const formRegex = /<form[^>]*action="([^"]*)"[^>]*method="(\w+)"[^>]*>([\s\S]*?)<\/form>/gi
    let match

    while ((match = formRegex.exec(content)) !== null) {
      const action = match[1]
      const method = match[2].toUpperCase() as 'GET' | 'POST'
      const formContent = match[3]

      // Extraer campos del formulario
      const fields = this.extractFormFields(formContent)

      forms.push({ action, method, fields })
    }

    return forms
  }

  /**
   * Extrae campos de un formulario
   */
  private extractFormFields(formContent: string): FormField[] {
    const fields: FormField[] = []
    const inputRegex = /<input[^>]*name="([^"]*)"[^>]*type="([^"]*)"[^>]*>/gi
    let match

    while ((match = inputRegex.exec(formContent)) !== null) {
      fields.push({
        name: match[1],
        type: match[2],
        required: match[0].includes('required')
      })
    }

    return fields
  }

  /**
   * Extrae llamadas a APIs/backend
   */
  private extractAPICalls(content: string): APICall[] {
    const calls: APICall[] = []

    // Buscar patrones comunes de AJAX/fetch en JSP
    const fetchPatterns = [
      /fetch\(['"]([^'"]+)['"]/g,
      /\$\.ajax\([^)]*url:\s*['"]([^'"]+)['"]/g,
      /\$\.get\(['"]([^'"]+)['"]/g,
      /\$\.post\(['"]([^'"]+)['"]/g
    ]

    for (const pattern of fetchPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        calls.push({
          url: match[1],
          method: pattern.source.includes('post') ? 'POST' : 'GET',
          parameters: []
        })
      }
    }

    return calls
  }

  /**
   * Extrae variables y su scope
   */
  private extractVariables(content: string): Variable[] {
    const variables: Variable[] = []

    // Request attributes: request.getAttribute("...")
    const requestAttr = content.match(/request\.getAttribute\(['"]([^'"]+)['"]\)/g)
    if (requestAttr) {
      requestAttr.forEach(attr => {
        const match = attr.match(/getAttribute\(['"]([^'"]+)['"]\)/)
        if (match) {
          variables.push({
            name: match[1],
            scope: 'request'
          })
        }
      })
    }

    // Session attributes
    const sessionAttr = content.match(/session\.getAttribute\(['"]([^'"]+)['"]\)/g)
    if (sessionAttr) {
      sessionAttr.forEach(attr => {
        const match = attr.match(/getAttribute\(['"]([^'"]+)['"]\)/)
        if (match) {
          variables.push({
            name: match[1],
            scope: 'session'
          })
        }
      })
    }

    return variables
  }

  /**
   * Extrae includes
   */
  private extractIncludes(content: string): string[] {
    const includes: string[] = []

    // <%@ include file="..." %>
    const staticIncludes = content.match(/<%@\s*include\s+file="([^"]+)"\s*%>/g)
    if (staticIncludes) {
      staticIncludes.forEach(inc => {
        const match = inc.match(/file="([^"]+)"/)
        if (match) includes.push(match[1])
      })
    }

    // <jsp:include page="..." />
    const dynamicIncludes = content.match(/<jsp:include\s+page="([^"]+)"/g)
    if (dynamicIncludes) {
      dynamicIncludes.forEach(inc => {
        const match = inc.match(/page="([^"]+)"/)
        if (match) includes.push(match[1])
      })
    }

    return includes
  }

  /**
   * Infiere ruta desde path del archivo
   */
  private inferRoute(filePath: string): string {
    const relativePath = path.relative(this.projectPath, filePath)
    return '/' + relativePath.replace(/\\/g, '/').replace(/\.jsp$/, '')
  }

  /**
   * Extrae rutas desde web.xml
   */
  private async extractRoutes(): Promise<RouteMap[]> {
    const routes: RouteMap[] = []

    try {
      const webXmlPath = path.join(this.projectPath, 'WEB-INF', 'web.xml')
      const webXml = await fs.readFile(webXmlPath, 'utf-8')

      // TODO: Parsear web.xml con XML parser
      // Por ahora, regex básico
      const servletMappings = webXml.match(/<servlet-mapping>[\s\S]*?<\/servlet-mapping>/g)
      
      if (servletMappings) {
        servletMappings.forEach(mapping => {
          const urlPattern = mapping.match(/<url-pattern>([^<]+)<\/url-pattern>/)
          if (urlPattern) {
            routes.push({
              path: urlPattern[1],
              jspFile: '' // TODO: Resolver servlet → JSP
            })
          }
        })
      }
    } catch {
      console.warn('⚠️  No se encontró web.xml, infiriendo rutas desde archivos')
    }

    return routes
  }

  /**
   * Identifica componentes compartidos (includes comunes)
   */
  private identifySharedComponents(files: ParsedJSP[]): string[] {
    const includeCount = new Map<string, number>()

    files.forEach(file => {
      file.includes.forEach(inc => {
        includeCount.set(inc, (includeCount.get(inc) || 0) + 1)
      })
    })

    // Componente compartido si se usa en 3+ archivos
    return Array.from(includeCount.entries())
      .filter(([_, count]) => count >= 3)
      .map(([inc, _]) => inc)
  }

  /**
   * Extrae dependencias desde POM.xml o lib/
   */
  private async extractDependencies(): Promise<string[]> {
    const dependencies: string[] = []

    try {
      // Intentar leer pom.xml
      const pomPath = path.join(this.projectPath, 'pom.xml')
      const pom = await fs.readFile(pomPath, 'utf-8')

      const depRegex = /<artifactId>([^<]+)<\/artifactId>/g
      let match
      while ((match = depRegex.exec(pom)) !== null) {
        dependencies.push(match[1])
      }
    } catch {
      // Si no hay pom.xml, listar JARs en WEB-INF/lib
      try {
        const libPath = path.join(this.projectPath, 'WEB-INF', 'lib')
        const jars = await fs.readdir(libPath)
        dependencies.push(...jars.filter(f => f.endsWith('.jar')))
      } catch {
        console.warn('⚠️  No se pudieron extraer dependencias')
      }
    }

    return dependencies
  }
}

// Singleton factory
export function createJSPParser(projectPath: string): JSPParser {
  return new JSPParser(projectPath)
}

export type { ParsedJSP, JSPProject, JavaCodeBlock, APICall, FormAction }



