/**
 * Architecture Manifest
 * Define la estructura del manifiesto arquitectónico y su persistencia
 * 
 * El manifiesto es el "contrato" que guía toda la refactorización:
 * - Stack actual detectado
 * - Stack propuesto por el LLM
 * - Reglas de migración específicas
 * - Configuración a generar
 */

import fs from 'fs';
import path from 'path';
import { DeepPatternAnalysis } from './DeepPatternScanner';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

export interface ArchitectureManifest {
  /** Versión del schema del manifiesto */
  version: '1.0.0';
  
  /** Nombre del proyecto */
  projectName: string;
  
  /** Ruta raíz del proyecto */
  projectRoot: string;
  
  /** Timestamp del análisis */
  analyzedAt: string;
  
  /** Análisis profundo de patrones detectados */
  patternAnalysis: DeepPatternAnalysis;
  
  /** Stack propuesto por el LLM */
  proposedStack: ProposedStack;
  
  /** Reglas de migración específicas para este proyecto */
  migrationRules: MigrationRule[];
  
  /** Actualizaciones de configuración necesarias */
  configUpdates: ConfigUpdates;
  
  /** Metadatos adicionales */
  metadata: {
    llmModel: string;
    generationTime: number;  // ms
    confidence: number;      // 0-100
  };
}

export interface ProposedStack {
  stateManagement: {
    library: 'zustand' | 'redux-toolkit' | 'jotai' | 'none';
    reasoning: string;
  };
  dataFetching: {
    library: 'tanstack-query' | 'swr' | 'rtk-query' | 'apollo' | 'manual';
    reasoning: string;
  };
  routing: {
    library: 'react-router-v7' | 'react-router-v6' | 'tanstack-router';
    reasoning: string;
  };
  styling: {
    library: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion';
    reasoning: string;
  };
  forms: {
    library: 'react-hook-form' | 'formik' | 'native';
    reasoning: string;
  };
  testing: {
    library: 'vitest' | 'jest';
    reasoning: string;
  };
}

export interface MigrationRule {
  /** Identificador único */
  id: string;
  
  /** Categoría de la regla */
  category: 'state' | 'fetching' | 'routing' | 'styling' | 'components' | 'typescript' | 'security';
  
  /** Nombre descriptivo */
  name: string;
  
  /** Patrón a detectar (descripción o regex) */
  detectPattern: string;
  
  /** Instrucción para el LLM sobre cómo transformar */
  transformInstruction: string;
  
  /** Prioridad (1 = más alta) */
  priority: number;
  
  /** Ejemplo de transformación */
  example: {
    before: string;
    after: string;
  };
  
  /** Si la regla es crítica (bloquea si no se aplica) */
  isCritical: boolean;
}

export interface ConfigUpdates {
  /** Dependencias a agregar */
  dependencies: Record<string, string>;
  
  /** DevDependencies a agregar */
  devDependencies: Record<string, string>;
  
  /** Dependencias a eliminar */
  removePackages: string[];
  
  /** Scripts a agregar/actualizar en package.json */
  scripts: Record<string, string>;
  
  /** Archivos de configuración a generar */
  configFiles: ConfigFile[];
}

export interface ConfigFile {
  /** Ruta relativa al proyecto */
  path: string;
  
  /** Contenido del archivo */
  content: string;
  
  /** Si debe sobrescribir si existe */
  overwrite: boolean;
}

// ============================================================================
// REGLAS DE MIGRACIÓN PREDEFINIDAS
// ============================================================================

export const DEFAULT_MIGRATION_RULES: MigrationRule[] = [
  // -------------------------------------------------------------------------
  // STATE MANAGEMENT: Redux Legacy -> Modern
  // -------------------------------------------------------------------------
  {
    id: 'redux-connect-to-hooks',
    category: 'state',
    name: 'Redux connect() a Hooks',
    detectPattern: 'connect(mapStateToProps, mapDispatchToProps)',
    transformInstruction: `
      Reemplazar el HOC connect() con hooks:
      1. Eliminar connect(), mapStateToProps, mapDispatchToProps
      2. Usar useSelector() para obtener estado: const value = useSelector(state => state.X)
      3. Usar useDispatch() para dispatch: const dispatch = useDispatch()
      4. Mover la lógica de mapDispatchToProps a funciones con dispatch directo
      5. Tipar el selector con RootState
    `,
    priority: 1,
    example: {
      before: `
const mapStateToProps = (state) => ({ user: state.auth.user });
const mapDispatchToProps = { login, logout };
export default connect(mapStateToProps, mapDispatchToProps)(UserProfile);`,
      after: `
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';

export function UserProfile() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  
  const handleLogin = () => dispatch(login());
  const handleLogout = () => dispatch(logout());
  // ...
}`
    },
    isCritical: true
  },
  
  {
    id: 'redux-to-zustand',
    category: 'state',
    name: 'Redux Store a Zustand',
    detectPattern: 'createStore() o configureStore() con estado simple',
    transformInstruction: `
      Si el estado es simple (no requiere middleware complejo):
      1. Crear store Zustand: const useStore = create((set) => ({ ... }))
      2. Mover reducers a acciones: increment: () => set((state) => ({ count: state.count + 1 }))
      3. Reemplazar useSelector por: const count = useStore(state => state.count)
      4. Reemplazar dispatch por llamada directa: useStore.getState().increment()
    `,
    priority: 2,
    example: {
      before: `
// store.js
const store = configureStore({
  reducer: { counter: counterReducer }
});

// Component
const count = useSelector(state => state.counter.value);
dispatch(increment());`,
      after: `
// store.ts
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Component
const { count, increment } = useCounterStore();`
    },
    isCritical: false
  },
  
  // -------------------------------------------------------------------------
  // DATA FETCHING: Manual -> TanStack Query
  // -------------------------------------------------------------------------
  {
    id: 'useeffect-fetch-to-query',
    category: 'fetching',
    name: 'useEffect + fetch/axios a useQuery',
    detectPattern: 'useEffect con fetch() o axios.get() y useState para loading/error',
    transformInstruction: `
      Convertir patrón de fetching manual a TanStack Query:
      1. Eliminar useState para data, loading, error
      2. Eliminar useEffect con fetch/axios
      3. Crear función fetcher async separada
      4. Usar useQuery({ queryKey: ['uniqueKey'], queryFn: fetcher })
      5. Destructurar { data, isLoading, error } de useQuery
      6. Agregar tipado genérico: useQuery<ResponseType>
    `,
    priority: 1,
    example: {
      before: `
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  fetchUsers();
}, []);`,
      after: `
import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
}

const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch('/api/users');
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

// En el componente:
const { data: users = [], isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});`
    },
    isCritical: true
  },
  
  {
    id: 'axios-post-to-mutation',
    category: 'fetching',
    name: 'axios POST/PUT/DELETE a useMutation',
    detectPattern: 'axios.post/put/delete en handlers o useEffect',
    transformInstruction: `
      Convertir mutaciones manuales a useMutation:
      1. Crear función mutationFn async
      2. Usar useMutation({ mutationFn, onSuccess, onError })
      3. Llamar mutation.mutate(data) en el handler
      4. Usar mutation.isPending para loading state
      5. Invalidar queries relacionadas en onSuccess
    `,
    priority: 2,
    example: {
      before: `
const handleSubmit = async (data) => {
  setLoading(true);
  try {
    await axios.post('/api/users', data);
    setSuccess(true);
    fetchUsers(); // refetch manual
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};`,
      after: `
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const createUser = useMutation({
  mutationFn: (data: CreateUserDto) => 
    fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(res => res.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});

const handleSubmit = (data: CreateUserDto) => {
  createUser.mutate(data);
};`
    },
    isCritical: true
  },
  
  // -------------------------------------------------------------------------
  // ROUTING: React Router v5 -> v6/v7
  // -------------------------------------------------------------------------
  {
    id: 'switch-to-routes',
    category: 'routing',
    name: '<Switch> a <Routes>',
    detectPattern: '<Switch> component',
    transformInstruction: `
      Migrar de React Router v5 a v6:
      1. Cambiar <Switch> por <Routes>
      2. Cambiar <Route component={X}> por <Route element={<X />}>
      3. Cambiar <Route render={...}> por <Route element={...}>
      4. Eliminar prop exact (ya no es necesario)
      5. Rutas anidadas deben usar Outlet
    `,
    priority: 1,
    example: {
      before: `
<Switch>
  <Route exact path="/" component={Home} />
  <Route path="/users" render={() => <Users data={data} />} />
  <Route component={NotFound} />
</Switch>`,
      after: `
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/users" element={<Users data={data} />} />
  <Route path="*" element={<NotFound />} />
</Routes>`
    },
    isCritical: true
  },
  
  {
    id: 'withrouter-to-hooks',
    category: 'routing',
    name: 'withRouter() a Hooks',
    detectPattern: 'withRouter(Component) HOC',
    transformInstruction: `
      Eliminar HOC withRouter:
      1. Quitar withRouter() del export
      2. Reemplazar this.props.history.push() por navigate() de useNavigate()
      3. Reemplazar this.props.match.params por useParams()
      4. Reemplazar this.props.location por useLocation()
    `,
    priority: 1,
    example: {
      before: `
class UserDetail extends Component {
  goBack = () => {
    this.props.history.push('/users');
  };
  render() {
    const { id } = this.props.match.params;
    return <div>User {id}</div>;
  }
}
export default withRouter(UserDetail);`,
      after: `
import { useNavigate, useParams } from 'react-router-dom';

export function UserDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const goBack = () => navigate('/users');
  
  return <div>User {id}</div>;
}`
    },
    isCritical: true
  },
  
  // -------------------------------------------------------------------------
  // COMPONENTS: Class -> Functional
  // -------------------------------------------------------------------------
  {
    id: 'class-to-functional',
    category: 'components',
    name: 'Class Component a Functional',
    detectPattern: 'class X extends Component o React.Component',
    transformInstruction: `
      Convertir Class Component a Functional Component:
      1. Cambiar class X extends Component a function X() o const X = () =>
      2. this.state -> useState() hooks (un hook por propiedad si son independientes)
      3. this.setState -> función setter del useState
      4. componentDidMount -> useEffect(..., [])
      5. componentDidUpdate -> useEffect(..., [deps])
      6. componentWillUnmount -> useEffect return cleanup
      7. this.props -> destructuring en parámetros
      8. Eliminar constructor, bind(this)
      9. Métodos de clase -> funciones o useCallback
    `,
    priority: 1,
    example: {
      before: `
class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this);
  }
  
  componentDidMount() {
    document.title = \`Count: \${this.state.count}\`;
  }
  
  componentDidUpdate() {
    document.title = \`Count: \${this.state.count}\`;
  }
  
  increment() {
    this.setState({ count: this.state.count + 1 });
  }
  
  render() {
    return (
      <button onClick={this.increment}>
        {this.state.count}
      </button>
    );
  }
}`,
      after: `
import { useState, useEffect } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);
  
  const increment = () => setCount(prev => prev + 1);
  
  return (
    <button onClick={increment}>
      {count}
    </button>
  );
}`
    },
    isCritical: true
  },
  
  // -------------------------------------------------------------------------
  // TYPESCRIPT
  // -------------------------------------------------------------------------
  {
    id: 'proptypes-to-typescript',
    category: 'typescript',
    name: 'PropTypes a TypeScript Interface',
    detectPattern: 'Component.propTypes = { ... }',
    transformInstruction: `
      Convertir PropTypes a TypeScript:
      1. Eliminar import PropTypes
      2. Eliminar Component.propTypes = { }
      3. Crear interface Props con tipado equivalente
      4. PropTypes.string -> string
      5. PropTypes.number -> number
      6. PropTypes.bool -> boolean
      7. PropTypes.func -> () => void o tipo específico
      8. PropTypes.array -> T[] con tipo específico
      9. PropTypes.object -> interface específica
      10. isRequired -> sin ? en la propiedad
    `,
    priority: 2,
    example: {
      before: `
import PropTypes from 'prop-types';

function User({ name, age, onUpdate }) {
  return <div>{name} - {age}</div>;
}

User.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
  onUpdate: PropTypes.func.isRequired,
};`,
      after: `
interface UserProps {
  name: string;
  age?: number;
  onUpdate: (id: string) => void;
}

export function User({ name, age, onUpdate }: UserProps) {
  return <div>{name} - {age}</div>;
}`
    },
    isCritical: true
  },
  
  {
    id: 'remove-any-types',
    category: 'typescript',
    name: 'Eliminar tipos any',
    detectPattern: ': any o as any',
    transformInstruction: `
      Reemplazar any por tipos específicos:
      1. Analizar el uso de la variable para inferir tipo
      2. Si es respuesta de API, crear interface para el response
      3. Si es evento, usar React.ChangeEvent<HTMLInputElement> etc
      4. Si es desconocido genuinamente, usar unknown con type guards
      5. Nunca dejar any sin comentario explicativo
    `,
    priority: 3,
    example: {
      before: `
const handleChange = (e: any) => {
  setValue(e.target.value);
};

const data: any = await fetchData();`,
      after: `
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

interface ApiResponse {
  id: string;
  items: Item[];
}
const data: ApiResponse = await fetchData();`
    },
    isCritical: false
  },
  
  // -------------------------------------------------------------------------
  // STYLING
  // -------------------------------------------------------------------------
  {
    id: 'inline-styles-to-tailwind',
    category: 'styling',
    name: 'Inline Styles a Tailwind',
    detectPattern: 'style={{ marginTop: X, padding: Y }}',
    transformInstruction: `
      Convertir inline styles a clases Tailwind:
      1. marginTop: 10 -> mt-2.5 (4px = 1 unit)
      2. padding: 20 -> p-5
      3. display: 'flex' -> flex
      4. flexDirection: 'column' -> flex-col
      5. backgroundColor: '#fff' -> bg-white
      6. color: '#333' -> text-gray-700
      7. Valores dinámicos: usar className con template literals
    `,
    priority: 3,
    example: {
      before: `
<div style={{ 
  display: 'flex', 
  flexDirection: 'column',
  padding: 20,
  backgroundColor: '#f5f5f5'
}}>
  <span style={{ marginBottom: 10, fontWeight: 'bold' }}>
    Title
  </span>
</div>`,
      after: `
<div className="flex flex-col p-5 bg-gray-100">
  <span className="mb-2.5 font-bold">
    Title
  </span>
</div>`
    },
    isCritical: false
  },
  
  // -------------------------------------------------------------------------
  // SECURITY
  // -------------------------------------------------------------------------
  {
    id: 'sanitize-innerhtml',
    category: 'security',
    name: 'Sanitizar dangerouslySetInnerHTML',
    detectPattern: 'dangerouslySetInnerHTML={{ __html: X }}',
    transformInstruction: `
      Asegurar uso de dangerouslySetInnerHTML:
      1. Importar DOMPurify
      2. Sanitizar contenido: DOMPurify.sanitize(html)
      3. Si es posible, evitar dangerouslySetInnerHTML y usar alternativas
      4. Agregar comentario explicando por qué es necesario
    `,
    priority: 1,
    example: {
      before: `
<div dangerouslySetInnerHTML={{ __html: userContent }} />`,
      after: `
import DOMPurify from 'dompurify';

// SECURITY: Contenido sanitizado de markdown/rich-text editor
<div 
  dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(userContent) 
  }} 
/>`
    },
    isCritical: true
  }
];

// ============================================================================
// MANIFEST PERSISTENCE
// ============================================================================

const MANIFEST_DIR = '.osmosis';
const MANIFEST_FILENAME = 'architecture-manifest.json';

export class ManifestManager {
  /**
   * Guarda el manifiesto en el proyecto
   */
  static async save(projectRoot: string, manifest: ArchitectureManifest): Promise<string> {
    const dir = path.join(projectRoot, MANIFEST_DIR);
    const filePath = path.join(dir, MANIFEST_FILENAME);
    
    // Crear directorio si no existe
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Guardar con formato legible
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
    
    console.log(`✅ Manifiesto guardado en: ${filePath}`);
    return filePath;
  }
  
  /**
   * Carga el manifiesto desde el proyecto
   */
  static async load(projectRoot: string): Promise<ArchitectureManifest | null> {
    const filePath = path.join(projectRoot, MANIFEST_DIR, MANIFEST_FILENAME);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ArchitectureManifest;
    } catch (e) {
      console.warn(`⚠️ Error cargando manifiesto: ${e}`);
      return null;
    }
  }
  
  /**
   * Verifica si existe un manifiesto
   */
  static exists(projectRoot: string): boolean {
    const filePath = path.join(projectRoot, MANIFEST_DIR, MANIFEST_FILENAME);
    return fs.existsSync(filePath);
  }
  
  /**
   * Elimina el manifiesto
   */
  static delete(projectRoot: string): void {
    const filePath = path.join(projectRoot, MANIFEST_DIR, MANIFEST_FILENAME);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// ============================================================================
// RULE SELECTOR
// ============================================================================

export class MigrationRuleSelector {
  /**
   * Selecciona las reglas aplicables basándose en el análisis de patrones
   */
  static selectRules(
    analysis: DeepPatternAnalysis,
    proposedStack: ProposedStack
  ): MigrationRule[] {
    const selectedRules: MigrationRule[] = [];
    
    // State Management Rules
    if (analysis.stateManagement.redux.connect > 0) {
      selectedRules.push(
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'redux-connect-to-hooks')!
      );
    }
    
    if (proposedStack.stateManagement.library === 'zustand' && 
        analysis.summary.primaryStateLib.includes('redux')) {
      selectedRules.push(
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'redux-to-zustand')!
      );
    }
    
    // Data Fetching Rules
    if (analysis.dataFetching.manual.useEffectAxios > 0 ||
        analysis.dataFetching.manual.useEffectFetch > 0) {
      selectedRules.push(
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'useeffect-fetch-to-query')!,
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'axios-post-to-mutation')!
      );
    }
    
    // Routing Rules
    if (analysis.routing.legacy.switch > 0) {
      selectedRules.push(
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'switch-to-routes')!
      );
    }
    
    if (analysis.routing.legacy.withRouter > 0) {
      selectedRules.push(
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'withrouter-to-hooks')!
      );
    }
    
    // Component Rules
    if (analysis.components.classComponents > 0) {
      selectedRules.push(
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'class-to-functional')!,
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'proptypes-to-typescript')!
      );
    }
    
    // TypeScript Rules (siempre aplicar)
    selectedRules.push(
      DEFAULT_MIGRATION_RULES.find(r => r.id === 'remove-any-types')!
    );
    
    // Styling Rules
    if (analysis.styling.inlineStyles.styleObjects > 0 &&
        proposedStack.styling.library === 'tailwind') {
      selectedRules.push(
        DEFAULT_MIGRATION_RULES.find(r => r.id === 'inline-styles-to-tailwind')!
      );
    }
    
    // Security Rules (siempre aplicar)
    selectedRules.push(
      DEFAULT_MIGRATION_RULES.find(r => r.id === 'sanitize-innerhtml')!
    );
    
    // Filtrar nulls y ordenar por prioridad
    return selectedRules
      .filter(Boolean)
      .sort((a, b) => a.priority - b.priority);
  }
}
