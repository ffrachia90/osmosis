/**
 * Deep Pattern Scanner
 * Escanea el código fuente real para detectar patrones arquitectónicos
 * (State Management, Data Fetching, Routing, Styling)
 * 
 * A diferencia del análisis de package.json, esto analiza CÓMO se usa cada tecnología
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// ============================================================================
// INTERFACES
// ============================================================================

export interface StateManagementPatterns {
  redux: {
    connect: number;           // connect(mapState, mapDispatch)
    mapStateToProps: number;   // function mapStateToProps
    mapDispatchToProps: number;
    thunks: number;            // dispatch(thunk)
    sagas: number;             // yield takeEvery
    rtk: boolean;              // @reduxjs/toolkit imports
    slices: number;            // createSlice
  };
  mobx: {
    observables: number;       // @observable
    actions: number;           // @action
    computed: number;          // @computed
  };
  context: {
    providers: number;         // <Context.Provider>
    consumers: number;         // useContext(
    createContext: number;     // createContext(
  };
  zustand: {
    stores: number;            // create((set) =>
    useStore: number;          // useStore(
  };
  jotai: {
    atoms: number;             // atom(
    useAtom: number;           // useAtom(
  };
  recoil: {
    atoms: number;             // atom({ key:
    selectors: number;         // selector({ key:
  };
}

export interface DataFetchingPatterns {
  manual: {
    useEffectFetch: number;    // useEffect + fetch
    useEffectAxios: number;    // useEffect + axios
    componentDidMountFetch: number; // componentDidMount + fetch
  };
  reactQuery: {
    useQuery: number;
    useMutation: number;
    queryClient: number;
  };
  swr: {
    useSWR: number;
  };
  apollo: {
    useQuery: number;
    useMutation: number;
    gql: number;
  };
  rtk: {
    createApi: number;
    useGetQuery: number;
  };
}

export interface RoutingPatterns {
  version: 'v5' | 'v6' | 'v7' | 'unknown';
  legacy: {
    switch: number;            // <Switch>
    routeComponent: number;    // <Route component={X}>
    routeRender: number;       // <Route render={}>
    withRouter: number;        // withRouter(
    historyPush: number;       // history.push(
  };
  modern: {
    routes: number;            // <Routes>
    routeElement: number;      // <Route element={}>
    useNavigate: number;       // useNavigate()
    useParams: number;         // useParams()
    useLocation: number;       // useLocation()
    createBrowserRouter: number;
    loaders: number;           // loader: async
  };
}

export interface StylingPatterns {
  styledComponents: {
    styled: number;            // styled.div`
    css: number;               // css`
    version: 'v3' | 'v5' | 'v6' | 'unknown';
  };
  emotion: {
    styled: number;
    css: number;
  };
  cssModules: {
    imports: number;           // import styles from '*.module.css'
    usage: number;             // className={styles.X}
  };
  tailwind: {
    classes: number;           // className="flex ..."
    config: boolean;           // tailwind.config.js exists
  };
  inlineStyles: {
    styleObjects: number;      // style={{ }}
    cssInJs: number;           // sx={{ }} (MUI)
  };
  sass: {
    imports: number;           // import '*.scss'
    variables: number;         // $variable
  };
}

export interface ComponentPatterns {
  classComponents: number;     // class X extends Component
  functionalComponents: number; // function X() or const X = () =>
  hocs: number;                 // withX(Component)
  renderProps: number;          // render={props => }
  forwardRef: number;           // forwardRef(
  memo: number;                 // React.memo(
  hooks: {
    useState: number;
    useEffect: number;
    useCallback: number;
    useMemo: number;
    useRef: number;
    useReducer: number;
    customHooks: number;       // use[A-Z]
  };
}

export interface DeepPatternAnalysis {
  stateManagement: StateManagementPatterns;
  dataFetching: DataFetchingPatterns;
  routing: RoutingPatterns;
  styling: StylingPatterns;
  components: ComponentPatterns;
  
  // Métricas agregadas
  summary: {
    totalFiles: number;
    totalComponents: number;
    legacyScore: number;       // 0-100, más alto = más legacy
    primaryStateLib: string;
    primaryFetchLib: string;
    primaryStyling: string;
  };
}

// ============================================================================
// SCANNER IMPLEMENTATION
// ============================================================================

export class DeepPatternScanner {
  private fileContents: Map<string, string> = new Map();
  
  /**
   * Escanea un proyecto completo y retorna análisis profundo de patrones
   */
  async scan(projectRoot: string): Promise<DeepPatternAnalysis> {
    console.log('🔬 Iniciando escaneo profundo de patrones...');
    
    // 1. Obtener todos los archivos JS/TS/JSX/TSX
    const files = await this.getSourceFiles(projectRoot);
    console.log(`   📁 ${files.length} archivos encontrados`);
    
    // 2. Leer contenido de todos los archivos
    await this.loadFileContents(files);
    
    // 3. Analizar cada categoría
    const stateManagement = this.analyzeStateManagement();
    const dataFetching = this.analyzeDataFetching();
    const routing = this.analyzeRouting();
    const styling = await this.analyzeStyling(projectRoot);
    const components = this.analyzeComponents();
    
    // 4. Calcular resumen
    const summary = this.calculateSummary(
      stateManagement, 
      dataFetching, 
      routing, 
      styling, 
      components,
      files.length
    );
    
    return {
      stateManagement,
      dataFetching,
      routing,
      styling,
      components,
      summary
    };
  }
  
  // --------------------------------------------------------------------------
  // FILE LOADING
  // --------------------------------------------------------------------------
  
  private async getSourceFiles(projectRoot: string): Promise<string[]> {
    const patterns = [
      '**/*.js',
      '**/*.jsx', 
      '**/*.ts',
      '**/*.tsx'
    ];
    
    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**'
    ];
    
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        ignore: ignorePatterns,
        absolute: true
      });
      files.push(...matches);
    }
    
    return [...new Set(files)]; // Eliminar duplicados
  }
  
  private async loadFileContents(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        this.fileContents.set(file, content);
      } catch (e) {
        // Ignorar archivos que no se pueden leer
      }
    }
  }
  
  private getAllContent(): string {
    return Array.from(this.fileContents.values()).join('\n');
  }
  
  private countPattern(pattern: RegExp): number {
    let count = 0;
    for (const content of this.fileContents.values()) {
      const matches = content.match(pattern);
      count += matches ? matches.length : 0;
    }
    return count;
  }
  
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT ANALYSIS
  // --------------------------------------------------------------------------
  
  private analyzeStateManagement(): StateManagementPatterns {
    const allContent = this.getAllContent();
    
    return {
      redux: {
        connect: this.countPattern(/connect\s*\(\s*map/g),
        mapStateToProps: this.countPattern(/mapStateToProps/g),
        mapDispatchToProps: this.countPattern(/mapDispatchToProps/g),
        thunks: this.countPattern(/dispatch\s*\(\s*\w+\s*\(/g),
        sagas: this.countPattern(/yield\s+(takeEvery|takeLatest|put|call)/g),
        rtk: allContent.includes('@reduxjs/toolkit'),
        slices: this.countPattern(/createSlice\s*\(/g)
      },
      mobx: {
        observables: this.countPattern(/@observable/g),
        actions: this.countPattern(/@action/g),
        computed: this.countPattern(/@computed/g)
      },
      context: {
        providers: this.countPattern(/<\w+\.Provider/g),
        consumers: this.countPattern(/useContext\s*\(/g),
        createContext: this.countPattern(/createContext\s*\(/g)
      },
      zustand: {
        stores: this.countPattern(/create\s*\(\s*\(set\)/g),
        useStore: this.countPattern(/useStore\s*\(/g)
      },
      jotai: {
        atoms: this.countPattern(/\batom\s*\(/g),
        useAtom: this.countPattern(/useAtom\s*\(/g)
      },
      recoil: {
        atoms: this.countPattern(/atom\s*\(\s*\{[\s\S]*?key\s*:/g),
        selectors: this.countPattern(/selector\s*\(\s*\{[\s\S]*?key\s*:/g)
      }
    };
  }
  
  // --------------------------------------------------------------------------
  // DATA FETCHING ANALYSIS
  // --------------------------------------------------------------------------
  
  private analyzeDataFetching(): DataFetchingPatterns {
    return {
      manual: {
        useEffectFetch: this.countPattern(/useEffect\s*\([^)]*\{[\s\S]*?fetch\s*\(/g),
        useEffectAxios: this.countPattern(/useEffect\s*\([^)]*\{[\s\S]*?axios\./g),
        componentDidMountFetch: this.countPattern(/componentDidMount[\s\S]*?(fetch|axios)/g)
      },
      reactQuery: {
        useQuery: this.countPattern(/useQuery\s*\(/g),
        useMutation: this.countPattern(/useMutation\s*\(/g),
        queryClient: this.countPattern(/QueryClient/g)
      },
      swr: {
        useSWR: this.countPattern(/useSWR\s*\(/g)
      },
      apollo: {
        useQuery: this.countPattern(/useQuery\s*\(\s*gql/g),
        useMutation: this.countPattern(/useMutation\s*\(\s*gql/g),
        gql: this.countPattern(/gql`/g)
      },
      rtk: {
        createApi: this.countPattern(/createApi\s*\(/g),
        useGetQuery: this.countPattern(/use\w+Query\s*\(/g)
      }
    };
  }
  
  // --------------------------------------------------------------------------
  // ROUTING ANALYSIS
  // --------------------------------------------------------------------------
  
  private analyzeRouting(): RoutingPatterns {
    const allContent = this.getAllContent();
    
    const legacy = {
      switch: this.countPattern(/<Switch[\s>]/g),
      routeComponent: this.countPattern(/<Route[^>]+component\s*=/g),
      routeRender: this.countPattern(/<Route[^>]+render\s*=/g),
      withRouter: this.countPattern(/withRouter\s*\(/g),
      historyPush: this.countPattern(/history\.push\s*\(/g)
    };
    
    const modern = {
      routes: this.countPattern(/<Routes[\s>]/g),
      routeElement: this.countPattern(/<Route[^>]+element\s*=/g),
      useNavigate: this.countPattern(/useNavigate\s*\(\s*\)/g),
      useParams: this.countPattern(/useParams\s*\(\s*\)/g),
      useLocation: this.countPattern(/useLocation\s*\(\s*\)/g),
      createBrowserRouter: this.countPattern(/createBrowserRouter\s*\(/g),
      loaders: this.countPattern(/loader\s*:\s*(async\s*)?\(/g)
    };
    
    // Determinar versión
    let version: 'v5' | 'v6' | 'v7' | 'unknown' = 'unknown';
    
    if (modern.createBrowserRouter > 0 || modern.loaders > 0) {
      version = 'v7';
    } else if (modern.routes > 0 || modern.routeElement > 0) {
      version = 'v6';
    } else if (legacy.switch > 0 || legacy.routeComponent > 0) {
      version = 'v5';
    }
    
    return { version, legacy, modern };
  }
  
  // --------------------------------------------------------------------------
  // STYLING ANALYSIS
  // --------------------------------------------------------------------------
  
  private async analyzeStyling(projectRoot: string): Promise<StylingPatterns> {
    const tailwindConfigExists = fs.existsSync(path.join(projectRoot, 'tailwind.config.js')) ||
                                  fs.existsSync(path.join(projectRoot, 'tailwind.config.ts'));
    
    // Detectar versión de styled-components
    let scVersion: 'v3' | 'v5' | 'v6' | 'unknown' = 'unknown';
    try {
      const pkgPath = path.join(projectRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const scVersionStr = pkg.dependencies?.['styled-components'] || '';
        if (scVersionStr.includes('3.')) scVersion = 'v3';
        else if (scVersionStr.includes('5.')) scVersion = 'v5';
        else if (scVersionStr.includes('6.')) scVersion = 'v6';
      }
    } catch (e) {}
    
    return {
      styledComponents: {
        styled: this.countPattern(/styled\.\w+`/g),
        css: this.countPattern(/\bcss`/g),
        version: scVersion
      },
      emotion: {
        styled: this.countPattern(/@emotion\/styled/g),
        css: this.countPattern(/@emotion\/react/g)
      },
      cssModules: {
        imports: this.countPattern(/import\s+\w+\s+from\s+['"][^'"]+\.module\.(css|scss)['"]/g),
        usage: this.countPattern(/className\s*=\s*\{\s*styles\.\w+/g)
      },
      tailwind: {
        classes: this.countPattern(/className\s*=\s*["'][^"']*\b(flex|grid|p-|m-|bg-|text-|w-|h-)/g),
        config: tailwindConfigExists
      },
      inlineStyles: {
        styleObjects: this.countPattern(/style\s*=\s*\{\s*\{/g),
        cssInJs: this.countPattern(/\bsx\s*=\s*\{\s*\{/g)
      },
      sass: {
        imports: this.countPattern(/import\s+['"][^'"]+\.scss['"]/g),
        variables: this.countPattern(/\$[\w-]+\s*:/g)
      }
    };
  }
  
  // --------------------------------------------------------------------------
  // COMPONENT ANALYSIS
  // --------------------------------------------------------------------------
  
  private analyzeComponents(): ComponentPatterns {
    return {
      classComponents: this.countPattern(/class\s+\w+\s+extends\s+(React\.)?(Component|PureComponent)/g),
      functionalComponents: this.countPattern(/(function\s+[A-Z]\w*\s*\(|const\s+[A-Z]\w*\s*=\s*(\([^)]*\)|[\w]+)\s*=>)/g),
      hocs: this.countPattern(/with[A-Z]\w*\s*\(/g),
      renderProps: this.countPattern(/render\s*=\s*\{\s*\([^)]*\)\s*=>/g),
      forwardRef: this.countPattern(/forwardRef\s*\(/g),
      memo: this.countPattern(/(React\.)?memo\s*\(/g),
      hooks: {
        useState: this.countPattern(/useState\s*[<(]/g),
        useEffect: this.countPattern(/useEffect\s*\(/g),
        useCallback: this.countPattern(/useCallback\s*\(/g),
        useMemo: this.countPattern(/useMemo\s*\(/g),
        useRef: this.countPattern(/useRef\s*[<(]/g),
        useReducer: this.countPattern(/useReducer\s*\(/g),
        customHooks: this.countPattern(/\buse[A-Z][a-zA-Z0-9]*\s*\(/g)
      }
    };
  }
  
  // --------------------------------------------------------------------------
  // SUMMARY CALCULATION
  // --------------------------------------------------------------------------
  
  private calculateSummary(
    state: StateManagementPatterns,
    fetching: DataFetchingPatterns,
    routing: RoutingPatterns,
    styling: StylingPatterns,
    components: ComponentPatterns,
    totalFiles: number
  ): DeepPatternAnalysis['summary'] {
    
    // Calcular legacy score
    let legacyPoints = 0;
    
    // State legacy
    legacyPoints += state.redux.connect * 5;
    legacyPoints += state.redux.mapStateToProps * 3;
    legacyPoints += state.mobx.observables * 2;
    
    // Fetching legacy
    legacyPoints += fetching.manual.useEffectAxios * 4;
    legacyPoints += fetching.manual.useEffectFetch * 4;
    legacyPoints += fetching.manual.componentDidMountFetch * 5;
    
    // Routing legacy
    legacyPoints += routing.legacy.switch * 5;
    legacyPoints += routing.legacy.withRouter * 4;
    legacyPoints += routing.legacy.historyPush * 2;
    
    // Component legacy
    legacyPoints += components.classComponents * 10;
    legacyPoints += components.hocs * 3;
    legacyPoints += components.renderProps * 2;
    
    // Styling legacy
    legacyPoints += styling.inlineStyles.styleObjects * 2;
    
    const legacyScore = Math.min(100, Math.round(legacyPoints / Math.max(totalFiles, 1) * 10));
    
    // Determinar librerías primarias
    const primaryStateLib = this.determinePrimaryStateLib(state);
    const primaryFetchLib = this.determinePrimaryFetchLib(fetching);
    const primaryStyling = this.determinePrimaryStyling(styling);
    
    return {
      totalFiles,
      totalComponents: components.classComponents + components.functionalComponents,
      legacyScore,
      primaryStateLib,
      primaryFetchLib,
      primaryStyling
    };
  }
  
  private determinePrimaryStateLib(state: StateManagementPatterns): string {
    const scores = {
      'redux-legacy': state.redux.connect + state.redux.mapStateToProps,
      'redux-toolkit': state.redux.slices + (state.redux.rtk ? 10 : 0),
      'mobx': state.mobx.observables + state.mobx.actions,
      'context': state.context.providers + state.context.consumers,
      'zustand': state.zustand.stores + state.zustand.useStore,
      'jotai': state.jotai.atoms + state.jotai.useAtom,
      'recoil': state.recoil.atoms + state.recoil.selectors
    };
    
    const max = Math.max(...Object.values(scores));
    if (max === 0) return 'none';
    
    return Object.entries(scores).find(([_, v]) => v === max)?.[0] || 'unknown';
  }
  
  private determinePrimaryFetchLib(fetching: DataFetchingPatterns): string {
    const scores = {
      'manual': fetching.manual.useEffectAxios + fetching.manual.useEffectFetch,
      'react-query': fetching.reactQuery.useQuery + fetching.reactQuery.useMutation,
      'swr': fetching.swr.useSWR * 2,
      'apollo': fetching.apollo.useQuery + fetching.apollo.gql,
      'rtk-query': fetching.rtk.createApi + fetching.rtk.useGetQuery
    };
    
    const max = Math.max(...Object.values(scores));
    if (max === 0) return 'none';
    
    return Object.entries(scores).find(([_, v]) => v === max)?.[0] || 'unknown';
  }
  
  private determinePrimaryStyling(styling: StylingPatterns): string {
    const scores = {
      'styled-components': styling.styledComponents.styled,
      'emotion': styling.emotion.styled + styling.emotion.css,
      'css-modules': styling.cssModules.imports,
      'tailwind': styling.tailwind.classes + (styling.tailwind.config ? 10 : 0),
      'inline-styles': styling.inlineStyles.styleObjects,
      'sass': styling.sass.imports
    };
    
    const max = Math.max(...Object.values(scores));
    if (max === 0) return 'none';
    
    return Object.entries(scores).find(([_, v]) => v === max)?.[0] || 'unknown';
  }
}
