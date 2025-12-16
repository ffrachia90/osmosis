/**
 * PathResolver - Resolución Robusta de Paths con Aliases
 * Soporta: @/, ~, tsconfig paths, webpack aliases
 */

import fs from 'fs';
import path from 'path';

export interface PathAlias {
  alias: string;
  path: string;
}

export interface ResolverConfig {
  projectRoot: string;
  aliases?: PathAlias[];
  extensions?: string[];
}

export class PathResolver {
  private projectRoot: string;
  private aliases: Map<string, string> = new Map();
  private extensions: string[];
  
  constructor(config: ResolverConfig) {
    this.projectRoot = config.projectRoot;
    this.extensions = config.extensions || ['.ts', '.tsx', '.js', '.jsx', '.json'];
    
    // Auto-detect aliases from tsconfig.json
    this.detectAliases();
    
    // Add manual aliases
    if (config.aliases) {
      config.aliases.forEach(({ alias, path: aliasPath }) => {
        this.aliases.set(alias, aliasPath);
      });
    }
  }
  
  /**
   * Resuelve un import path a ruta absoluta
   */
  resolve(importPath: string, fromFile: string): string | null {
    // 1. Node modules (ignorar)
    if (this.isNodeModule(importPath)) {
      return null;
    }
    
    // 2. Absolute path
    if (path.isAbsolute(importPath)) {
      return this.findWithExtensions(importPath);
    }
    
    // 3. Alias (@/, ~/, etc.)
    const aliasResolved = this.resolveAlias(importPath);
    if (aliasResolved) {
      return this.findWithExtensions(aliasResolved);
    }
    
    // 4. Relative path (./utils, ../components)
    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, importPath);
    return this.findWithExtensions(resolved);
  }
  
  /**
   * Detecta aliases desde tsconfig.json
   */
  private detectAliases(): void {
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    
    try {
      const content = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(content);
      
      const paths = tsconfig.compilerOptions?.paths;
      if (!paths) return;
      
      const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
      const baseUrlResolved = path.join(this.projectRoot, baseUrl);
      
      // Parse paths like: "@/*": ["src/*"]
      Object.entries(paths).forEach(([alias, targets]) => {
        if (Array.isArray(targets) && targets.length > 0) {
          // Remover /* del alias y target
          const aliasClean = alias.replace('/*', '');
          const targetClean = targets[0].replace('/*', '');
          const targetResolved = path.join(baseUrlResolved, targetClean);
          
          this.aliases.set(aliasClean, targetResolved);
        }
      });
      
      console.log(`✅ Detectados ${this.aliases.size} aliases desde tsconfig.json`);
      
    } catch (error) {
      // No tsconfig.json, usar defaults
      this.setDefaultAliases();
    }
  }
  
  /**
   * Aliases por defecto si no hay tsconfig
   */
  private setDefaultAliases(): void {
    this.aliases.set('@', path.join(this.projectRoot, 'src'));
    this.aliases.set('~', path.join(this.projectRoot, 'src'));
    this.aliases.set('@components', path.join(this.projectRoot, 'src/components'));
    this.aliases.set('@utils', path.join(this.projectRoot, 'src/utils'));
  }
  
  /**
   * Resuelve un alias (ej: @/components/Button → /project/src/components/Button)
   */
  private resolveAlias(importPath: string): string | null {
    for (const [alias, aliasPath] of this.aliases) {
      if (importPath.startsWith(alias + '/')) {
        const relativePart = importPath.slice(alias.length + 1);
        return path.join(aliasPath, relativePart);
      } else if (importPath === alias) {
        return aliasPath;
      }
    }
    return null;
  }
  
  /**
   * Busca archivo con diferentes extensiones
   */
  private findWithExtensions(filePath: string): string | null {
    // 1. Try exact path
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
    
    // 2. Try with extensions
    for (const ext of this.extensions) {
      const withExt = filePath + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return withExt;
      }
    }
    
    // 3. Try index file in directory
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      for (const ext of this.extensions) {
        const indexFile = path.join(filePath, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check si es un node module
   */
  private isNodeModule(importPath: string): boolean {
    // No empieza con ./ o ../ o /
    return !importPath.startsWith('./') && 
           !importPath.startsWith('../') && 
           !importPath.startsWith('/') &&
           !this.aliases.has(importPath.split('/')[0]);
  }
  
  /**
   * Get all configured aliases
   */
  getAliases(): Map<string, string> {
    return new Map(this.aliases);
  }
}

