import { BAYER_4X4 } from './dither'

type RGB = [number, number, number]

type PostFxFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: Record<string, number | boolean>,
  frame: number,
  palette?: RGB[],
) => void

function none() {}

function crt(ctx: CanvasRenderingContext2D, w: number, h: number, _params: Record<string, number | boolean>, _frame: number = 0, _palette?: RGB[]) {
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const copy = new Uint8ClampedArray(d)
  for (let i = 0; i < h; i++) {
    const t = i % 2 === 1 ? 0.65 : 1
    for (let j = 0; j < w; j++) {
      const idx = (i * w + j) * 4
      const lp = Math.max(0, j - 1), rp = Math.min(w - 1, j + 1)
      d[idx] = copy[(i * w + lp) * 4]! * t
      d[idx + 1] = copy[idx + 1]! * t
      d[idx + 2] = copy[(i * w + rp) * 4 + 2]! * t
    }
  }
  ctx.putImageData(id, 0, 0)
}

function glitch(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: Record<string, number | boolean>,
) {
  const pixelSize = (params['pixelSize'] as number) ?? 2
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const copy = new Uint8ClampedArray(d)
  const ox = Math.max(1, Math.round(pixelSize * 1.5))
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++) {
      const dst = (i * w + j) * 4
      d[dst] = copy[(i * w + Math.min(w - 1, j + ox)) * 4]!
      d[dst + 2] = copy[(i * w + Math.max(0, j - ox)) * 4 + 2]!
    }
  const lines = 8 + Math.floor(Math.random() * 8)
  const copy2 = new Uint8ClampedArray(d)
  for (let l = 0; l < lines; l++) {
    const sy = Math.floor(Math.random() * h / pixelSize) * pixelSize
    const bh = (Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 4)) * pixelSize
    const bw = pixelSize * (Math.random() < 0.5 ? 6 : 2)
    const shift = Math.round((Math.random() - 0.5) * 2 * bw)
    for (let i = sy; i < Math.min(h, sy + bh); i++)
      for (let j = 0; j < w; j++) {
        const sj = j - shift, dst = (i * w + j) * 4
        if (sj >= 0 && sj < w) {
          const src = (i * w + sj) * 4
          d[dst] = copy2[src]!; d[dst + 1] = copy2[src + 1]!; d[dst + 2] = copy2[src + 2]!; d[dst + 3] = copy2[src + 3]!
        } else {
          d[dst] = d[dst + 1] = d[dst + 2] = 0; d[dst + 3] = 255
        }
      }
  }
  ctx.putImageData(id, 0, 0)
}

function ghost(ctx: CanvasRenderingContext2D, w: number, h: number, _params: Record<string, number | boolean>, frame: number = 0, _palette?: RGB[]) {
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const copy = new Uint8ClampedArray(d)
  const t = frame * 0.12 % (Math.PI * 2)
  const ox = Math.round(Math.cos(t) * 3), oy = Math.round(Math.sin(t) * 2)
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++) {
      const sj = j - ox, si = i - oy
      if (sj < 0 || sj >= w || si < 0 || si >= h) continue
      const dst = (i * w + j) * 4, src = (si * w + sj) * 4
      d[dst] = Math.round(d[dst]! * 0.7 + copy[src]! * 0.3)
      d[dst + 1] = Math.round(d[dst + 1]! * 0.7 + copy[src + 1]! * 0.3)
      d[dst + 2] = Math.round(d[dst + 2]! * 0.7 + copy[src + 2]! * 0.3)
    }
  ctx.putImageData(id, 0, 0)
}

function paletteCycle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _params: Record<string, number | boolean>,
  frame: number,
  palette?: RGB[],
) {
  if (!palette || palette.length === 0) return
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const len = palette.length
  const shift = frame % len
  if (shift === 0) return
  const key = (r: number, g: number, b: number) => r << 16 | g << 8 | b
  const map = new Map<number, number>()
  palette.forEach((c, i) => map.set(key(c[0], c[1], c[2]), i))
  for (let i = 0; i < d.length; i += 4) {
    const k = key(d[i]!, d[i + 1]!, d[i + 2]!)
    const idx = map.get(k)
    if (idx !== undefined) {
      const nc = palette[(idx + shift) % len]!
      d[i] = nc[0]; d[i + 1] = nc[1]; d[i + 2] = nc[2]
    }
  }
  ctx.putImageData(id, 0, 0)
}

function ditherFade(ctx: CanvasRenderingContext2D, w: number, h: number, _params: Record<string, number | boolean>, frame: number = 0, _palette?: RGB[]) {
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const t = 8 + Math.sin(frame * 0.15) * 6
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (BAYER_4X4[i % 4]![j % 4]! > t) {
        const idx = (i * w + j) * 4
        d[idx]! *= 0.3; d[idx + 1]! *= 0.3; d[idx + 2]! *= 0.3
      }
  ctx.putImageData(id, 0, 0)
}

function combined(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: Record<string, number | boolean>,
  frame: number,
  palette?: RGB[],
) {
  if (params['crt']) crt(ctx, w, h, params, frame)
  if (params['glitch']) glitch(ctx, w, h, params)
  if (params['ghost']) ghost(ctx, w, h, params, frame)
  if (params['paletteCycle']) paletteCycle(ctx, w, h, params, frame, palette)
  if (params['ditherFade']) ditherFade(ctx, w, h, params, frame)
}

export const postFxAlgorithms: Record<string, PostFxFn> = {
  'none': none,
  'crt': crt,
  'glitch': glitch,
  'ghost': ghost,
  'palette-cycle': paletteCycle,
  'dither-fade': ditherFade,
  'combined': combined,
}
