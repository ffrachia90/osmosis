/**
 * CodebaseIndexer - Escanea el proyecto y construye el Knowledge Graph
 * Extrae componentes, funciones, types, patterns
 */

import * as ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { KnowledgeGraph, CodeEntity, EntityType } from './KnowledgeGraph.js';
import { DependencyGraph } from '../analysis/DependencyGraph.js';

export class CodebaseIndexer {
  private graph: KnowledgeGraph;
  private projectRoot: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.graph = new KnowledgeGraph();
  }
  
  /**
   * Indexa el codebase completo
   */
  async index(dependencyGraph: DependencyGraph): Promise<KnowledgeGraph> {
    console.log('🔍 Indexando codebase para Knowledge Graph...');
    
    const nodes = dependencyGraph.getAllNodes();
    let indexed = 0;
    
    for (const node of nodes) {
      // Solo indexar archivos JS/TS (no legacy PHP/JSP por ahora)
      if (node.type === 'js' || node.type === 'ts') {
        await this.indexFile(node.id, node.dependencies);
        indexed++;
      }
    }
    
    const stats = this.graph.getStats();
    console.log(`✅ Indexados ${indexed} archivos`);
    console.log(`   📦 ${stats.totalEntities} entidades totales`);
    console.log(`   🎨 ${stats.designSystem.components} componentes`);
    console.log(`   🎨 ${stats.designSystem.themeTokens} theme tokens`);
    console.log(`   🔧 ${stats.designSystem.patterns} patrones comunes`);
    
    return this.graph;
  }
  
  /**
   * Indexa un archivo individual
   */
  private async indexFile(filePath: string, dependencies: string[]): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Crear SourceFile con TypeScript Compiler API
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );
      
      // Visitor pattern para extraer entidades
      const visit = (node: ts.Node) => {
        // Funciones exportadas
        if (ts.isFunctionDeclaration(node) && node.name) {
          this.extractFunction(node, filePath, dependencies);
        }
        
        // Clases exportadas (componentes de clase React)
        if (ts.isClassDeclaration(node) && node.name) {
          this.extractClass(node, filePath, dependencies);
        }
        
        // Const/Let exportados (componentes funcionales, hooks, constantes)
        if (ts.isVariableStatement(node)) {
          this.extractVariables(node, filePath, dependencies);
        }
        
        // Interfaces/Types
        if (ts.isInterfaceDeclaration(node)) {
          this.extractInterface(node, filePath);
        }
        
        if (ts.isTypeAliasDeclaration(node)) {
          this.extractTypeAlias(node, filePath);
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(sourceFile);
      
    } catch (error) {
      console.warn(`⚠️  Error indexing ${filePath}: ${error}`);
    }
  }
  
  /**
   * Extrae función
   */
  private extractFunction(node: ts.FunctionDeclaration, filePath: string, dependencies: string[]): void {
    if (!node.name) return;
    
    const isExported = this.isExported(node);
    const name = node.name.text;
    const jsdoc = this.extractJSDoc(node);
    
    // Determinar tipo: utility o component
    const type: EntityType = this.isReactComponent(node) ? 'component' : 'function';
    
    const entity: CodeEntity = {
      id: `${filePath}:${name}`,
      name,
      type,
      filePath,
      exported: isExported,
      signature: this.getFunctionSignature(node),
      description: jsdoc,
      dependencies,
      returnType: this.getReturnType(node)
    };
    
    // Si es componente React, extraer props
    if (type === 'component') {
      entity.props = this.extractComponentProps(node);
    }
    
    this.graph.addEntity(entity);
  }
  
  /**
   * Extrae clase (puede ser componente React)
   */
  private extractClass(node: ts.ClassDeclaration, filePath: string, dependencies: string[]): void {
    if (!node.name) return;
    
    const isExported = this.isExported(node);
    const name = node.name.text;
    const jsdoc = this.extractJSDoc(node);
    
    // Detectar si hereda de React.Component
    const isReactComponent = node.heritageClauses?.some(clause => 
      clause.types.some(type => {
        const typeName = type.expression.getText();
        return typeName.includes('Component') || typeName.includes('PureComponent');
      })
    );
    
    const entity: CodeEntity = {
      id: `${filePath}:${name}`,
      name,
      type: isReactComponent ? 'component' : 'class',
      filePath,
      exported: isExported,
      description: jsdoc,
      dependencies
    };
    
    this.graph.addEntity(entity);
  }
  
  /**
   * Extrae variables (const Button = ..., export const primaryColor = ...)
   */
  private extractVariables(node: ts.VariableStatement, filePath: string, dependencies: string[]): void {
    const isExported = this.isExported(node);
    
    node.declarationList.declarations.forEach(decl => {
      if (!ts.isIdentifier(decl.name)) return;
      
      const name = decl.name.text;
      const jsdoc = this.extractJSDoc(node);
      
      // Detectar tipo de entidad
      let type: EntityType = 'constant';
      
      if (decl.initializer) {
        // Hook (useState, useEffect, custom hooks)
        if (name.startsWith('use')) {
          type = 'hook';
        }
        // Componente funcional React
        else if (this.isReactComponentVariable(decl)) {
          type = 'component';
        }
      }
      
      const entity: CodeEntity = {
        id: `${filePath}:${name}`,
        name,
        type,
        filePath,
        exported: isExported,
        signature: decl.initializer ? decl.initializer.getText().substring(0, 100) : undefined,
        description: jsdoc,
        dependencies
      };
      
      // Si es componente, extraer props
      if (type === 'component' && decl.initializer) {
        entity.props = this.extractComponentPropsFromVariable(decl);
      }
      
      this.graph.addEntity(entity);
    });
  }
  
  /**
   * Extrae interface
   */
  private extractInterface(node: ts.InterfaceDeclaration, filePath: string): void {
    const isExported = this.isExported(node);
    const name = node.name.text;
    const jsdoc = this.extractJSDoc(node);
    
    const entity: CodeEntity = {
      id: `${filePath}:${name}`,
      name,
      type: 'interface',
      filePath,
      exported: isExported,
      description: jsdoc,
      dependencies: []
    };
    
    // Si es Props interface, asociar con componente
    if (name.endsWith('Props')) {
      entity.tags = ['props'];
    }
    
    this.graph.addEntity(entity);
  }
  
  /**
   * Extrae type alias
   */
  private extractTypeAlias(node: ts.TypeAliasDeclaration, filePath: string): void {
    const isExported = this.isExported(node);
    const name = node.name.text;
    const jsdoc = this.extractJSDoc(node);
    
    const entity: CodeEntity = {
      id: `${filePath}:${name}`,
      name,
      type: 'type',
      filePath,
      exported: isExported,
      description: jsdoc,
      dependencies: []
    };
    
    this.graph.addEntity(entity);
  }
  
  // Helpers privados
  
  private isExported(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) && 
           ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
  }
  
  private extractJSDoc(node: ts.Node): string | undefined {
    const jsDocTags = ts.getJSDocTags(node);
    if (jsDocTags.length > 0) {
      return jsDocTags.map(tag => tag.comment).join(' ');
    }
    return undefined;
  }
  
  private getFunctionSignature(node: ts.FunctionDeclaration): string {
    const params = node.parameters.map(p => {
      const name = p.name.getText();
      const type = p.type ? `: ${p.type.getText()}` : '';
      return `${name}${type}`;
    }).join(', ');
    
    const returnType = node.type ? `: ${node.type.getText()}` : '';
    return `(${params})${returnType}`;
  }
  
  private getReturnType(node: ts.FunctionDeclaration): string | undefined {
    return node.type?.getText();
  }
  
  private isReactComponent(node: ts.FunctionDeclaration): boolean {
    // Heurística: retorna JSX
    const returnType = this.getReturnType(node);
    return returnType?.includes('JSX.Element') || 
           returnType?.includes('ReactElement') ||
           returnType?.includes('ReactNode') ||
           false;
  }
  
  private isReactComponentVariable(decl: ts.VariableDeclaration): boolean {
    if (!decl.initializer) return false;
    
    // Arrow function que retorna JSX
    if (ts.isArrowFunction(decl.initializer)) {
      const returnType = decl.initializer.type;
      if (returnType) {
        const typeText = returnType.getText();
        return typeText.includes('JSX.Element') || 
               typeText.includes('ReactElement') ||
               typeText.includes('React.FC');
      }
    }
    
    return false;
  }
  
  private extractComponentProps(node: ts.FunctionDeclaration): Record<string, string> {
    const props: Record<string, string> = {};
    
    // Buscar primer parámetro (props)
    if (node.parameters.length > 0) {
      const propsParam = node.parameters[0];
      if (propsParam.type && ts.isTypeLiteralNode(propsParam.type)) {
        propsParam.type.members.forEach(member => {
          if (ts.isPropertySignature(member) && member.name) {
            const propName = member.name.getText();
            const propType = member.type ? member.type.getText() : 'any';
            props[propName] = propType;
          }
        });
      }
    }
    
    return props;
  }
  
  private extractComponentPropsFromVariable(decl: ts.VariableDeclaration): Record<string, string> {
    // TODO: Implementar extracción de props de arrow functions
    return {};
  }
}

