/**
 * EmbeddingsEngine - Genera y compara vectores semánticos
 * Soporta: OpenAI, Gemini, o embeddings locales
 */

import { createHash } from 'crypto';

export type EmbeddingProvider = 'openai' | 'gemini' | 'local';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  apiKey?: string;
  model?: string; // e.g., 'text-embedding-3-small' for OpenAI
}

export interface VectorEntity {
  id: string;
  embedding: number[]; // Vector de números
  metadata: {
    type: string;
    filePath: string;
    sourceCode: string;
  };
}

export class EmbeddingsEngine {
  private config: EmbeddingConfig;
  private cache: Map<string, number[]> = new Map();
  
  constructor(config: EmbeddingConfig) {
    this.config = config;
  }
  
  /**
   * Genera embedding para un texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache primero
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    let embedding: number[];
    
    switch (this.config.provider) {
      case 'openai':
        embedding = await this.generateOpenAIEmbedding(text);
        break;
      case 'gemini':
        embedding = await this.generateGeminiEmbedding(text);
        break;
      case 'local':
        embedding = this.generateLocalEmbedding(text);
        break;
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
    
    this.cache.set(cacheKey, embedding);
    return embedding;
  }
  
  /**
   * OpenAI Embeddings
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required');
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          input: text,
          model: this.config.model || 'text-embedding-3-small'
        })
      });
      
      const data = await response.json() as any;
      return data.data[0].embedding;
      
    } catch (error) {
      console.warn(`⚠️  OpenAI embedding failed: ${error}`);
      // Fallback a local
      return this.generateLocalEmbedding(text);
    }
  }
  
  /**
   * Gemini Embeddings
   */
  private async generateGeminiEmbedding(text: string): Promise<number[]> {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key required');
    }
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text }] }
          })
        }
      );
      
      const data = await response.json() as any;
      return data.embedding.values;
      
    } catch (error) {
      console.warn(`⚠️  Gemini embedding failed: ${error}`);
      // Fallback a local
      return this.generateLocalEmbedding(text);
    }
  }
  
  /**
   * Local Embeddings (Fallback simple)
   * Usa TF-IDF básico para generar vector
   */
  private generateLocalEmbedding(text: string): number[] {
    // TF-IDF simplificado
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    // Crear vector de 384 dimensiones (estándar para embeddings pequeños)
    const vector = new Array(384).fill(0);
    
    // Hash cada palabra a una posición en el vector
    words.forEach(word => {
      const hash = this.simpleHash(word);
      const index = hash % 384;
      vector[index] += 1;
    });
    
    // Normalizar
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  }
  
  /**
   * Calcula similitud coseno entre dos vectores
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same length');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (norm1 * norm2);
  }
  
  /**
   * Busca los top K vectores más similares
   */
  findTopK(queryEmbedding: number[], vectors: VectorEntity[], k: number = 5): VectorEntity[] {
    const similarities = vectors.map(vec => ({
      entity: vec,
      similarity: this.cosineSimilarity(queryEmbedding, vec.embedding)
    }));
    
    // Ordenar por similitud descendente
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Retornar top K
    return similarities.slice(0, k).map(s => s.entity);
  }
  
  /**
   * Genera embedding para código (usa docstring + signature + primeras líneas)
   */
  async generateCodeEmbedding(entity: {
    sourceCode: string;
    docstring?: string;
    signature?: string;
  }): Promise<number[]> {
    // Crear texto representativo del código
    const parts: string[] = [];
    
    if (entity.docstring) {
      parts.push(entity.docstring);
    }
    
    if (entity.signature) {
      parts.push(entity.signature);
    }
    
    // Primeras 10 líneas del código (sin comentarios)
    const codeLines = entity.sourceCode
      .split('\n')
      .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('/*'))
      .slice(0, 10);
    
    parts.push(codeLines.join(' '));
    
    const text = parts.join(' ');
    return this.generateEmbedding(text);
  }
  
  // Helper methods
  
  private getCacheKey(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Guarda embeddings cache en disco
   */
  saveCache(filePath: string): void {
    const fs = require('fs');
    const cacheData = Array.from(this.cache.entries());
    fs.writeFileSync(filePath, JSON.stringify(cacheData));
  }
  
  /**
   * Carga embeddings cache desde disco
   */
  loadCache(filePath: string): void {
    const fs = require('fs');
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const cacheData = JSON.parse(data);
      this.cache = new Map(cacheData);
      console.log(`✅ Loaded ${this.cache.size} cached embeddings`);
    } catch (error) {
      console.log('No cache found, starting fresh');
    }
  }
}

