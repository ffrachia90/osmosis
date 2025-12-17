#!/usr/bin/env node
/**
 * Osmosis MCP Server - Model Context Protocol Integration for Cursor
 * Provides legacy code analysis, architectural planning, and migration tools
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
import { ArchitecturePlanner } from '../core/architecture/ArchitecturePlanner.js';
import { ManifestManager } from '../core/architecture/ArchitectureManifest.js';
import { ConfigGenerator } from '../generators/config-generator.js';
import { PromptAssembler, PromptContext } from '../core/prompt-engine/assembler.js';
import { ContextInjector } from '../core/rag/ContextInjector.js';
import fs from 'fs';
import path from 'path';

// Define available tools
const TOOLS: Tool[] = [
  // =========================================================================
  // ANALYSIS TOOLS
  // =========================================================================
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
  
  // =========================================================================
  // ARCHITECTURE TOOLS (NEW)
  // =========================================================================
  {
    name: 'plan_architecture',
    description: 'Generate a comprehensive architectural modernization plan for a React project. Analyzes patterns (Redux, React Query, Router, styling) and proposes modern stack.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the React project directory'
        },
        force: {
          type: 'boolean',
          description: 'Force re-analysis even if manifest exists',
          default: false
        }
      },
      required: ['projectPath']
    }
  },
  {
    name: 'get_architecture_manifest',
    description: 'Get the existing architecture manifest for a project (if available)',
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
    name: 'generate_config',
    description: 'Generate modern configuration files (tsconfig, eslint, tailwind, etc.) based on the architecture manifest',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory'
        },
        apply: {
          type: 'boolean',
          description: 'Actually write the files (false = dry run)',
          default: false
        }
      },
      required: ['projectPath']
    }
  },
  {
    name: 'get_migration_rules',
    description: 'Get the migration rules for a project based on its architecture manifest',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory'
        },
        category: {
          type: 'string',
          enum: ['state', 'fetching', 'routing', 'styling', 'components', 'typescript', 'security', 'all'],
          description: 'Filter rules by category',
          default: 'all'
        }
      },
      required: ['projectPath']
    }
  },
  
  // =========================================================================
  // MIGRATION TOOLS
  // =========================================================================
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
          description: 'Source framework (jsp, php, jquery, react-legacy, etc.)'
        },
        targetFramework: {
          type: 'string',
          enum: ['react', 'angular', 'vue'],
          description: 'Target framework'
        }
      },
      required: ['filePath', 'sourceFramework', 'targetFramework']
    }
  },
  {
    name: 'refactor_file_integral',
    description: 'Refactor a React file using the architectural manifest rules (integral mode). Applies state, fetching, routing, and styling migrations coherently.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the React file to refactor'
        },
        projectPath: {
          type: 'string',
          description: 'Path to the project root (where manifest is stored)'
        }
      },
      required: ['filePath', 'projectPath']
    }
  }
];

// Create server instance
const server = new Server(
  {
    name: 'osmosis-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// LLM Service singleton
let llmService: LLMService | null = null;

function getLLMService(): LLMService {
  if (!llmService) {
    llmService = new LLMService({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL
    });
  }
  return llmService;
}

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
      // Analysis tools
      case 'analyze_project':
        return await analyzeProject(args.projectPath as string);
      
      case 'detect_technology':
        return await detectTechnology(args.projectPath as string);
      
      case 'calculate_tech_debt':
        return await calculateTechDebt(args.projectPath as string);
      
      // Architecture tools
      case 'plan_architecture':
        return await planArchitecture(args.projectPath as string, args.force as boolean);
      
      case 'get_architecture_manifest':
        return await getArchitectureManifest(args.projectPath as string);
      
      case 'generate_config':
        return await generateConfig(args.projectPath as string, args.apply as boolean);
      
      case 'get_migration_rules':
        return await getMigrationRules(args.projectPath as string, args.category as string);
      
      // Migration tools
      case 'validate_code':
        return await validateCode(args.code as string, args.framework as string);
      
      case 'migrate_file':
        return await migrateFile(
          args.filePath as string,
          args.sourceFramework as string,
          args.targetFramework as string
        );
      
      case 'refactor_file_integral':
        return await refactorFileIntegral(
          args.filePath as string,
          args.projectPath as string
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

// ============================================================================
// ANALYSIS TOOL IMPLEMENTATIONS
// ============================================================================

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
  for (const file of migrationOrder.slice(0, 50)) {
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
  
  for (const file of files.slice(0, 100)) {
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

// ============================================================================
// ARCHITECTURE TOOL IMPLEMENTATIONS
// ============================================================================

async function planArchitecture(projectPath: string, force: boolean = false) {
  const llm = getLLMService();
  const planner = new ArchitecturePlanner(llm);
  
  const result = await planner.planFull(projectPath, { force, verbose: false });
  
  const manifest = result.manifest;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          isNew: result.isNew,
          analysisTime: result.analysisTime,
          summary: {
            projectName: manifest.projectName,
            legacyScore: manifest.patternAnalysis.summary.legacyScore,
            totalFiles: manifest.patternAnalysis.summary.totalFiles,
            totalComponents: manifest.patternAnalysis.summary.totalComponents,
            primaryStateLib: manifest.patternAnalysis.summary.primaryStateLib,
            primaryFetchLib: manifest.patternAnalysis.summary.primaryFetchLib,
            primaryStyling: manifest.patternAnalysis.summary.primaryStyling
          },
          proposedStack: {
            state: manifest.proposedStack.stateManagement.library,
            stateReason: manifest.proposedStack.stateManagement.reasoning,
            fetching: manifest.proposedStack.dataFetching.library,
            fetchingReason: manifest.proposedStack.dataFetching.reasoning,
            routing: manifest.proposedStack.routing.library,
            styling: manifest.proposedStack.styling.library,
            forms: manifest.proposedStack.forms.library,
            testing: manifest.proposedStack.testing.library
          },
          migrationRulesCount: manifest.migrationRules.length,
          configUpdates: {
            newDependencies: Object.keys(manifest.configUpdates.dependencies).length,
            packagesToRemove: manifest.configUpdates.removePackages.length,
            configFilesToGenerate: manifest.configUpdates.configFiles.length
          },
          confidence: manifest.metadata.confidence
        }, null, 2)
      }
    ]
  };
}

async function getArchitectureManifest(projectPath: string) {
  const embeddingConfig = {
    provider: 'local' as const,
    apiKey: undefined
  };
  
  const manifest = await ManifestManager.load(projectPath);
  
  if (!manifest) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            exists: false,
            message: 'No architecture manifest found. Run plan_architecture first.'
          }, null, 2)
        }
      ]
    };
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          exists: true,
          manifest: manifest
        }, null, 2)
      }
    ]
  };
}

async function generateConfig(projectPath: string, apply: boolean = false) {
  const manifest = await ManifestManager.load(projectPath);
  
  if (!manifest) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'No architecture manifest found. Run plan_architecture first.'
          }, null, 2)
        }
      ]
    };
  }
  
  if (apply) {
    const result = await ConfigGenerator.apply(projectPath, manifest.configUpdates);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            applied: true,
            created: result.created,
            updated: result.updated,
            skipped: result.skipped
          }, null, 2)
        }
      ]
    };
  }
  
  // Dry run - just show what would be generated
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          applied: false,
          dryRun: true,
          wouldCreate: manifest.configUpdates.configFiles.map(f => f.path),
          dependencies: manifest.configUpdates.dependencies,
          devDependencies: manifest.configUpdates.devDependencies,
          packagesToRemove: manifest.configUpdates.removePackages,
          scripts: manifest.configUpdates.scripts
        }, null, 2)
      }
    ]
  };
}

async function getMigrationRules(projectPath: string, category: string = 'all') {
  const manifest = await ManifestManager.load(projectPath);
  
  if (!manifest) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'No architecture manifest found. Run plan_architecture first.'
          }, null, 2)
        }
      ]
    };
  }
  
  let rules = manifest.migrationRules;
  
  if (category !== 'all') {
    rules = rules.filter(r => r.category === category);
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          totalRules: rules.length,
          rules: rules.map(r => ({
            id: r.id,
            name: r.name,
            category: r.category,
            priority: r.priority,
            isCritical: r.isCritical,
            detectPattern: r.detectPattern,
            transformInstruction: r.transformInstruction.substring(0, 200) + '...',
            example: r.example
          }))
        }, null, 2)
      }
    ]
  };
}

// ============================================================================
// MIGRATION TOOL IMPLEMENTATIONS
// ============================================================================

async function validateCode(code: string, framework: string) {
  const validation = CodeSafeGuard.validate(code, framework as 'react' | 'angular' | 'vue');
  
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

/**
 * Extracts code from LLM response that may include markdown code blocks and explanations
 */
function extractCodeFromResponse(response: string): string {
  // Most reliable approach: split on ``` and find the code content
  const parts = response.split('```');
  
  // Format is: [text before, "language\ncode", text after, ...]
  // We want the parts at odd indices (1, 3, 5, ...) that contain the actual code
  const codeBlocks: string[] = [];
  
  for (let i = 1; i < parts.length; i += 2) {
    let content = parts[i];
    
    // Remove language specifier if present (first line like "typescript" or "tsx")
    const firstNewline = content.indexOf('\n');
    if (firstNewline !== -1) {
      const firstLine = content.substring(0, firstNewline).trim().toLowerCase();
      if (['typescript', 'tsx', 'jsx', 'javascript', 'ts', 'js', ''].includes(firstLine)) {
        content = content.substring(firstNewline + 1);
      }
    }
    
    content = content.trim();
    if (content.length > 0) {
      codeBlocks.push(content);
    }
  }
  
  // Return the largest code block (usually the main code)
  if (codeBlocks.length > 0) {
    return codeBlocks.reduce((a, b) => a.length > b.length ? a : b);
  }
  
  // If no code blocks found, check if response starts with code directly
  const trimmed = response.trim();
  if (trimmed.startsWith('import ') || 
      trimmed.startsWith('export ') || 
      trimmed.startsWith('const ') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/**') ||
      trimmed.startsWith('type ') ||
      trimmed.startsWith('interface ') ||
      trimmed.startsWith('enum ')) {
    return trimmed;
  }
  
  // Last resort: return as-is
  return response;
}

async function migrateFile(filePath: string, sourceFramework: string, targetFramework: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const llm = getLLMService();
  
  // Build knowledge graph for context
  const projectRoot = path.dirname(filePath);
  const embeddingConfig = {
    provider: (process.env.OPENAI_API_KEY ? 'openai' : 'local') as 'openai' | 'local',
    apiKey: process.env.OPENAI_API_KEY
  };
  
  let knowledgeGraph = await KnowledgeGraph.load(projectRoot, embeddingConfig);
  if (!knowledgeGraph) {
    const indexer = new CodebaseIndexer(projectRoot, embeddingConfig);
    knowledgeGraph = await indexer.index();
  }
  
  const contextInjector = new ContextInjector(knowledgeGraph);
  
  // Build prompt
  const context: PromptContext = {
    clientName: 'MCP User',
    sourceTech: sourceFramework as PromptContext['sourceTech'],
    targetTech: targetFramework as PromptContext['targetTech'],
    filename: path.basename(filePath),
    sourceCode,
    fileExt: path.extname(filePath).slice(1)
  };
  
  let prompt = PromptAssembler.assemble(context);
  prompt = await contextInjector.enrichPrompt(prompt, {
    fileName: path.basename(filePath),
    filePath,
    sourceCode,
    legacyLanguage: sourceFramework,
    targetFramework
  });
  
  // Generate code
  const rawResponse = await llm.generate(prompt);
  const migratedCode = extractCodeFromResponse(rawResponse);
  
  // Validate
  const validation = CodeSafeGuard.validate(migratedCode, targetFramework as 'react' | 'angular' | 'vue');
  
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

async function refactorFileIntegral(filePath: string, projectPath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Load manifest
  const manifest = await ManifestManager.load(projectPath);
  if (!manifest) {
    throw new Error('No architecture manifest found. Run plan_architecture first.');
  }
  
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const llm = getLLMService();
  
  // Load knowledge graph
  const embeddingConfig = {
    provider: (process.env.OPENAI_API_KEY ? 'openai' : 'local') as 'openai' | 'local',
    apiKey: process.env.OPENAI_API_KEY
  };
  
  let knowledgeGraph = await KnowledgeGraph.load(projectPath, embeddingConfig);
  if (!knowledgeGraph) {
    const indexer = new CodebaseIndexer(projectPath, embeddingConfig);
    knowledgeGraph = await indexer.index();
  }
  
  const contextInjector = new ContextInjector(knowledgeGraph);
  
  // Build context with manifest
  const context: PromptContext = {
    clientName: 'MCP User',
    sourceTech: 'react-legacy',
    targetTech: 'react',
    filename: path.basename(filePath),
    sourceCode,
    fileExt: path.extname(filePath).slice(1),
    architectureManifest: manifest
  };
  
  // Use integral assembler
  let prompt = PromptAssembler.assembleIntegral(context, manifest);
  prompt = await contextInjector.enrichPrompt(prompt, {
    fileName: path.basename(filePath),
    filePath,
    sourceCode,
    legacyLanguage: 'react-legacy',
    targetFramework: 'react'
  });
  
  // Generate code
  const rawRefactorResponse = await llm.generate(prompt);
  const refactoredCode = extractCodeFromResponse(rawRefactorResponse);
  
  // Validate
  const validation = CodeSafeGuard.validate(refactoredCode, 'react');
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          refactoredCode,
          appliedStack: {
            state: manifest.proposedStack.stateManagement.library,
            fetching: manifest.proposedStack.dataFetching.library,
            routing: manifest.proposedStack.routing.library,
            styling: manifest.proposedStack.styling.library
          },
          rulesApplied: manifest.migrationRules.length,
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

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Osmosis MCP Server v2.0.0 running on stdio');
  console.error('Tools available: analyze_project, detect_technology, calculate_tech_debt, plan_architecture, get_architecture_manifest, generate_config, get_migration_rules, validate_code, migrate_file, refactor_file_integral');
}

main().catch(console.error);
