import { ref, reactive, computed, watch } from 'vue'
import { PALETTES } from '@/data/palettes'
import type { RGB, FxKey, AdjustState, FxState, PaletteMap } from '@/types'

// ── 算法函数 ──────────────────────────────────────

// LAB 色彩空间转换
function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b)
  let x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl
  let y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl
  let z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl
  const xn = 0.95047, yn = 1.0, zn = 1.08883
  x /= xn; y /= yn; z /= zn
  const d = 6 / 29, d3 = d * d * d
  const f = (t: number) => t > d3 ? Math.pow(t, 1 / 3) : t / (3 * d * d) + 4 / 29
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function deltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0], da = lab1[1] - lab2[1], db = lab1[2] - lab2[2]
  return Math.sqrt(dL * dL + da * da + db * db)
}

function nearestColor(
  r: number, g: number, b: number,
  palette: RGB[],
  paletteLab?: [number, number, number][],
): RGB {
  let best = Infinity
  let res: RGB = palette[0] ?? [0, 0, 0]
  const lab = rgbToLab(r, g, b)
  const labs = paletteLab ?? palette.map(c => rgbToLab(c[0], c[1], c[2]))
  for (let i = 0; i < palette.length; i++) {
    const d = deltaE(lab, labs[i]!)
    if (d < best) { best = d; res = palette[i]! }
  }
  return res
}

function applyDither(imgData: ImageData, w: number, h: number, palette: RGB[], strength: number, paletteLab?: [number, number, number][]) {
  const d = imgData.data
  const buf = new Float32Array(w * h * 3)
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++) {
      const idx = (i * w + j) * 4, bi = (i * w + j) * 3
      buf[bi] = d[idx]!; buf[bi + 1] = d[idx + 1]!; buf[bi + 2] = d[idx + 2]!
    }
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++) {
      const idx = (i * w + j) * 4
      if (d[idx + 3]! < 30) continue
      const bi = (i * w + j) * 3
      const or = Math.max(0, Math.min(255, buf[bi]!))
      const og = Math.max(0, Math.min(255, buf[bi + 1]!))
      const ob = Math.max(0, Math.min(255, buf[bi + 2]!))
      const [nr, ng, nb] = nearestColor(or, og, ob, palette, paletteLab)
      d[idx] = nr; d[idx + 1] = ng; d[idx + 2] = nb
      const er = (or - nr) * strength
      const eg = (og - ng) * strength
      const eb = (ob - nb) * strength
      for (const [dj, di, w_] of [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]] as [number,number,number][]) {
        const nj = j + dj, ni = i + di
        if (nj >= 0 && nj < w && ni < h) {
          const nb2 = (ni * w + nj) * 3
          buf[nb2]! += er * w_; buf[nb2 + 1]! += eg * w_; buf[nb2 + 2]! += eb * w_
        }
      }
    }
}

function applyErode(imgData: ImageData, w: number, h: number, times: number) {
  const d = imgData.data
  for (let t = 0; t < times; t++) {
    const copy = new Uint8ClampedArray(d)
    for (let i = 0; i < h; i++)
      for (let j = 0; j < w; j++) {
        const idx = (i * w + j) * 4
        if (copy[idx + 3]! < 30) continue
        let lr = 0.2126 * copy[idx]! + 0.7152 * copy[idx + 1]! + 0.0722 * copy[idx + 2]!
        let br = copy[idx]!, bg = copy[idx + 1]!, bb = copy[idx + 2]!
        for (const [di, dj] of [[-1,0],[1,0],[0,-1],[0,1]] as [number,number][]) {
          const ni = i + di, nj = j + dj
          if (ni < 0 || ni >= h || nj < 0 || nj >= w) continue
          const ni2 = (ni * w + nj) * 4
          if (copy[ni2 + 3]! < 30) continue
          const nl = 0.2126 * copy[ni2]! + 0.7152 * copy[ni2 + 1]! + 0.0722 * copy[ni2 + 2]!
          if (nl < lr) { lr = nl; br = copy[ni2]!; bg = copy[ni2 + 1]!; bb = copy[ni2 + 2]! }
        }
        d[idx] = br; d[idx + 1] = bg; d[idx + 2] = bb
      }
  }
}

function applyBCS(imgData: ImageData, brightness: number, contrast: number, saturation: number) {
  const d = imgData.data
  const cf = 259 * (contrast + 255) / (255 * (259 - contrast))
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 30) continue
    let r = d[i]! + brightness, g = d[i + 1]! + brightness, b = d[i + 2]! + brightness
    r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = l + saturation * (r - l); g = l + saturation * (g - l); b = l + saturation * (b - l)
    d[i]   = Math.max(0, Math.min(255, r + 0.5)) | 0
    d[i+1] = Math.max(0, Math.min(255, g + 0.5)) | 0
    d[i+2] = Math.max(0, Math.min(255, b + 0.5)) | 0
  }
}

const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]

export function applyDitherFade(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const t = 8 + Math.sin(frame * 0.15) * 6
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++)
      if (BAYER[i % 4]![j % 4]! > t) {
        const idx = (i * w + j) * 4
        d[idx]! *= 0.3; d[idx+1]! *= 0.3; d[idx+2]! *= 0.3
      }
  ctx.putImageData(id, 0, 0)
}

export function applyCRT(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const copy = new Uint8ClampedArray(d)
  for (let i = 0; i < h; i++) {
    const t = i % 2 === 1 ? 0.65 : 1
    for (let j = 0; j < w; j++) {
      const idx = (i * w + j) * 4
      const lp = Math.max(0, j - 1), rp = Math.min(w - 1, j + 1)
      d[idx]   = copy[(i * w + lp) * 4]! * t
      d[idx+1] = copy[idx + 1]! * t
      d[idx+2] = copy[(i * w + rp) * 4 + 2]! * t
    }
  }
  ctx.putImageData(id, 0, 0)
}

export function applyPaletteCycle(ctx: CanvasRenderingContext2D, w: number, h: number, palette: RGB[], frame: number) {
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const len = palette.length
  const shift = frame % len
  if (shift === 0) return
  const key = (r: number, g: number, b: number) => r << 16 | g << 8 | b
  const map = new Map<number, number>()
  palette.forEach((c, i) => map.set(key(c[0], c[1], c[2]), i))
  for (let i = 0; i < d.length; i += 4) {
    const k = key(d[i]!, d[i+1]!, d[i+2]!)
    const idx = map.get(k)
    if (idx !== undefined) {
      const nc = palette[(idx + shift) % len]!
      d[i] = nc[0]; d[i+1] = nc[1]; d[i+2] = nc[2]
    }
  }
  ctx.putImageData(id, 0, 0)
}

export function applyGhost(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
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
      d[dst]   = Math.round(d[dst]!   * 0.7 + copy[src]!   * 0.3)
      d[dst+1] = Math.round(d[dst+1]! * 0.7 + copy[src+1]! * 0.3)
      d[dst+2] = Math.round(d[dst+2]! * 0.7 + copy[src+2]! * 0.3)
    }
  ctx.putImageData(id, 0, 0)
}

// ── Task 3: 动态 Dither 阈值 ─────────────────────

function recommendedDitherStrength(userValue: number, paletteSize: number): number {
  if (paletteSize >= 33) return 0
  if (paletteSize >= 17) return Math.min(userValue, 0.5)
  return userValue
}

// ── Task 2: 局部限色 ──────────────────────────────

function applyBlockRestriction(imgData: ImageData, w: number, h: number, blockSize: number, maxColors: number) {
  if (blockSize <= 0) return
  const d = imgData.data
  const key = (r: number, g: number, b: number) => r << 16 | g << 8 | b
  for (let by = 0; by < h; by += blockSize)
    for (let bx = 0; bx < w; bx += blockSize) {
      const colorMap = new Map<number, RGB>()
      const pixels: { idx: number; r: number; g: number; b: number }[] = []
      for (let i = by; i < Math.min(h, by + blockSize); i++)
        for (let j = bx; j < Math.min(w, bx + blockSize); j++) {
          const idx = (i * w + j) * 4
          if (d[idx + 3]! < 30) continue
          const r = d[idx]!, g = d[idx + 1]!, b = d[idx + 2]!
          const k = key(r, g, b)
          pixels.push({ idx, r, g, b })
          if (!colorMap.has(k)) colorMap.set(k, [r, g, b])
        }
      const colors = [...colorMap.values()]
      if (colors.length <= maxColors) continue
      const colorsLab = colors.map(c => rgbToLab(c[0], c[1], c[2]))
      for (let pi = maxColors; pi < pixels.length; pi++) {
        const p = pixels[pi]!
        const [nr, ng, nb] = nearestColor(p.r, p.g, p.b, colors, colorsLab)
        d[p.idx] = nr; d[p.idx + 1] = ng; d[p.idx + 2] = nb
      }
    }
}

// ── Task 4: 预设匹配 ──────────────────────────────

export function matchesPreset(
  preset: { adjust: Partial<AdjustState>; fx: Partial<FxState>; pixelSize: number; paletteKey: string },
  pixelSize: number,
  paletteKey: string,
  adjust: AdjustState,
  fx: FxState,
): boolean {
  if (preset.pixelSize !== pixelSize || preset.paletteKey !== paletteKey) return false
  for (const k of Object.keys(preset.adjust) as (keyof AdjustState)[])
    if (preset.adjust[k] !== adjust[k]) return false
  for (const k of Object.keys(preset.fx) as (keyof FxState)[])
    if (preset.fx[k] !== fx[k]) return false
  return true
}

export function applyGlitch(ctx: CanvasRenderingContext2D, w: number, h: number, pixelSize: number) {
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const copy = new Uint8ClampedArray(d)
  const ox = Math.max(1, Math.round(pixelSize * 1.5))
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++) {
      const dst = (i * w + j) * 4
      d[dst]   = copy[(i * w + Math.min(w - 1, j + ox)) * 4]!
      d[dst+2] = copy[(i * w + Math.max(0, j - ox)) * 4 + 2]!
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
          d[dst] = copy2[src]!; d[dst+1] = copy2[src+1]!; d[dst+2] = copy2[src+2]!; d[dst+3] = copy2[src+3]!
        } else {
          d[dst] = d[dst+1] = d[dst+2] = 0; d[dst+3] = 255
        }
      }
  }
  ctx.putImageData(id, 0, 0)
}

// ── Composable ────────────────────────────────────

export function usePixelConverter() {
  const palettes = reactive<PaletteMap>({ ...PALETTES })

  const pixelSize = ref(2)
  const paletteKey = ref('sora')
  const adjust = reactive<AdjustState>({
    dither: 0.1,
    erode: 0,
    brightness: 0,
    contrast: 0,
    saturation: 1,
    blockSize: 0,
    blockMaxColors: 4,
  })
  const fx = reactive<FxState>({
    glitch: false,
    crt: false,
    paletteCycle: false,
    ghost: false,
    ditherFade: false,
  })

  const currentPalette = computed(() => palettes[paletteKey.value])
  const hasAnyFx = computed(() => Object.values(fx).some(Boolean))

  let paletteLabCache: [number, number, number][] = []

  function refreshPaletteLab() {
    const p = currentPalette.value
    paletteLabCache = p ? p.colors.map(c => rgbToLab(c[0], c[1], c[2])) : []
  }

  refreshPaletteLab()
  watch(paletteKey, refreshPaletteLab)

  let sourceImg: HTMLImageElement | null = null
  let baseImageData: ImageData | null = null
  let fxTimer: ReturnType<typeof setInterval> | null = null
  let fxFrame = 0
  const isProcessing = ref(false)
  const hasImage = ref(false)

  function addCustomPalette(key: string, name: string, colors: RGB[]) {
    palettes[key] = { name, colors, custom: true }
    if (key === paletteKey.value) refreshPaletteLab()
  }

  function removeCustomPalette(key: string) {
    if (palettes[key]?.custom) {
      delete palettes[key]
      if (paletteKey.value === key) paletteKey.value = 'sora'
    }
  }

  function stopFx(ctx: CanvasRenderingContext2D | null) {
    if (fxTimer) { clearInterval(fxTimer); fxTimer = null }
    if (ctx && baseImageData) {
      ctx.putImageData(baseImageData, 0, 0)
    }
  }

  function startFx(ctx: CanvasRenderingContext2D, w: number, h: number) {
    fxFrame = 0
    fxTimer = setInterval(() => {
      if (!baseImageData) return
      ctx.putImageData(baseImageData, 0, 0)
      if (fx.crt)          applyCRT(ctx, w, h)
      if (fx.paletteCycle) applyPaletteCycle(ctx, w, h, currentPalette.value!.colors, fxFrame)
      if (fx.ghost)        applyGhost(ctx, w, h, fxFrame)
      if (fx.ditherFade)   applyDitherFade(ctx, w, h, fxFrame)
      if (fx.glitch)       applyGlitch(ctx, w, h, pixelSize.value)
      fxFrame++
    }, 120)
  }

  function convert(canvas: HTMLCanvasElement) {
    if (!sourceImg) return
    isProcessing.value = true

    const ctx = canvas.getContext('2d')!
    stopFx(ctx)

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const palette = currentPalette.value!.colors
      const MAX = 600
      let sw = sourceImg!.naturalWidth
      let sh = sourceImg!.naturalHeight
      if (sw > MAX || sh > MAX) {
        const s = Math.min(MAX / sw, MAX / sh)
        sw = Math.floor(sw * s); sh = Math.floor(sh * s)
      }
      canvas.width = sw; canvas.height = sh

      const pw = Math.max(1, Math.floor(sw / pixelSize.value))
      const ph = Math.max(1, Math.floor(sh / pixelSize.value))

      // 侵蚀预处理（在原始尺寸上做）
      let drawSource: CanvasImageSource = sourceImg!
      if (adjust.erode > 0) {
        const tmp = document.createElement('canvas')
        tmp.width = sw; tmp.height = sh
        const tc = tmp.getContext('2d')!
        tc.drawImage(sourceImg!, 0, 0, sw, sh)
        const id = tc.getImageData(0, 0, sw, sh)
        applyErode(id, sw, sh, adjust.erode)
        tc.putImageData(id, 0, 0)
        drawSource = tmp
      }

      // 缩小到像素网格尺寸
      const small = document.createElement('canvas')
      small.width = pw; small.height = ph
      const sc = small.getContext('2d')!
      sc.imageSmoothingEnabled = true
      sc.imageSmoothingQuality = 'medium'
      sc.drawImage(drawSource, 0, 0, pw, ph)

      const id = sc.getImageData(0, 0, pw, ph)

      // BCS
      if (adjust.brightness !== 0 || adjust.contrast !== 0 || adjust.saturation !== 1) {
        applyBCS(id, adjust.brightness, adjust.contrast, adjust.saturation)
      }

      // 量化 + 抖动
      const ditherStrength = recommendedDitherStrength(adjust.dither, palette.length)
      if (ditherStrength > 0) {
        applyDither(id, pw, ph, palette, ditherStrength, paletteLabCache)
      } else {
        const d = id.data
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3]! < 30) continue
          const [r, g, b] = nearestColor(d[i]!, d[i+1]!, d[i+2]!, palette, paletteLabCache)
          d[i] = r; d[i+1] = g; d[i+2] = b
        }
      }

      // 局部限色（量化之后）
      applyBlockRestriction(id, pw, ph, adjust.blockSize, adjust.blockMaxColors)

      sc.putImageData(id, 0, 0)

      // 放大回显示尺寸
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, sw, sh)
      ctx.drawImage(small, 0, 0, sw, sh)

      baseImageData = ctx.getImageData(0, 0, sw, sh)
      isProcessing.value = false

      if (hasAnyFx.value) startFx(ctx, sw, sh)
    }))
  }

  function loadImageFile(file: File, canvas: HTMLCanvasElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('not an image')); return }
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        sourceImg = img
        hasImage.value = true
        convert(canvas)
        resolve()
      }
      img.onerror = reject
      img.src = url
    })
  }

  function toggleFx(key: FxKey, canvas: HTMLCanvasElement) {
    fx[key] = !fx[key]
    if (!hasImage.value) return
    const ctx = canvas.getContext('2d')!
    stopFx(ctx)
    if (hasAnyFx.value) {
      const w = canvas.width, h = canvas.height
      startFx(ctx, w, h)
    }
  }

  function reconvert(canvas: HTMLCanvasElement) {
    if (hasImage.value) convert(canvas)
  }

  return {
    palettes,
    pixelSize,
    paletteKey,
    adjust,
    fx,
    currentPalette,
    hasAnyFx,
    isProcessing,
    hasImage,
    addCustomPalette,
    removeCustomPalette,
    loadImageFile,
    toggleFx,
    reconvert,
    getCanvas: () => ({ baseImageData }),
  }
}
