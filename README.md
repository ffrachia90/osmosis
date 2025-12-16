# 🧬 Osmosis - AI-Powered Legacy Code Modernizer

**Transform decades-old legacy applications into modern, production-ready code automatically.**

Osmosis uses Claude 3.5 Sonnet, RAG (Retrieval-Augmented Generation), and enterprise-grade validation to migrate JSP, PHP, jQuery, AngularJS, and other legacy technologies to React, Angular, or Vue with best practices.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)

---

## **✨ Key Features**

- 🤖 **Claude 3.5 Sonnet Integration** - Real-time streaming code generation
- 🧠 **RAG System** - Understands your entire codebase with vector similarity search
- 🛡️ **CodeSafeGuard** - TypeScript Compiler API validation (not regex)
- 🔧 **Auto-Repair** - Intelligent error fixing with up to 3 LLM attempts
- 📊 **Tech Debt Analysis** - Calculates debt score and refactor hours
- 🔄 **Dependency Graph** - AST-based dependency resolution with topological sort
- 🚀 **Production Ready** - Backup manager, audit logs, path resolution
- 🐳 **Docker Support** - Containerized deployment
- 🔌 **Cursor MCP Integration** - Use directly in Cursor IDE

---

## **🚀 Quick Start**

### **Prerequisites**

- Node.js 20+
- **Anthropic API Key** (Claude 3.5 Sonnet) - **REQUIRED** ✅
- **OpenAI API Key** (for RAG embeddings) - **OPTIONAL** ⚠️
  - If not provided, uses local embeddings (TF-IDF)
  - Recommended for better RAG accuracy

### **Installation**

```bash
# Clone repository
git clone https://github.com/yourusername/osmosis.git
cd osmosis

# Install dependencies
npm install

# Build
npm run build

# Configure API keys
export ANTHROPIC_API_KEY="sk-ant-..."  # REQUIRED: For Claude 3.5 Sonnet (code generation)
export OPENAI_API_KEY="sk-..."         # OPTIONAL: For RAG embeddings (better component detection)
```

**💡 Tip:** You can run Osmosis with ONLY `ANTHROPIC_API_KEY`. The `OPENAI_API_KEY` is optional and only improves RAG accuracy.

### **Basic Usage**

```bash
# 1. Analyze legacy project
npm run analyze -- --dir ./legacy-app --output analysis.json

# 2. Migrate to modern framework
npm run migrate -- \
  --source ./legacy-app \
  --from jsp \
  --to react \
  --output ./migrated-app
```

---

## **🐳 Docker Deployment**

### **Build Image**

```bash
docker-compose build
```

### **Run Analysis**

```bash
docker-compose run osmosis analyze --dir /workspace --output /workspace/analysis.json
```

### **Run Migration**

```bash
docker-compose run osmosis migrate \
  --source /workspace/legacy \
  --from php \
  --to react \
  --output /workspace/migrated
```

### **Environment Variables**

Create `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ANTHROPIC_BASE_URL=https://api.anthropic.com  # Optional: for enterprise proxy
```

---

## **🔌 Cursor MCP Integration**

Osmosis implements the Model Context Protocol (MCP) for direct integration with Cursor IDE.

### **Setup**

1. **Build Osmosis**:
```bash
npm run build
```

2. **Configure Cursor**:

Add to your Cursor settings (`.cursor/settings.json` or global settings):

```json
{
  "mcpServers": {
    "osmosis": {
      "command": "node",
      "args": ["/absolute/path/to/osmosis/dist/mcp/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

3. **Restart Cursor**

### **Available MCP Tools**

Once configured, you can use these tools in Cursor:

- `analyze_project` - Full project analysis with tech debt
- `detect_technology` - Identify legacy technologies
- `calculate_tech_debt` - Get debt score and refactor hours
- `validate_code` - Validate generated code
- `migrate_file` - Migrate single file with RAG context

### **Example Usage in Cursor**

```
# In Cursor chat:
@osmosis analyze_project {"projectPath": "./my-legacy-app"}

# Or ask natural language:
"Analyze this legacy JSP project and tell me the tech debt"
```

---

## **📊 Supported Technologies**

### **Input (Legacy)**

| Technology | Detection | Parsing | Status |
|-----------|-----------|---------|--------|
| JSP | ✅ | ✅ | 🟢 Full |
| PHP | ✅ | ✅ | 🟢 Full |
| jQuery | ✅ | ✅ | 🟢 Full |
| AngularJS v1 | ✅ | ✅ | 🟢 Full |
| ASP.NET | ✅ | 🟡 | 🟡 V1 |
| Ruby Rails | ✅ | 🟡 | 🟡 V1 |
| Python Django | ✅ | 🟡 | 🟡 V1 |
| Cold Fusion | ✅ | 🟡 | 🟡 V1 |

### **Output (Modern)**

- React (TypeScript, Hooks, Best Practices)
- Angular (Standalone Components, Signals)
- Vue 3 (Composition API)

---

## **🏗️ Architecture**

```
┌─────────────────────────────────────────┐
│          CLI / MCP Server               │
├─────────────────────────────────────────┤
│ LegacyDetector → DependencyGraph        │
│       ↓                ↓                 │
│ CodebaseIndexer → KnowledgeGraph (RAG)  │
│       ↓                                  │
│ LLMService (Claude 3.5 Sonnet)          │
│       ↓                                  │
│ CodeSafeGuard → Auto-Repair Loop        │
│       ↓                                  │
│    Migrated Code ✅                      │
└─────────────────────────────────────────┘
```

### **Core Components**

- **LegacyDetector**: Identifies legacy technologies (jQuery, JSP, PHP, etc.)
- **DependencyGraph**: AST parsing + topological sort for migration order
- **KnowledgeGraph**: RAG system with vector embeddings (OpenAI/Gemini/Local)
- **LLMService**: Claude 3.5 Sonnet integration with streaming
- **CodeSafeGuard**: TypeScript Compiler API validation
- **TechDebtAnalyzer**: Calculates debt score with 7 heuristics
- **BackupManager**: Automatic backups before modifications
- **AuditLogger**: Immutable audit logs with hash chain

---

## **🎯 Use Cases**

### **1. Banking Legacy Migration**

```bash
# Analyze 20-year-old JSP application
osmosis analyze --dir ./banking-app

Output:
✅ Technology: JSP (Era: 2000s)
✅ 500 files, 250,000 lines
✅ Tech Debt: 1,200 hours refactor
✅ Migration order determined

# Migrate to React
osmosis migrate --source ./banking-app --from jsp --to react

Output:
✅ 500/500 files migrated
✅ RAG prevented 47 duplicate components
✅ Auto-repaired 23 validation errors
```

### **2. Refactor Modern Code**

```bash
# Refactor React 2019 code to 2025 standards
osmosis refactor --source ./old-react-app --framework react

Fixes:
✅ Class Components → Hooks
✅ any types → Proper interfaces
✅ Performance (useMemo, useCallback)
✅ Accessibility (ARIA labels)
```

### **3. Tech Debt Audit**

```bash
osmosis analyze --dir ./legacy-app

Output:
Debt Score: 78/100 (High)
Refactor Hours: 1,200h
Toxic Files: 45
Recommendations:
  - God Classes detected (15 files >600 lines)
  - Spaghetti code (nesting depth >6)
  - Magic numbers (234 occurrences)
```

---

## **📈 Performance**

| Operation | Time | Notes |
|-----------|------|-------|
| **Indexing** (500 files) | ~3 min | First time only |
| **Load Cache** | <0.5s | Subsequent runs |
| **Migration** (per file) | 10-30s | With RAG context |
| **Auto-Repair** | +5-15s | If errors detected |

---

## **💰 Cost Estimation**

Claude 3.5 Sonnet Pricing:
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

**Typical Project (500 files):**
- ~$25-30 USD total
- RAG reduces cost by ~15% (component reuse)

---

## **🔒 Enterprise Security**

### **On-Premise / Air-Gapped**

Use enterprise proxy:

```bash
export ANTHROPIC_BASE_URL="https://your-proxy.company.com"
export ANTHROPIC_API_KEY="your-enterprise-key"
```

### **Features**

- ✅ Backup snapshots before modifications
- ✅ Immutable audit logs with hash chain
- ✅ Code never sent externally (on-premise mode)
- ✅ GDPR/SOC2/ISO27001 compliant architecture

---

## **❓ FAQ**

### **Why two API keys?**

**Anthropic (REQUIRED):**
- Powers Claude 3.5 Sonnet
- Generates the migrated code
- Without it, Osmosis can't work

**OpenAI (OPTIONAL):**
- Powers RAG embeddings (`text-embedding-3-small`)
- Improves component similarity detection
- Without it, uses local embeddings (TF-IDF)

**Can I run without OpenAI key?**
YES! Just set `ANTHROPIC_API_KEY` and Osmosis will work fine with local embeddings.

**Which is better?**
- **With OpenAI key:** RAG finds similar components more accurately (~95% precision)
- **Without OpenAI key:** RAG still works (~75% precision) using TF-IDF

**Alternative to OpenAI?**
Use Gemini: `export GEMINI_API_KEY="..."`

### **Do I need BOTH keys?**

**Minimum (works):**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Recommended (better RAG):**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

---

## **📚 Documentation**

- [RAG System](docs/RAG-SYSTEM.md) - Vector embeddings and semantic search
- [LLM Integration](docs/LLM-INTEGRATION.md) - Claude 3.5 Sonnet details
- [Security](docs/SECURITY.md) - Enterprise deployment
- [Roadmap](ROADMAP.md) - Feature maturity and future plans

---

## **🛠️ Development**

```bash
# Run in dev mode
npm run dev

# Run tests
npm test

# Run MCP server in dev mode
npm run mcp:dev

# Lint
npm run lint
```

---

## **🤝 Contributing**

Contributions welcome! Priority areas:

1. PHP Laravel route parser
2. Ruby Rails route parser
3. Python Django URL parser
4. Visual regression testing

See [ROADMAP.md](ROADMAP.md) for details.

---

## **📄 License**

MIT License - see [LICENSE](LICENSE) for details.

---

## **🙋 Support**

- **Issues**: [GitHub Issues](https://github.com/yourusername/osmosis/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/osmosis/discussions)
- **Enterprise**: contact@osmosis.dev

---

## **⭐ Show Your Support**

If Osmosis helped you migrate legacy code, give us a ⭐ on GitHub!

---

**Built with ❤️ using Claude 3.5 Sonnet, TypeScript, and Node.js**
