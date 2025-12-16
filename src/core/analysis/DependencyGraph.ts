import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import { PathResolver } from '../resolution/PathResolver.js';

export interface FileNode {
    id: string; // Absolute path
    dependencies: string[]; // List of file IDs this file depends on
    dependents: string[]; // List of file IDs that depend on this file
    type: 'jsp' | 'php' | 'js' | 'ts' | 'unknown';
    exports?: string[]; // Exported identifiers (for Knowledge Graph)
}

export class DependencyGraph {
    private nodes: Map<string, FileNode> = new Map();
    private pathResolver: PathResolver;

    constructor(private rootDir: string) {
        this.pathResolver = new PathResolver({
            projectRoot: rootDir
        });
    }

    public async build(): Promise<void> {
        const files = await glob(`${this.rootDir}/**/*.{js,jsx,ts,tsx,php,jsp}`);

        // 1. Initialize Nodes
        files.forEach((file: string) => {
            this.nodes.set(path.resolve(file), {
                id: path.resolve(file),
                dependencies: [],
                dependents: [],
                type: this.detectType(file),
                exports: []
            });
        });

        // 2. Scan Dependencies usando AST (no regex!)
        for (const file of files) {
            const filePath = path.resolve(file);
            const node = this.nodes.get(filePath);
            
            if (!node) continue;
            
            // Parsear según tipo de archivo
            if (node.type === 'js' || node.type === 'ts') {
                await this.scanJavaScriptAST(filePath);
            } else if (node.type === 'php') {
                await this.scanPHPRegex(filePath); // Fallback a regex para PHP
            } else if (node.type === 'jsp') {
                await this.scanJSPRegex(filePath); // Fallback a regex para JSP
            }
        }
    }

    /**
     * AST Parsing para JavaScript/TypeScript (ROBUSTO)
     */
    private async scanJavaScriptAST(filePath: string): Promise<void> {
        const node = this.nodes.get(filePath);
        if (!node) return;

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

            // Visitor pattern para encontrar imports
            const imports: string[] = [];
            const exports: string[] = [];

            const visit = (node: ts.Node) => {
                // Import statements
                if (ts.isImportDeclaration(node)) {
                    const moduleSpecifier = node.moduleSpecifier;
                    if (ts.isStringLiteral(moduleSpecifier)) {
                        imports.push(moduleSpecifier.text);
                    }
                }
                
                // Export declarations (para Knowledge Graph)
                if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
                    // Export { ... }
                    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
                        node.exportClause.elements.forEach(elem => {
                            exports.push(elem.name.text);
                        });
                    }
                }
                
                // Named exports (export function foo, export const bar)
                const hasExportModifier = ts.canHaveModifiers(node) && 
                    ts.getModifiers(node)?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword);
                
                if (hasExportModifier) {
                    if (ts.isFunctionDeclaration(node) && node.name) {
                        exports.push(node.name.text);
                    } else if (ts.isVariableStatement(node)) {
                        node.declarationList.declarations.forEach(decl => {
                            if (ts.isIdentifier(decl.name)) {
                                exports.push(decl.name.text);
                            }
                        });
                    } else if (ts.isClassDeclaration(node) && node.name) {
                        exports.push(node.name.text);
                    }
                }

                ts.forEachChild(node, visit);
            };

            visit(sourceFile);

            // Guardar exports para Knowledge Graph
            this.nodes.get(filePath)!.exports = exports;

            // Resolver paths con PathResolver
            imports.forEach(importPath => {
                const resolved = this.pathResolver.resolve(importPath, filePath);
                if (resolved && this.nodes.has(resolved)) {
                    node.dependencies.push(resolved);
                    this.nodes.get(resolved)!.dependents.push(filePath);
                }
            });

        } catch (error) {
            console.warn(`⚠️  Error parsing ${filePath}: ${error}`);
            // Fallback a regex si AST falla
            await this.scanJavaScriptRegex(filePath);
        }
    }

    /**
     * Fallback: Regex parsing para JavaScript (legacy)
     */
    private async scanJavaScriptRegex(filePath: string): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf-8');
        const node = this.nodes.get(filePath);
        if (!node) return;

        const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
        const requireRegex = /require\(['"](.+)['"]\)/g;
        
        const matches: string[] = [];
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        
        while ((match = requireRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }

        matches.forEach(importPath => {
            const resolved = this.pathResolver.resolve(importPath, filePath);
            if (resolved && this.nodes.has(resolved)) {
                node.dependencies.push(resolved);
                this.nodes.get(resolved)!.dependents.push(filePath);
            }
        });
    }

    /**
     * PHP parsing (regex-based, pero robusto)
     */
    private async scanPHPRegex(filePath: string): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf-8');
        const node = this.nodes.get(filePath);
        if (!node) return;

        const includeRegex = /(?:include|require|include_once|require_once)\s*\(?\s*['"](.+)['"]\s*\)?/g;
        const matches: string[] = [];
        let match;

        while ((match = includeRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }

        matches.forEach(importPath => {
            const resolved = this.pathResolver.resolve(importPath, filePath);
            if (resolved && this.nodes.has(resolved)) {
                node.dependencies.push(resolved);
                this.nodes.get(resolved)!.dependents.push(filePath);
            }
        });
    }

    /**
     * JSP parsing (regex-based)
     */
    private async scanJSPRegex(filePath: string): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf-8');
        const node = this.nodes.get(filePath);
        if (!node) return;

        const jspIncludeRegex = /<%@\s*include\s+file=['"](.+)['"]\s*%>/g;
        const matches: string[] = [];
        let match;

        while ((match = jspIncludeRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }

        matches.forEach(importPath => {
            const resolved = this.pathResolver.resolve(importPath, filePath);
            if (resolved && this.nodes.has(resolved)) {
                node.dependencies.push(resolved);
                this.nodes.get(resolved)!.dependents.push(filePath);
            }
        });
    }

    private detectType(file: string): FileNode['type'] {
        if (file.endsWith('.php')) return 'php';
        if (file.endsWith('.jsp')) return 'jsp';
        if (file.match(/\.tsx?$/)) return 'ts';
        if (file.match(/\.jsx?$/)) return 'js';
        return 'unknown';
    }

    /**
     * Returns the "Bottom-Up" migration order. 
     * Items with 0 dependencies (leafs) come first.
     */
    public getMigrationOrder(): string[] {
        const visited = new Set<string>();
        const order: string[] = [];

        const visit = (nodeId: string) => {
            if (visited.has(nodeId)) return;
            const node = this.nodes.get(nodeId);
            if (!node) return;

            // Depth First Search
            node.dependencies.forEach(depId => visit(depId));

            visited.add(nodeId);
            order.push(nodeId);
        };

        this.nodes.forEach(node => visit(node.id));
        return order;
    }

    public getComplexity(filePath: string): number {
        // Simple heuristic: Line count / imports count
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').length;
        return lines;
    }

    public getNode(filePath: string): FileNode | undefined {
        return this.nodes.get(path.resolve(filePath));
    }

    public getAllNodes(): FileNode[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Knowledge Graph: Get exported identifiers by file
     */
    public getExportsMap(): Map<string, string[]> {
        const exportsMap = new Map<string, string[]>();
        
        this.nodes.forEach((node, filePath) => {
            if (node.exports && node.exports.length > 0) {
                exportsMap.set(filePath, node.exports);
            }
        });
        
        return exportsMap;
    }

    public getStats() {
        return {
            totalFiles: this.nodes.size,
            byType: {
                jsp: this.countByType('jsp'),
                php: this.countByType('php'),
                js: this.countByType('js'),
                ts: this.countByType('ts'),
                unknown: this.countByType('unknown')
            },
            totalExports: Array.from(this.nodes.values()).reduce((sum, node) => sum + (node.exports?.length || 0), 0)
        };
    }

    private countByType(type: FileNode['type']): number {
        let count = 0;
        this.nodes.forEach(node => {
            if (node.type === type) count++;
        });
        return count;
    }
}
