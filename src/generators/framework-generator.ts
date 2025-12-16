/**
 * Framework-Agnostic Code Generator
 * Genera React, Angular, Vue o lo que el cliente necesite
 * ESTO ES CLAVE PARA VENDER A MÚLTIPLES CLIENTES
 */

import type { ParsedJSP } from '../parsers/jsp-parser'

type TargetFramework = 'react' | 'angular' | 'vue' | 'svelte' | 'nextjs' | 'nuxt'
type StateManagement = 'zustand' | 'redux' | 'mobx' | 'rxjs' | 'pinia' | 'context'
type StyleSystem = 'tailwind' | 'styled-components' | 'css-modules' | 'scss' | 'mui' | 'bootstrap'

interface GenerationConfig {
  framework: TargetFramework
  typescript: boolean
  stateManagement?: StateManagement
  styleSystem?: StyleSystem
  testFramework?: 'jest' | 'vitest' | 'jasmine' | 'karma'
  routingLibrary?: string
  designSystem?: {
    name: string
    componentsPath: string
  }
}

interface GeneratedCode {
  framework: TargetFramework
  files: GeneratedFile[]
  dependencies: PackageDependency[]
  structure: ProjectStructure
  tests: GeneratedFile[]
  documentation: string
}

interface GeneratedFile {
  path: string
  content: string
  type: 'component' | 'service' | 'hook' | 'style' | 'config' | 'test'
}

interface PackageDependency {
  name: string
  version: string
  devDependency: boolean
}

interface ProjectStructure {
  directories: string[]
  configFiles: string[]
  entryPoint: string
}

export class FrameworkGenerator {
  /**
   * Genera código para el framework especificado
   */
  async generate(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): Promise<GeneratedCode> {
    console.log(`🔨 Generando código para ${config.framework}...`)

    switch (config.framework) {
      case 'react':
      case 'nextjs':
        return await this.generateReact(legacyCode, config, ragContext)
      
      case 'angular':
        return await this.generateAngular(legacyCode, config, ragContext)
      
      case 'vue':
      case 'nuxt':
        return await this.generateVue(legacyCode, config, ragContext)
      
      case 'svelte':
        return await this.generateSvelte(legacyCode, config, ragContext)
      
      default:
        throw new Error(`Framework ${config.framework} no soportado`)
    }
  }

  /**
   * Genera código React/Next.js
   */
  private async generateReact(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): Promise<GeneratedCode> {
    const isNextJs = config.framework === 'nextjs'
    const files: GeneratedFile[] = []

    // 1. Generar componente principal
    const componentCode = this.generateReactComponent(legacyCode, config, ragContext)
    files.push({
      path: isNextJs ? 'app/page.tsx' : 'src/components/Page.tsx',
      content: componentCode,
      type: 'component'
    })

    // 2. Generar hooks personalizados
    if (legacyCode.apiCalls.length > 0) {
      const hooksCode = this.generateReactHooks(legacyCode, config)
      files.push({
        path: 'src/hooks/usePageData.ts',
        content: hooksCode,
        type: 'hook'
      })
    }

    // 3. Generar servicios API
    const apiCode = this.generateReactAPI(legacyCode, config)
    files.push({
      path: 'src/services/api.ts',
      content: apiCode,
      type: 'service'
    })

    // 4. Generar estilos
    const styleCode = this.generateStyles(legacyCode, config)
    files.push({
      path: config.styleSystem === 'tailwind' ? 'src/styles.css' : 'src/Page.module.css',
      content: styleCode,
      type: 'style'
    })

    // 5. Generar tests
    const testCode = this.generateReactTests(legacyCode, config)
    files.push({
      path: 'src/__tests__/Page.test.tsx',
      content: testCode,
      type: 'test'
    })

    return {
      framework: config.framework,
      files,
      dependencies: this.getReactDependencies(config),
      structure: this.getReactStructure(isNextJs),
      tests: files.filter(f => f.type === 'test'),
      documentation: this.generateDocumentation(config.framework, legacyCode)
    }
  }

  /**
   * Genera código Angular
   */
  private async generateAngular(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): Promise<GeneratedCode> {
    const files: GeneratedFile[] = []

    // 1. Componente Angular
    const componentCode = this.generateAngularComponent(legacyCode, config, ragContext)
    files.push({
      path: 'src/app/page/page.component.ts',
      content: componentCode,
      type: 'component'
    })

    // 2. Template HTML
    const templateCode = this.generateAngularTemplate(legacyCode, config)
    files.push({
      path: 'src/app/page/page.component.html',
      content: templateCode,
      type: 'component'
    })

    // 3. Servicio
    const serviceCode = this.generateAngularService(legacyCode, config)
    files.push({
      path: 'src/app/services/page.service.ts',
      content: serviceCode,
      type: 'service'
    })

    // 4. Estilos
    const styleCode = this.generateStyles(legacyCode, config)
    files.push({
      path: 'src/app/page/page.component.scss',
      content: styleCode,
      type: 'style'
    })

    // 5. Tests
    const testCode = this.generateAngularTests(legacyCode, config)
    files.push({
      path: 'src/app/page/page.component.spec.ts',
      content: testCode,
      type: 'test'
    })

    return {
      framework: 'angular',
      files,
      dependencies: this.getAngularDependencies(config),
      structure: this.getAngularStructure(),
      tests: files.filter(f => f.type === 'test'),
      documentation: this.generateDocumentation('angular', legacyCode)
    }
  }

  /**
   * Genera código Vue/Nuxt
   */
  private async generateVue(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): Promise<GeneratedCode> {
    const isNuxt = config.framework === 'nuxt'
    const files: GeneratedFile[] = []

    // 1. Componente Vue
    const componentCode = this.generateVueComponent(legacyCode, config, ragContext)
    files.push({
      path: isNuxt ? 'pages/index.vue' : 'src/components/Page.vue',
      content: componentCode,
      type: 'component'
    })

    // 2. Composables
    if (legacyCode.apiCalls.length > 0) {
      const composableCode = this.generateVueComposables(legacyCode, config)
      files.push({
        path: 'composables/usePageData.ts',
        content: composableCode,
        type: 'hook'
      })
    }

    // 3. Tests
    const testCode = this.generateVueTests(legacyCode, config)
    files.push({
      path: 'src/__tests__/Page.spec.ts',
      content: testCode,
      type: 'test'
    })

    return {
      framework: config.framework,
      files,
      dependencies: this.getVueDependencies(config),
      structure: this.getVueStructure(isNuxt),
      tests: files.filter(f => f.type === 'test'),
      documentation: this.generateDocumentation(config.framework, legacyCode)
    }
  }

  /**
   * Genera componente React
   */
  private generateReactComponent(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): string {
    const ts = config.typescript
    const ext = ts ? 'tsx' : 'jsx'

    return `${ts ? `import { useState, useEffect } from 'react'\n` : ''}
${legacyCode.apiCalls.length > 0 ? `import { usePageData } from '../hooks/usePageData'\n` : ''}
${config.styleSystem === 'tailwind' ? '' : `import styles from './Page.module.css'\n`}

${ts ? 'interface PageProps {}\n\n' : ''}
export ${config.framework === 'nextjs' ? 'default ' : ''}function Page(${ts ? 'props: PageProps' : ''}) {
  ${legacyCode.apiCalls.length > 0 ? `const { data, loading, error } = usePageData()\n` : ''}
  
  ${legacyCode.variables.length > 0 ? legacyCode.variables.map(v => 
    `const [${v.name}, set${v.name.charAt(0).toUpperCase() + v.name.slice(1)}] = useState${ts ? '<any>' : ''}(null)`
  ).join('\n  ') : ''}

  return (
    <div ${config.styleSystem === 'tailwind' ? 'className="container mx-auto p-4"' : `className={styles.container}`}>
      <h1 ${config.styleSystem === 'tailwind' ? 'className="text-2xl font-bold"' : `className={styles.title}`}>
        ${legacyCode.route || 'Page'}
      </h1>
      
      ${legacyCode.formActions.length > 0 ? `
      <form onSubmit={handleSubmit} ${config.styleSystem === 'tailwind' ? 'className="space-y-4"' : `className={styles.form}`}>
        ${legacyCode.formActions[0].fields.map(field => `
        <div>
          <label htmlFor="${field.name}">${field.name}</label>
          <input
            id="${field.name}"
            type="${field.type}"
            name="${field.name}"
            ${field.required ? 'required' : ''}
          />
        </div>`).join('\n        ')}
        <button type="submit">Submit</button>
      </form>` : ''}
      
      ${legacyCode.apiCalls.length > 0 ? `
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}` : ''}
    </div>
  )
}
`
  }

  /**
   * Genera componente Angular
   */
  private generateAngularComponent(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): string {
    return `import { Component, OnInit } from '@angular/core'
import { PageService } from '../../services/page.service'

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent implements OnInit {
  ${legacyCode.variables.map(v => `${v.name}: any = null`).join('\n  ')}
  loading = false
  error: any = null

  constructor(private pageService: PageService) {}

  ngOnInit(): void {
    ${legacyCode.apiCalls.length > 0 ? 'this.loadData()' : ''}
  }

  ${legacyCode.apiCalls.length > 0 ? `
  loadData(): void {
    this.loading = true
    this.pageService.getData().subscribe({
      next: (data) => {
        this.data = data
        this.loading = false
      },
      error: (error) => {
        this.error = error
        this.loading = false
      }
    })
  }` : ''}

  ${legacyCode.formActions.length > 0 ? `
  onSubmit(form: any): void {
    if (form.valid) {
      this.pageService.submitForm(form.value).subscribe({
        next: () => console.log('Success'),
        error: (error) => console.error('Error', error)
      })
    }
  }` : ''}
}
`
  }

  /**
   * Genera componente Vue (Composition API)
   */
  private generateVueComponent(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): string {
    const ts = config.typescript

    return `<script ${ts ? 'setup lang="ts"' : 'setup'}>
import { ref, onMounted } from 'vue'
${legacyCode.apiCalls.length > 0 ? `import { usePageData } from '../composables/usePageData'\n` : ''}

${legacyCode.apiCalls.length > 0 ? `const { data, loading, error, fetchData } = usePageData()\n` : ''}
${legacyCode.variables.map(v => `const ${v.name} = ref(null)`).join('\n')}

onMounted(() => {
  ${legacyCode.apiCalls.length > 0 ? 'fetchData()' : ''}
})

${legacyCode.formActions.length > 0 ? `
const handleSubmit = async (event${ts ? ': Event' : ''}) => {
  event.preventDefault()
  // Handle form submission
}` : ''}
</script>

<template>
  <div class="${config.styleSystem === 'tailwind' ? 'container mx-auto p-4' : 'container'}">
    <h1 class="${config.styleSystem === 'tailwind' ? 'text-2xl font-bold' : 'title'}">
      ${legacyCode.route || 'Page'}
    </h1>
    
    ${legacyCode.apiCalls.length > 0 ? `
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <pre v-else>{{ data }}</pre>` : ''}
    
    ${legacyCode.formActions.length > 0 ? `
    <form @submit="handleSubmit">
      ${legacyCode.formActions[0].fields.map(field => `
      <div>
        <label for="${field.name}">${field.name}</label>
        <input
          id="${field.name}"
          v-model="${field.name}"
          type="${field.type}"
          ${field.required ? 'required' : ''}
        />
      </div>`).join('\n      ')}
      <button type="submit">Submit</button>
    </form>` : ''}
  </div>
</template>

<style scoped>
/* Component styles */
</style>
`
  }

  // ... Más métodos de generación para cada framework ...

  private generateReactHooks(legacyCode: ParsedJSP, config: GenerationConfig): string {
    return `import { useState, useEffect } from 'react'
import { fetchData } from '../services/api'

export function usePageData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const result = await fetchData()
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return { data, loading, error }
}
`
  }

  private generateReactAPI(legacyCode: ParsedJSP, config: GenerationConfig): string {
    const apiCall = legacyCode.apiCalls[0]
    
    return `${config.typescript ? `
interface ApiResponse {
  // Define response type
}
` : ''}
export async function fetchData()${config.typescript ? ': Promise<ApiResponse>' : ''} {
  const response = await fetch('${apiCall?.url || '/api/data'}')
  if (!response.ok) throw new Error('Failed to fetch')
  return response.json()
}
`
  }

  private generateStyles(legacyCode: ParsedJSP, config: GenerationConfig): string {
    if (config.styleSystem === 'tailwind') {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;
`
    }

    return `.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}
`
  }

  private generateReactTests(legacyCode: ParsedJSP, config: GenerationConfig): string {
    return `import { render, screen } from '@testing-library/react'
import Page from '../Page'

describe('Page', () => {
  it('renders without crashing', () => {
    render(<Page />)
    expect(screen.getByText(/Page/i)).toBeInTheDocument()
  })
})
`
  }

  private generateAngularTemplate(legacyCode: ParsedJSP, config: GenerationConfig): string {
    return `<div class="container">
  <h1>${legacyCode.route || 'Page'}</h1>
  
  <div *ngIf="loading">Loading...</div>
  <div *ngIf="error">Error: {{ error }}</div>
  <pre *ngIf="!loading && !error">{{ data | json }}</pre>
</div>
`
  }

  private generateAngularService(legacyCode: ParsedJSP, config: GenerationConfig): string {
    return `import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class PageService {
  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    return this.http.get('/api/data')
  }
}
`
  }

  private generateAngularTests(legacyCode: ParsedJSP, config: GenerationConfig): string {
    return `import { ComponentFixture, TestBed } from '@angular/core/testing'
import { PageComponent } from './page.component'

describe('PageComponent', () => {
  let component: PageComponent
  let fixture: ComponentFixture<PageComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageComponent ]
    }).compileComponents()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
`
  }

  private generateVueComposables(legacyCode: ParsedJSP, config: GenerationConfig): string {
    return `import { ref } from 'vue'

export function usePageData() {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchData = async () => {
    loading.value = true
    try {
      const response = await fetch('/api/data')
      data.value = await response.json()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchData }
}
`
  }

  private generateVueTests(legacyCode: ParsedJSP, config: GenerationConfig): string {
    return `import { mount } from '@vue/test-utils'
import Page from '../Page.vue'

describe('Page', () => {
  it('renders properly', () => {
    const wrapper = mount(Page)
    expect(wrapper.text()).toContain('Page')
  })
})
`
  }

  private generateSvelte(
    legacyCode: ParsedJSP,
    config: GenerationConfig,
    ragContext: any
  ): Promise<GeneratedCode> {
    // TODO: Implementar Svelte generator
    throw new Error('Svelte generator coming soon')
  }

  private getReactDependencies(config: GenerationConfig): PackageDependency[] {
    const deps: PackageDependency[] = [
      { name: 'react', version: '^18.2.0', devDependency: false },
      { name: 'react-dom', version: '^18.2.0', devDependency: false }
    ]

    if (config.framework === 'nextjs') {
      deps.push({ name: 'next', version: '^14.0.0', devDependency: false })
    }

    if (config.styleSystem === 'tailwind') {
      deps.push({ name: 'tailwindcss', version: '^3.4.0', devDependency: true })
    }

    return deps
  }

  private getAngularDependencies(config: GenerationConfig): PackageDependency[] {
    return [
      { name: '@angular/core', version: '^17.0.0', devDependency: false },
      { name: '@angular/common', version: '^17.0.0', devDependency: false },
      { name: '@angular/platform-browser', version: '^17.0.0', devDependency: false }
    ]
  }

  private getVueDependencies(config: GenerationConfig): PackageDependency[] {
    const deps: PackageDependency[] = [
      { name: 'vue', version: '^3.3.0', devDependency: false }
    ]

    if (config.framework === 'nuxt') {
      deps.push({ name: 'nuxt', version: '^3.8.0', devDependency: false })
    }

    return deps
  }

  private getReactStructure(isNextJs: boolean): ProjectStructure {
    return {
      directories: isNextJs 
        ? ['app', 'components', 'lib', 'public']
        : ['src', 'src/components', 'src/hooks', 'src/services', 'public'],
      configFiles: isNextJs
        ? ['next.config.js', 'tsconfig.json', 'package.json']
        : ['vite.config.ts', 'tsconfig.json', 'package.json'],
      entryPoint: isNextJs ? 'app/page.tsx' : 'src/main.tsx'
    }
  }

  private getAngularStructure(): ProjectStructure {
    return {
      directories: ['src/app', 'src/app/components', 'src/app/services', 'src/assets'],
      configFiles: ['angular.json', 'tsconfig.json', 'package.json'],
      entryPoint: 'src/main.ts'
    }
  }

  private getVueStructure(isNuxt: boolean): ProjectStructure {
    return {
      directories: isNuxt
        ? ['pages', 'components', 'composables', 'public']
        : ['src', 'src/components', 'src/composables', 'public'],
      configFiles: isNuxt
        ? ['nuxt.config.ts', 'tsconfig.json', 'package.json']
        : ['vite.config.ts', 'tsconfig.json', 'package.json'],
      entryPoint: isNuxt ? 'app.vue' : 'src/main.ts'
    }
  }

  private generateDocumentation(framework: TargetFramework, legacyCode: ParsedJSP): string {
    return `# Generated ${framework} Application

## Source
Migrated from: ${legacyCode.filePath}

## Components Generated
- Main page component
- ${legacyCode.apiCalls.length} API service(s)
- ${legacyCode.formActions.length} form(s)
- Tests included

## Setup
\`\`\`bash
npm install
npm run dev
\`\`\`
`
  }
}

// Singleton
export const frameworkGenerator = new FrameworkGenerator()

export type { TargetFramework, GenerationConfig, GeneratedCode, GeneratedFile }


