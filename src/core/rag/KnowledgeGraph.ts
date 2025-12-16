/**
 * KnowledgeGraph - Sistema RAG Enterprise-Grade
 * - Búsqueda semántica con embeddings vectoriales
 * - Persistencia en disco para velocidad
 * - Contexto global del proyecto
 */

import fs from 'fs';
import path from 'path';
import { ExtractedEntity } from './EntityExtractor.js';
import { EmbeddingsEngine, VectorEntity, EmbeddingConfig } from './EmbeddingsEngine.js';

export interface KnowledgeGraphData {
  entities: Map<string, ExtractedEntity>;
  vectors: VectorEntity[];
  metadata: {
    indexed: number; // Timestamp
    version: string;
    projectPath: string;
  };
}

export class KnowledgeGraph {
  private entities: Map<string, ExtractedEntity> = new Map();
  private vectors: VectorEntity[] = [];
  private embeddingsEngine: EmbeddingsEngine;
  private cacheDir: string = '.osmosis';
  
  constructor(embeddingConfig: EmbeddingConfig, projectRoot?: string) {
    this.embeddingsEngine = new EmbeddingsEngine(embeddingConfig);
    
    if (projectRoot) {
      this.cacheDir = path.join(projectRoot, '.osmosis');
    }
  }
  
  /**
   * Agrega una entidad y genera su embedding
   */
  async addEntity(entity: ExtractedEntity): Promise<void> {
    this.entities.set(entity.id, entity);
    
    // Generar embedding vectorial
    const embedding = await this.embeddingsEngine.generateCodeEmbedding({
      sourceCode: entity.sourceCode,
      docstring: entity.docstring,
      signature: entity.signature
    });
    
    this.vectors.push({
      id: entity.id,
      embedding,
      metadata: {
        type: entity.type,
        filePath: entity.filePath,
        sourceCode: entity.sourceCode
      }
    });
  }
  
  /**
   * Búsqueda semántica por similitud vectorial
   */
  async search(query: string, topK: number = 5): Promise<ExtractedEntity[]> {
    // Generar embedding de la query
    const queryEmbedding = await this.embeddingsEngine.generateEmbedding(query);
    
    // Buscar los K vectores más similares
    const topVectors = this.embeddingsEngine.findTopK(queryEmbedding, this.vectors, topK);
    
    // Retornar entidades completas
    return topVectors
      .map(vec => this.entities.get(vec.id))
      .filter((e): e is ExtractedEntity => e !== undefined);
  }
  
  /**
   * Busca entidades relevantes para un código dado
   */
  async findRelevant(codeContext: string, topK: number = 5): Promise<ExtractedEntity[]> {
    return this.search(codeContext, topK);
  }
  
  /**
   * Busca componentes similares (evita duplicación)
   */
  async findSimilarComponents(componentName: string, sourceCode?: string): Promise<ExtractedEntity[]> {
    const query = sourceCode ? 
      `${componentName} ${sourceCode.substring(0, 500)}` : 
      componentName;
    
    const results = await this.search(query, 10);
    
    // Filtrar solo componentes
    return results.filter(e => e.type === 'component');
  }
  
  /**
   * Obtiene contexto relevante para un archivo siendo migrado
   */
  async getRelevantContext(filePath: string, legacyCode: string): Promise<{
    components: ExtractedEntity[];
    utilities: ExtractedEntity[];
    patterns: ExtractedEntity[];
  }> {
    const relevant = await this.search(legacyCode, 15);
    
    return {
      components: relevant.filter(e => e.type === 'component'),
      utilities: relevant.filter(e => e.type === 'function' || e.type === 'constant'),
      patterns: relevant.filter(e => e.type === 'hook')
    };
  }
  
  /**
   * Estadísticas del grafo
   */
  getStats() {
    const byType: Record<string, number> = {};
    
    this.entities.forEach(entity => {
      byType[entity.type] = (byType[entity.type] || 0) + 1;
    });
    
    return {
      totalEntities: this.entities.size,
      totalVectors: this.vectors.length,
      byType,
      hasEmbeddings: this.vectors.length > 0
    };
  }
  
  /**
   * Guarda el grafo completo en disco (.osmosis/knowledge-graph.json)
   */
  async save(projectRoot: string): Promise<void> {
    const cacheDir = path.join(projectRoot, '.osmosis');
    
    // Crear carpeta si no existe
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const data: any = {
      entities: Array.from(this.entities.entries()),
      vectors: this.vectors,
      metadata: {
        indexed: Date.now(),
        version: '1.0.0',
        projectPath: projectRoot
      }
    };
    
    const graphPath = path.join(cacheDir, 'knowledge-graph.json');
    fs.writeFileSync(graphPath, JSON.stringify(data, null, 2));
    
    // Guardar también cache de embeddings
    const embeddingsCachePath = path.join(cacheDir, 'embeddings-cache.json');
    this.embeddingsEngine.saveCache(embeddingsCachePath);
    
    console.log(`✅ Knowledge Graph guardado en ${graphPath}`);
  }
  
  /**
   * Carga el grafo desde disco (cache)
   */
  static async load(projectRoot: string, embeddingConfig: EmbeddingConfig): Promise<KnowledgeGraph | null> {
    const graphPath = path.join(projectRoot, '.osmosis', 'knowledge-graph.json');
    
    if (!fs.existsSync(graphPath)) {
      return null; // No hay cache
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      
      const graph = new KnowledgeGraph(embeddingConfig, projectRoot);
      
      // Restaurar entities
      graph.entities = new Map(data.entities);
      
      // Restaurar vectors
      graph.vectors = data.vectors;
      
      // Cargar embeddings cache
      const embeddingsCachePath = path.join(projectRoot, '.osmosis', 'embeddings-cache.json');
      if (fs.existsSync(embeddingsCachePath)) {
        graph.embeddingsEngine.loadCache(embeddingsCachePath);
      }
      
      console.log(`✅ Knowledge Graph cargado desde cache (${graph.entities.size} entidades)`);
      return graph;
      
    } catch (error) {
      console.warn(`⚠️  Error loading cache: ${error}`);
      return null;
    }
  }
  
  /**
   * Verifica si el cache está actualizado
   */
  static isCacheStale(projectRoot: string, fileModifiedTimes: Map<string, number>): boolean {
    const graphPath = path.join(projectRoot, '.osmosis', 'knowledge-graph.json');
    
    if (!fs.existsSync(graphPath)) {
      return true; // No hay cache
    }
    
    const cacheStats = fs.statSync(graphPath);
    const cacheTime = cacheStats.mtimeMs;
    
    // Si algún archivo fue modificado después del cache, está stale
    for (const [filePath, modTime] of fileModifiedTimes.entries()) {
      if (modTime > cacheTime) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Exporta solo entities a JSON (para debugging)
   */
  toJSON(): string {
    return JSON.stringify({
      entities: Array.from(this.entities.entries()),
      totalVectors: this.vectors.length
    }, null, 2);
  }
}
