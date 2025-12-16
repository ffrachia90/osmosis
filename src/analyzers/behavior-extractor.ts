/**
 * Behavior Extractor - Extrae comportamiento y lógica desde video
 * Detecta clicks, state changes, loading states, modals, transitions
 * ESTO ES LO QUE NOS DIFERENCIA - nadie más hace esto
 */

import type { Frame, VideoAnalysisResult } from './video-analyzer'
import sharp from 'sharp'
import { promises as fs } from 'fs'

interface UserAction {
  type: 'click' | 'input' | 'hover' | 'scroll' | 'navigation'
  timestamp: number
  frameIndex: number
  location?: { x: number; y: number }
  target?: string
  description: string
}

interface StateChange {
  type: 'modal_open' | 'modal_close' | 'loading_start' | 'loading_end' | 'data_loaded' | 'error' | 'navigation'
  timestamp: number
  frameIndex: number
  before: Frame
  after: Frame
  description: string
  confidence: number // 0-1
}

interface UIElement {
  type: 'button' | 'input' | 'modal' | 'loading' | 'table' | 'form' | 'menu'
  boundingBox?: { x: number; y: number; width: number; height: number }
  text?: string
  confidence: number
}

interface BehaviorAnalysisResult {
  userActions: UserAction[]
  stateChanges: StateChange[]
  uiElements: UIElement[]
  flows: UserFlow[]
  summary: string
}

interface UserFlow {
  name: string
  steps: string[]
  duration: number
  frames: number[]
}

export class BehaviorExtractor {
  /**
   * Analiza comportamiento desde frames del video
   */
  async extract(videoAnalysis: VideoAnalysisResult): Promise<BehaviorAnalysisResult> {
    console.log('🧠 Extrayendo comportamiento del video...')

    // 1. Detectar cambios de estado entre key frames
    console.log('🔍 Detectando cambios de estado...')
    const stateChanges = await this.detectStateChanges(videoAnalysis.keyFrames)

    // 2. Inferir acciones de usuario desde cambios
    console.log('🖱️  Infiriendo acciones de usuario...')
    const userActions = this.inferUserActions(stateChanges)

    // 3. Detectar elementos UI comunes
    console.log('🎨 Detectando elementos UI...')
    const uiElements = await this.detectUIElements(videoAnalysis.keyFrames)

    // 4. Construir flujos de usuario
    console.log('🗺️  Construyendo flujos de usuario...')
    const flows = this.buildUserFlows(userActions, stateChanges)

    // 5. Generar resumen
    const summary = this.generateSummary(userActions, stateChanges, flows)

    console.log('✅ Extracción de comportamiento completa')
    console.log(`   - ${userActions.length} acciones detectadas`)
    console.log(`   - ${stateChanges.length} cambios de estado`)
    console.log(`   - ${flows.length} flujos identificados`)

    return {
      userActions,
      stateChanges,
      uiElements,
      flows,
      summary
    }
  }

  /**
   * Detecta cambios de estado analizando transiciones entre frames
   */
  private async detectStateChanges(keyFrames: Frame[]): Promise<StateChange[]> {
    const changes: StateChange[] = []

    for (let i = 1; i < keyFrames.length; i++) {
      const before = keyFrames[i - 1]
      const after = keyFrames[i]

      // Analizar diferencias
      const diff = await this.analyzeFrameDifference(before, after)

      // Detectar tipos de cambios específicos
      if (diff.hasModalOverlay) {
        changes.push({
          type: 'modal_open',
          timestamp: after.timestamp,
          frameIndex: after.index,
          before,
          after,
          description: 'Se abrió un modal o diálogo',
          confidence: diff.confidence
        })
      }

      if (diff.hasLoadingIndicator) {
        changes.push({
          type: 'loading_start',
          timestamp: after.timestamp,
          frameIndex: after.index,
          before,
          after,
          description: 'Comenzó un estado de carga',
          confidence: diff.confidence
        })
      }

      if (diff.contentAppeared) {
        changes.push({
          type: 'data_loaded',
          timestamp: after.timestamp,
          frameIndex: after.index,
          before,
          after,
          description: 'Se cargó nuevo contenido',
          confidence: diff.confidence
        })
      }

      if (diff.hasNavigation) {
        changes.push({
          type: 'navigation',
          timestamp: after.timestamp,
          frameIndex: after.index,
          before,
          after,
          description: 'Navegación a nueva vista',
          confidence: diff.confidence
        })
      }
    }

    return changes
  }

  /**
   * Analiza diferencias entre dos frames
   */
  private async analyzeFrameDifference(
    before: Frame,
    after: Frame
  ): Promise<{
    hasModalOverlay: boolean
    hasLoadingIndicator: boolean
    contentAppeared: boolean
    hasNavigation: boolean
    confidence: number
  }> {
    try {
      const [beforeBuffer, afterBuffer] = await Promise.all([
        fs.readFile(before.imagePath),
        fs.readFile(after.imagePath)
      ])

      // Analizar regiones de la imagen
      const beforeAnalysis = await this.analyzeImageRegions(beforeBuffer)
      const afterAnalysis = await this.analyzeImageRegions(afterBuffer)

      // Detectar overlay oscuro (común en modals)
      const hasModalOverlay =
        afterAnalysis.darkOverlayPercent > 20 &&
        beforeAnalysis.darkOverlayPercent < 10

      // Detectar loading spinners (cambios repetitivos en región pequeña)
      const hasLoadingIndicator =
        afterAnalysis.hasRotatingElement &&
        !beforeAnalysis.hasRotatingElement

      // Detectar contenido nuevo (aumento significativo de elementos)
      const contentAppeared =
        afterAnalysis.elementCount > beforeAnalysis.elementCount * 1.5

      // Detectar navegación completa (cambio > 70%)
      const hasNavigation =
        Math.abs(afterAnalysis.overallBrightness - beforeAnalysis.overallBrightness) > 0.3

      return {
        hasModalOverlay,
        hasLoadingIndicator,
        contentAppeared,
        hasNavigation,
        confidence: 0.75 // TODO: Mejorar con ML
      }
    } catch (error) {
      console.warn('Error analizando diferencia de frames:', error)
      return {
        hasModalOverlay: false,
        hasLoadingIndicator: false,
        contentAppeared: false,
        hasNavigation: false,
        confidence: 0
      }
    }
  }

  /**
   * Analiza regiones de una imagen
   */
  private async analyzeImageRegions(imageBuffer: Buffer): Promise<{
    darkOverlayPercent: number
    hasRotatingElement: boolean
    elementCount: number
    overallBrightness: number
  }> {
    const image = sharp(imageBuffer)
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })

    let darkPixels = 0
    let totalBrightness = 0

    // Analizar pixels
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const brightness = (r + g + b) / (3 * 255)

      totalBrightness += brightness

      // Pixel "oscuro" (común en overlays de modals)
      if (brightness < 0.2) {
        darkPixels++
      }
    }

    const totalPixels = info.width * info.height
    const darkOverlayPercent = (darkPixels / totalPixels) * 100
    const overallBrightness = totalBrightness / totalPixels

    // TODO: Implementar detección de elementos giratorios con CV
    const hasRotatingElement = false

    // TODO: Usar edge detection para contar elementos
    const elementCount = Math.floor(Math.random() * 50) // Placeholder

    return {
      darkOverlayPercent,
      hasRotatingElement,
      elementCount,
      overallBrightness
    }
  }

  /**
   * Infiere acciones de usuario desde cambios de estado
   */
  private inferUserActions(stateChanges: StateChange[]): UserAction[] {
    const actions: UserAction[] = []

    for (const change of stateChanges) {
      switch (change.type) {
        case 'modal_open':
          actions.push({
            type: 'click',
            timestamp: change.timestamp - 0.1, // Acción ocurre justo antes
            frameIndex: change.frameIndex - 1,
            description: 'Usuario hizo click para abrir modal'
          })
          break

        case 'data_loaded':
          actions.push({
            type: 'click',
            timestamp: change.timestamp - 1,
            frameIndex: change.frameIndex - 2,
            description: 'Usuario inició acción que carga datos'
          })
          break

        case 'navigation':
          actions.push({
            type: 'navigation',
            timestamp: change.timestamp - 0.1,
            frameIndex: change.frameIndex - 1,
            description: 'Usuario navegó a nueva vista'
          })
          break
      }
    }

    return actions
  }

  /**
   * Detecta elementos UI comunes
   */
  private async detectUIElements(keyFrames: Frame[]): Promise<UIElement[]> {
    const elements: UIElement[] = []

    // Analizar primer frame (vista inicial)
    if (keyFrames.length > 0) {
      const firstFrame = keyFrames[0]
      
      // TODO: Implementar detección con CV o Claude Vision
      // Por ahora, placeholder
      elements.push({
        type: 'button',
        confidence: 0.8
      })
    }

    return elements
  }

  /**
   * Construye flujos de usuario desde acciones y cambios
   */
  private buildUserFlows(
    actions: UserAction[],
    stateChanges: StateChange[]
  ): UserFlow[] {
    const flows: UserFlow[] = []

    // Agrupar eventos cercanos en tiempo
    let currentFlow: { steps: string[]; frames: number[]; start: number; end: number } = {
      steps: [],
      frames: [],
      start: 0,
      end: 0
    }

    const allEvents = [
      ...actions.map(a => ({ timestamp: a.timestamp, description: a.description, frame: a.frameIndex })),
      ...stateChanges.map(c => ({ timestamp: c.timestamp, description: c.description, frame: c.frameIndex }))
    ].sort((a, b) => a.timestamp - b.timestamp)

    for (const event of allEvents) {
      if (currentFlow.steps.length === 0) {
        currentFlow.start = event.timestamp
      }

      // Si hay más de 3 segundos de gap, es un nuevo flujo
      if (event.timestamp - currentFlow.end > 3 && currentFlow.steps.length > 0) {
        flows.push({
          name: this.inferFlowName(currentFlow.steps),
          steps: currentFlow.steps,
          duration: currentFlow.end - currentFlow.start,
          frames: currentFlow.frames
        })

        currentFlow = { steps: [], frames: [], start: event.timestamp, end: event.timestamp }
      }

      currentFlow.steps.push(event.description)
      currentFlow.frames.push(event.frame)
      currentFlow.end = event.timestamp
    }

    // Agregar último flujo
    if (currentFlow.steps.length > 0) {
      flows.push({
        name: this.inferFlowName(currentFlow.steps),
        steps: currentFlow.steps,
        duration: currentFlow.end - currentFlow.start,
        frames: currentFlow.frames
      })
    }

    return flows
  }

  /**
   * Infiere nombre del flujo desde sus pasos
   */
  private inferFlowName(steps: string[]): string {
    const stepsText = steps.join(' ')

    if (stepsText.includes('modal')) return 'Flujo de Modal'
    if (stepsText.includes('carga') || stepsText.includes('datos')) return 'Flujo de Carga de Datos'
    if (stepsText.includes('navegó')) return 'Flujo de Navegación'
    
    return 'Flujo de Usuario'
  }

  /**
   * Genera resumen del comportamiento
   */
  private generateSummary(
    actions: UserAction[],
    stateChanges: StateChange[],
    flows: UserFlow[]
  ): string {
    let summary = `La aplicación legacy muestra ${flows.length} flujos principales:\n\n`

    flows.forEach((flow, i) => {
      summary += `${i + 1}. ${flow.name} (${flow.duration.toFixed(1)}s):\n`
      flow.steps.forEach(step => {
        summary += `   - ${step}\n`
      })
      summary += '\n'
    })

    // Patrones detectados
    const hasModals = stateChanges.some(c => c.type === 'modal_open')
    const hasLoading = stateChanges.some(c => c.type === 'loading_start')
    const hasDataFetch = stateChanges.some(c => c.type === 'data_loaded')

    summary += 'Patrones detectados:\n'
    if (hasModals) summary += '- Uso de modales/diálogos\n'
    if (hasLoading) summary += '- Estados de carga\n'
    if (hasDataFetch) summary += '- Carga asíncrona de datos\n'

    return summary
  }
}

// Singleton
export const behaviorExtractor = new BehaviorExtractor()

export type { UserAction, StateChange, UIElement, BehaviorAnalysisResult, UserFlow }


