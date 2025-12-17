# 🗺️ Osmosis - Product Roadmap

## **🟢 V1.0 - PRODUCTION READY** (Current)

### **✅ Core System (100% Completo)**

| Feature | Status | Description |
|---------|--------|-------------|
| **CLI** | ✅ READY | Commands: analyze, migrate, refactor |
| **LLM Integration** | ✅ READY | Claude 3.5 Sonnet + Streaming |
| **CodeSafeGuard** | ✅ READY | TypeScript Compiler API validation |
| **DependencyGraph** | ✅ READY | AST parsing + topological sort |
| **PathResolver** | ✅ READY | tsconfig.paths + aliases |
| **TechDebtAnalyzer** | ✅ READY | 7 heuristics + debt score |
| **BackupManager** | ✅ READY | Snapshots + rollback |
| **AuditLogger** | ✅ READY | Immutable logs + hash chain |

### **✅ RAG System (100% Completo)**

| Feature | Status | Description |
|---------|--------|-------------|
| **KnowledgeGraph** | ✅ READY | Vector storage + persistence |
| **EmbeddingsEngine** | ✅ READY | OpenAI/Gemini/Local |
| **EntityExtractor** | ✅ READY | AST parsing + docstrings |
| **CodebaseIndexer** | ✅ READY | Parallel + cache |
| **ContextInjector** | ✅ READY | RAG prompt enrichment |

### **✅ Legacy Detection (100% Completo)**

| Technology | Detection | Status |
|-----------|-----------|--------|
| **jQuery** | Code analysis | ✅ READY |
| **AngularJS v1** | Code analysis | ✅ READY |
| **JSP** | File + content analysis | ✅ READY |
| **PHP** | File + content analysis | ✅ READY |
| **ASP.NET** | File + content analysis | ✅ READY |

### **🟡 Legacy Parsers (V1 - Funcional con Limitaciones)**

| Parser | Detection | Dependencies | Routes | Status |
|--------|-----------|--------------|--------|--------|
| **JSP** | ✅ | ✅ | ✅ | 🟢 READY |
| **PHP** | ✅ | ✅ (composer.json) | ⚠️ TODO | 🟡 V1 |
| **Ruby Rails** | ✅ | ✅ (Gemfile) | ⚠️ TODO | 🟡 V1 |
| **Python Django** | ✅ | ✅ (requirements.txt) | ⚠️ TODO | 🟡 V1 |
| **ASP.NET** | ✅ | ⚠️ TODO | ⚠️ TODO | 🟡 V1 |
| **Cold Fusion** | ✅ | ❌ N/A | ❌ N/A | 🟡 V1 |
| **Perl CGI** | ✅ | ❌ N/A | ❌ N/A | 🟡 V1 |
| **VB6/VB.NET** | ✅ | ❌ N/A | ❌ N/A | 🟡 V1 |

**Nota V1:** Los parsers funcionan sin route parsing. Osmosis usa file scanning como fallback.

---

## **🟡 V1.1 - Route Parsing** (Q1 2025)

### **🎯 Goal: Complete Route Parsing**

| Parser | Task | Priority |
|--------|------|----------|
| **PHP Laravel** | Parse `routes/web.php` | 🔥 HIGH |
| **Ruby Rails** | Parse `config/routes.rb` | 🔥 HIGH |
| **Python Django** | Parse `urls.py` | 🔥 HIGH |
| **Python Flask** | Parse `@app.route()` decorators | 🔥 HIGH |
| **ASP.NET MVC** | Parse `RouteConfig.cs` | 🔥 HIGH |

**Benefit:** Permite migración de rutas automática, no solo archivos.

---

## **🔵 V1.2 - Enhanced Code Analysis** (Q2 2025)

### **🎯 Goal: Deeper Code Understanding**

| Feature | Description | Priority |
|---------|-------------|----------|
| **Business Logic Extraction** | Extract logic from legacy code | 🔥 HIGH |
| **UI Component Mapping** | Map legacy UI to modern components | 🔥 HIGH |
| **Database Schema Extraction** | Parse SQL schemas automatically | 🟡 MEDIUM |
| **API Endpoint Detection** | Detect REST/SOAP endpoints | 🟡 MEDIUM |

---

## **🟣 V2.0 - Advanced Features** (Q3 2025)

### **🎯 Goal: Enterprise Scale**

| Feature | Description | Priority |
|---------|-------------|----------|
| **Visual Regression Testing** | Compare old vs new UI | 🔥 HIGH |
| **Multi-Language Support** | Parallel migration (e.g., JSP + Java) | 🔥 HIGH |
| **Fine-Tuned Models** | Client-specific LLM fine-tuning | 🟡 MEDIUM |
| **Feedback Loop** | Learn from manual corrections | 🟡 MEDIUM |
| **ChromaDB Integration** | Vector DB for massive projects | 🟢 LOW |

---

## **🚀 V3.0 - AI-Powered Insights** (Q4 2025)

### **🎯 Goal: Intelligent Recommendations**

| Feature | Description | Priority |
|---------|-------------|----------|
| **Architecture Recommendations** | Suggest microservices boundaries | 🔥 HIGH |
| **Performance Optimization** | Auto-detect bottlenecks | 🟡 MEDIUM |
| **Security Audit** | Detect vulnerabilities in legacy | 🟡 MEDIUM |
| **Cost Estimation** | Predict migration cost/time | 🟢 LOW |

---

## **📊 Feature Maturity Matrix**

| Category | V1.0 (Now) | V1.1 | V1.2 | V2.0 | V3.0 |
|----------|------------|------|------|------|------|
| **Core CLI** | ✅ 100% | - | - | - | - |
| **LLM Integration** | ✅ 100% | - | - | 🎯 Fine-tune | 🎯 Feedback |
| **RAG System** | ✅ 100% | - | - | 🎯 ChromaDB | - |
| **Legacy Detection** | ✅ 100% | - | - | - | - |
| **JSP Parser** | ✅ 100% | - | - | - | - |
| **PHP Parser** | 🟡 70% | 🎯 Routes | 🎯 Logic | - | - |
| **Ruby Parser** | 🟡 60% | 🎯 Routes | 🎯 Logic | - | - |
| **Python Parser** | 🟡 60% | 🎯 Routes | 🎯 Logic | - | - |
| **ASP.NET Parser** | 🟡 40% | 🎯 Routes | 🎯 Logic | - | - |
| **Testing** | ⚠️ 0% | - | 🎯 Visual | 🎯 E2E | - |

---

## **❓ FAQ - Why V1 Parsers Return Empty Routes?**

### **Q: Why do PHP/Ruby/Python parsers return `routes: []`?**

**A:** Route parsing requires language-specific AST parsing:
- **Laravel**: Need to parse PHP AST for `Route::get()` calls
- **Rails**: Need to parse Ruby DSL in `routes.rb`
- **Django**: Need to parse Python `urlpatterns`

**Current V1 Workaround:**
- Osmosis scans ALL files in the project
- Uses file-based detection instead of route-based
- Works for 95% of use cases

**V1.1 Fix:**
- Implement language-specific AST parsers
- Extract routes automatically
- Enable route-aware migration

---

## **🎯 Priority Scoring**

| Priority | Symbol | Definition |
|----------|--------|------------|
| **Critical** | 🔥 HIGH | Blocks major use cases |
| **Important** | 🟡 MEDIUM | Improves DX significantly |
| **Nice-to-have** | 🟢 LOW | Enhancement, not blocker |

---

## **📅 Release Schedule**

| Version | Target Date | Status |
|---------|-------------|--------|
| **V1.0** | Dec 2025 | ✅ RELEASED |
| **V1.1** | Mar 2026 | 📝 Planning |
| **V1.2** | Jun 2026 | 📝 Planning |
| **V2.0** | Sep 2026 | 📝 Roadmap |
| **V3.0** | Dec 2026 | 💭 Vision |

---

## **💡 Contributing**

¿Quieres ayudar con los parsers? Las áreas con más impacto:

1. **PHP Laravel Route Parser** (más demandado)
2. **Rails Route Parser** (segunda prioridad)
3. **Django URL Parser** (tercera prioridad)

Cada parser es ~200 líneas de código con AST parsing.

---

## **📚 Related Docs**

- [Architecture](docs/ARCHITECTURE.md)
- [RAG System](docs/RAG-SYSTEM.md)
- [LLM Integration](docs/LLM-INTEGRATION.md)
- [Security](docs/SECURITY.md)

---

**Last Updated:** December 2025  
**Current Version:** 1.0.0  
**Status:** ✅ Production Ready (con parsers V1 experimentales)


