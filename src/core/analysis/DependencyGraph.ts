import fs from 'fs';
import path from 'path';
import glob from 'glob';

export interface FileNode {
    id: string; // Absolute path
    dependencies: string[]; // List of file IDs this file depends on
    dependents: string[]; // List of file IDs that depend on this file
    type: 'jsp' | 'php' | 'js' | 'unknown';
}

export class DependencyGraph {
    private nodes: Map<string, FileNode> = new Map();

    constructor(private rootDir: string) { }

    public async build(): Promise<void> {
        const files = glob.sync(`${this.rootDir}/**/*.{js,jsx,ts,tsx,php,jsp}`);

        // 1. Initialize Nodes
        files.forEach(file => {
            this.nodes.set(path.resolve(file), {
                id: path.resolve(file),
                dependencies: [],
                dependents: [],
                type: this.detectType(file)
            });
        });

        // 2. Scan Dependencies
        for (const file of files) {
            await this.scanFile(path.resolve(file));
        }
    }

    private detectType(file: string): FileNode['type'] {
        if (file.endsWith('.php')) return 'php';
        if (file.endsWith('.jsp')) return 'jsp';
        if (file.match(/\.(js|ts)x?$/)) return 'js';
        return 'unknown';
    }

    private async scanFile(filePath: string) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const node = this.nodes.get(filePath);
        if (!node) return;

        // Regex Strategies per tech
        let matches: string[] = [];

        if (node.type === 'js') {
            // Import statements: import ... from './path'
            const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
            const requireRegex = /require\(['"](.+)['"]\)/g;
            matches = [...this.extractPaths(content, importRegex), ...this.extractPaths(content, requireRegex)];
        }
        else if (node.type === 'php') {
            // PHP includes: include 'path'; require_once('path');
            const includeRegex = /(?:include|require|include_once|require_once)\s*\(?\s*['"](.+)['"]\s*\)?/g;
            matches = this.extractPaths(content, includeRegex);
        }
        else if (node.type === 'jsp') {
            // JSP includes: <%@ include file="..." %> or <jsp:include page="..." />
            const jspIncludeRegex = /<%@\s*include\s+file=['"](.+)['"]\s*%>/g;
            matches = this.extractPaths(content, jspIncludeRegex);
        }

        // Resolve Paths
        matches.forEach(relPath => {
            const absPath = this.resolveImport(filePath, relPath);
            if (absPath && this.nodes.has(absPath)) {
                node.dependencies.push(absPath);
                this.nodes.get(absPath)?.dependents.push(filePath);
            }
        });
    }

    private extractPaths(content: string, regex: RegExp): string[] {
        const paths: string[] = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            paths.push(match[1]);
        }
        return paths;
    }

    private resolveImport(sourceFile: string, importPath: string): string | null {
        // Basic resolution strategy (can be improved for Aliases provided in tsconfig)
        try {
            const dir = path.dirname(sourceFile);
            const candidates = [
                path.resolve(dir, importPath),
                path.resolve(dir, importPath + '.js'),
                path.resolve(dir, importPath + '.ts'),
                path.resolve(dir, importPath + '.tsx'),
                path.resolve(dir, importPath + '.php'),
                path.resolve(dir, importPath + '.jsp'),
            ];

            for (const c of candidates) {
                if (fs.existsSync(c)) return c;
            }
        } catch (e) { return null; }
        return null;
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
}
