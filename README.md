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

## 🚀 The Solution: Code-First AI Migration
Osmosis connects directly to your legacy codebase, indexes it to create a semantic understanding of the application, and rewrites the frontend layer.

### Core Capabilities
1.  **🔮 Full Codebase Understanding (RAG)**
    - Ingests the entire legacy source tree.
    - Understands server-side rendering logic, conditional flows, and data binding (e.g., JSP Scriptlets -> React Logic).
    - Resolves dependencies and shared resources automatically.

2.  **🛡️ Enterprise-Grade Security**
    - **Zero Data Leakage**: Works with your corporate LLM Proxy.
    - **Claude 3.5 Sonnet Integration**: Uses state-of-the-art reasoning for complex logic refactoring.
    - **On-Premise Ready**: Designed to run within your VPC.

3.  **✨ Intelligent Re-Architecting**
    - **Logic Extraction**: Separates UI from Logic (e.g., extracts Business Logic from JSP scriptlets into React Hooks/Services).
    - **Design System Enforcement**: Maps legacy styles to your *current* UI Kit.
    - **Framework Agnostic Output**: Generate React, Angular, or Vue based on client requirements.

## 🏗️ Architecture

```
osmosis/
├── core/
│   ├── ingestion/         # Source code parsers (JSP, Java, PHP)
│   ├── rag-engine/        # Vector store & Context retrieval
│   └── llm-gateway/       # Enterprise Proxy Client (Claude)
├── analysis/
│   ├── flow-extractor/    # Logic & State flow analysis
│   └── component-mapper/  # Legacy to Modern Component mapping
├── synthesis/
│   ├── react-generator/   # React Strategy (Hooks, Context)
│   ├── angular-generator/ # Angular Strategy (Services, Observables)
│   └── test-generator/    # Auto-generated E2E & Unit tests
└── cli/                   # Command line interface
```

## 🎬 Transformation Workflow

```bash
# 1. INGEST - Auto-detects technology (no need to specify!)
osmosis analyze --source ./legacy-app

# Output:
# ✅ Detected: PHP Laravel 5.4
# ✅ Found: 47 routes, 82 controllers, 156 views
# ✅ Complexity: Medium

# 2. PLAN - Choose your modern stack
osmosis plan --target react --state zustand --style tailwind

# Output:
# ✅ Migration plan generated
# ✅ Estimated effort: 3 weeks
# ✅ 156 components to generate

# 3. GENERATE - AI does the heavy lifting
osmosis migrate --framework react --output ./modern-app

# Output:
# ✅ Generated 156 React components
# ✅ Generated 47 API hooks
# ✅ Generated 234 E2E tests
# ✅ Test coverage: 94%

# 4. VERIFY - Run tests automatically
cd ./modern-app && npm test

# ✅ All tests passed!
```

## 🔧 Technology Stack

**Input (Auto-Detected):**
- JSP, PHP, ASP, Ruby, Python, ColdFusion, Perl, VB, jQuery - **We handle them all**

**Processing:**
- **AI Engine**: Claude 3.5 Sonnet (via your Enterprise Proxy)
- **RAG**: ChromaDB + Local embeddings (100% private)
- **Parsing**: Multi-language AST parsers + Tree-sitter
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
