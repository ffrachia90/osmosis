# 🤖 Integración con Claude 3.5 Sonnet

## **Descripción General**

Osmosis utiliza **Claude 3.5 Sonnet** de Anthropic como motor de generación de código. El sistema está diseñado para ser enterprise-grade con soporte para proxies corporativos, streaming, y auto-reparación inteligente.

---

## **🔧 Configuración**

### **Opción 1: API Key Directa**

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### **Opción 2: Proxy Empresarial**

Para empresas que usan proxy intermedio (por seguridad):

```bash
export ANTHROPIC_API_KEY="tu-key-empresarial"
export ANTHROPIC_BASE_URL="https://your-proxy.company.com"
```

### **Verificar Conexión**

```bash
$ osmosis migrate --source test.jsp --from jsp --to react

🤖 Conectando con Claude 3.5 Sonnet...
✅ Claude 3.5 Sonnet conectado (claude-3-5-sonnet-20241022, Max Tokens: 8000, Temp: 0.7)
```

---

## **📦 LLMService API**

### **Constructor**

```typescript
import { LLMService } from './core/llm/LLMService';

const llm = new LLMService({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022', // Opcional
  maxTokens: 8000,                      // Opcional
  temperature: 0.7,                     // Opcional
  baseURL: 'https://api.anthropic.com'  // Opcional (proxy)
});
```

### **Métodos Principales**

#### **1. generateWithStreaming() - Con Streaming (UX Profesional)**

```typescript
const code = await llm.generateWithStreaming(prompt, {
  onStart: () => {
    console.log('🤖 Generando...');
  },
  onToken: (token: string) => {
    process.stdout.write(token); // Streaming en tiempo real
  },
  onComplete: (fullText: string) => {
    console.log('\n✅ Generación completa');
  },
  onError: (error: Error) => {
    console.error('❌ Error:', error.message);
  }
});
```

**Salida en Terminal:**
```
🤖 Generando...
import React from 'react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  ...
✅ Generación completa
```

---

#### **2. generate() - Sin Streaming (Más Rápido)**

Para batch processing o cuando no necesitas feedback visual:

```typescript
const code = await llm.generate(prompt);
```

---

#### **3. repair() - Auto-Reparación Inteligente**

```typescript
const repairedCode = await llm.repair(
  originalCode,
  [
    'Class Component detected',
    'dangerouslySetInnerHTML without sanitization',
    'Missing alt attribute'
  ],
  'react',
  attempt: 1
);
```

**Prompt de Reparación (Generado Automáticamente):**
```markdown
# 🔧 CODE REPAIR - Attempt 1/3

## ❌ Validation Errors Detected
1. Class Component detected
2. dangerouslySetInnerHTML without sanitization
3. Missing alt attribute

## 🐛 Problematic Code
```tsx
class LoginForm extends React.Component { ... }
```

## ✅ Your Task
1. Fix ALL errors listed above
2. Maintain the original functionality
3. Keep the same component structure
4. Use modern best practices
5. Return ONLY the fixed code

## 🎯 Common Fixes
- Class Components → Functional Components + Hooks
- dangerouslySetInnerHTML → Use DOMPurify
- Missing alt → Add descriptive alt text
```

---

#### **4. healthCheck() - Verificar Conexión**

```typescript
const isHealthy = await llm.healthCheck();

if (!isHealthy) {
  console.error('❌ No se pudo conectar con Claude');
}
```

---

## **🔄 Flujo de Migración con Auto-Reparación**

```
┌─────────────────────────────────────────────┐
│ 1. Generar Código (Primera Vez)            │
├─────────────────────────────────────────────┤
│ PromptAssembler.assemble()                  │
│   ↓                                          │
│ ContextInjector.enrichPrompt() (RAG)        │
│   ↓                                          │
│ LLMService.generateWithStreaming()          │
│   ↓                                          │
│ Código Generado                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 2. Validación con CodeSafeGuard             │
├─────────────────────────────────────────────┤
│ CodeSafeGuard.validate(code)                │
│   ↓                                          │
│ ✅ Valid?  → Guardar y continuar            │
│ ❌ Invalid? → Ir a Auto-Reparación          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 3. Auto-Reparación (Max 3 Intentos)        │
├─────────────────────────────────────────────┤
│ LLMService.repair(code, errors, framework)  │
│   ↓                                          │
│ Código Reparado                              │
│   ↓                                          │
│ CodeSafeGuard.validate(repairedCode)        │
│   ↓                                          │
│ ✅ Valid? → Guardar                         │
│ ❌ Invalid? → Reintentar (Max 3)            │
│   ↓                                          │
│ Si falla 3 veces → Fallback (Fixes Known)  │
└─────────────────────────────────────────────┘
```

---

## **📊 Ejemplo Real de Auto-Reparación**

### **Intento 1:**
```
🔧 Iniciando auto-reparación con Claude (Max 3 intentos)...

🤖 Intento 1/3 - Enviando a Claude...
   ⚠️  Intento 1 - Aún hay errores:
      - Class Component detected
      - Missing TypeScript types
   🔄 Reintentando con errores actualizados...
```

### **Intento 2:**
```
🤖 Intento 2/3 - Enviando a Claude...
   ⚠️  Intento 2 - Aún hay errores:
      - Missing alt attribute on <img>
   🔄 Reintentando con errores actualizados...
```

### **Intento 3:**
```
🤖 Intento 3/3 - Enviando a Claude...
   ✅ Reparación exitosa en intento 3
```

---

## **🎛️ Configuración Avanzada**

### **Temperatura (Temperature)**

Controla la creatividad del LLM:

```typescript
const llm = new LLMService({
  temperature: 0.3 // Más determinista (para reparaciones)
});

const llm = new LLMService({
  temperature: 0.7 // Balanceado (default)
});

const llm = new LLMService({
  temperature: 1.0 // Más creativo (para nuevas features)
});
```

**Uso en Osmosis:**
- **Generación Inicial**: `0.7` (balanceado)
- **Reparaciones**: `0.3` (determinista, evita introducir nuevos errores)

---

### **Max Tokens**

Controla el tamaño máximo de la respuesta:

```typescript
const llm = new LLMService({
  maxTokens: 4000 // Archivos pequeños
});

const llm = new LLMService({
  maxTokens: 8000 // Default (mayoría de componentes)
});

const llm = new LLMService({
  maxTokens: 16000 // Archivos grandes (cuidado con costos)
});
```

---

## **💰 Costos y Límites**

### **Claude 3.5 Sonnet Pricing (2025)**

| Métrica | Costo |
|---------|-------|
| **Input** (Prompt) | $3.00 por 1M tokens |
| **Output** (Código generado) | $15.00 por 1M tokens |

### **Estimación por Archivo**

| Tamaño Archivo | Tokens Promedio | Costo Estimado |
|----------------|-----------------|----------------|
| Pequeño (<100 líneas) | 500 input + 1,000 output | $0.017 |
| Mediano (100-300 líneas) | 1,500 input + 3,000 output | $0.050 |
| Grande (>300 líneas) | 3,000 input + 6,000 output | $0.100 |

**Proyecto Típico (500 archivos medianos):**
- Costo: ~$25 USD
- Con auto-reparación (20% de archivos): ~$30 USD

---

## **🔒 Seguridad y Compliance**

### **1. Proxy Empresarial**

Para empresas que no permiten llamadas directas a APIs externas:

```bash
# Tu empresa proporciona un proxy intermedio
export ANTHROPIC_BASE_URL="https://llm-proxy.company.com"
export ANTHROPIC_API_KEY="empresa-key-123"
```

El proxy puede:
- ✅ Auditar todas las requests
- ✅ Sanitizar prompts (eliminar datos sensibles)
- ✅ Aplicar rate limiting
- ✅ Cachear respuestas (ahorro de costos)

---

### **2. Air-Gapped Deployment**

Si tu empresa NO permite llamadas externas:

**Opción A: Self-Hosted LLM**
```bash
# Usar modelo local (Llama 3, CodeLlama, etc.)
export LLM_PROVIDER="local"
export LLM_MODEL_PATH="/models/codellama-13b"
```

**Opción B: On-Premise Claude (Enterprise)**
```bash
# Claude Enterprise on-premise
export ANTHROPIC_BASE_URL="https://claude.internal.company.com"
```

> 📝 **Nota**: Self-hosted LLMs requieren modificación de `LLMService` (próximamente).

---

## **🚨 Manejo de Errores**

### **Error: API Key No Configurada**

```
❌ ANTHROPIC_API_KEY no configurada.
   Configura: export ANTHROPIC_API_KEY="sk-ant-..."
   O pasa { apiKey: "..." } al constructor
```

**Solución:**
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

---

### **Error: Rate Limit Exceeded**

```
❌ Error LLM: Rate limit exceeded (429)
```

**Soluciones:**
1. Esperar 60 segundos y reintentar
2. Reducir concurrencia (procesar menos archivos en paralelo)
3. Upgradar plan de Anthropic

---

### **Error: Timeout**

```
❌ Error LLM: Request timeout
```

**Soluciones:**
1. Verificar conexión a internet
2. Verificar proxy empresarial
3. Reducir `maxTokens` (archivos muy grandes)

---

## **🧪 Testing**

### **Test Básico**

```bash
# Crear archivo test
echo "class Test extends React.Component {}" > test.jsx

# Migrar
osmosis migrate --source test.jsx --from react --to react --output ./test-output

# Verificar output
cat ./test-output/test.tsx
```

### **Test de Reparación**

```typescript
// Archivo con errores intencionales
const badCode = `
class LoginForm extends React.Component {
  render() {
    return <div dangerouslySetInnerHTML={{__html: userInput}} />;
  }
}
`;

// Osmosis lo detectará y reparará automáticamente
```

---

## **📈 Mejoras Futuras**

- [ ] Soporte para modelos locales (Llama 3, CodeLlama)
- [ ] Cache de respuestas LLM (ahorro de costos)
- [ ] Batching inteligente (múltiples archivos en 1 request)
- [ ] Fine-tuning específico para cada cliente
- [ ] Feedback loop (aprender de correcciones manuales)

---

## **📚 Referencias**

- [Anthropic API Docs](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude 3.5 Sonnet](https://www.anthropic.com/claude)
- [Enterprise Deployment](https://www.anthropic.com/enterprise)

---

**LLM Integration** - v1.0.0  
Powered by Claude 3.5 Sonnet 🤖


