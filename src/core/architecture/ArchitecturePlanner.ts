/**
 * Architecture Planner - Enhanced Version
 * Planificador arquitectónico integral que:
 * 1. Escanea el proyecto profundamente
 * 2. Propone un stack moderno cohesivo
 * 3. Genera reglas de migración específicas
 * 4. Produce configuración actualizada
 */

import { LLMService } from '../llm/LLMService';
import { DeepPatternScanner, DeepPatternAnalysis } from './DeepPatternScanner';
import {
  ArchitectureManifest,
  ProposedStack,
  MigrationRule,
  ManifestManager,
  MigrationRuleSelector,
  DEFAULT_MIGRATION_RULES
} from './ArchitectureManifest';
import { ConfigGenerator } from '../../generators/config-generator';
import fs from 'fs';
import path from 'path';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ArchitectureState {
  currentStack: {
    state: string[];
    routing: string[];
    fetching: string[];
    styling: string[];
    testing: string[];
  };
  proposedStack: {
    state: string;
    routing: string;
    fetching: string;
    styling: string;
  };
  reasoning: string;
  migrationRules: string[];
}

export interface PlanningOptions {
  /** Forzar re-análisis aunque exista manifiesto */
  force?: boolean;
  
  /** Preferencias de stack (opcional, sino el LLM decide) */
  stackPreferences?: Partial<ProposedStack>;
  
  /** Verbose output */
  verbose?: boolean;
}

export interface PlanningResult {
  manifest: ArchitectureManifest;
  isNew: boolean;
  analysisTime: number;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class ArchitecturePlanner {
  private scanner: DeepPatternScanner;
  
  constructor(private llmService: LLMService) {
    this.scanner = new DeepPatternScanner();
  }
  
  // --------------------------------------------------------------------------
  // MAIN PLANNING METHODS
  // --------------------------------------------------------------------------
  
  /**
   * Planifica la arquitectura completa del proyecto
   * Este es el método principal que orquesta todo el análisis
   */
  async planFull(
    projectRoot: string,
    options: PlanningOptions = {}
  ): Promise<PlanningResult> {
    const startTime = Date.now();
    
    // 1. Verificar si existe manifiesto previo
    if (!options.force && ManifestManager.exists(projectRoot)) {
      console.error('📋 Cargando manifiesto existente...');
      const existing = await ManifestManager.load(projectRoot);
      if (existing) {
        return {
          manifest: existing,
          isNew: false,
          analysisTime: Date.now() - startTime
        };
      }
    }
    
    console.error('🏗️  Iniciando planificación arquitectónica integral...\n');
    
    // 2. Escaneo profundo de patrones
    console.error('📊 Fase 1: Escaneo profundo del código fuente...');
    const patternAnalysis = await this.scanner.scan(projectRoot);
    this.printPatternSummary(patternAnalysis);
    
    // 3. Generar propuesta de stack con LLM
    console.error('\n🤖 Fase 2: Consultando Arquitecto AI para propuesta de stack...');
    const proposedStack = await this.generateStackProposal(
      patternAnalysis,
      options.stackPreferences
    );
    this.printProposedStack(proposedStack);
    
    // 4. Seleccionar reglas de migración aplicables
    console.error('\n📝 Fase 3: Seleccionando reglas de migración...');
    const migrationRules = MigrationRuleSelector.selectRules(patternAnalysis, proposedStack);
    console.error(`   ${migrationRules.length} reglas seleccionadas`);
    
    // 5. Generar custom rules con LLM si hay patrones no cubiertos
    const customRules = await this.generateCustomRules(patternAnalysis, proposedStack);
    const allRules = [...migrationRules, ...customRules];
    
    // 6. Generar configuración
    console.error('\n⚙️  Fase 4: Generando configuración moderna...');
    const configUpdates = ConfigGenerator.generate(patternAnalysis, proposedStack, projectRoot);
    console.error(`   ${configUpdates.configFiles.length} archivos de config`);
    console.error(`   ${Object.keys(configUpdates.dependencies).length} dependencias nuevas`);
    console.error(`   ${configUpdates.removePackages.length} paquetes a eliminar`);
    
    // 7. Construir manifiesto
    const projectName = this.getProjectName(projectRoot);
    const manifest: ArchitectureManifest = {
      version: '1.0.0',
      projectName,
      projectRoot,
      analyzedAt: new Date().toISOString(),
      patternAnalysis,
      proposedStack,
      migrationRules: allRules,
      configUpdates,
      metadata: {
        llmModel: this.llmService.getModelInfo(),
        generationTime: Date.now() - startTime,
        confidence: this.calculateConfidence(patternAnalysis, allRules)
      }
    };
    
    // 8. Guardar manifiesto
    await ManifestManager.save(projectRoot, manifest);
    
    return {
      manifest,
      isNew: true,
      analysisTime: Date.now() - startTime
    };
  }
  
  /**
   * Método legacy para compatibilidad
   */
  async plan(projectRoot: string): Promise<ArchitectureState> {
    console.error('🏗️  Analizando arquitectura actual...');
    
    // 1. Leer dependencies del package.json
    const packageJson = this.readPackageJson(projectRoot);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    // 2. Detectar stack actual
    const currentStack = this.detectStack(dependencies);
    
    // 3. Consultar al LLM para definir la mejor estrategia de modernización
    console.error('🤖 Consultando al Arquitecto AI para definir el Stack Moderno...');
    const plan = await this.generateMigrationPlan(currentStack);
    
    return {
      currentStack,
      ...plan
    };
  }
  
  // --------------------------------------------------------------------------
  // STACK PROPOSAL
  // --------------------------------------------------------------------------
  
  private async generateStackProposal(
    analysis: DeepPatternAnalysis,
    preferences?: Partial<ProposedStack>
  ): Promise<ProposedStack> {
    const prompt = `
Eres un Arquitecto de Software Principal experto en React moderno (2024+).
Analiza el siguiente análisis de patrones de un proyecto real y propón el stack moderno más adecuado.

## Análisis del Proyecto

### Estado Actual Detectado
- **State Management Principal:** ${analysis.summary.primaryStateLib}
- **Data Fetching Principal:** ${analysis.summary.primaryFetchLib}
- **Styling Principal:** ${analysis.summary.primaryStyling}
- **Legacy Score:** ${analysis.summary.legacyScore}/100 (más alto = más legacy)

### Patrones Específicos Detectados
- Redux connect(): ${analysis.stateManagement.redux.connect}
- Redux mapStateToProps: ${analysis.stateManagement.redux.mapStateToProps}
- RTK Slices: ${analysis.stateManagement.redux.slices}
- Context Providers: ${analysis.stateManagement.context.providers}
- useEffect+fetch/axios manual: ${analysis.dataFetching.manual.useEffectFetch + analysis.dataFetching.manual.useEffectAxios}
- React Query useQuery: ${analysis.dataFetching.reactQuery.useQuery}
- Router v5 (Switch): ${analysis.routing.legacy.switch}
- Router v6+ (Routes): ${analysis.routing.modern.routes}
- Class Components: ${analysis.components.classComponents}
- Functional Components: ${analysis.components.functionalComponents}
- Inline Styles: ${analysis.styling.inlineStyles.styleObjects}
- Tailwind Usage: ${analysis.styling.tailwind.classes}

### Métricas
- Total archivos: ${analysis.summary.totalFiles}
- Total componentes: ${analysis.summary.totalComponents}

## Tu Tarea

Basándote en este análisis, propón el stack moderno más apropiado. 
Considera:
1. Minimizar fricción de migración (elegir tecnologías similares a las actuales cuando tenga sentido)
2. Priorizar DX (Developer Experience) y mantenibilidad
3. Elegir tecnologías con buen soporte de TypeScript
4. Preferir soluciones probadas en producción

## Tu Salida (JSON Only)

IMPORTANTE: Para state management, SIEMPRE usa "redux-toolkit". No uses Zustand, Jotai ni otras alternativas.
RTK es el estándar empresarial y ofrece: createSlice, createAsyncThunk, RTK Query, DevTools, y compatibilidad con Redux existente.

Responde SOLO con un JSON válido con este formato exacto:
{
  "stateManagement": {
    "library": "redux-toolkit",
    "reasoning": "Explicación breve de por qué elegiste esta librería"
  },
  "dataFetching": {
    "library": "tanstack-query" | "swr" | "rtk-query" | "apollo" | "manual",
    "reasoning": "Explicación breve"
  },
  "routing": {
    "library": "react-router-v7" | "react-router-v6" | "tanstack-router",
    "reasoning": "Explicación breve"
  },
  "styling": {
    "library": "tailwind" | "css-modules" | "styled-components" | "emotion",
    "reasoning": "Explicación breve"
  },
  "forms": {
    "library": "react-hook-form" | "formik" | "native",
    "reasoning": "Explicación breve"
  },
  "testing": {
    "library": "vitest" | "jest",
    "reasoning": "Explicación breve"
  }
}
`;

    const response = await this.llmService.generate(prompt);
    
    try {
      // Limpiar markdown si existe
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      
      // Aplicar preferencias del usuario si existen
      if (preferences) {
        return this.mergeWithPreferences(parsed, preferences);
      }
      
      return parsed;
    } catch (e) {
      console.error('Error parseando propuesta de stack:', response);
      // Retornar defaults sensatos
      return this.getDefaultStack(analysis);
    }
  }
  
  private getDefaultStack(analysis: DeepPatternAnalysis): ProposedStack {
    return {
      stateManagement: {
        library: 'redux-toolkit',
        reasoning: 'Redux Toolkit es el estándar empresarial para state management'
      },
      dataFetching: {
        library: 'tanstack-query',
        reasoning: 'Estándar de la industria para data fetching'
      },
      routing: {
        library: analysis.routing.version === 'v5' ? 'react-router-v6' : 'react-router-v7',
        reasoning: 'Migración incremental de router'
      },
      styling: {
        library: analysis.styling.tailwind.config ? 'tailwind' : 'css-modules',
        reasoning: 'Basado en configuración existente'
      },
      forms: {
        library: 'react-hook-form',
        reasoning: 'Mejor DX y performance'
      },
      testing: {
        library: 'vitest',
        reasoning: 'Más rápido que Jest, compatible con Vite'
      }
    };
  }
  
  private mergeWithPreferences(
    proposed: ProposedStack,
    preferences: Partial<ProposedStack>
  ): ProposedStack {
    return {
      stateManagement: preferences.stateManagement || proposed.stateManagement,
      dataFetching: preferences.dataFetching || proposed.dataFetching,
      routing: preferences.routing || proposed.routing,
      styling: preferences.styling || proposed.styling,
      forms: preferences.forms || proposed.forms,
      testing: preferences.testing || proposed.testing
    };
  }
  
  // --------------------------------------------------------------------------
  // CUSTOM RULES GENERATION
  // --------------------------------------------------------------------------
  
  private async generateCustomRules(
    analysis: DeepPatternAnalysis,
    proposedStack: ProposedStack
  ): Promise<MigrationRule[]> {
    // Detectar patrones no cubiertos por reglas default
    const uncoveredPatterns: string[] = [];
    
    // HOCs personalizados
    if (analysis.components.hocs > 5) {
      uncoveredPatterns.push('High number of HOCs detected');
    }
    
    // Render props
    if (analysis.components.renderProps > 3) {
      uncoveredPatterns.push('Render props pattern detected');
    }
    
    // MobX
    if (analysis.stateManagement.mobx.observables > 0) {
      uncoveredPatterns.push('MobX observables detected');
    }
    
    if (uncoveredPatterns.length === 0) {
      return [];
    }
    
    const prompt = `
Genera reglas de migración personalizadas para estos patrones no estándar detectados:

${uncoveredPatterns.join('\n')}

Stack destino:
- State: ${proposedStack.stateManagement.library}
- Fetching: ${proposedStack.dataFetching.library}
- Routing: ${proposedStack.routing.library}

Responde con un array JSON de reglas con este formato:
[
  {
    "id": "custom-rule-id",
    "category": "state" | "components",
    "name": "Nombre descriptivo",
    "detectPattern": "Patrón a detectar",
    "transformInstruction": "Instrucción detallada para el LLM",
    "priority": 5,
    "example": { "before": "código antes", "after": "código después" },
    "isCritical": false
  }
]
`;

    try {
      const response = await this.llmService.generate(prompt);
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('No se pudieron generar reglas personalizadas');
      return [];
    }
  }
  
  // --------------------------------------------------------------------------
  // LEGACY METHODS (Para compatibilidad)
  // --------------------------------------------------------------------------
  
  private readPackageJson(root: string): Record<string, Record<string, string>> {
    try {
      const content = fs.readFileSync(path.join(root, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('⚠️ No se encontró package.json. Se inferirá stack por código.');
      return { dependencies: {}, devDependencies: {} };
    }
  }
  
  private detectStack(deps: Record<string, string>) {
    const keys = Object.keys(deps);
    return {
      state: keys.filter(d => ['redux', 'mobx', 'recoil', 'zustand', 'jotai', 'xstate'].some(k => d.includes(k))),
      routing: keys.filter(d => ['react-router', 'reach-router', 'wouter'].some(k => d.includes(k))),
      fetching: keys.filter(d => ['axios', 'swr', 'react-query', 'apollo', 'relay'].some(k => d.includes(k))),
      styling: keys.filter(d => ['styled-components', 'emotion', 'sass', 'less', 'tailwindcss', 'bootstrap', 'material-ui', 'antd'].some(k => d.includes(k))),
      testing: keys.filter(d => ['jest', 'mocha', 'chai', 'enzyme', 'cypress', 'playwright', 'vitest'].some(k => d.includes(k)))
    };
  }
  
  private async generateMigrationPlan(currentStack: ReturnType<typeof this.detectStack>): Promise<{
    proposedStack: ArchitectureState['proposedStack'];
    reasoning: string;
    migrationRules: string[];
  }> {
    const prompt = `
Eres un Arquitecto de Software Principal experto en React moderno.
Analiza el siguiente stack tecnológico heredado y propón una arquitectura moderna 2024+.

## Stack Actual Detectado
${JSON.stringify(currentStack, null, 2)}

## Objetivos de Modernización
1. **State:** Preferir Zustand o Redux Toolkit sobre Redux vanilla.
2. **Fetching:** Mover todo fetch/axios manual a TanStack Query v5.
3. **Routing:** Actualizar a React Router v6 (Data APIs) o TanStack Router.
4. **Styling:** Si usan CSS-in-JS legacy, propón Tailwind CSS o Emotion moderno. Si usan CSS/SASS, propón Tailwind.
5. **Testing:** Vitest + React Testing Library.

## Tu Salida (JSON Only)
Responde SOLO con un JSON válido con este formato:
{
  "proposedStack": {
    "state": "nombre de librería",
    "routing": "nombre de librería",
    "fetching": "nombre de librería",
    "styling": "nombre de librería"
  },
  "reasoning": "Breve explicación de por qué elegiste este stack",
  "migrationRules": [
    "Lista de 5-10 reglas técnicas muy específicas para el LLM que hará la migración de código",
    "Ejemplo: Convertir connect(mapStateToProps) a useSelector",
    "Ejemplo: Reemplazar axios.get en useEffect por useQuery"
  ]
}
`;

    const response = await this.llmService.generate(prompt);

    try {
      // Limpiar markdown si existe
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Error parseando plan de arquitectura:', response);
      throw new Error('El LLM no generó un plan válido.');
    }
  }
  
  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------
  
  private getProjectName(projectRoot: string): string {
    try {
      const pkgPath = path.join(projectRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return pkg.name || path.basename(projectRoot);
      }
    } catch (e) {}
    return path.basename(projectRoot);
  }
  
  private calculateConfidence(
    analysis: DeepPatternAnalysis,
    rules: MigrationRule[]
  ): number {
    // Más archivos analizados = más confianza
    const fileFactor = Math.min(analysis.summary.totalFiles / 100, 1) * 30;
    
    // Más reglas aplicables = más cobertura
    const ruleFactor = Math.min(rules.length / 10, 1) * 30;
    
    // Menos legacy = más fácil
    const legacyFactor = (100 - analysis.summary.legacyScore) * 0.4;
    
    return Math.round(fileFactor + ruleFactor + legacyFactor);
  }
  
  private printPatternSummary(analysis: DeepPatternAnalysis): void {
    console.error('\n   📈 RESUMEN DE PATRONES DETECTADOS:');
    console.error('   ─'.repeat(30));
    console.error(`   📁 Total archivos: ${analysis.summary.totalFiles}`);
    console.error(`   🧩 Total componentes: ${analysis.summary.totalComponents}`);
    console.error(`   📊 Legacy Score: ${analysis.summary.legacyScore}/100`);
    console.error(`   🗃️  State Principal: ${analysis.summary.primaryStateLib}`);
    console.error(`   🔄 Fetching Principal: ${analysis.summary.primaryFetchLib}`);
    console.error(`   🎨 Styling Principal: ${analysis.summary.primaryStyling}`);
    
    if (analysis.components.classComponents > 0) {
      console.error(`   ⚠️  Class Components: ${analysis.components.classComponents}`);
    }
    if (analysis.stateManagement.redux.connect > 0) {
      console.error(`   ⚠️  Redux connect(): ${analysis.stateManagement.redux.connect}`);
    }
    if (analysis.routing.legacy.switch > 0) {
      console.error(`   ⚠️  React Router v5 <Switch>: ${analysis.routing.legacy.switch}`);
    }
  }
  
  private printProposedStack(stack: ProposedStack): void {
    console.error('\n   🚀 STACK MODERNO PROPUESTO:');
    console.error('   ─'.repeat(30));
    console.error(`   🗃️  State: ${stack.stateManagement.library}`);
    console.error(`      └─ ${stack.stateManagement.reasoning}`);
    console.error(`   🔄 Fetching: ${stack.dataFetching.library}`);
    console.error(`      └─ ${stack.dataFetching.reasoning}`);
    console.error(`   🧭 Routing: ${stack.routing.library}`);
    console.error(`      └─ ${stack.routing.reasoning}`);
    console.error(`   🎨 Styling: ${stack.styling.library}`);
    console.error(`      └─ ${stack.styling.reasoning}`);
    console.error(`   📝 Forms: ${stack.forms.library}`);
    console.error(`   🧪 Testing: ${stack.testing.library}`);
  }
}
