# 🔄 Osmosis - Enterprise Code Migration Agent

**Intelligent, automated migration from Legacy Monoliths (JSP, JSF, PHP) to Modern Frontend Architectures (React, Angular).**

## 🎯 The Mission
Transform decades-old banking and enterprise interfaces into state-of-the-art modern web applications automagically. Osmosis doesn't just "transpile" code; it **understands** your business logic using advanced RAG (Retrieval-Augmented Generation) and re-architects it following modern best practices.

## 💡 The Problem
Enterprises manage extensive portfolios of applications:
- **Legacy V1s**: Built decades ago in *any* legacy technology. Stable but unmaintainable.
- **Modern V2s**: React/Next.js/Angular apps using latest Design Systems & Best Practices.
- **The Gap**: Migrating V1 to V2 manually takes years, costs millions, and introduces regressions.

### Supported Legacy Technologies (Auto-Detected)

| Language/Framework | Examples | Status |
|-------------------|----------|--------|
| **Java** | JSP, Servlets, Struts, Spring MVC (old) | ✅ Full Support |
| **PHP** | Laravel (old), CodeIgniter, Symfony 2.x, Vanilla PHP | ✅ Full Support |
| **ASP/C#** | Classic ASP, WebForms, ASP.NET MVC 2-4 | ✅ Full Support |
| **Ruby** | Rails 3.x-5.x, Sinatra | ✅ Full Support |
| **Python** | Django 1.x-2.x, Flask (old) | ✅ Full Support |
| **Cold Fusion** | CFM, CFC | ✅ Full Support |
| **Perl** | CGI Scripts | ✅ Full Support |
| **Visual Basic** | VB6, VB.NET WebForms | ✅ Full Support |
| **jQuery Spaghetti** | HTML + inline jQuery | ✅ Full Support |
| **Custom/Unknown** | Any codebase | ⚠️ Generic Parser |

**Don't see your tech? We can add support in 1-2 weeks.**

## 🧠 Enterprise RAG System - El Diferenciador

### **¿Qué Hace Especial a Osmosis?**

La mayoría de herramientas de migración son **estúpidas**: procesan archivos aisladamente sin entender el contexto global. Osmosis es **inteligente**: **entiende tu proyecto completo** antes de generar una sola línea de código.

#### **RAG Enterprise-Grade con Embeddings Vectoriales**

```bash
# 1. Primera vez: Indexa el proyecto (una sola vez)
$ osmosis analyze --dir ./my-legacy-app
🧠 Indexando... 100% (1,234 entidades)
✅ 1,234 entidades, 1,234 vectores generados
✅ Cache guardado en .osmosis/

# 2. Migración: Usa contexto del proyecto (instantáneo)
$ osmosis migrate --source ./legacy --from jsp --to react
✅ Knowledge Graph cargado desde cache (0.2s)
[1/50] Migrando LoginForm.jsp...
  🔍 Encontró componente similar: LoginButton (evita duplicación)
  ⚙️  Reutilizando: validateEmail, hashPassword
  🪝 Usando hook existente: useAuth
✅ LoginForm.jsx generado con contexto del proyecto
```

#### **Búsqueda Semántica (No Solo Keywords)**

```typescript
// ❌ RAG Naive: Busca por nombre exacto
search("Button") → encuentra componentes con "Button" en el nombre

// ✅ RAG Enterprise: Busca por significado
search("login authentication") 
  → encuentra: UserAuthForm, LoginButton, useAuth, validateCredentials
  → aunque NO tengan "login" en el nombre
```

#### **Capacidades del RAG:**

| Feature | Naive | **Osmosis** |
|---------|-------|-------------|
| **Búsqueda** | Keywords | ✅ **Similarity Vectorial** |
| **Persistencia** | ❌ | ✅ **Cache Inteligente** |
| **Código Real** | ❌ | ✅ **AST + Docstrings** |
| **Evita Duplicación** | ❌ | ✅ **Reutiliza Componentes** |
| **Embeddings** | ❌ | ✅ **OpenAI/Gemini/Local** |
| **Performance** | O(n) | ✅ **O(log n)** |

📚 **[Ver Documentación Completa del RAG →](docs/RAG-SYSTEM.md)**

---

## 🧠 Osmosis AI - Brain & Configuration
Osmosis comes pre-configured with a powerful set of **AI Rules** for Cursor IDE, transforming it into an automated Migration Architect.

### Active Rulebook (`.cursor/rules`)
| Rule ID | Focus Area | Description |
| :--- | :--- | :--- |
| `00` | **Master Identity** | Enforces Security, Zero-Hallucination, and Interface-First architecture. |
| `01-04` | **Legacy Ingestion** | Expert strategies for extracting logic from jQuery, JSP, PHP, and .NET. |
| `05-06` | **Modern Refactoring** | Guidelines for cleaning up chaotic React and updating Angular. |
| `10` | **Microfrontends** | "Luca Mezzalira" standard for splitting Monoliths using Module Federation. |

### Usage in Cursor
Just open a legacy file and type `Ctrl/Cmd + L`:
> "Migrate this using Rule 02" 
> "Split this into a Microfrontend (Rule 10)"


## 🎬 Transformation Workflow

### 1️⃣ Análisis Inteligente con Grafo de Dependencias

```bash
osmosis analyze --dir ./legacy-banking-app --output analysis.json
```

**Output:**
```
🔍 Analizando proyecto...
✔ Tecnologías detectadas: jsp, java
📊 Construyendo grafo de dependencias...
✔ Grafo construido: 127 archivos encontrados

📈 RESUMEN DEL ANÁLISIS:
────────────────────────────────────────────────────────
📁 Proyecto: /path/to/legacy-banking-app
🔧 Tecnologías: jsp, java
📄 Total de archivos: 127
⏱️  Esfuerzo estimado: 254h (4 sprints)
────────────────────────────────────────────────────────

🎯 ORDEN DE MIGRACIÓN ÓPTIMO (Primeros 10):
  1. src/utils/DateFormatter.jsp
     ├─ Complejidad: 45 líneas
     ├─ Dependencias: 0
     └─ Dependientes: 23
  
  2. src/utils/CurrencyFormatter.jsp
     ├─ Complejidad: 52 líneas
     ├─ Dependencias: 0
     └─ Dependientes: 18
```

**¿Por qué es importante?**
- 🎯 **Orden Óptimo**: Migra archivos base primero, evita romper dependencias
- 📊 **Métricas Reales**: Líneas de código, complejidad, esfuerzo estimado
- 🔍 **Detección Automática**: No necesitas especificar la tecnología

### 2️⃣ Migración con Validación en Tiempo Real

```bash
osmosis migrate \
  --source ./legacy-banking-app \
  --from jsp \
  --to react \
  --output ./migrated-react \
  --client "Banco Nacional"
```

**Output:**
```
🚀 Iniciando migración...
✔ Orden de migración determinado: 127 archivos

[1/127] Migrando src/utils/DateFormatter.jsp...
✅ src/utils/DateFormatter.jsp migrado

[3/127] Migrando src/services/UserService.jsp...
⚠️  SafeGuard detectó problemas:
     ❌ Class Component detected (use Functional Component + Hooks)
     ❌ Missing TypeScript types for props
🔧 Intentando reparación automática...
✅ Código reparado automáticamente

📊 RESUMEN DE MIGRACIÓN:
────────────────────────────────────────────────────────
✅ Exitosos: 125/127
❌ Fallidos: 2/127
📁 Output: ./migrated-react
────────────────────────────────────────────────────────
```

**Diferenciadores clave:**
- 🛡️ **CodeSafeGuard**: Valida código con compilador TypeScript real (no regex)
- 🔧 **Auto-Repair**: Si el LLM genera código malo, lo repara automáticamente
- 📊 **Progreso en Tiempo Real**: Sabes exactamente qué está pasando

### 3️⃣ Refactorización de Código Moderno

```bash
# ¿Tienes React 2019 con Class Components?
osmosis refactor \
  --source ./old-react-app \
  --framework react \
  --output ./modern-react-app
```

**Detecta y corrige:**
- ❌ Class Components → ✅ Functional + Hooks
- ❌ `any` types → ✅ TypeScript Interfaces
- ❌ `dangerouslySetInnerHTML` → ✅ DOMPurify
- ❌ Performance issues → ✅ `useMemo`, `useCallback`
- ❌ Accesibilidad → ✅ ARIA labels, semantic HTML

### 4️⃣ Microfrontend Architecture

```bash
# ¿Monolito React imposible de mantener?
osmosis microfrontend generate \
  --source ./monolith-react-app \
  --output ./micro-frontends \
  --strategy module-federation
```

**Output:**
```
📦 shell-app (Puerto 3000)
   ├─ Router principal
   ├─ Layout compartido
   └─ Error Boundaries

📦 mfe-dashboard (Puerto 3001)
📦 mfe-reports (Puerto 3002)
📦 mfe-settings (Porto 3003)

✅ Webpack Module Federation configurado
✅ Shared dependencies optimizados
✅ Tests E2E generados
```

## 🏗️ Arquitectura Robusta - Enterprise Grade

### 🧠 Motor de Análisis

```
┌─────────────────────────────────────────────────────────────┐
│                   DependencyGraph                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ LegacyDetector│→│ AST Parser  │→│ Dependency  │        │
│  │ (Auto-detect) │ │ (Multi-Lang)│ │   Resolver  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│           ↓                                ↓                │
│  ┌──────────────────────────────────────────────┐          │
│  │   Migration Order (Bottom-Up Topological)    │          │
│  │   Utils.js → Service.js → Component.js       │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

**¿Por qué es diferente?**
- ✅ **Compilador Real**: Usa TypeScript Compiler API, no regex
- ✅ **Grafo de Dependencias**: Migra en orden correcto (utils antes que apps)
- ✅ **AST Parsing**: Entiende estructura del código, no solo texto

### 🛡️ CodeSafeGuard - Validación Empresarial

```typescript
// ❌ LLM genera esto (MALO)
class UserList extends Component {
  render() {
    return <div dangerouslySetInnerHTML={{__html: data}} />;
  }
}

// ⚠️ SafeGuard RECHAZA automáticamente:
// - Class Component (obsoleto)
// - XSS vulnerability (dangerouslySetInnerHTML sin sanitizar)

// 🔧 Auto-Repair genera esto (BUENO)
import DOMPurify from 'dompurify';

export const UserList: React.FC<Props> = ({ data }) => {
  const sanitized = DOMPurify.sanitize(data);
  return <div dangerouslySetInnerHTML={{__html: sanitized}} />;
};
```

**Reglas de Validación:**
- ✅ **Sintaxis**: Código compila sin errores TypeScript
- ✅ **Seguridad**: No XSS, SQL injection, eval()
- ✅ **Performance**: No inline functions en loops
- ✅ **Accesibilidad**: WCAG 2.1 AA compliance
- ✅ **Modernidad**: Hooks, no Class Components

### 🧬 RAG Engine - Contexto Inteligente

```
┌────────────────────────────────────────────────────────────┐
│            Codebase RAG (Retrieval-Augmented)             │
│  ┌───────────┐   ┌───────────┐   ┌──────────────┐       │
│  │  Indexer  │→  │ ChromaDB  │←  │ Query Engine │       │
│  │ (Scan ALL)│   │ (Vectors) │   │ (Similar)    │       │
│  └───────────┘   └───────────┘   └──────────────┘       │
│        ↓                                  ↑               │
│  ┌──────────────────────────────────────────┐            │
│  │ Claude API: "Here's how YOU handle auth" │            │
│  │ (Context from YOUR codebase, not generic)│            │
│  └──────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────┘
```

**¿Por qué RAG?**
- ✅ Aprende patrones de TU empresa (nombres, estilos, servicios)
- ✅ Genera código consistente con TU arquitectura
- ✅ No alucinaciones: "No tenés ese componente, creémoslo"

## 🔧 Technology Stack

**Input (Auto-Detected):**
- JSP, PHP, ASP, Ruby, Python, ColdFusion, Perl, VB, jQuery - **We handle them all**

**Processing:**
- **AI Engine**: Claude 3.5 Sonnet (via your Enterprise Proxy)
- **RAG**: ChromaDB + Local embeddings (100% private)
- **Parsing**: Multi-language AST parsers + Tree-sitter
- **Validation**: TypeScript Compiler API (real compiler, not regex)
- **Understanding**: Semantic analysis of business logic

**Output (Your Choice):**
- **React** (CRA, Vite, Next.js 14)
- **Angular** (v17+ with Signals)
- **Vue** (3.x Composition API, Nuxt 3)
- **Svelte** (SvelteKit)

**Plus:**
- TypeScript (enforced)
- E2E Tests (Playwright/Cypress)
- Storybook stories
- Full documentation

## 📄 License
Proprietary - Enterprise Edition
