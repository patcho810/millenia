import type { StageNode, StageId } from './types'
import { preprocessAlgorithms } from './stages/preprocess'
import { scaleAlgorithms } from './stages/scale'
import { paletteAlgorithms } from './stages/palette'
import { quantizeAlgorithms } from './stages/quantize'
import { ditherAlgorithms } from './stages/dither'
import { blockAlgorithms } from './stages/block'
import { rgbToLab } from './stages/shared'

type RGB = [number, number, number]

const STAGE_ORDER: StageId[] = ['scale', 'preprocess', 'palette', 'quantize', 'block', 'dither']

const ALGO_MAP: Record<StageId, Record<string, Function>> = {
  preprocess: preprocessAlgorithms,
  scale: scaleAlgorithms,
  palette: paletteAlgorithms,
  quantize: quantizeAlgorithms,
  dither: ditherAlgorithms,
  block: blockAlgorithms,
  postfx: {},
}

export async function executePipeline(
  sourceImg: HTMLImageElement,
  canvas: HTMLCanvasElement,
  stages: StageNode[],
  palette: RGB[],
  paletteLab: [number, number, number][],
  displayPixelSize: number,
  maxDisplaySize: number = 600,
): Promise<ImageData> {
  const stageMap = new Map<StageId, StageNode>()
  for (const s of stages) stageMap.set(s.stageId, s)

  let sw = sourceImg.naturalWidth
  let sh = sourceImg.naturalHeight
  if (sw > maxDisplaySize || sh > maxDisplaySize) {
    const s = Math.min(maxDisplaySize / sw, maxDisplaySize / sh)
    sw = Math.floor(sw * s); sh = Math.floor(sh * s)
  }

  canvas.width = sw; canvas.height = sh

  const pw = Math.max(1, Math.floor(sw / displayPixelSize))
  const ph = Math.max(1, Math.floor(sh / displayPixelSize))

  const scaleStage = stageMap.get('scale')
  let smallCanvas: HTMLCanvasElement
  if (scaleStage?.enabled) {
    const fn = scaleAlgorithms[scaleStage.algorithm]
    if (fn) {
      smallCanvas = fn(sourceImg, pw, ph, scaleStage.params)
    } else {
      smallCanvas = scaleAlgorithms['nearest']!(sourceImg, pw, ph, {})
    }
  } else {
    smallCanvas = scaleAlgorithms['nearest']!(sourceImg, pw, ph, {})
  }

  const sc = smallCanvas.getContext('2d')!
  const id = sc.getImageData(0, 0, pw, ph)

  const preprocessStage = stageMap.get('preprocess')
  if (preprocessStage?.enabled) {
    const fn = ALGO_MAP.preprocess[preprocessStage.algorithm]
    if (fn) fn(id, pw, ph, preprocessStage.params)
  }

  const paletteStage = stageMap.get('palette')
  if (paletteStage?.enabled && paletteStage.algorithm === 'median-cut') {
    const fn = paletteAlgorithms[paletteStage.algorithm]
    if (fn) {
      const generated = fn(id, pw, ph, paletteStage.params as Record<string, number>)
      if (generated.length > 0) {
        palette.length = 0
        palette.push(...generated)
        paletteLab.length = 0
        paletteLab.push(...generated.map(c => rgbToLab(c[0], c[1], c[2])))
      }
    }
  }

  const quantizeStage = stageMap.get('quantize')
  if (quantizeStage?.enabled) {
    const fn = ALGO_MAP.quantize[quantizeStage.algorithm]
    if (fn) fn(id, pw, ph, palette, quantizeStage.params as Record<string, number>, paletteLab)
  }

  const blockStage = stageMap.get('block')
  if (blockStage?.enabled) {
    const fn = ALGO_MAP.block[blockStage.algorithm]
    if (fn) fn(id, pw, ph, blockStage.params)
  }

  const recommendedStrength = (userValue: number, paletteSize: number): number => {
    if (paletteSize >= 33) return 0
    if (paletteSize >= 17) return Math.min(userValue, 0.5)
    return userValue
  }

  const ditherStage = stageMap.get('dither')
  if (ditherStage?.enabled) {
    const fn = ALGO_MAP.dither[ditherStage.algorithm]
    if (fn) {
      const strength = recommendedStrength(
        (ditherStage.params['strength'] as number) ?? 0,
        palette.length,
      )
      fn(id, pw, ph, palette, { ...ditherStage.params, strength }, paletteLab)
    }
  }

  sc.putImageData(id, 0, 0)

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, sw, sh)
  ctx.drawImage(smallCanvas, 0, 0, sw, sh)

  return ctx.getImageData(0, 0, sw, sh)
}
