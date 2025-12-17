/**
 * Video Analyzer - Extrae frames y metadatos de videos/GIFs
 * Procesa videos de aplicaciones legacy en uso para entender comportamiento
 */

import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

// Configurar ffmpeg
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

interface VideoMetadata {
  duration: number
  fps: number
  width: number
  height: number
  format: string
  codec: string
}

interface Frame {
  timestamp: number
  index: number
  imagePath: string
  imageBuffer?: Buffer
}

interface VideoAnalysisResult {
  metadata: VideoMetadata
  frames: Frame[]
  keyFrames: Frame[]
  totalFrames: number
  outputDir: string
}

interface ExtractOptions {
  fps?: number // Frames por segundo a extraer (default: 1 = 1 frame/segundo)
  maxFrames?: number // Máximo de frames a extraer
  outputDir?: string
  extractKeyFramesOnly?: boolean
  quality?: number // 1-100
}

export class VideoAnalyzer {
  private tmpDir: string

  constructor(tmpDir: string = '/tmp/osmosis') {
    this.tmpDir = tmpDir
  }

  /**
   * Analiza un video completo
   */
  async analyze(
    videoPath: string,
    options: ExtractOptions = {}
  ): Promise<VideoAnalysisResult> {
    console.error(`🎬 Analizando video: ${videoPath}`)

    // 1. Crear directorio de output
    const outputDir = options.outputDir || path.join(this.tmpDir, `analysis-${Date.now()}`)
    await fs.mkdir(outputDir, { recursive: true })

    // 2. Extraer metadata
    console.error('📊 Extrayendo metadata...')
    const metadata = await this.extractMetadata(videoPath)

    // 3. Extraer frames
    console.error('🎞️  Extrayendo frames...')
    const frames = await this.extractFrames(videoPath, outputDir, {
      ...options,
      metadata
    })

    // 4. Detectar key frames (frames con cambios significativos)
    console.error('🔍 Detectando key frames...')
    const keyFrames = await this.detectKeyFrames(frames)

    console.error(`✅ Análisis completo: ${frames.length} frames, ${keyFrames.length} key frames`)

    return {
      metadata,
      frames,
      keyFrames,
      totalFrames: frames.length,
      outputDir
    }
  }

  /**
   * Extrae metadata del video
   */
  private extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Error leyendo metadata: ${err.message}`))
          return
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video')
        
        if (!videoStream) {
          reject(new Error('No se encontró stream de video'))
          return
        }

        resolve({
          duration: metadata.format.duration || 0,
          fps: this.parseFps(videoStream.r_frame_rate || '30/1'),
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          format: metadata.format.format_name || 'unknown',
          codec: videoStream.codec_name || 'unknown'
        })
      })
    })
  }

  /**
   * Extrae frames del video
   */
  private async extractFrames(
    videoPath: string,
    outputDir: string,
    options: ExtractOptions & { metadata: VideoMetadata }
  ): Promise<Frame[]> {
    const { fps = 1, maxFrames, metadata } = options
    const framesDir = path.join(outputDir, 'frames')
    await fs.mkdir(framesDir, { recursive: true })

    // Calcular cuántos frames extraer
    const totalFramesToExtract = maxFrames || Math.floor(metadata.duration * fps)

    return new Promise((resolve, reject) => {
      const frames: Frame[] = []
      let frameIndex = 0

      ffmpeg(videoPath)
        .fps(fps)
        .frames(totalFramesToExtract)
        .output(path.join(framesDir, 'frame-%04d.png'))
        .on('end', async () => {
          // Leer frames generados
          const files = await fs.readdir(framesDir)
          const sortedFiles = files.sort()

          for (const file of sortedFiles) {
            const framePath = path.join(framesDir, file)
            frames.push({
              timestamp: frameIndex / fps,
              index: frameIndex,
              imagePath: framePath
            })
            frameIndex++
          }

          resolve(frames)
        })
        .on('error', (err) => {
          reject(new Error(`Error extrayendo frames: ${err.message}`))
        })
        .run()
    })
  }

  /**
   * Detecta key frames (frames con cambios visuales significativos)
   * Útil para identificar transiciones, modals, loading states, etc.
   */
  private async detectKeyFrames(frames: Frame[]): Promise<Frame[]> {
    if (frames.length === 0) return []

    const keyFrames: Frame[] = [frames[0]] // Primer frame siempre es key
    let previousBuffer: Buffer | null = null

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const currentBuffer = await fs.readFile(frame.imagePath)

      if (previousBuffer) {
        const similarity = await this.compareImages(previousBuffer, currentBuffer)
        
        // Si la similitud es < 85%, es un cambio significativo
        if (similarity < 0.85) {
          keyFrames.push(frame)
        }
      }

      previousBuffer = currentBuffer

      // Para no comparar todos (sería muy lento), sample cada 5 frames
      if (i % 5 === 0) {
        previousBuffer = currentBuffer
      }
    }

    // Último frame siempre es key
    if (frames.length > 1) {
      keyFrames.push(frames[frames.length - 1])
    }

    return keyFrames
  }

  /**
   * Compara dos imágenes y retorna similitud (0-1)
   */
  private async compareImages(img1: Buffer, img2: Buffer): Promise<number> {
    try {
      // Redimensionar a tamaño pequeño para comparación rápida
      const size = 32
      
      const [data1, data2] = await Promise.all([
        sharp(img1).resize(size, size).raw().toBuffer(),
        sharp(img2).resize(size, size).raw().toBuffer()
      ])

      // Calcular diferencia pixel a pixel
      let diff = 0
      for (let i = 0; i < data1.length; i++) {
        diff += Math.abs(data1[i] - data2[i])
      }

      // Normalizar (0 = idénticas, 1 = completamente diferentes)
      const maxDiff = data1.length * 255
      const normalizedDiff = diff / maxDiff

      // Retornar similitud (1 - diferencia)
      return 1 - normalizedDiff
    } catch (error) {
      console.warn('Error comparando imágenes:', error)
      return 0
    }
  }

  /**
   * Parse FPS del formato "30/1"
   */
  private parseFps(fpsString: string): number {
    const parts = fpsString.split('/')
    const num = parseInt(parts[0])
    const den = parseInt(parts[1] || '1')
    return num / den
  }

  /**
   * Extrae un frame específico en un timestamp
   */
  async extractFrameAt(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath)
        })
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
    })
  }

  /**
   * Convierte GIF a video (para procesamiento más fácil)
   */
  async gifToVideo(gifPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(gifPath)
        .output(outputPath)
        .videoCodec('libx264')
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .run()
    })
  }

  /**
   * Limpia archivos temporales
   */
  async cleanup(analysisResult: VideoAnalysisResult): Promise<void> {
    try {
      await fs.rm(analysisResult.outputDir, { recursive: true, force: true })
      console.error('🗑️  Archivos temporales limpiados')
    } catch (error) {
      console.warn('⚠️  Error limpiando archivos temporales:', error)
    }
  }

  /**
   * Crea un thumbnail del video
   */
  async createThumbnail(
    videoPath: string,
    outputPath: string,
    timestamp: number = 1
  ): Promise<string> {
    return this.extractFrameAt(videoPath, timestamp, outputPath)
  }
}

// Singleton
export const videoAnalyzer = new VideoAnalyzer()

export type { VideoMetadata, Frame, VideoAnalysisResult, ExtractOptions }



