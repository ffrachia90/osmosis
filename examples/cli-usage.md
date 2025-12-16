# 🧬 Osmosis CLI - Ejemplos de Uso

## 📊 Análisis de Proyecto Legacy

### Analizar un proyecto JSP bancario

```bash
osmosis analyze \
  --dir /path/to/legacy-banking-app \
  --output analysis-report.json
```

**Output esperado:**

```
🔍 Analizando proyecto...
✔ Tecnologías detectadas: jsp, java
✔ Grafo construido: 127 archivos encontrados
✔ Reporte generado: analysis-report.json

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

  3. src/services/UserService.jsp
     ├─ Complejidad: 120 líneas
     ├─ Dependencias: 2
     └─ Dependientes: 15
  
  ... y 117 archivos más
```

### Estructura del Reporte (JSON)

```json
{
  "project": "/path/to/legacy-banking-app",
  "timestamp": "2024-12-16T10:30:00.000Z",
  "technologies": ["jsp", "java"],
  "totalFiles": 127,
  "migrationOrder": [
    {
      "order": 1,
      "file": "src/utils/DateFormatter.jsp",
      "complexity": 45,
      "dependencies": 0,
      "dependents": 23
    }
  ],
  "estimatedEffort": {
    "hours": 254,
    "sprints": 4
  }
}
```

---

## 🚀 Migración Completa

### Migrar proyecto JSP → React

```bash
osmosis migrate \
  --source /path/to/legacy-banking-app \
  --from jsp \
  --to react \
  --output ./migrated-react \
  --client "Banco Nacional" \
  --design-system ./design-system
```

**Output esperado:**

```
🚀 Iniciando migración...
✔ Orden de migración determinado: 127 archivos

[1/127] Migrando src/utils/DateFormatter.jsp...
✅ src/utils/DateFormatter.jsp migrado

[2/127] Migrando src/utils/CurrencyFormatter.jsp...
✅ src/utils/CurrencyFormatter.jsp migrado

[3/127] Migrando src/services/UserService.jsp...
⚠️  SafeGuard detectó problemas en src/services/UserService.jsp
     ❌ Class Component detected (use Functional Component + Hooks)
     ❌ Missing TypeScript types for props
🔧 Intentando reparación automática...
✅ Código reparado automáticamente
✅ src/services/UserService.jsp migrado

...

📊 RESUMEN DE MIGRACIÓN:
────────────────────────────────────────────────────────
✅ Exitosos: 125/127
❌ Fallidos: 2/127
📁 Output: ./migrated-react
────────────────────────────────────────────────────────
```

### Migrar un archivo individual

```bash
osmosis migrate \
  --source ./legacy/UserProfile.php \
  --from php \
  --to react \
  --output ./migrated
```

---

## 🔧 Refactorización de Código Moderno

### Refactorizar React con malas prácticas

```bash
osmosis refactor \
  --source ./src/components \
  --framework react \
  --output ./refactored
```

**Detecta y corrige:**
- ❌ Class Components → ✅ Functional Components + Hooks
- ❌ `any` types → ✅ Interfaces TypeScript
- ❌ Inline functions en renders → ✅ `useCallback`
- ❌ `dangerouslySetInnerHTML` → ✅ DOMPurify
- ❌ Falta de accesibilidad → ✅ ARIA labels + roles

### Solo analizar (sin modificar)

```bash
osmosis refactor \
  --source ./src \
  --framework react \
  --analyze-only
```

---

## 🏗️ Arquitectura Micro Frontend

### Analizar monolito y proponer descomposición

```bash
osmosis microfrontend analyze \
  --source ./monolith-react-app \
  --strategy module-federation \
  --output mfe-analysis.json
```

### Generar estructura de Micro Frontends

```bash
osmosis microfrontend generate \
  --source ./monolith-react-app \
  --output ./micro-frontends \
  --strategy module-federation \
  --shell-port 3000 \
  --remotes "dashboard:3001,reports:3002,settings:3003"
```

---

## 🎯 Casos de Uso Reales

### 1. Banco con JSP Legacy (10 años)

**Escenario:** 500 archivos JSP, lógica de negocio mezclada con UI, sin tests

```bash
# Paso 1: Análisis
osmosis analyze --dir ./banking-app --output analysis.json

# Paso 2: Migración por etapas (primeros 50 archivos críticos)
osmosis migrate \
  --source ./banking-app/src/core \
  --from jsp \
  --to react \
  --output ./migrated \
  --client "Banco Nacional"

# Paso 3: Validación con tests E2E
osmosis test --compare-legacy ./banking-app --new ./migrated
```

### 2. Refactorizar React 2019 → React 2024

**Escenario:** App React con Class Components, `componentDidMount`, sin TypeScript

```bash
osmosis refactor \
  --source ./old-react-app \
  --framework react \
  --output ./modern-react-app
```

**Resultado:**
- ✅ Class → Functional Components
- ✅ Lifecycle → Hooks
- ✅ PropTypes → TypeScript
- ✅ Tests generados automáticamente

### 3. E-commerce PHP → Vue 3

```bash
osmosis migrate \
  --source ./ecommerce-php \
  --from php \
  --to vue \
  --output ./ecommerce-vue \
  --design-system ./vuetify-theme
```

---

## 🔐 Integración con Claude (Enterprise Proxy)

```bash
# Configurar proxy empresarial
export CLAUDE_API_URL="https://proxy.miempresa.com/v1"
export CLAUDE_API_KEY="sk-ant-..."

osmosis migrate \
  --source ./legacy-app \
  --from jsp \
  --to react \
  --llm-model claude-3-sonnet-20240229
```

---

## 🚦 Dry Run (Simular sin escribir)

```bash
osmosis migrate \
  --source ./legacy-app \
  --from jsp \
  --to react \
  --dry-run
```

---

## 📈 CI/CD Integration

### GitHub Actions

```yaml
name: Osmosis Quality Check

on: [pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Osmosis
        run: npm install -g osmosis
      
      - name: Analyze Code Quality
        run: osmosis refactor --source ./src --framework react --analyze-only
      
      - name: Fail on Critical Issues
        run: osmosis analyze --dir ./src --fail-on-critical
```

---

## 🎓 Tips y Mejores Prácticas

### 1. Siempre analizar primero

```bash
# ❌ NO hacer esto directamente
osmosis migrate --source ./huge-project --from jsp --to react

# ✅ Hacer esto
osmosis analyze --dir ./huge-project
# Revisar el reporte, identificar dependencias
# Migrar por etapas
```

### 2. Usar Design System propio

```bash
osmosis migrate \
  --source ./legacy \
  --from jsp \
  --to react \
  --design-system ./mi-empresa-design-system
```

### 3. Migración incremental

```bash
# Sprint 1: Utilities y servicios base
osmosis migrate --source ./utils --from jsp --to react

# Sprint 2: Componentes de UI
osmosis migrate --source ./components --from jsp --to react

# Sprint 3: Páginas principales
osmosis migrate --source ./pages --from jsp --to react
```

---

## 🆘 Troubleshooting

### Error: "SafeGuard bloqueó 50% de los archivos"

**Causa:** El LLM está generando código con malas prácticas

**Solución:**
```bash
# Aumentar strictness del SafeGuard
osmosis migrate \
  --source ./legacy \
  --from jsp \
  --to react \
  --safeguard-level strict \
  --auto-repair
```

### Error: "Dependencias circulares detectadas"

**Causa:** El grafo tiene ciclos (A → B → C → A)

**Solución:**
```bash
# Analizar y romper ciclos
osmosis analyze --dir ./project --detect-cycles
osmosis refactor --source ./project --break-circular-deps
```

---

## 📚 Documentación Adicional

- [Arquitectura del Sistema](../ARCHITECTURE.md)
- [Guía de Mejores Prácticas](../BEST-PRACTICES-SOURCES.md)
- [Matriz de Capacidades](../CAPABILITIES.md)
- [Business Plan](../BUSINESS-PLAN.md)

