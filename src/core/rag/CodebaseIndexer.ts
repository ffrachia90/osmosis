/**
 * CodebaseIndexer - Escanea proyectos y construye Knowledge Graph con embeddings
 * - Extrae código real y docstrings
 * - Genera embeddings vectoriales
 * - Caché inteligente
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { KnowledgeGraph } from './KnowledgeGraph.js';
import { EntityExtractor } from './EntityExtractor.js';
import { EmbeddingConfig } from './EmbeddingsEngine.js';

export class CodebaseIndexer {
  private rootDir: string;
  private embeddingConfig: EmbeddingConfig;
  
  constructor(rootDir: string, embeddingConfig: EmbeddingConfig) {
    this.rootDir = rootDir;
    this.embeddingConfig = embeddingConfig;
  }
  
  /**
   * Indexa el codebase completo con embeddings
   */
  async index(): Promise<KnowledgeGraph> {
    console.log('🧠 Construyendo Knowledge Graph con embeddings...');
    
    // Intentar cargar desde cache primero
    const fileModTimes = this.getFileModificationTimes();
    const isCacheStale = KnowledgeGraph.isCacheStale(this.rootDir, fileModTimes);
    
    if (!isCacheStale) {
      const cachedGraph = await KnowledgeGraph.load(this.rootDir, this.embeddingConfig);
      if (cachedGraph) {
        console.log('✅ Usando Knowledge Graph desde caché (instantáneo)');
        return cachedGraph;
      }
    }
    
    console.log('📦 Caché no disponible o desactualizado, indexando desde cero...');
    
    // Crear nuevo grafo
    const graph = new KnowledgeGraph(this.embeddingConfig, this.rootDir);
    
    // Buscar todos los archivos JS/TS
    const files = await glob('**/*.{js,jsx,ts,tsx}', {
      cwd: this.rootDir,
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.osmosis/**'],
      absolute: true
    });
    
    console.log(`📁 Encontrados ${files.length} archivos para indexar`);
    
    let totalEntities = 0;
    
    // Procesar archivos en paralelo (batches de 10)
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (filePath) => {
        try {
          const entities = EntityExtractor.extractFromFile(filePath);
          
          // Agregar cada entidad al grafo (con embedding)
          for (const entity of entities) {
            await graph.addEntity(entity);
            totalEntities++;
          }
          
        } catch (error) {
          console.warn(`⚠️  Error indexing ${filePath}: ${error}`);
        }
      }));
      
      // Progress indicator
      const progress = Math.min(100, ((i + batchSize) / files.length) * 100);
      process.stdout.write(`\r⏳ Progreso: ${progress.toFixed(0)}% (${totalEntities} entidades)`);
    }
    
    console.log('\n');
    
    // Guardar en cache
    await graph.save(this.rootDir);
    
    const stats = graph.getStats();
    console.log(`✅ Indexación completa:`);
    console.log(`   📦 ${stats.totalEntities} entidades`);
    console.log(`   🧮 ${stats.totalVectors} vectores generados`);
    console.log(`   🎨 ${stats.byType.component || 0} componentes`);
    console.log(`   🪝 ${stats.byType.hook || 0} hooks`);
    console.log(`   ⚙️  ${stats.byType.function || 0} funciones`);
    
    return graph;
  }
  
  /**
   * Obtiene timestamps de modificación de archivos
   */
  private getFileModificationTimes(): Map<string, number> {
    const times = new Map<string, number>();
    
    try {
      const files = glob.sync('**/*.{js,jsx,ts,tsx}', {
        cwd: this.rootDir,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.osmosis/**'],
        absolute: true
      });
      
      files.forEach(file => {
        const stats = fs.statSync(file);
        times.set(file, stats.mtimeMs);
      });
      
    } catch (error) {
      console.warn(`⚠️  Error getting file times: ${error}`);
    }
    
    return times;
  }
  
  /**
   * Invalida el cache (forza re-indexación)
   */
  static invalidateCache(projectRoot: string): void {
    const cachePath = path.join(projectRoot, '.osmosis', 'knowledge-graph.json');
    
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
      console.log('✅ Cache invalidado');
    }
  }
}
