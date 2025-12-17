/**
 * EntityExtractor - Extrae código real, docstrings y metadata de entidades
 * Información completa para RAG semántico
 */

import * as ts from 'typescript';
import fs from 'fs';

export interface ExtractedEntity {
  id: string;
  type: 'component' | 'function' | 'interface' | 'constant' | 'hook';
  filePath: string;
  sourceCode: string; // El código real de la función/componente
  docstring?: string; // JSDoc o comentario
  signature?: string; // Type signature
  dependencies: string[];
  metadata: {
    lineStart: number;
    lineEnd: number;
    complexity?: number; // Cyclomatic complexity (opcional)
  };
}

export class EntityExtractor {
  /**
   * Extrae entidades completas de un archivo con código real
   */
  static extractFromFile(filePath: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );
      
      const visit = (node: ts.Node) => {
        // Funciones exportadas
        if (ts.isFunctionDeclaration(node) && node.name) {
          const entity = this.extractFunction(node, filePath, content);
          if (entity) entities.push(entity);
        }
        
        // Const/Let exportados
        if (ts.isVariableStatement(node)) {
          const extracted = this.extractVariables(node, filePath, content);
          entities.push(...extracted);
        }
        
        // Interfaces
        if (ts.isInterfaceDeclaration(node)) {
          const entity = this.extractInterface(node, filePath, content);
          if (entity) entities.push(entity);
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(sourceFile);
      
    } catch (error) {
      console.warn(`⚠️  Error extracting from ${filePath}: ${error}`);
    }
    
    return entities;
  }
  
  /**
   * Extrae función con código completo
   */
  private static extractFunction(
    node: ts.FunctionDeclaration,
    filePath: string,
    fileContent: string
  ): ExtractedEntity | null {
    if (!node.name) return null;
    
    const name = node.name.text;
    const isExported = this.isExported(node);
    
    if (!isExported) return null; // Solo exportados
    
    // Extraer código fuente real
    const sourceCode = node.getText();
    
    // Extraer JSDoc
    const docstring = this.extractJSDoc(node);
    
    // Calcular líneas
    const sourceFileObj = node.getSourceFile();
    const lineStart = sourceFileObj.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const lineEnd = sourceFileObj.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    
    // Type signature
    const signature = this.getFunctionSignature(node);
    
    // Determinar tipo
    const type = this.isReactComponent(node) ? 'component' : 
                 name.startsWith('use') ? 'hook' : 'function';
    
    return {
      id: name,
      type,
      filePath,
      sourceCode,
      docstring,
      signature,
      dependencies: this.extractDependencies(node),
      metadata: {
        lineStart,
        lineEnd,
        complexity: this.calculateComplexity(node)
      }
    };
  }
  
  /**
   * Extrae variables (const, let) exportadas
   */
  private static extractVariables(
    node: ts.VariableStatement,
    filePath: string,
    fileContent: string
  ): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const isExported = this.isExported(node);
    
    if (!isExported) return [];
    
    node.declarationList.declarations.forEach(decl => {
      if (!ts.isIdentifier(decl.name)) return;
      
      const name = decl.name.text;
      const sourceCode = decl.getText();
      const docstring = this.extractJSDoc(node);
      
      const sourceFileObj = node.getSourceFile();
      const lineStart = sourceFileObj.getLineAndCharacterOfPosition(decl.getStart()).line + 1;
      const lineEnd = sourceFileObj.getLineAndCharacterOfPosition(decl.getEnd()).line + 1;
      
      // Determinar tipo
      let type: ExtractedEntity['type'] = 'constant';
      if (name.startsWith('use')) type = 'hook';
      else if (decl.initializer && this.isReactComponentVariable(decl)) type = 'component';
      
      entities.push({
        id: name,
        type,
        filePath,
        sourceCode,
        docstring,
        dependencies: [],
        metadata: {
          lineStart,
          lineEnd
        }
      });
    });
    
    return entities;
  }
  
  /**
   * Extrae interface
   */
  private static extractInterface(
    node: ts.InterfaceDeclaration,
    filePath: string,
    fileContent: string
  ): ExtractedEntity | null {
    const isExported = this.isExported(node);
    if (!isExported) return null;
    
    const name = node.name.text;
    const sourceCode = node.getText();
    const docstring = this.extractJSDoc(node);
    
    const sourceFileObj = node.getSourceFile();
    const lineStart = sourceFileObj.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const lineEnd = sourceFileObj.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    
    return {
      id: name,
      type: 'interface',
      filePath,
      sourceCode,
      docstring,
      dependencies: [],
      metadata: {
        lineStart,
        lineEnd
      }
    };
  }
  
  // Helper methods
  
  private static isExported(node: ts.Node): boolean {
    return ts.canHaveModifiers(node) && 
           ts.getModifiers(node)?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword) || false;
  }
  
  private static extractJSDoc(node: ts.Node): string | undefined {
    const jsDoc = (node as any).jsDoc;
    if (jsDoc && jsDoc.length > 0) {
      return jsDoc[0].comment || undefined;
    }
    return undefined;
  }
  
  private static getFunctionSignature(node: ts.FunctionDeclaration): string {
    const params = node.parameters.map(p => {
      const name = p.name.getText();
      const type = p.type ? `: ${p.type.getText()}` : '';
      return `${name}${type}`;
    }).join(', ');
    
    const returnType = node.type ? `: ${node.type.getText()}` : '';
    return `(${params})${returnType}`;
  }
  
  private static isReactComponent(node: ts.FunctionDeclaration): boolean {
    const returnType = node.type?.getText();
    return returnType?.includes('JSX.Element') || 
           returnType?.includes('ReactElement') ||
           returnType?.includes('ReactNode') ||
           false;
  }
  
  private static isReactComponentVariable(decl: ts.VariableDeclaration): boolean {
    if (!decl.initializer) return false;
    
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
  
  private static extractDependencies(node: ts.FunctionDeclaration): string[] {
    // TODO: Extraer imports usados dentro de la función
    return [];
  }
  
  private static calculateComplexity(node: ts.FunctionDeclaration): number {
    // Simple cyclomatic complexity
    let complexity = 1;
    
    const visit = (n: ts.Node) => {
      if (ts.isIfStatement(n) || 
          ts.isWhileStatement(n) || 
          ts.isForStatement(n) ||
          ts.isConditionalExpression(n) ||
          ts.isCaseClause(n)) {
        complexity++;
      }
      
      ts.forEachChild(n, visit);
    };
    
    visit(node);
    return complexity;
  }
}


