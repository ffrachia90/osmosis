#!/usr/bin/env node
/**
 * Osmosis MCP Server - Model Context Protocol Integration for Cursor
 * Provides legacy code analysis and migration tools directly in Cursor IDE
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { LegacyDetector } from '../analyzers/legacy-detector.js';
import { DependencyGraph } from '../core/analysis/DependencyGraph.js';
import { TechDebtAnalyzer } from '../core/analysis/TechDebtAnalyzer.js';
import { CodeSafeGuard } from '../core/safeguard/validator.js';
import { LLMService } from '../core/llm/LLMService.js';
import { CodebaseIndexer } from '../core/rag/CodebaseIndexer.js';
import { KnowledgeGraph } from '../core/rag/KnowledgeGraph.js';
import fs from 'fs';

// Define available tools
const TOOLS: Tool[] = [
  {
    name: 'analyze_project',
    description: 'Analyze a legacy codebase and generate comprehensive report including tech debt, dependencies, and migration order',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory to analyze'
        }
      },
      required: ['projectPath']
    }
  },
  {
    name: 'detect_technology',
    description: 'Detect legacy technologies used in a codebase (jQuery, JSP, PHP, AngularJS, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory'
        }
      },
      required: ['projectPath']
    }
  },
  {
    name: 'calculate_tech_debt',
    description: 'Calculate technical debt score and estimated refactor hours for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory'
        }
      },
      required: ['projectPath']
    }
  },
  {
    name: 'validate_code',
    description: 'Validate generated code using TypeScript compiler and best practices',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Code to validate'
        },
        framework: {
          type: 'string',
          enum: ['react', 'angular', 'vue'],
          description: 'Target framework'
        }
      },
      required: ['code', 'framework']
    }
  },
  {
    name: 'migrate_file',
    description: 'Migrate a single legacy file to modern framework with RAG context',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the legacy file'
        },
        sourceFramework: {
          type: 'string',
          description: 'Source framework (jsp, php, jquery, etc.)'
        },
        targetFramework: {
          type: 'string',
          enum: ['react', 'angular', 'vue'],
          description: 'Target framework'
        }
      },
      required: ['filePath', 'sourceFramework', 'targetFramework']
    }
  }
];

// Create server instance
const server = new Server(
  {
    name: 'osmosis-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error('Arguments required');
  }

  try {
    switch (name) {
      case 'analyze_project':
        return await analyzeProject(args.projectPath as string);
      
      case 'detect_technology':
        return await detectTechnology(args.projectPath as string);
      
      case 'calculate_tech_debt':
        return await calculateTechDebt(args.projectPath as string);
      
      case 'validate_code':
        return await validateCode(args.code as string, args.framework as string);
      
      case 'migrate_file':
        return await migrateFile(
          args.filePath as string,
          args.sourceFramework as string,
          args.targetFramework as string
        );
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ]
    };
  }
});

// Tool implementations

async function analyzeProject(projectPath: string) {
  // Detect technologies
  const detector = new LegacyDetector();
  const detection = await detector.detectFromCodebase(projectPath);
  
  // Build dependency graph
  const graph = new DependencyGraph(projectPath);
  await graph.build();
  const migrationOrder = graph.getMigrationOrder();
  
  // Calculate tech debt
  const debtAnalyzer = new TechDebtAnalyzer();
  const filesContent = new Map<string, string>();
  for (const file of migrationOrder.slice(0, 50)) { // Limit to 50 files for performance
    if (fs.existsSync(file)) {
      filesContent.set(file, fs.readFileSync(file, 'utf-8'));
    }
  }
  const debtReport = debtAnalyzer.analyzeProject(filesContent);
  
  // Build knowledge graph
  const embeddingConfig = {
    provider: (process.env.OPENAI_API_KEY ? 'openai' : 'local') as 'openai' | 'local',
    apiKey: process.env.OPENAI_API_KEY
  };
  const indexer = new CodebaseIndexer(projectPath, embeddingConfig);
  const knowledgeGraph = await indexer.index();
  const kgStats = knowledgeGraph.getStats();
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          technology: detection.primary?.name || 'Unknown',
          era: detection.era,
          estimatedAge: detection.estimatedAge,
          totalFiles: migrationOrder.length,
          techDebt: {
            score: debtReport.totalScore,
            refactorHours: debtReport.totalRefactorHours,
            toxicFiles: debtReport.toxicFiles.length
          },
          knowledgeGraph: {
            entities: kgStats.totalEntities,
            vectors: kgStats.totalVectors,
            components: kgStats.byType.component || 0
          },
          recommendations: detection.recommendations
        }, null, 2)
      }
    ]
  };
}

async function detectTechnology(projectPath: string) {
  const detector = new LegacyDetector();
  const result = await detector.detectFromCodebase(projectPath);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          primary: result.primary?.name,
          confidence: result.primary?.confidence,
          era: result.era,
          estimatedAge: result.estimatedAge,
          allTechnologies: result.technologies.map(t => ({
            name: t.name,
            confidence: t.confidence,
            complexity: t.migrationComplexity
          })),
          indicators: result.primary?.indicators || []
        }, null, 2)
      }
    ]
  };
}

async function calculateTechDebt(projectPath: string) {
  const graph = new DependencyGraph(projectPath);
  await graph.build();
  const files = graph.getMigrationOrder();
  
  const analyzer = new TechDebtAnalyzer();
  const filesContent = new Map<string, string>();
  
  for (const file of files.slice(0, 100)) { // Limit for performance
    if (fs.existsSync(file)) {
      filesContent.set(file, fs.readFileSync(file, 'utf-8'));
    }
  }
  
  const report = analyzer.analyzeProject(filesContent);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          totalScore: report.totalScore,
          refactorHours: report.totalRefactorHours,
          filesAnalyzed: filesContent.size,
          toxicFiles: report.toxicFiles,
          recommendations: report.recommendations
        }, null, 2)
      }
    ]
  };
}

async function validateCode(code: string, framework: string) {
  const validation = CodeSafeGuard.validate(code, framework as any);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        }, null, 2)
      }
    ]
  };
}

async function migrateFile(filePath: string, sourceFramework: string, targetFramework: string) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  
  // Initialize LLM service
  const llmService = new LLMService({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Build knowledge graph for context
  const projectRoot = filePath.split('/').slice(0, -1).join('/');
  const embeddingConfig = {
    provider: (process.env.OPENAI_API_KEY ? 'openai' : 'local') as 'openai' | 'local',
    apiKey: process.env.OPENAI_API_KEY
  };
  
  let knowledgeGraph = await KnowledgeGraph.load(projectRoot, embeddingConfig);
  if (!knowledgeGraph) {
    const indexer = new CodebaseIndexer(projectRoot, embeddingConfig);
    knowledgeGraph = await indexer.index();
  }
  
  // Generate prompt (simplified)
  const prompt = `Migrate the following ${sourceFramework} code to ${targetFramework}:

\`\`\`
${sourceCode}
\`\`\`

Requirements:
- Use modern best practices
- Maintain functionality
- Use TypeScript
- Follow ${targetFramework} conventions
- Return ONLY the migrated code, no explanations`;
  
  // Generate code
  const migratedCode = await llmService.generate(prompt);
  
  // Validate
  const validation = CodeSafeGuard.validate(migratedCode, targetFramework as any);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          migratedCode,
          validation: {
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings
          }
        }, null, 2)
      }
    ]
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Osmosis MCP Server running on stdio');
}

main().catch(console.error);

