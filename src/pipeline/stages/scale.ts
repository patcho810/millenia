type ScaleFn = (
  source: CanvasImageSource,
  targetW: number,
  targetH: number,
  _params: Record<string, unknown>,
) => HTMLCanvasElement

function nearest(
  source: CanvasImageSource,
  targetW: number,
  targetH: number,
  _params: Record<string, unknown>,
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = targetW; c.height = targetH
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 0, 0, targetW, targetH)
  return c
}

function bilinear(
  source: CanvasImageSource,
  targetW: number,
  targetH: number,
  _params: Record<string, unknown>,
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = targetW; c.height = targetH
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'low'
  ctx.drawImage(source, 0, 0, targetW, targetH)
  return c
}

function bicubic(
  source: CanvasImageSource,
  targetW: number,
  targetH: number,
  _params: Record<string, unknown>,
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = targetW; c.height = targetH
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'medium'
  ctx.drawImage(source, 0, 0, targetW, targetH)
  return c
}

function lanczos(
  source: CanvasImageSource,
  targetW: number,
  targetH: number,
  _params: Record<string, unknown>,
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = targetW; c.height = targetH
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, targetW, targetH)
  return c
}

export const scaleAlgorithms: Record<string, ScaleFn> = {
  'nearest': nearest,
  'bilinear': bilinear,
  'bicubic': bicubic,
  'lanczos': lanczos,
}
