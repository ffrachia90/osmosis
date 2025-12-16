# 🧠 Sistema RAG Enterprise-Grade

## **Descripción General**

Osmosis incluye un sistema RAG (Retrieval-Augmented Generation) de nivel empresarial que permite al LLM entender **el contexto completo** de tu proyecto antes de generar código.

## **¿Qué Hace Diferente a Este RAG?**

### **1. Búsqueda Semántica (No Solo Keywords)**

```typescript
// ❌ RAG Naive (Keyword Matching)
if (query.includes("Button")) {
  return buttonComponents;
}

// ✅ RAG Enterprise (Vector Similarity)
const queryEmbedding = await generateEmbedding(query);
const similar = findTopK(queryEmbedding, allComponents, k=5);
// Encuentra componentes similares aunque se llamen diferente
// "login" → encuentra "UserAuthenticationForm"
```

### **2. Persistencia Inteligente**

```bash
# Primera vez: Indexa todo el proyecto
$ osmosis analyze --dir ./my-app
🧠 Indexando... (2-3 minutos)
✅ 1,234 entidades, 1,234 vectores generados
✅ Cache guardado en .osmosis/

# Segunda vez: Instantáneo
$ osmosis migrate --source ./legacy
✅ Knowledge Graph cargado desde cache (0.1s)
```

### **3. Código Real + Docstrings**

```typescript
// ❌ RAG Naive: Solo guarda nombres
{
  id: "calculateTax",
  type: "function"
}

// ✅ RAG Enterprise: Código completo
{
  id: "calculateTax",
  type: "function",
  sourceCode: "export function calculateTax(amount: number, rate: number) { ... }",
  docstring: "Calcula el impuesto basado en el monto y la tasa",
  signature: "(amount: number, rate: number): number",
  dependencies: ["formatCurrency", "validateAmount"]
}
```

---

## **Arquitectura**

```
┌─────────────────────────────────────────────┐
│ 1. INDEXACIÓN (Una vez por proyecto)       │
├─────────────────────────────────────────────┤
│ CodebaseIndexer                              │
│   ↓                                          │
│ EntityExtractor (Extrae código real)        │
│   ↓                                          │
│ EmbeddingsEngine (Genera vectores)          │
│   ↓                                          │
│ KnowledgeGraph.save(.osmosis/)              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 2. MIGRACIÓN (Cada archivo)                │
├─────────────────────────────────────────────┤
│ KnowledgeGraph.load() [instantáneo]         │
│   ↓                                          │
│ ContextInjector.enrichPrompt()              │
│   ↓ (Búsqueda semántica)                    │
│ Prompt + Contexto Relevante → LLM          │
└─────────────────────────────────────────────┘
```

---

## **Componentes**

### **EntityExtractor**

Extrae entidades del código con AST parsing (TypeScript Compiler API).

**Qué Extrae:**
- ✅ Código fuente completo
- ✅ JSDoc/Docstrings
- ✅ Type signatures
- ✅ Líneas de inicio/fin
- ✅ Complejidad ciclomática
- ✅ Dependencias

**Tipos de Entidades:**
- `component` - Componentes React (funcionales o clase)
- `function` - Funciones utility
- `hook` - Custom hooks (`use*`)
- `constant` - Constantes exportadas
- `interface` - Interfaces TypeScript

**Ejemplo:**
```typescript
const entities = EntityExtractor.extractFromFile('src/components/Button.tsx');
// entities[0] = {
//   id: "Button",
//   type: "component",
//   sourceCode: "export const Button = ({ label, onClick }) => { ... }",
//   docstring: "Primary button component",
//   signature: "({ label: string, onClick: () => void }): JSX.Element",
//   metadata: { lineStart: 5, lineEnd: 12, complexity: 2 }
// }
```

---

### **EmbeddingsEngine**

Genera vectores numéricos para búsqueda semántica.

**Proveedores Soportados:**
1. **OpenAI** - `text-embedding-3-small` (384 dimensiones)
2. **Gemini** - `embedding-001`
3. **Local** - TF-IDF simplificado (fallback sin API key)

**Configuración:**
```bash
# Opción 1: OpenAI (Recomendado)
export OPENAI_API_KEY="sk-..."

# Opción 2: Gemini
export GEMINI_API_KEY="..."

# Opción 3: Local (Sin API key, pero menos preciso)
# No requiere configuración
```

**Cómo Funciona:**
```typescript
const engine = new EmbeddingsEngine({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small'
});

// Generar embedding para código
const embedding = await engine.generateCodeEmbedding({
  sourceCode: "function calculateTax(amount, rate) { ... }",
  docstring: "Calcula el impuesto",
  signature: "(amount: number, rate: number): number"
});

// embedding = [0.123, -0.456, 0.789, ...] (384 números)
```

**Similitud Coseno:**
```typescript
const similarity = engine.cosineSimilarity(vec1, vec2);
// 0.95 = Muy similar
// 0.50 = Algo similar
// 0.10 = Poco similar
```

---

### **KnowledgeGraph**

Almacena y busca entidades con búsqueda vectorial.

**Métodos Principales:**

```typescript
// 1. Agregar entidad con embedding
await graph.addEntity(entity);

// 2. Búsqueda semántica
const results = await graph.search(
  "authentication logic with JWT tokens",
  topK: 5
);
// Retorna los 5 componentes/funciones más relevantes

// 3. Buscar componentes similares (evita duplicación)
const similar = await graph.findSimilarComponents(
  "LoginButton",
  sourceCode // opcional
);

// 4. Contexto relevante para migración
const context = await graph.getRelevantContext(
  filePath,
  legacyCode
);
// context = {
//   components: [Button, Input, Form],
//   utilities: [validateEmail, formatPhone],
//   patterns: [useAuth, useFetch]
// }

// 5. Guardar en disco
await graph.save(projectRoot);
// Guarda en .osmosis/knowledge-graph.json

// 6. Cargar desde cache
const graph = await KnowledgeGraph.load(projectRoot, embeddingConfig);
```

---

### **CodebaseIndexer**

Escanea el proyecto y construye el Knowledge Graph.

**Flujo:**
1. Busca archivos `.js`, `.jsx`, `.ts`, `.tsx`
2. Extrae entidades con `EntityExtractor`
3. Genera embeddings con `EmbeddingsEngine`
4. Guarda en cache (`.osmosis/`)

**Optimizaciones:**
- ✅ Procesa archivos en paralelo (batches de 10)
- ✅ Detecta si cache está desactualizado (compara timestamps)
- ✅ Cache de embeddings (no re-genera vectores idénticos)

**Ejemplo:**
```bash
# Indexación inicial (lenta)
$ time osmosis analyze --dir ./my-app
🧠 Indexando... 100% (629 entidades)
✅ 629 entidades, 629 vectores generados
Real: 2m 34s

# Con cache (instantáneo)
$ time osmosis analyze --dir ./my-app
✅ Knowledge Graph cargado desde cache (629 entidades)
Real: 0.2s
```

---

### **ContextInjector**

Enriquece prompts con contexto del proyecto.

**Qué Inyecta:**
1. **Componentes Similares** - Evita duplicación
2. **Utilities Relevantes** - Funciones disponibles
3. **Hooks y Patterns** - Patrones del proyecto
4. **Restricciones** - Reglas del proyecto

**Ejemplo:**

```typescript
const contextInjector = new ContextInjector(knowledgeGraph);

const enrichedPrompt = await contextInjector.enrichPrompt(
  basePrompt,
  {
    fileName: "LoginForm.jsp",
    filePath: "/legacy/login/LoginForm.jsp",
    sourceCode: legacyCode,
    legacyLanguage: "jsp",
    targetFramework: "react"
  }
);
```

**Output:**
```markdown
## 🔍 COMPONENTES SIMILARES EXISTENTES

⚠️  **IMPORTANTE**: Los siguientes componentes ya existen en el proyecto.
**NO crees componentes duplicados**. Reutiliza estos o extiéndelos si es necesario.

### 1. `LoginButton` (src/ui/LoginButton.tsx)
   **Descripción**: Primary login button with loading state
   **Signature**: `({ label: string, isLoading: boolean }): JSX.Element`

\`\`\`typescript
export const LoginButton = ({ label, isLoading }) => {
  return (
    <button disabled={isLoading}>
      {isLoading ? <Spinner /> : label}
    </button>
  );
};
\`\`\`

## ⚙️  UTILIDADES DISPONIBLES

- **`validateEmail`** (`src/utils/validation.ts`)
  Validates email format with RFC5322 compliance
  `(email: string): boolean`

- **`hashPassword`** (`src/utils/crypto.ts`)
  Hashes password with bcrypt
  `(password: string): Promise<string>`

## 🪝 HOOKS Y PATTERNS DISPONIBLES

- **`useAuth`** (`src/hooks/useAuth.ts`)
  Authentication hook with JWT management
  `(): { login, logout, user, isAuthenticated }`

## ⚠️  RESTRICCIONES DEL PROYECTO

1. **NO crear componentes desde cero** si existe uno similar (revisa sección anterior)
2. **NO usar colores hardcodeados** - usar theme tokens si existen
3. **NO usar Class Components** - solo Functional Components + Hooks
...
```

---

## **Uso en CLI**

### **Comando `analyze`**

```bash
$ osmosis analyze --dir ./my-legacy-app

🧠 Indexando codebase para RAG con embeddings vectoriales...
ℹ️ Usando openai para embeddings semánticos
⏳ Progreso: 100% (1,234 entidades)
✅ Knowledge Graph: 1,234 entidades, 1,234 vectores generados, 247 componentes
✅ Knowledge Graph guardado en ./my-legacy-app/.osmosis/
```

**Archivos Generados:**
- `.osmosis/knowledge-graph.json` - Entidades + vectores
- `.osmosis/embeddings-cache.json` - Cache de embeddings (rápido)
- `analysis-report.json` - Reporte completo

---

### **Comando `migrate`**

```bash
$ osmosis migrate --source ./legacy --from jsp --to react

🧠 Cargando Knowledge Graph...
✅ Knowledge Graph cargado desde cache (1,234 entidades)
[1/50] Migrando LoginForm.jsp...
  🔍 Encontrados 3 componentes similares (reutilizando)
  ⚙️  Usando utilities: validateEmail, hashPassword
  🪝 Usando hooks: useAuth
✅ LoginForm.jsx generado
```

---

## **Performance**

### **Indexación Inicial**

| Tamaño Proyecto | Archivos | Entidades | Tiempo (OpenAI) | Tiempo (Local) |
|-----------------|----------|-----------|-----------------|----------------|
| Pequeño         | 50       | ~200      | 30s             | 10s            |
| Mediano         | 500      | ~2,000    | 3m              | 1m             |
| Grande          | 2,000    | ~10,000   | 12m             | 4m             |

### **Con Cache (Subsecuentes)**

| Operación           | Tiempo  |
|---------------------|---------|
| Cargar Knowledge Graph | <0.5s   |
| Búsqueda semántica  | <50ms   |
| Enriquecer prompt   | <100ms  |

---

## **Comparación: Naive vs Enterprise**

| Feature                    | RAG Naive | RAG Enterprise |
|----------------------------|-----------|----------------|
| **Búsqueda**               | Keywords  | Vector Similarity |
| **Persistencia**           | ❌        | ✅ Cache inteligente |
| **Código Real**            | ❌        | ✅ Código completo |
| **Docstrings**             | ❌        | ✅ JSDoc extraído |
| **Type Signatures**        | ❌        | ✅ TypeScript |
| **Detección Duplicación**  | ❌        | ✅ Similarity Search |
| **Embeddings**             | ❌        | ✅ OpenAI/Gemini/Local |
| **Complejidad**            | O(n)      | O(log n) |

---

## **Variables de Entorno**

```bash
# Embeddings Provider (Opcional)
OPENAI_API_KEY=sk-...                    # OpenAI (Recomendado)
GEMINI_API_KEY=...                        # Gemini (Alternativa)
# Si no se proporciona ninguna, usa embeddings locales (TF-IDF)

# Ejemplo de uso
export OPENAI_API_KEY="sk-proj-..."
osmosis analyze --dir ./my-app
```

---

## **FAQ**

### **¿Cuánto cuesta usar OpenAI embeddings?**

- Modelo: `text-embedding-3-small`
- Costo: $0.02 por 1M tokens
- Proyecto típico (2,000 archivos): ~$0.50
- Con cache: Solo se paga una vez

### **¿Puedo usar embeddings locales?**

Sí, Osmosis tiene un fallback TF-IDF si no se proporciona API key. Es menos preciso pero funcional.

### **¿Se envía mi código a OpenAI?**

Solo se envían snippets de código para generar embeddings (vectores numéricos). Los embeddings se guardan localmente en `.osmosis/`.

### **¿Cómo invalido el cache?**

```bash
rm -rf .osmosis/
osmosis analyze --dir ./my-app
```

### **¿Funciona con otros lenguajes además de JS/TS?**

Por ahora solo JS/TS. Soporte para Python, Java, Go próximamente.

---

## **Próximas Mejoras**

- [ ] Soporte para Python (AST parsing)
- [ ] Soporte para Java (ANTLR parser)
- [ ] Búsqueda híbrida (keywords + vectorial)
- [ ] Clustering de componentes similares
- [ ] Recomendaciones automáticas de refactor
- [ ] Integración con ChromaDB/LanceDB (vector databases)

---

## **Contribuir**

¿Ideas para mejorar el RAG? Abre un issue en GitHub.

---

**Osmosis RAG System** - v1.0.0  
Enterprise-Grade Code Understanding 🧠

