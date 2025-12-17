/**
 * Prompt Assembler - Enhanced Version
 * Ensambla prompts contextuales para el LLM basados en:
 * - Tecnología origen/destino
 * - Reglas de migración del manifiesto arquitectónico
 * - Contexto RAG del proyecto
 */

import { ArchitectureManifest, MigrationRule } from '../architecture/ArchitectureManifest';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PromptContext {
  clientName: string;
  sourceTech: 'jsp' | 'php' | 'jquery' | 'asp' | 'coldfusion' | 'perl' | 'vb' | 'react-legacy';
  targetTech: 'react' | 'angular' | 'vue' | 'svelte';
  filename: string;
  sourceCode: string;
  fileExt: string;
  
  /** Manifiesto arquitectónico (para refactorización integral) */
  architectureManifest?: ArchitectureManifest;
  
  /** Reglas adicionales específicas del archivo */
  additionalRules?: string[];
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class PromptAssembler {
  /**
   * Ensambla el prompt completo para el LLM
   */
  static assemble(context: PromptContext): string {
    const systemPrompt = this.getSystemPrompt(context);
    const techContext = this.getTechContext(context);
    const codeContext = this.getCodeContext(context);
    
    // Obtener reglas de migración
    const migrationRules = context.architectureManifest
      ? this.getMigrationRulesSection(context.architectureManifest)
      : this.getDefaultMigrationRules(context);
    
    // Stack propuesto (si hay manifiesto)
    const stackSection = context.architectureManifest
      ? this.getProposedStackSection(context.architectureManifest)
      : '';

    return `${systemPrompt}

${techContext}

${stackSection}

${migrationRules}

${codeContext}

## Tu Tarea

Refactoriza/Migra el siguiente código ${context.sourceTech} a ${context.targetTech} siguiendo:
1. Las reglas de migración especificadas arriba
2. El stack propuesto del proyecto
3. Las mejores prácticas modernas de ${context.targetTech}

\`\`\`${context.fileExt}
${context.sourceCode}
\`\`\`

## Requisitos Críticos:

1.  **TypeScript Estricto**: Convierte PropTypes a Interfaces/Types. NO uses 'any'.
2.  **Componentes Funcionales**: Convierte TODOS los Class Components a Functional Components.
3.  **Hooks**: Reemplaza lifecycle methods con useEffect. Reemplaza setState con useState/useReducer.
4.  **Aplica TODAS las reglas de migración** listadas arriba de forma consistente.
5.  **Mantén la funcionalidad**: El código resultante debe hacer exactamente lo mismo que el original.
6.  **Imports modernos**: Usa imports del stack propuesto (ej: @tanstack/react-query, zustand, etc.)

## Output esperado:

\`\`\`typescript
// Código refactorizado aquí
\`\`\``;
  }

  /**
   * Ensambla prompt específico para refactorización arquitectónica integral
   */
  static assembleIntegral(
    context: PromptContext,
    manifest: ArchitectureManifest
  ): string {
    const basePrompt = this.assemble({
      ...context,
      architectureManifest: manifest
    });
    
    // Agregar sección de consistencia global
    const consistencySection = this.getConsistencySection(manifest);
    
    return `${basePrompt}

${consistencySection}`;
  }

  // --------------------------------------------------------------------------
  // SYSTEM PROMPT
  // --------------------------------------------------------------------------

  private static getSystemPrompt(context: PromptContext): string {
    const isIntegral = !!context.architectureManifest;
    
    return `# Osmosis Modernization Agent${isIntegral ? ' - Architectural Refactoring Mode' : ''}

Eres un Arquitecto de Software Principal especializado en modernización de React.
Cliente: ${context.clientName}
Misión: transformar ${context.sourceTech.toUpperCase()} → ${context.targetTech.toUpperCase()} (Modern Architecture)
${isIntegral ? `
🏗️ MODO ARQUITECTÓNICO INTEGRAL ACTIVADO
Proyecto: ${context.architectureManifest!.projectName}
Stack Propuesto: Ya definido en el manifiesto (ver abajo)

IMPORTANTE: Debes seguir ESTRICTAMENTE las reglas de migración y el stack propuesto
para mantener consistencia en todo el proyecto.
` : ''}`;
  }

  // --------------------------------------------------------------------------
  // TECH CONTEXT
  // --------------------------------------------------------------------------

  private static getTechContext(context: PromptContext): string {
    const sourceContext = this.getSourceTechContext(context.sourceTech);
    const targetContext = this.getTargetTechContext(context.targetTech);

    return `## Contexto de Tecnologías

### Origen: ${context.sourceTech.toUpperCase()}
${sourceContext}

### Destino: ${context.targetTech.toUpperCase()}
${targetContext}`;
  }

  private static getSourceTechContext(tech: PromptContext['sourceTech']): string {
    const contexts: Record<string, string> = {
      jsp: '- Lógica mezclada con presentación\n- Scriptlets (<% ... %>)\n- JSTL tags\n- Session management manual',
      php: '- Código procedural\n- echo/print para output\n- $_GET/$_POST para input\n- include/require para modularización',
      jquery: '- Manipulación directa del DOM\n- Event handlers con .on()\n- AJAX con $.ajax()\n- Animaciones imperativas',
      asp: '- VBScript o JScript\n- Response.Write para output\n- Session/Application state\n- ADO para DB',
      coldfusion: '- Tags CFML\n- cfquery para DB\n- cfoutput para presentación',
      perl: '- CGI scripts\n- print statements\n- HTML embebido en strings',
      vb: '- Forms con controles visuales\n- Event-driven architecture\n- COM components',
      'react-legacy': `- Class Components (extends React.Component)
- Lifecycle Methods (componentDidMount, componentWillReceiveProps, etc.)
- this.state / this.setState
- createRef() antiguo
- Higher Order Components (HOCs) y Render Props excesivos
- Mixins (si es muy antiguo)
- Redux connect() / mapStateToProps / mapDispatchToProps
- useEffect + axios/fetch manual para data fetching
- React Router v5 (Switch, Route component=)`
    };

    return contexts[tech] || '- Código legacy genérico';
  }

  private static getTargetTechContext(tech: PromptContext['targetTech']): string {
    const contexts = {
      react: `- Functional Components + Hooks ONLY
- TypeScript strict mode
- State management: Según stack propuesto (Zustand/RTK/Jotai)
- Data fetching: TanStack Query o según stack propuesto
- Side effects: useEffect con cleanup
- Performance: useMemo, useCallback
- Routing: React Router v6+ con hooks
- Testing: React Testing Library + Vitest`,

      angular: `- Standalone Components (no NgModule)
- Signals para reactividad
- OnPush Change Detection
- Services para lógica
- RxJS con async pipe
- Testing: Jasmine + Karma`,

      vue: `- Composition API + <script setup>
- TypeScript
- Reactive primitives: ref, computed
- Lifecycle: onMounted, onUnmounted
- Pinia para state
- Testing: Vitest + Vue Test Utils`,

      svelte: `- Single File Components
- TypeScript
- Reactive declarations: $:
- Stores para state compartido
- Testing: Vitest + Testing Library`
    };

    return contexts[tech] || '- Framework moderno genérico';
  }

  // --------------------------------------------------------------------------
  // MIGRATION RULES
  // --------------------------------------------------------------------------

  private static getMigrationRulesSection(manifest: ArchitectureManifest): string {
    const rules = manifest.migrationRules;
    
    if (!rules || rules.length === 0) {
      return this.getDefaultMigrationRules({ sourceTech: 'react-legacy', targetTech: 'react' } as PromptContext);
    }
    
    let section = `## 📋 REGLAS DE MIGRACIÓN DEL PROYECTO

Las siguientes reglas son OBLIGATORIAS y deben aplicarse consistentemente:

`;
    
    // Agrupar por categoría
    const byCategory = this.groupRulesByCategory(rules);
    
    for (const [category, categoryRules] of Object.entries(byCategory)) {
      section += `### ${this.getCategoryTitle(category)}\n\n`;
      
      for (const rule of categoryRules) {
        section += `**${rule.name}** ${rule.isCritical ? '🔴 CRÍTICA' : ''}\n`;
        section += `- Detectar: \`${rule.detectPattern}\`\n`;
        section += `- Transformar: ${rule.transformInstruction.trim().split('\n').slice(0, 3).join(' ')}\n`;
        
        if (rule.example) {
          section += `- Ejemplo:\n`;
          section += `  \`\`\`typescript\n  // ANTES:\n  ${rule.example.before.trim().split('\n').slice(0, 3).join('\n  ')}\n  \n  // DESPUÉS:\n  ${rule.example.after.trim().split('\n').slice(0, 3).join('\n  ')}\n  \`\`\`\n`;
        }
        section += '\n';
      }
    }
    
    return section;
  }

  private static getDefaultMigrationRules(context: PromptContext): string {
    return `## 📋 REGLAS DE MIGRACIÓN ESTÁNDAR

### State Management
- **connect() → Hooks**: Reemplazar \`connect(mapStateToProps)\` por \`useSelector\` + \`useDispatch\`
- **this.state → useState**: Convertir estado de clase a hooks

### Data Fetching
- **useEffect+fetch → useQuery**: Centralizar fetching en TanStack Query
- **Manejo de loading/error**: Usar estados de useQuery en lugar de useState manual

### Routing
- **Switch → Routes**: Actualizar de React Router v5 a v6
- **withRouter → hooks**: Usar \`useNavigate\`, \`useParams\`, \`useLocation\`

### Components
- **Class → Function**: Convertir todos los class components
- **Lifecycle → useEffect**: componentDidMount, etc. a useEffect

### TypeScript
- **PropTypes → Interface**: Definir tipos estrictos
- **No any**: Usar tipos específicos siempre`;
  }

  private static groupRulesByCategory(rules: MigrationRule[]): Record<string, MigrationRule[]> {
    return rules.reduce((acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = [];
      }
      acc[rule.category].push(rule);
      return acc;
    }, {} as Record<string, MigrationRule[]>);
  }

  private static getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      state: '🗃️ State Management',
      fetching: '🔄 Data Fetching',
      routing: '🧭 Routing',
      styling: '🎨 Styling',
      components: '🧩 Components',
      typescript: '📘 TypeScript',
      security: '🔒 Security'
    };
    return titles[category] || category.toUpperCase();
  }

  // --------------------------------------------------------------------------
  // PROPOSED STACK
  // --------------------------------------------------------------------------

  private static getProposedStackSection(manifest: ArchitectureManifest): string {
    const stack = manifest.proposedStack;
    
    return `## 🚀 STACK PROPUESTO DEL PROYECTO

IMPORTANTE: Usa ESTAS librerías específicas, no otras alternativas.

| Categoría | Librería | Imports |
|-----------|----------|---------|
| State | **${stack.stateManagement.library}** | ${this.getStackImports(stack.stateManagement.library)} |
| Fetching | **${stack.dataFetching.library}** | ${this.getStackImports(stack.dataFetching.library)} |
| Routing | **${stack.routing.library}** | ${this.getStackImports(stack.routing.library)} |
| Styling | **${stack.styling.library}** | ${this.getStackImports(stack.styling.library)} |
| Forms | **${stack.forms.library}** | ${this.getStackImports(stack.forms.library)} |
`;
  }

  private static getStackImports(library: string): string {
    const imports: Record<string, string> = {
      'zustand': "`import { create } from 'zustand'`",
      'redux-toolkit': "`import { configureStore, createSlice } from '@reduxjs/toolkit'`",
      'jotai': "`import { atom, useAtom } from 'jotai'`",
      'tanstack-query': "`import { useQuery, useMutation } from '@tanstack/react-query'`",
      'swr': "`import useSWR from 'swr'`",
      'rtk-query': "`import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'`",
      'react-router-v7': "`import { createBrowserRouter, RouterProvider } from 'react-router'`",
      'react-router-v6': "`import { Routes, Route, useNavigate } from 'react-router-dom'`",
      'tailwind': "`className=\"...\"` con utility classes",
      'css-modules': "`import styles from './X.module.css'`",
      'styled-components': "`import styled from 'styled-components'`",
      'emotion': "`import styled from '@emotion/styled'`",
      'react-hook-form': "`import { useForm } from 'react-hook-form'`",
      'formik': "`import { useFormik } from 'formik'`",
      'native': "Forms nativos con useState",
      'none': "Sin librería de state",
      'manual': "fetch/axios directo"
    };
    
    return imports[library] || library;
  }

  // --------------------------------------------------------------------------
  // CONSISTENCY SECTION
  // --------------------------------------------------------------------------

  private static getConsistencySection(manifest: ArchitectureManifest): string {
    return `
## ⚠️ CONSISTENCIA GLOBAL

Este archivo es parte de una refactorización arquitectónica de todo el proyecto.
Para mantener consistencia:

1. **Nombrado de hooks**: Sigue el patrón \`use[Feature][Action]\`
   - Ejemplo: \`useUserData\`, \`useAuthLogin\`

2. **Estructura de queries**: 
   - queryKey: ['resource', id, filters]
   - queryFn: función async separada

3. **Manejo de errores**: 
   - Usa Error Boundaries para errores de render
   - Usa onError en mutations para errores de API

4. **Tipado consistente**:
   - Interfaces en PascalCase
   - Props interfaces: \`ComponentNameProps\`
   - API responses: \`APIResourceResponse\`

5. **Imports**:
   - Usa path aliases: \`@/components\`, \`@/hooks\`, \`@/lib\`
   - Agrupa imports: react → third-party → local
`;
  }

  // --------------------------------------------------------------------------
  // CODE CONTEXT
  // --------------------------------------------------------------------------

  private static getCodeContext(context: PromptContext): string {
    return `## Archivo: ${context.filename}

Extensión: .${context.fileExt}
Líneas: ${context.sourceCode.split('\n').length}`;
  }
}
