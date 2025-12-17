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
import { LLMService } from './core/llm/LLMService.js';
import { ArchitecturePlanner } from './core/architecture/ArchitecturePlanner.js';
import { ManifestManager, ArchitectureManifest } from './core/architecture/ArchitectureManifest.js';
import { ConfigGenerator } from './generators/config-generator.js';

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
      const detectionResult = await detector.detectFromCodebase(projectDir);
      const technologies = detectionResult.technologies.map(t => t.name);

      spinner.succeed(
        `Tecnologías detectadas: ${detectionResult.primary?.name || 'Moderno'} ` +
        `(${technologies.length} tecnologías legacy, Era: ${detectionResult.era})`
      );

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

      // Inicializar LLM Service
      spinner.start('🤖 Conectando con Claude 3.5 Sonnet...');
      let llmService: LLMService;

      try {
        llmService = new LLMService({
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseURL: process.env.ANTHROPIC_BASE_URL
        });

        // Health check
        const isHealthy = await llmService.healthCheck();
        if (!isHealthy) {
          throw new Error('LLM service health check failed');
        }

        spinner.succeed(`Claude 3.5 Sonnet conectado (${llmService.getModelInfo()})`);
      } catch (error) {
        spinner.fail('❌ Error conectando con Claude');
        console.error('\n💡 Tip: Configura ANTHROPIC_API_KEY:');
        console.error('   export ANTHROPIC_API_KEY="sk-ant-..."');
        console.error('   \n   O si usas proxy empresarial:');
        console.error('   export ANTHROPIC_BASE_URL="https://your-proxy.com"');
        process.exit(1);
      }

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
            sourceTech: options.from as PromptContext['sourceTech'],
            targetTech: options.to as PromptContext['targetTech'],
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

          // Generar código con Claude 3.5 Sonnet + Streaming
          spinner.text = `[${index + 1}/${filesToMigrate.length}] 🤖 Generando código para ${relPath}...`;

          let generatedCode = '';
          let tokenCount = 0;

          generatedCode = await llmService.generateWithStreaming(prompt, {
            onStart: () => {
              process.stdout.write('\n     ');
            },
            onToken: (token) => {
              // Mostrar puntos de progreso cada 50 tokens
              tokenCount++;
              if (tokenCount % 50 === 0) {
                process.stdout.write('.');
              }
            },
            onComplete: () => {
              process.stdout.write(' ✓\n');
            },
            onError: (error) => {
              spinner.fail(`❌ Error LLM: ${error.message}`);
            }
          });

          // Validar con SafeGuard
          const validation = CodeSafeGuard.validate(generatedCode, options.to as 'react' | 'angular' | 'vue');

          if (!validation.isValid) {
            spinner.warn(`⚠️  SafeGuard detectó problemas en ${relPath}`);
            validation.errors.forEach(err => console.log(`     ❌ ${err}`));

            // Auto-reparar con LLM
            const repairedCode = await attemptRepair(
              llmService,
              generatedCode,
              validation.errors,
              options.to
            );

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
 * REFACTOR COMMAND - Enhanced with Architectural Mode
 * Refactoriza código moderno con malas prácticas
 */
program
  .command('refactor')
  .description('Refactoriza código moderno siguiendo mejores prácticas')
  .requiredOption('--source <path>', 'Archivo o directorio a refactorizar')
  .requiredOption('--framework <name>', 'Framework (react, angular, vue)')
  .option('--output <dir>', 'Directorio de salida', './refactored')
  .option('--analyze-only', 'Solo analizar sin refactorizar', false)
  .option('--integral', 'Refactorización arquitectónica completa (analiza y moderniza stack entero)', false)
  .option('--manifest <path>', 'Usar manifiesto arquitectónico existente')
  .option('--apply-config', 'Aplicar configuración generada (package.json, tsconfig, etc.)', false)
  .option('--force', 'Forzar re-análisis aunque exista manifiesto', false)
  .action(async (options) => {
    const spinner = ora('🚀 Iniciando Refactorización...').start();

    try {
      const sourcePath = path.resolve(options.source);

      if (!fs.existsSync(sourcePath)) {
        spinner.fail(`Source path not found: ${sourcePath}`);
        process.exit(1);
      }

      const isDirectory = fs.statSync(sourcePath).isDirectory();
      const projectRoot = isDirectory ? sourcePath : path.dirname(sourcePath);

      // Inicializar LLM Service
      spinner.start('🤖 Conectando con Claude...');
      let llmService: LLMService;

      try {
        llmService = new LLMService({
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseURL: process.env.ANTHROPIC_BASE_URL
        });
        await llmService.healthCheck();
        spinner.succeed(`Motor AI conectado (${llmService.getModelInfo()})`);
      } catch (error) {
        spinner.fail('❌ Error conectando con la API de AI');
        console.error('Asegúrate de tener ANTHROPIC_API_KEY configurada.');
        process.exit(1);
      }

      // ========================================================================
      // MODO INTEGRAL: Refactorización Arquitectónica Completa
      // ========================================================================
      let manifest: ArchitectureManifest | null = null;

      if (options.integral) {
        console.log('\n🏗️  ═══════════════════════════════════════════════════════');
        console.log('   MODO ARQUITECTÓNICO INTEGRAL');
        console.log('   Analizando proyecto completo para modernización coherente');
        console.log('═══════════════════════════════════════════════════════════\n');

        // Cargar o generar manifiesto
        if (options.manifest) {
          spinner.start('📋 Cargando manifiesto existente...');
          const manifestPath = path.resolve(options.manifest);
          if (fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            spinner.succeed('Manifiesto cargado');
          } else {
            spinner.fail('Manifiesto no encontrado');
            process.exit(1);
          }
        } else {
          const planner = new ArchitecturePlanner(llmService);
          const planResult = await planner.planFull(projectRoot, {
            force: options.force,
            verbose: true
          });
          manifest = planResult.manifest;

          if (!planResult.isNew) {
            console.log('\n📋 Usando manifiesto existente (usa --force para re-analizar)');
          }
        }

        // Mostrar resumen del manifiesto
        console.log('\n📊 RESUMEN DEL ANÁLISIS ARQUITECTÓNICO:');
        console.log('─'.repeat(60));
        console.log(`   Proyecto: ${manifest!.projectName}`);
        console.log(`   Legacy Score: ${manifest!.patternAnalysis.summary.legacyScore}/100`);
        console.log(`   Archivos a procesar: ${manifest!.patternAnalysis.summary.totalFiles}`);
        console.log(`   Reglas de migración: ${manifest!.migrationRules.length}`);
        console.log('─'.repeat(60));

        // Aplicar configuración si se solicita
        if (options.applyConfig) {
          spinner.start('⚙️  Aplicando configuración moderna...');
          const configResult = await ConfigGenerator.apply(projectRoot, manifest!.configUpdates);

          console.log('\n📁 CONFIGURACIÓN APLICADA:');
          if (configResult.created.length > 0) {
            console.log(`   ✅ Creados: ${configResult.created.join(', ')}`);
          }
          if (configResult.updated.length > 0) {
            console.log(`   📝 Actualizados: ${configResult.updated.join(', ')}`);
          }
          if (configResult.skipped.length > 0) {
            console.log(`   ⏭️  Omitidos: ${configResult.skipped.join(', ')}`);
          }

          spinner.succeed('Configuración aplicada');

          // Mostrar comando para instalar dependencias
          console.log('\n💡 Ejecuta para instalar nuevas dependencias:');
          console.log('   npm install');
          console.log('');
        }

        if (options.analyzeOnly) {
          console.log('\n✅ Análisis completado (--analyze-only)');
          console.log(`   Manifiesto guardado en: ${projectRoot}/.osmosis/architecture-manifest.json`);
          process.exit(0);
        }
      }

      // ========================================================================
      // OBTENER ARCHIVOS A REFACTORIZAR
      // ========================================================================
      let filesToRefactor: string[];

      if (isDirectory) {
        spinner.text = '📊 Analizando dependencias para refactorización segura...';
        const graph = new DependencyGraph(sourcePath);
        await graph.build();
        filesToRefactor = graph.getMigrationOrder();
        spinner.succeed(`Orden de refactorización calculado: ${filesToRefactor.length} archivos`);
      } else {
        filesToRefactor = [sourcePath];
      }

      // Cargar Knowledge Graph para RAG
      spinner.start('🧠 Cargando Contexto del Proyecto (RAG)...');

      const embeddingConfig = {
        provider: (process.env.OPENAI_API_KEY ? 'openai' :
          process.env.GEMINI_API_KEY ? 'gemini' :
            'local') as 'openai' | 'gemini' | 'local',
        apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
      };

      let knowledgeGraph = await KnowledgeGraph.load(projectRoot, embeddingConfig);

      if (!knowledgeGraph) {
        spinner.info('Indexando codebase para entender el contexto global...');
        const indexer = new CodebaseIndexer(projectRoot, embeddingConfig);
        knowledgeGraph = await indexer.index();
        await knowledgeGraph.save(projectRoot);
      }

      const contextInjector = new ContextInjector(knowledgeGraph);
      spinner.succeed('Contexto cargado');

      // ========================================================================
      // LOOP PRINCIPAL DE REFACTORIZACIÓN
      // ========================================================================
      let successCount = 0;
      let failCount = 0;

      console.log('\n🔄 INICIANDO REFACTORIZACIÓN...\n');

      for (const [index, filePath] of filesToRefactor.entries()) {
        const relPath = isDirectory ? path.relative(sourcePath, filePath) : path.basename(filePath);

        // Filtrar solo archivos JS/TS/JSX/TSX
        if (!filePath.match(/\.(js|jsx|ts|tsx)$/)) continue;

        spinner.start(`[${index + 1}/${filesToRefactor.length}] Modernizando ${relPath}...`);

        try {
          const sourceCode = fs.readFileSync(filePath, 'utf-8');

          const context: PromptContext = {
            clientName: 'Osmosis User',
            sourceTech: 'react-legacy',
            targetTech: options.framework as PromptContext['targetTech'],
            filename: path.basename(filePath),
            sourceCode,
            fileExt: path.extname(filePath).slice(1),
            // IMPORTANTE: Pasar el manifiesto para modo integral
            architectureManifest: manifest || undefined
          };

          // 1. Ensamblar Prompt (con o sin manifiesto)
          let prompt: string;
          if (manifest) {
            prompt = PromptAssembler.assembleIntegral(context, manifest);
          } else {
            prompt = PromptAssembler.assemble(context);
          }

          // 2. Inyectar Contexto RAG
          prompt = await contextInjector.enrichPrompt(prompt, {
            fileName: path.basename(filePath),
            filePath: filePath,
            sourceCode: sourceCode,
            legacyLanguage: 'react-legacy',
            targetFramework: options.framework
          });

          // 3. Generar Código Moderno
          spinner.text = `[${index + 1}/${filesToRefactor.length}] 🤖 Reescribiendo ${relPath}...`;

          let generatedCode = await llmService.generateWithStreaming(prompt, {
            onToken: () => { },
            onError: (e) => spinner.fail(`Error LLM: ${e.message}`)
          });

          // 4. Validar Calidad
          const validation = CodeSafeGuard.validate(generatedCode, options.framework as 'react' | 'angular' | 'vue');

          if (!validation.isValid) {
            spinner.warn(`⚠️  SafeGuard detectó problemas en ${relPath}. Auto-reparando...`);

            const repairedCode = await attemptRepair(
              llmService,
              generatedCode,
              validation.errors,
              options.framework
            );

            if (repairedCode) {
              generatedCode = repairedCode;
              spinner.succeed(`✅ ${relPath} reparado y modernizado`);
              successCount++;
            } else {
              spinner.fail(`❌ No se pudo reparar automáticamente ${relPath}`);
              failCount++;
            }
          } else {
            successCount++;
            spinner.succeed(`✅ ${relPath} modernizado perfectamente`);
          }

          // 5. Guardar resultado
          await writeOutput(filePath, generatedCode, options.output, options.analyzeOnly);

        } catch (error) {
          spinner.fail(`❌ Falló modernización de ${relPath}`);
          console.error(error);
          failCount++;
        }
      }

      // ========================================================================
      // RESUMEN FINAL
      // ========================================================================
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('   📊 RESUMEN DE REFACTORIZACIÓN');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`   ✅ Exitosos: ${successCount}/${filesToRefactor.length}`);
      console.log(`   ❌ Fallidos: ${failCount}/${filesToRefactor.length}`);
      console.log(`   📁 Output: ${options.output}`);

      if (options.integral && manifest) {
        console.log('\n   🏗️  MODO INTEGRAL:');
        console.log(`   └─ Stack: ${manifest.proposedStack.stateManagement.library} + ` +
          `${manifest.proposedStack.dataFetching.library} + ` +
          `${manifest.proposedStack.routing.library}`);
        console.log(`   └─ Reglas aplicadas: ${manifest.migrationRules.length}`);
      }

      console.log('═══════════════════════════════════════════════════════════\n');

      if (options.analyzeOnly) {
        console.log('⚠️  MODO ANALYZE-ONLY: No se escribieron archivos');
      }

      // Sugerencia de próximos pasos
      if (options.integral && !options.applyConfig) {
        console.log('💡 PRÓXIMOS PASOS:');
        console.log('   1. Revisa el manifiesto: .osmosis/architecture-manifest.json');
        console.log('   2. Aplica configuración: osmosis refactor --source . --framework react --integral --apply-config');
        console.log('   3. Instala dependencias: npm install');
        console.log('');
      }

    } catch (error) {
      spinner.fail('Error crítico durante la refactorización');
      console.error(error);
      process.exit(1);
    }
  });

/**
 * PLAN COMMAND - Solo genera el plan arquitectónico
 */
program
  .command('plan')
  .description('Genera un plan de modernización arquitectónica sin ejecutar cambios')
  .requiredOption('--dir <directory>', 'Directorio del proyecto a analizar')
  .option('--force', 'Forzar re-análisis aunque exista manifiesto', false)
  .option('--output <path>', 'Ruta del manifiesto de salida')
  .action(async (options) => {
    const spinner = ora('🏗️ Generando plan arquitectónico...').start();

    try {
      const projectDir = path.resolve(options.dir);

      if (!fs.existsSync(projectDir)) {
        spinner.fail(`Directorio no encontrado: ${projectDir}`);
        process.exit(1);
      }

      // Inicializar LLM
      spinner.text = '🤖 Conectando con Claude...';
      const llmService = new LLMService({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL
      });

      await llmService.healthCheck();
      spinner.succeed('Motor AI conectado');

      // Ejecutar planificación
      const planner = new ArchitecturePlanner(llmService);
      const result = await planner.planFull(projectDir, {
        force: options.force,
        verbose: true
      });

      // Guardar en ubicación personalizada si se especifica
      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, JSON.stringify(result.manifest, null, 2));
        console.log(`\n✅ Manifiesto guardado en: ${outputPath}`);
      }

      // Mostrar resumen
      const m = result.manifest;
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('   📋 PLAN DE MODERNIZACIÓN GENERADO');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`   Proyecto: ${m.projectName}`);
      console.log(`   Legacy Score: ${m.patternAnalysis.summary.legacyScore}/100`);
      console.log(`   Confianza: ${m.metadata.confidence}%`);
      console.log(`   Tiempo de análisis: ${m.metadata.generationTime}ms`);
      console.log('');
      console.log('   📦 STACK PROPUESTO:');
      console.log(`   ├─ State: ${m.proposedStack.stateManagement.library}`);
      console.log(`   ├─ Fetching: ${m.proposedStack.dataFetching.library}`);
      console.log(`   ├─ Routing: ${m.proposedStack.routing.library}`);
      console.log(`   ├─ Styling: ${m.proposedStack.styling.library}`);
      console.log(`   └─ Testing: ${m.proposedStack.testing.library}`);
      console.log('');
      console.log('   📝 REGLAS DE MIGRACIÓN:');
      m.migrationRules.slice(0, 5).forEach(rule => {
        console.log(`   ├─ ${rule.name} ${rule.isCritical ? '🔴' : ''}`);
      });
      if (m.migrationRules.length > 5) {
        console.log(`   └─ ... y ${m.migrationRules.length - 5} más`);
      }
      console.log('');
      console.log('   📁 CONFIGURACIÓN A GENERAR:');
      console.log(`   ├─ Nuevas deps: ${Object.keys(m.configUpdates.dependencies).length}`);
      console.log(`   ├─ A eliminar: ${m.configUpdates.removePackages.length}`);
      console.log(`   └─ Config files: ${m.configUpdates.configFiles.length}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n💡 Ejecuta para aplicar:');
      console.log(`   osmosis refactor --source ${projectDir} --framework react --integral --apply-config`);
      console.log('');

    } catch (error) {
      spinner.fail('Error generando plan');
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

/**
 * Loop de Reparación Real con LLM (Max 3 intentos)
 */
async function attemptRepair(
  llmService: LLMService,
  code: string,
  errors: string[],
  targetTech: string,
  maxRetries = 3
): Promise<string | null> {
  console.log(`\n🔧 Iniciando auto-reparación con Claude (Max ${maxRetries} intentos)...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n   🤖 Intento ${attempt}/${maxRetries} - Enviando a Claude...`);

    try {
      // Llamar al LLM para reparar el código
      const repairedCode = await llmService.repair(
        code,
        errors,
        targetTech,
        attempt
      );

      // Validar código reparado
      const validation = CodeSafeGuard.validate(repairedCode, targetTech as 'react' | 'angular' | 'vue');

      if (validation.isValid) {
        console.log(`   ✅ Reparación exitosa en intento ${attempt}`);
        return repairedCode;
      } else {
        console.log(`   ⚠️  Intento ${attempt} - Aún hay errores:`);
        validation.errors.forEach(err => console.log(`      - ${err}`));

        // Actualizar para siguiente intento
        errors = validation.errors;
        code = repairedCode; // Usar versión parcialmente reparada como base

        if (attempt < maxRetries) {
          console.log(`   🔄 Reintentando con errores actualizados...`);
        }
      }

    } catch (error) {
      console.error(`   ❌ Error en intento ${attempt}: ${error}`);

      // Si falla la conexión al LLM, intentar fallback con fixes conocidos
      console.log(`   🔧 Intentando fixes automáticos conocidos...`);
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
      }

      // Validar fallback
      const validation = CodeSafeGuard.validate(repairedCode, targetTech as 'react' | 'angular' | 'vue');
      if (validation.isValid) {
        console.log(`   ✅ Reparación exitosa con fixes automáticos`);
        return repairedCode;
      }

      code = repairedCode;
    }
  }

  console.log(`\n❌ Auto-reparación falló después de ${maxRetries} intentos`);
  console.log(`   💡 Considera revisar manualmente el archivo`);
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
