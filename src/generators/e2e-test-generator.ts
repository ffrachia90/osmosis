/**
 * E2E Test Generator - Genera tests Playwright/Cypress automáticamente
 * Valida que el nuevo código se comporta igual que el legacy
 */

import type { UserFlow, UserAction, StateChange } from '../analyzers/behavior-extractor'
import type { Frame } from '../analyzers/video-analyzer'

interface E2ETest {
  name: string
  description: string
  framework: 'playwright' | 'cypress'
  code: string
  visualRegression: boolean
}

interface TestSuite {
  name: string
  tests: E2ETest[]
  setup?: string
  teardown?: string
}

export class E2ETestGenerator {
  /**
   * Genera suite completa de tests E2E
   */
  async generate(
    flows: UserFlow[],
    actions: UserAction[],
    stateChanges: StateChange[],
    framework: 'playwright' | 'cypress' = 'playwright'
  ): Promise<TestSuite> {
    console.log(`🧪 Generando tests E2E (${framework})...`)

    const tests: E2ETest[] = []

    // 1. Generar tests por flujo
    for (const flow of flows) {
      const test = this.generateFlowTest(flow, framework)
      tests.push(test)
    }

    // 2. Generar tests de regresión visual
    const visualTests = this.generateVisualRegressionTests(stateChanges, framework)
    tests.push(...visualTests)

    // 3. Generar tests de estado
    const stateTests = this.generateStateTests(stateChanges, framework)
    tests.push(...stateTests)

    console.log(`✅ ${tests.length} tests generados`)

    return {
      name: 'Migration E2E Tests',
      tests,
      setup: this.generateSetup(framework),
      teardown: this.generateTeardown(framework)
    }
  }

  /**
   * Genera test para un flujo de usuario
   */
  private generateFlowTest(flow: UserFlow, framework: 'playwright' | 'cypress'): E2ETest {
    if (framework === 'playwright') {
      return this.generatePlaywrightFlowTest(flow)
    } else {
      return this.generateCypressFlowTest(flow)
    }
  }

  /**
   * Genera test Playwright para un flujo
   */
  private generatePlaywrightFlowTest(flow: UserFlow): E2ETest {
    const code = `import { test, expect } from '@playwright/test'

test.describe('${flow.name}', () => {
  test('should replicate legacy behavior', async ({ page }) => {
    // Navegar a la aplicación
    await page.goto('/')
    
    ${flow.steps.map((step, i) => this.generatePlaywrightStep(step, i)).join('\n    ')}
    
    // Validación final
    await expect(page).toHaveScreenshot('${this.slugify(flow.name)}-final.png')
  })
})
`

    return {
      name: `test-${this.slugify(flow.name)}`,
      description: `Test E2E para: ${flow.name}`,
      framework: 'playwright',
      code,
      visualRegression: true
    }
  }

  /**
   * Genera test Cypress para un flujo
   */
  private generateCypressFlowTest(flow: UserFlow): E2ETest {
    const code = `describe('${flow.name}', () => {
  it('should replicate legacy behavior', () => {
    // Navegar a la aplicación
    cy.visit('/')
    
    ${flow.steps.map((step, i) => this.generateCypressStep(step, i)).join('\n    ')}
    
    // Validación final
    cy.matchImageSnapshot('${this.slugify(flow.name)}-final')
  })
})
`

    return {
      name: `test-${this.slugify(flow.name)}`,
      description: `Test E2E para: ${flow.name}`,
      framework: 'cypress',
      code,
      visualRegression: true
    }
  }

  /**
   * Genera paso de Playwright desde descripción
   */
  private generatePlaywrightStep(step: string, index: number): string {
    const stepLower = step.toLowerCase()

    // Detectar tipo de acción y generar código apropiado
    if (stepLower.includes('click') || stepLower.includes('hizo click')) {
      if (stepLower.includes('modal')) {
        return `// ${step}
    await page.getByRole('button', { name: /open|abrir/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()`
      }
      return `// ${step}
    await page.getByRole('button').first().click()`
    }

    if (stepLower.includes('carga') || stepLower.includes('loading')) {
      return `// ${step}
    await expect(page.getByTestId('loading')).toBeVisible()
    await expect(page.getByTestId('loading')).toBeHidden()`
    }

    if (stepLower.includes('datos') || stepLower.includes('contenido')) {
      return `// ${step}
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount({ min: 1 })`
    }

    if (stepLower.includes('navegó') || stepLower.includes('navigation')) {
      return `// ${step}
    await expect(page).toHaveURL(/\\/.*$/)`
    }

    // Genérico
    return `// ${step}
    await page.waitForTimeout(500)`
  }

  /**
   * Genera paso de Cypress desde descripción
   */
  private generateCypressStep(step: string, index: number): string {
    const stepLower = step.toLowerCase()

    if (stepLower.includes('click') || stepLower.includes('hizo click')) {
      if (stepLower.includes('modal')) {
        return `// ${step}
    cy.findByRole('button', { name: /open|abrir/i }).click()
    cy.findByRole('dialog').should('be.visible')`
      }
      return `// ${step}
    cy.findByRole('button').first().click()`
    }

    if (stepLower.includes('carga') || stepLower.includes('loading')) {
      return `// ${step}
    cy.findByTestId('loading').should('be.visible')
    cy.findByTestId('loading').should('not.exist')`
    }

    if (stepLower.includes('datos') || stepLower.includes('contenido')) {
      return `// ${step}
    cy.findByRole('table').should('be.visible')
    cy.findByRole('row').should('have.length.gt', 0)`
    }

    if (stepLower.includes('navegó') || stepLower.includes('navigation')) {
      return `// ${step}
    cy.url().should('match', /\\/.*$/)`
    }

    return `// ${step}
    cy.wait(500)`
  }

  /**
   * Genera tests de regresión visual
   */
  private generateVisualRegressionTests(
    stateChanges: StateChange[],
    framework: 'playwright' | 'cypress'
  ): E2ETest[] {
    const tests: E2ETest[] = []

    // Agrupar cambios por tipo
    const modalChanges = stateChanges.filter(c => c.type === 'modal_open')
    const dataChanges = stateChanges.filter(c => c.type === 'data_loaded')

    if (modalChanges.length > 0) {
      tests.push(this.generateVisualTest('Modal Display', 'modal', framework))
    }

    if (dataChanges.length > 0) {
      tests.push(this.generateVisualTest('Data Loading', 'data-load', framework))
    }

    return tests
  }

  /**
   * Genera test de regresión visual
   */
  private generateVisualTest(
    name: string,
    slug: string,
    framework: 'playwright' | 'cypress'
  ): E2ETest {
    if (framework === 'playwright') {
      const code = `import { test, expect } from '@playwright/test'

test('Visual Regression: ${name}', async ({ page }) => {
  await page.goto('/')
  
  // Esperar a que la página cargue
  await page.waitForLoadState('networkidle')
  
  // Tomar screenshot y comparar con baseline
  await expect(page).toHaveScreenshot('${slug}-baseline.png', {
    maxDiffPixels: 100
  })
})
`

      return {
        name: `visual-${slug}`,
        description: `Regresión visual: ${name}`,
        framework: 'playwright',
        code,
        visualRegression: true
      }
    } else {
      const code = `describe('Visual Regression: ${name}', () => {
  it('should match baseline screenshot', () => {
    cy.visit('/')
    
    // Esperar a que la página cargue
    cy.wait(1000)
    
    // Comparar con baseline
    cy.matchImageSnapshot('${slug}-baseline')
  })
})
`

      return {
        name: `visual-${slug}`,
        description: `Regresión visual: ${name}`,
        framework: 'cypress',
        code,
        visualRegression: true
      }
    }
  }

  /**
   * Genera tests de estados
   */
  private generateStateTests(
    stateChanges: StateChange[],
    framework: 'playwright' | 'cypress'
  ): E2ETest[] {
    const tests: E2ETest[] = []

    // Test de loading states
    const hasLoading = stateChanges.some(c => c.type === 'loading_start')
    if (hasLoading && framework === 'playwright') {
      const code = `import { test, expect } from '@playwright/test'

test('Loading State Behavior', async ({ page }) => {
  await page.goto('/')
  
  // Interceptar request para controlar timing
  await page.route('**/api/**', route => {
    setTimeout(() => route.continue(), 1000)
  })
  
  // Trigger acción que causa loading
  await page.getByRole('button').first().click()
  
  // Verificar loading state aparece
  await expect(page.getByTestId('loading')).toBeVisible()
  
  // Verificar loading state desaparece
  await expect(page.getByTestId('loading')).not.toBeVisible()
  
  // Verificar contenido final
  await expect(page.getByRole('main')).toBeVisible()
})
`

      tests.push({
        name: 'test-loading-state',
        description: 'Valida comportamiento de loading state',
        framework: 'playwright',
        code,
        visualRegression: false
      })
    }

    return tests
  }

  /**
   * Genera setup para tests
   */
  private generateSetup(framework: 'playwright' | 'cypress'): string {
    if (framework === 'playwright') {
      return `import { test as base } from '@playwright/test'

export const test = base.extend({
  // Setup personalizado si es necesario
})
`
    } else {
      return `// Cypress setup en cypress/support/e2e.ts
before(() => {
  // Setup global
})

beforeEach(() => {
  // Setup por test
})
`
    }
  }

  /**
   * Genera teardown para tests
   */
  private generateTeardown(framework: 'playwright' | 'cypress'): string {
    if (framework === 'playwright') {
      return `// Playwright teardown automático`
    } else {
      return `after(() => {
  // Cleanup global
})

afterEach(() => {
  // Cleanup por test
})
`
    }
  }

  /**
   * Convierte string a slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
  }

  /**
   * Genera configuración de Playwright
   */
  generatePlaywrightConfig(): string {
    return `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
`
  }

  /**
   * Genera configuración de Cypress
   */
  generateCypressConfig(): string {
    return `import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      // Plugins aquí
    },
  },
  
  viewportWidth: 1280,
  viewportHeight: 720,
  video: true,
  screenshotOnRunFailure: true,
})
`
  }
}

// Singleton
export const e2eTestGenerator = new E2ETestGenerator()

export type { E2ETest, TestSuite }

