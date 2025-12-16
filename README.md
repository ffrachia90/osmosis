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
