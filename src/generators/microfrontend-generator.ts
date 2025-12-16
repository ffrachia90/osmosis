/**
 * Micro Frontend Generator
 * Genera la estructura y configuración para arquitectura de micro frontends
 * Soporta Module Federation (Webpack 5), Single-SPA, y otras estrategias
 */

import { MicroFrontendArchitecture, MicroFrontendBoundary } from '../analyzers/microfrontend-analyzer';

export interface MicroFrontendProject {
  name: string;
  path: string;
  type: 'shell' | 'remote';
  files: GeneratedFile[];
  configuration: any;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'config' | 'component' | 'routing' | 'infrastructure';
}

export class MicroFrontendGenerator {
  /**
   * Genera todos los proyectos de micro frontends
   */
  async generate(architecture: MicroFrontendArchitecture): Promise<MicroFrontendProject[]> {
    const projects: MicroFrontendProject[] = [];
    
    // 1. Generar Shell App
    const shellApp = await this.generateShellApp(architecture);
    projects.push(shellApp);
    
    // 2. Generar cada Micro Frontend
    for (const mfe of architecture.microFrontends) {
      const mfeProject = await this.generateMicroFrontend(mfe, architecture);
      projects.push(mfeProject);
    }
    
    // 3. Generar shared libraries
    const sharedLib = await this.generateSharedLibrary(architecture);
    projects.push(sharedLib);
    
    return projects;
  }

  /**
   * Genera la Shell App (orquestador)
   */
  private async generateShellApp(architecture: MicroFrontendArchitecture): Promise<MicroFrontendProject> {
    const files: GeneratedFile[] = [];
    
    // Package.json
    files.push({
      path: 'package.json',
      type: 'config',
      content: this.generateShellPackageJson(architecture)
    });
    
    // Webpack config para Module Federation
    if (architecture.strategy === 'module-federation') {
      files.push({
        path: 'webpack.config.js',
        type: 'config',
        content: this.generateShellWebpackConfig(architecture)
      });
    }
    
    // App principal
    files.push({
      path: 'src/App.tsx',
      type: 'component',
      content: this.generateShellAppComponent(architecture)
    });
    
    // Router
    files.push({
      path: 'src/Router.tsx',
      type: 'routing',
      content: this.generateShellRouter(architecture)
    });
    
    // Layout
    files.push({
      path: 'src/Layout.tsx',
      type: 'component',
      content: this.generateShellLayout()
    });
    
    // MFE Loader
    files.push({
      path: 'src/components/MicroFrontendLoader.tsx',
      type: 'component',
      content: this.generateMFELoader()
    });
    
    // Error Boundary
    files.push({
      path: 'src/components/ErrorBoundary.tsx',
      type: 'component',
      content: this.generateErrorBoundary()
    });
    
    // Event Bus (si se usa)
    if (architecture.communicationStrategy === 'event-bus') {
      files.push({
        path: 'src/utils/eventBus.ts',
        type: 'infrastructure',
        content: this.generateEventBus()
      });
    }
    
    return {
      name: architecture.shell.name,
      path: `./${architecture.shell.name}`,
      type: 'shell',
      files,
      configuration: {
        port: 3000,
        strategy: architecture.strategy
      }
    };
  }

  /**
   * Genera un Micro Frontend individual
   */
  private async generateMicroFrontend(
    mfe: MicroFrontendBoundary,
    architecture: MicroFrontendArchitecture
  ): Promise<MicroFrontendProject> {
    const files: GeneratedFile[] = [];
    
    // Package.json
    files.push({
      path: 'package.json',
      type: 'config',
      content: this.generateMFEPackageJson(mfe)
    });
    
    // Webpack config
    if (architecture.strategy === 'module-federation') {
      files.push({
        path: 'webpack.config.js',
        type: 'config',
        content: this.generateMFEWebpackConfig(mfe, architecture)
      });
    }
    
    // Bootstrap (para Module Federation)
    files.push({
      path: 'src/bootstrap.tsx',
      type: 'infrastructure',
      content: this.generateMFEBootstrap(mfe)
    });
    
    // Entry point
    files.push({
      path: 'src/index.ts',
      type: 'infrastructure',
      content: `import('./bootstrap');`
    });
    
    // App principal del MFE
    files.push({
      path: 'src/App.tsx',
      type: 'component',
      content: this.generateMFEApp(mfe)
    });
    
    // Router del MFE
    files.push({
      path: 'src/Router.tsx',
      type: 'routing',
      content: this.generateMFERouter(mfe)
    });
    
    return {
      name: mfe.name,
      path: `./${mfe.name}`,
      type: 'remote',
      files,
      configuration: {
        port: 3000 + architecture.microFrontends.indexOf(mfe) + 1,
        exposedModules: ['./App']
      }
    };
  }

  /**
   * Genera librería compartida
   */
  private async generateSharedLibrary(architecture: MicroFrontendArchitecture): Promise<MicroFrontendProject> {
    const files: GeneratedFile[] = [];
    
    files.push({
      path: 'package.json',
      type: 'config',
      content: JSON.stringify({
        name: '@mfe/shared',
        version: '1.0.0',
        main: 'dist/index.js',
        peerDependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        }
      }, null, 2)
    });
    
    files.push({
      path: 'src/index.ts',
      type: 'infrastructure',
      content: `export * from './components';\nexport * from './hooks';\nexport * from './utils';`
    });
    
    return {
      name: 'shared',
      path: './shared',
      type: 'remote',
      files,
      configuration: {}
    };
  }

  // ===== GENERADORES DE CONTENIDO =====

  private generateShellPackageJson(architecture: MicroFrontendArchitecture): string {
    return JSON.stringify({
      name: 'shell-app',
      version: '1.0.0',
      scripts: {
        start: 'webpack serve --mode development',
        build: 'webpack --mode production',
        'type-check': 'tsc --noEmit'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.20.0'
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        typescript: '^5.3.0',
        webpack: '^5.89.0',
        'webpack-cli': '^5.1.4',
        'webpack-dev-server': '^4.15.0',
        '@module-federation/enhanced': '^0.2.0',
        'html-webpack-plugin': '^5.5.0',
        'ts-loader': '^9.5.0'
      }
    }, null, 2);
  }

  private generateShellWebpackConfig(architecture: MicroFrontendArchitecture): string {
    const remotes = architecture.microFrontends.map((mfe, idx) => 
      `${mfe.name}: '${mfe.name}@http://localhost:${3001 + idx}/remoteEntry.js'`
    ).join(',\n        ');

    return `const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
  },
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        ${remotes}
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.20.0' },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};`;
  }

  private generateShellAppComponent(architecture: MicroFrontendArchitecture): string {
    return `import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './Router';
import Layout from './Layout';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<div>Cargando...</div>}>
            <Router />
          </Suspense>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;`;
  }

  private generateShellRouter(architecture: MicroFrontendArchitecture): string {
    const routes = architecture.microFrontends.map(mfe => {
      const routePath = mfe.routes[0] || `/${mfe.name.replace('mfe-', '')}`;
      return `  <Route path="${routePath}/*" element={<${this.capitalize(mfe.name)}App />} />`;
    }).join('\n');

    const imports = architecture.microFrontends.map(mfe => 
      `const ${this.capitalize(mfe.name)}App = React.lazy(() => import('${mfe.name}/App'));`
    ).join('\n');

    return `import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Micro Frontends
${imports}

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
${routes}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const HomePage = () => <div><h1>Bienvenido</h1></div>;
const NotFound = () => <div><h1>404 - No encontrado</h1></div>;

export default Router;`;
  }

  private generateShellLayout(): string {
    return `import React from 'react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="header">
        <nav>
          <a href="/">Inicio</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/reports">Reportes</a>
        </nav>
      </header>
      <main className="content">
        {children}
      </main>
      <footer className="footer">
        © 2025 Mi Aplicación
      </footer>
    </div>
  );
};

export default Layout;`;
  }

  private generateMFELoader(): string {
    return `import React, { Suspense, ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface MicroFrontendLoaderProps {
  component: Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
}

const MicroFrontendLoader: React.FC<MicroFrontendLoaderProps> = ({ 
  component, 
  fallback = <div>Cargando módulo...</div> 
}) => {
  const LazyComponent = React.lazy(() => component);
  
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
};

export default MicroFrontendLoader;`;
  }

  private generateErrorBoundary(): string {
    return `import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error en Micro Frontend:', error, errorInfo);
    // Aquí puedes enviar el error a un servicio de logging
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee', border: '1px solid #f00' }}>
          <h2>⚠️ Error al cargar el módulo</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;`;
  }

  private generateEventBus(): string {
    return `type EventCallback = (data: any) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);

    // Retorna función de unsuscribe
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  publish(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  clear(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export const eventBus = new EventBus();
export default eventBus;`;
  }

  private generateMFEPackageJson(mfe: MicroFrontendBoundary): string {
    return JSON.stringify({
      name: mfe.name,
      version: '1.0.0',
      scripts: {
        start: `webpack serve --mode development --port ${3001 + Math.random() * 100}`,
        build: 'webpack --mode production',
        'type-check': 'tsc --noEmit'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.20.0',
        ...mfe.dependencies.external.reduce((acc, dep) => ({ ...acc, [dep]: 'latest' }), {})
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        typescript: '^5.3.0',
        webpack: '^5.89.0',
        'webpack-cli': '^5.1.4',
        'webpack-dev-server': '^4.15.0',
        '@module-federation/enhanced': '^0.2.0',
        'html-webpack-plugin': '^5.5.0',
        'ts-loader': '^9.5.0'
      }
    }, null, 2);
  }

  private generateMFEWebpackConfig(mfe: MicroFrontendBoundary, architecture: MicroFrontendArchitecture): string {
    const port = 3001 + architecture.microFrontends.indexOf(mfe);
    
    return `const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    port: ${port},
    historyApiFallback: true,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: '${mfe.name}',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.20.0' },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};`;
  }

  private generateMFEBootstrap(mfe: MicroFrontendBoundary): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  private generateMFEApp(mfe: MicroFrontendBoundary): string {
    return `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="${mfe.name}">
      <h1>${this.capitalize(mfe.name.replace('mfe-', ''))} Module</h1>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/details" element={<DetailsPage />} />
      </Routes>
    </div>
  );
};

const HomePage = () => <div>Home de ${mfe.name}</div>;
const DetailsPage = () => <div>Detalles de ${mfe.name}</div>;

export default App;`;
  }

  private generateMFERouter(mfe: MicroFrontendBoundary): string {
    return `import React from 'react';
import { Routes, Route } from 'react-router-dom';

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Main ${mfe.name}</div>} />
    </Routes>
  );
};

export default Router;`;
  }

  private capitalize(str: string): string {
    return str.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }
}

