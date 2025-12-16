#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import { PromptAssembler, PromptContext } from './core/prompt-engine/assembler.js';
import { CodeSafeGuard } from './core/safeguard/validator.js';
import { DependencyGraph } from './core/analysis/DependencyGraph.js';
import { LegacyDetector } from './analyzers/legacy-detector.js';
import { CodebaseIndexer } from './core/rag/CodebaseIndexer.js';
import { ContextInjector } from './core/rag/ContextInjector.js';
import { KnowledgeGraph } from './core/rag/KnowledgeGraph.js';
import { TechDebtAnalyzer } from './core/analysis/TechDebtAnalyzer.js';

const program = new Command();

program
  .name('osmosis')
  .description('🧬 Osmosis - AI-Powered Legacy Code Modernizer')
  .version('1.0.0');

/**
 * ANALYZE COMMAND
 * Analiza un directorio completo y muestra el grafo de dependencias
 */
program
  .command('analyze')
  .description('Analiza un proyecto legacy y genera el grafo de dependencias')
  .requiredOption('--dir <directory>', 'Directorio del proyecto a analizar')
  .option('--output <file>', 'Archivo de salida para el reporte (JSON)', 'analysis-report.json')
  .action(async (options) => {
    const spinner = ora('🔍 Analizando proyecto...').start();

    try {
      const projectDir = path.resolve(options.dir);

      if (!fs.existsSync(projectDir)) {
        spinner.fail(`Directorio no encontrado: ${projectDir}`);
        process.exit(1);
      }

      // 1. Detectar tecnologías legacy
      spinner.text = '🔎 Detectando tecnologías legacy...';
      const detector = new LegacyDetector();
      const technologies = await detector.detectFromCode(projectDir);

      spinner.succeed(`Tecnologías detectadas: ${technologies.length > 0 ? technologies.join(', ') : 'javascript'}`);

      // 2. Construir grafo de dependencias
      spinner.start('📊 Construyendo grafo de dependencias...');
      const graph = new DependencyGraph(projectDir);
      await graph.build();
      
      const migrationOrder = graph.getMigrationOrder();
      spinner.succeed(`Grafo construido: ${migrationOrder.length} archivos encontrados`);
      
      // 3. Construir Knowledge Graph (RAG) con embeddings
      spinner.start('🧠 Indexando codebase para RAG con embeddings vectoriales...');
      
      // Configuración de embeddings (detecta API keys o usa local)
      const embeddingConfig = {
        provider: (process.env.OPENAI_API_KEY ? 'openai' : 
                   process.env.GEMINI_API_KEY ? 'gemini' : 
                   'local') as 'openai' | 'gemini' | 'local',
        apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
        model: process.env.OPENAI_API_KEY ? 'text-embedding-3-small' : undefined
      };
      
      if (embeddingConfig.provider === 'local') {
        spinner.info('No API key detectada, usando embeddings locales (TF-IDF)');
      } else {
        spinner.info(`Usando ${embeddingConfig.provider} para embeddings semánticos`);
      }
      
      const indexer = new CodebaseIndexer(projectDir, embeddingConfig);
      const knowledgeGraph = await indexer.index();
      const kgStats = knowledgeGraph.getStats();
      
      spinner.succeed(
        `Knowledge Graph: ${kgStats.totalEntities} entidades, ` +
        `${kgStats.totalVectors} vectores generados, ` +
        `${kgStats.byType.component || 0} componentes`
      );
      
      // Guardar Knowledge Graph en .osmosis/
      await knowledgeGraph.save(projectDir);

      // 3. Analizar Deuda Técnica
      spinner.start('💰 Calculando deuda técnica...');
      const debtAnalyzer = new TechDebtAnalyzer();

      // Cargar contenido de archivos para análisis profundo
      const filesContent = new Map<string, string>();
      for (const file of migrationOrder) {
        if (fs.existsSync(file)) {
          filesContent.set(file, fs.readFileSync(file, 'utf-8'));
        }
      }

      const debtReport = debtAnalyzer.analyzeProject(filesContent);
      spinner.succeed(`Deuda calculada: Esfuerzo estimado ${debtReport.totalRefactorHours}h de refactorización`);

      // 4. Generar reporte
      spinner.start('📝 Generando reporte...');
      const report = {
        project: projectDir,
        timestamp: new Date().toISOString(),
        technologies,
        totalFiles: migrationOrder.length,
        debtMetrics: {
          score: debtReport.totalScore,
          refactorHours: debtReport.totalRefactorHours,
          recommendations: debtReport.recommendations
        },
        knowledgeGraph: {
          totalEntities: kgStats.totalEntities,
          totalVectors: kgStats.totalVectors,
          components: kgStats.byType.component || 0,
          hooks: kgStats.byType.hook || 0,
          functions: kgStats.byType.function || 0,
          interfaces: kgStats.byType.interface || 0,
          hasEmbeddings: kgStats.hasEmbeddings
        },
        migrationOrder: migrationOrder.map((file, index) => {
          // Obtener métricas específicas de este archivo
          const content = filesContent.get(file) || '';
          const metrics = debtAnalyzer.analyzeFile(content, path.basename(file));

          return {
            order: index + 1,
            file: path.relative(projectDir, file),
            complexity: graph.getComplexity(file),
            debtScore: metrics.score,
            issues: metrics.issues,
            dependencies: graph.getNode(file)?.dependencies.length || 0,
            dependents: graph.getNode(file)?.dependents.length || 0
          };
        }),
        estimatedEffort: calculateEffort(migrationOrder, graph)
      };

      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      
      spinner.succeed(`Reporte generado: ${outputPath}`);

      // Mostrar resumen en consola
      console.log('\n📈 RESUMEN DEL ANÁLISIS:');
      console.log('─'.repeat(60));
      console.log(`📁 Proyecto: ${projectDir}`);
      console.log(`🔧 Tecnologías: ${technologies.length > 0 ? technologies.join(', ') : 'javascript'}`);
      console.log(`📄 Total de archivos: ${migrationOrder.length}`);

      console.log('\n⚡  ESFUERZO DE DEUDA TÉCNICA:');
      console.log(`   Puntaje de Salud: ${100 - debtReport.totalScore}/100`);
      console.log(`   Horas de Refactor: ${debtReport.totalRefactorHours}h`);
      console.log(`   Sprints Estimados: ~${Math.ceil(debtReport.totalRefactorHours / 80)} sprints`);
      console.log(`   Archivos Críticos: ${debtReport.toxicFiles.length}`);
      console.log(`   Recomendación: ${debtReport.recommendations[0]}`);

      console.log('─'.repeat(60));
      console.log('\n🎯 TOP 5 ARCHIVOS MÁS COMPLEJOS:');

      const topToxic = report.migrationOrder
        .sort((a, b) => b.debtScore - a.debtScore)
        .slice(0, 5);

      topToxic.forEach(item => {
        console.log(`  🔥 ${item.file}`);
        console.log(`     ├─ Toxicidad: ${item.debtScore}/100`);
        console.log(`     └─ Problemas: ${item.issues.slice(0, 2).join(', ')}...`);
      });

    } catch (error) {
      spinner.fail('Error durante el análisis');
      console.error(error);
      process.exit(1);
    }
  });

/**
 * MIGRATE COMMAND
 * Migra un archivo o directorio completo de legacy a moderno
 */
program
  .command('migrate')
  .description('Migra código legacy a framework moderno')
  .requiredOption('--source <path>', 'Archivo o directorio a migrar')
  .requiredOption('--from <tech>', 'Tecnología origen (jsp, php, jquery, asp, coldfusion)')
  .requiredOption('--to <tech>', 'Tecnología destino (react, angular, vue)')
  .option('--output <dir>', 'Directorio de salida', './migrated')
  .option('--client <name>', 'Nombre del cliente (para contexto de negocio)')
  .option('--design-system <dir>', 'Path al design system del cliente')
  .option('--dry-run', 'Simular migración sin escribir archivos', false)
  .action(async (options) => {
    const spinner = ora('🚀 Iniciando migración...').start();

    try {
      const sourcePath = path.resolve(options.source);
      const isDirectory = fs.statSync(sourcePath).isDirectory();

      let filesToMigrate: string[];

      if (isDirectory) {
        // Modo Directorio: Analizar grafo primero
        spinner.text = '📊 Analizando proyecto completo...';
        const graph = new DependencyGraph(sourcePath);
        await graph.build();
        filesToMigrate = graph.getMigrationOrder();
        spinner.succeed(`Orden de migración determinado: ${filesToMigrate.length} archivos`);
      } else {
        // Modo Archivo Único
        filesToMigrate = [sourcePath];
      }

      // Cargar Knowledge Graph para contexto RAG
      spinner.start('🧠 Cargando Knowledge Graph...');
      const projectRoot = isDirectory ? sourcePath : path.dirname(sourcePath);
      
      const embeddingConfig = {
        provider: (process.env.OPENAI_API_KEY ? 'openai' : 
                   process.env.GEMINI_API_KEY ? 'gemini' : 
                   'local') as 'openai' | 'gemini' | 'local',
        apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
        model: process.env.OPENAI_API_KEY ? 'text-embedding-3-small' : undefined
      };
      
      let knowledgeGraph = await KnowledgeGraph.load(projectRoot, embeddingConfig);
      
      if (!knowledgeGraph) {
        spinner.info('No se encontró Knowledge Graph, indexando proyecto...');
        const indexer = new CodebaseIndexer(projectRoot, embeddingConfig);
        knowledgeGraph = await indexer.index();
        await knowledgeGraph.save(projectRoot);
      }
      
      const contextInjector = new ContextInjector(knowledgeGraph);
      spinner.succeed('Knowledge Graph cargado');
      
      // Migrar cada archivo en orden
      let migratedCount = 0;
      let failedCount = 0;

      for (const [index, filePath] of filesToMigrate.entries()) {
        const relPath = isDirectory ? path.relative(sourcePath, filePath) : path.basename(filePath);
        spinner.start(`[${index + 1}/${filesToMigrate.length}] Migrando ${relPath}...`);

        try {
          const sourceCode = fs.readFileSync(filePath, 'utf-8');
          const context: PromptContext = {
            clientName: options.client || 'GenericClient',
            sourceTech: options.from as any,
            targetTech: options.to as any,
            filename: path.basename(filePath),
            sourceCode,
            fileExt: path.extname(filePath).slice(1)
          };

          // Generar prompt base
          let prompt = PromptAssembler.assemble(context);
          
          // Enriquecer con contexto RAG semántico
          prompt = await contextInjector.enrichPrompt(prompt, {
            fileName: path.basename(filePath),
            filePath: filePath,
            sourceCode: sourceCode,
            legacyLanguage: options.from,
            targetFramework: options.to
          });

          // TODO: Aquí se llamaría a Claude API
          // Por ahora simulamos respuesta
          const generatedCode = await simulateLLMCall(prompt, options.to);

          // Validar con SafeGuard
          const validation = CodeSafeGuard.validate(generatedCode, options.to as any);

          if (!validation.isValid) {
            spinner.warn(`⚠️  SafeGuard detectó problemas en ${relPath}`);
            validation.errors.forEach(err => console.log(`     ❌ ${err}`));

            // Auto-reparar
            const repairedCode = await attemptRepair(generatedCode, validation.errors, options.to);

            if (repairedCode) {
              spinner.succeed(`✅ Código reparado automáticamente`);
              await writeOutput(filePath, repairedCode, options.output, options.dryRun);
              migratedCount++;
            } else {
              failedCount++;
            }
          } else {
            await writeOutput(filePath, generatedCode, options.output, options.dryRun);
            migratedCount++;
            spinner.succeed(`✅ ${relPath} migrado`);
          }

        } catch (error) {
          spinner.fail(`❌ Error migrando ${relPath}`);
          console.error(error);
          failedCount++;
        }
      }

      // Resumen final
      console.log('\n📊 RESUMEN DE MIGRACIÓN:');
      console.log('─'.repeat(60));
      console.log(`✅ Exitosos: ${migratedCount}/${filesToMigrate.length}`);
      console.log(`❌ Fallidos: ${failedCount}/${filesToMigrate.length}`);
      console.log(`📁 Output: ${options.output}`);
      console.log('─'.repeat(60));

      if (options.dryRun) {
        console.log('\n⚠️  DRY RUN: No se escribieron archivos');
      }

    } catch (error) {
      spinner.fail('Error durante la migración');
      console.error(error);
      process.exit(1);
    }
  });

/**
 * REFACTOR COMMAND
 * Refactoriza código moderno con malas prácticas
 */
program
  .command('refactor')
  .description('Refactoriza código moderno siguiendo mejores prácticas')
  .requiredOption('--source <path>', 'Archivo o directorio a refactorizar')
  .requiredOption('--framework <name>', 'Framework (react, angular, vue)')
  .option('--output <dir>', 'Directorio de salida', './refactored')
  .option('--analyze-only', 'Solo analizar sin refactorizar', false)
  .action(async (options) => {
    const spinner = ora('🔍 Analizando código...').start();

    try {
      // TODO: Implementar ModernCodeAnalyzer
      spinner.succeed('Análisis completado (TODO: implementar)');
      console.log('⚠️  Comando en desarrollo');

    } catch (error) {
      spinner.fail('Error durante refactorización');
      console.error(error);
      process.exit(1);
    }
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateEffort(files: string[], graph: DependencyGraph): { hours: number, sprints: number } {
  let totalLines = 0;
  files.forEach(file => {
    totalLines += graph.getComplexity(file);
  });

  // Estimación: 50 líneas legacy = 1 hora de migración
  const hours = Math.ceil(totalLines / 50);
  const sprints = Math.ceil(hours / 80); // 2 semanas = 80 horas

  return { hours, sprints };
}

async function simulateLLMCall(prompt: string, targetTech: string): Promise<string> {
  // TODO: Integrar con Claude API real
  // Por ahora retornamos código simulado

  if (targetTech === 'react') {
    return `import React from 'react';

export const MigratedComponent: React.FC = () => {
  return (
    <div>
      <h1>Componente Migrado</h1>
    </div>
  );
};`;
  }

  return '// TODO: Implementar generación real con LLM';
}

/**
 * Loop de Reparación con Reintentos (Max 3)
 */
async function attemptRepair(code: string, errors: string[], targetTech: string, maxRetries = 3): Promise<string | null> {
  console.log(`\n🔧 Iniciando auto-reparación (Max ${maxRetries} intentos)...`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n   Intento ${attempt}/${maxRetries}...`);
    
    try {
      // Generar prompt de reparación
      const repairPrompt = CodeSafeGuard.generateRepairPrompt(code, errors);
      
      // TODO: Aquí llamaríamos al LLM real
      // Por ahora simulamos con fixes conocidos
      let repairedCode = code;
      
      // Fix 1: Class Component → Functional
      if (errors.some(e => e.includes('Class Component'))) {
        repairedCode = repairedCode.replace(
          /class\s+(\w+)\s+extends\s+React\.Component/g,
          'export const $1: React.FC = () =>'
        );
      }
      
      // Fix 2: dangerouslySetInnerHTML sin sanitizar
      if (errors.some(e => e.includes('dangerouslySetInnerHTML'))) {
        if (!repairedCode.includes('DOMPurify')) {
          repairedCode = "import DOMPurify from 'dompurify';\n" + repairedCode;
          repairedCode = repairedCode.replace(
            /dangerouslySetInnerHTML={{__html:\s*(.+?)}}/g,
            'dangerouslySetInnerHTML={{__html: DOMPurify.sanitize($1)}}'
          );
        }
      }
      
      // Fix 3: eval() removal
      if (errors.some(e => e.includes('eval()'))) {
        repairedCode = repairedCode.replace(/eval\(/g, '// REMOVED: eval(');
        console.log('   ⚠️  eval() removido - requiere revisión manual');
      }
      
      // Validar código reparado
      const validation = CodeSafeGuard.validate(repairedCode, targetTech as any);
      
      if (validation.isValid) {
        console.log(`   ✅ Reparación exitosa en intento ${attempt}`);
        return repairedCode;
      } else {
        console.log(`   ❌ Intento ${attempt} falló. Errores restantes:`);
        validation.errors.forEach(err => console.log(`      - ${err}`));
        
        // Actualizar errors para siguiente intento
        errors = validation.errors;
        code = repairedCode; // Usar versión parcialmente reparada
      }
      
    } catch (error) {
      console.error(`   ❌ Error en intento ${attempt}: ${error}`);
    }
  }
  
  console.log(`\n❌ Auto-reparación falló después de ${maxRetries} intentos`);
  return null;
}

async function writeOutput(sourcePath: string, content: string, outputDir: string, dryRun: boolean): Promise<void> {
  if (dryRun) return;

  const filename = path.basename(sourcePath, path.extname(sourcePath));
  const outputPath = path.join(outputDir, `${filename}.tsx`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
}

// ============================================================================
// RUN CLI
// ============================================================================

program.parse(process.argv);
