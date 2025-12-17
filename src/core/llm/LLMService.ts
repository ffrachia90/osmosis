/**
 * LLMService - Claude 3.5 Sonnet Integration con Streaming
 * Maneja todas las interacciones con el LLM de manera enterprise
 */

import Anthropic from '@anthropic-ai/sdk';

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string; // Para proxy empresarial
}

export interface StreamOptions {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export class LLMService {
  private client: Anthropic;
  private config: Required<LLMConfig>;
  
  constructor(config: LLMConfig = {}) {
    // Configuración por defecto con soporte para variables de entorno
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      model: config.model || 'claude-3-5-sonnet-20241022',
      maxTokens: config.maxTokens || 8000,
      temperature: config.temperature || 0.7,
      baseURL: config.baseURL || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
    };
    
    if (!this.config.apiKey) {
      throw new Error(
        '❌ ANTHROPIC_API_KEY no configurada.\n' +
        '   Configura: export ANTHROPIC_API_KEY="sk-ant-..."\n' +
        '   O pasa { apiKey: "..." } al constructor'
      );
    }
    
    // Inicializar cliente con soporte para proxy empresarial
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL
    });
  }
  
  /**
   * Genera código con streaming (para UI profesional)
   */
  async generateWithStreaming(
    prompt: string,
    options: StreamOptions = {}
  ): Promise<string> {
    let fullText = '';
    
    try {
      options.onStart?.();
      
      const stream = await this.client.messages.stream({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      // Procesar stream
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 
            chunk.delta.type === 'text_delta') {
          const token = chunk.delta.text;
          fullText += token;
          options.onToken?.(token);
        }
      }
      
      options.onComplete?.(fullText);
      return fullText;
      
    } catch (error) {
      const err = error as Error;
      options.onError?.(err);
      throw new Error(`LLM Error: ${err.message}`);
    }
  }
  
  /**
   * Genera código sin streaming (más rápido para batch)
   */
  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      // Extraer texto de la respuesta
      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }
      
      return textContent.text;
      
    } catch (error) {
      const err = error as Error;
      throw new Error(`LLM Error: ${err.message}`);
    }
  }
  
  /**
   * Repara código basado en errores de CodeSafeGuard
   */
  async repair(
    originalCode: string,
    errors: string[],
    targetFramework: string,
    attempt: number = 1
  ): Promise<string> {
    const repairPrompt = this.buildRepairPrompt(
      originalCode,
      errors,
      targetFramework,
      attempt
    );
    
    // Usar temperatura más baja para reparaciones (más determinista)
    const originalTemp = this.config.temperature;
    this.config.temperature = 0.3;
    
    try {
      const repairedCode = await this.generate(repairPrompt);
      return this.extractCode(repairedCode);
    } finally {
      this.config.temperature = originalTemp;
    }
  }
  
  /**
   * Construye prompt de reparación con contexto de errores
   */
  private buildRepairPrompt(
    code: string,
    errors: string[],
    targetFramework: string,
    attempt: number
  ): string {
    return `# 🔧 CODE REPAIR - Attempt ${attempt}/3

## 📋 Task
Fix the following ${targetFramework} code that has validation errors.

## ❌ Validation Errors Detected
${errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}

## 🐛 Problematic Code
\`\`\`${this.getLanguageFromFramework(targetFramework)}
${code}
\`\`\`

## ✅ Your Task
1. **Fix ALL errors listed above**
2. **Maintain the original functionality**
3. **Keep the same component structure**
4. **Use modern best practices**
5. **Return ONLY the fixed code** (no explanations)

## 🎯 Common Fixes
- Class Components → Functional Components + Hooks
- dangerouslySetInnerHTML → Use DOMPurify
- eval() → Remove or use safe alternatives
- Inline functions → Extract to useCallback
- Missing alt attributes → Add descriptive alt text
- TypeScript errors → Add proper types

## 📝 Output Format
Return ONLY the corrected code wrapped in a code fence:

\`\`\`${this.getLanguageFromFramework(targetFramework)}
// Your fixed code here
\`\`\`

Start now:`;
  }
  
  /**
   * Extrae código de la respuesta del LLM (elimina markdown)
   */
  private extractCode(response: string): string {
    // Buscar código entre ```
    const codeBlockRegex = /```(?:typescript|javascript|tsx|jsx)?\n([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Si no hay code fence, retornar todo (asumiendo que es código)
    return response.trim();
  }
  
  /**
   * Obtiene el lenguaje para code fence basado en framework
   */
  private getLanguageFromFramework(framework: string): string {
    const map: Record<string, string> = {
      'react': 'tsx',
      'angular': 'typescript',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    
    return map[framework.toLowerCase()] || 'typescript';
  }
  
  /**
   * Valida que el servicio esté correctamente configurado
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      });
      
      return response.content.length > 0;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Obtiene información del modelo actual
   */
  getModelInfo(): string {
    return `${this.config.model} (Max Tokens: ${this.config.maxTokens}, Temp: ${this.config.temperature})`;
  }
}

/**
 * Singleton instance para uso global
 */
let globalLLMService: LLMService | null = null;

export function getLLMService(config?: LLMConfig): LLMService {
  if (!globalLLMService) {
    globalLLMService = new LLMService(config);
  }
  return globalLLMService;
}

export function resetLLMService(): void {
  globalLLMService = null;
}


