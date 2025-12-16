/**
 * Prompt Assembler
 * Ensambla prompts contextuales para el LLM basados en la tecnología origen/destino
 */

export interface PromptContext {
  clientName: string;
  sourceTech: 'jsp' | 'php' | 'jquery' | 'asp' | 'coldfusion' | 'perl' | 'vb';
  targetTech: 'react' | 'angular' | 'vue' | 'svelte';
  filename: string;
  sourceCode: string;
  fileExt: string;
}

export class PromptAssembler {
  /**
   * Ensambla el prompt completo para el LLM
   */
  static assemble(context: PromptContext): string {
    const systemPrompt = this.getSystemPrompt(context);
    const techContext = this.getTechContext(context);
    const codeContext = this.getCodeContext(context);
    
    return `${systemPrompt}

${techContext}

${codeContext}

## Tu Tarea

Migra el siguiente código ${context.sourceTech} a ${context.targetTech} siguiendo las mejores prácticas modernas:

\`\`\`${context.fileExt}
${context.sourceCode}
\`\`\`

## Requisitos:

1. **Seguridad**: Sanitiza todo input del usuario
2. **TypeScript**: Usa tipos estrictos, NO uses 'any'
3. **Modernidad**: Functional Components + Hooks (React), Signals (Angular), Composition API (Vue)
4. **Performance**: Memoization inteligente
5. **Accesibilidad**: WCAG 2.1 AA compliance
6. **Testing**: Genera tests unitarios + E2E

## Output esperado:

\`\`\`typescript
// Código migrado aquí
\`\`\``;
  }

  private static getSystemPrompt(context: PromptContext): string {
    return `# Osmosis Migration Agent

Eres un experto en migración de código legacy a arquitecturas modernas.
Cliente: ${context.clientName}
Misión: Migrar ${context.sourceTech.toUpperCase()} → ${context.targetTech.toUpperCase()}`;
  }

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
    const contexts = {
      jsp: '- Lógica mezclada con presentación\n- Scriptlets (<% ... %>)\n- JSTL tags\n- Session management manual',
      php: '- Código procedural\n- echo/print para output\n- $_GET/$_POST para input\n- include/require para modularización',
      jquery: '- Manipulación directa del DOM\n- Event handlers con .on()\n- AJAX con $.ajax()\n- Animaciones imperativas',
      asp: '- VBScript o JScript\n- Response.Write para output\n- Session/Application state\n- ADO para DB',
      coldfusion: '- Tags CFML\n- cfquery para DB\n- cfoutput para presentación',
      perl: '- CGI scripts\n- print statements\n- HTML embebido en strings',
      vb: '- Forms con controles visuales\n- Event-driven architecture\n- COM components'
    };
    
    return contexts[tech] || '- Código legacy genérico';
  }

  private static getTargetTechContext(tech: PromptContext['targetTech']): string {
    const contexts = {
      react: `- Functional Components + Hooks
- TypeScript strict mode
- State management: useState, useReducer, o Zustand
- Side effects: useEffect con cleanup
- Performance: useMemo, useCallback
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

  private static getCodeContext(context: PromptContext): string {
    return `## Archivo: ${context.filename}

Extensión: .${context.fileExt}
Líneas: ${context.sourceCode.split('\n').length}`;
  }
}
