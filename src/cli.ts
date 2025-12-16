#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import ora from 'ora';
import { PromptAssembler, PromptContext } from './core/prompt-engine/assembler.js';
import { CodeSafeGuard } from './core/safeguard/validator.js';
import { DependencyGraph } from './core/analysis/DependencyGraph.js';
import { LegacyDetector } from './analyzers/legacy-detector.js';

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

      // 3. Generar reporte
      spinner.start('📝 Generando reporte...');
      const report = {
        project: projectDir,
        timestamp: new Date().toISOString(),
        technologies,
        totalFiles: migrationOrder.length,
        migrationOrder: migrationOrder.map((file, index) => ({
          order: index + 1,
          file: path.relative(projectDir, file),
          complexity: graph.getComplexity(file),
          dependencies: graph.getNode(file)?.dependencies.length || 0,
          dependents: graph.getNode(file)?.dependents.length || 0
        })),
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
      console.log(`⏱️  Esfuerzo estimado: ${report.estimatedEffort.hours}h (${report.estimatedEffort.sprints} sprints)`);
      console.log('─'.repeat(60));
      console.log('\n🎯 ORDEN DE MIGRACIÓN ÓPTIMO (Primeros 10):');
      report.migrationOrder.slice(0, 10).forEach(item => {
        console.log(`  ${item.order}. ${item.file}`);
        console.log(`     ├─ Complejidad: ${item.complexity} líneas`);
        console.log(`     ├─ Dependencias: ${item.dependencies}`);
        console.log(`     └─ Dependientes: ${item.dependents}`);
      });
      
      if (migrationOrder.length > 10) {
        console.log(`  ... y ${migrationOrder.length - 10} archivos más (ver ${options.output})`);
      }

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

          // Generar prompt
          const prompt = PromptAssembler.assemble(context);

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

async function attemptRepair(code: string, errors: string[], targetTech: string): Promise<string | null> {
  // TODO: Implementar auto-reparación
  console.log('🔧 Intentando reparación automática...');
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
