import { applyBCS_ } from './shared'

type PreprocessFn = (
  imgData: ImageData,
  w: number,
  h: number,
  params: Record<string, number>,
) => void

function none(_imgData: ImageData) {}

function gaussianBlur(imgData: ImageData, w: number, h: number, params: Record<string, number>) {
  const radius = Math.max(1, params['radius'] ?? 1)
  const kernel = radius === 1
    ? [1, 2, 1, 2, 4, 2, 1, 2, 1]
    : [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1]
  const kW = radius === 1 ? 3 : 5
  const kSum = kernel.reduce((a, b) => a + b, 0)
  applyKernel(imgData, w, h, kernel, kW, kSum)
}

function boxBlur(imgData: ImageData, w: number, h: number, params: Record<string, number>) {
  const radius = Math.max(1, params['radius'] ?? 1)
  const kW = 2 * radius + 1
  const kernel: number[] = []
  for (let i = 0; i < kW * kW; i++) kernel.push(1)
  const kSum = kW * kW
  applyKernel(imgData, w, h, kernel, kW, kSum)
}

function sharpen(imgData: ImageData, w: number, h: number) {
  applyKernel(imgData, w, h, [0, -1, 0, -1, 5, -1, 0, -1, 0], 3, 1)
}

function bcs(imgData: ImageData, _w: number, _h: number, params: Record<string, number>) {
  applyBCS_(
    imgData,
    params['brightness'] ?? 0,
    params['contrast'] ?? 0,
    params['saturation'] ?? 1,
  )
}

function erode(imgData: ImageData, w: number, h: number, params: Record<string, number>) {
  const times = params['times'] ?? 1
  const d = imgData.data
  for (let t = 0; t < times; t++) {
    const copy = new Uint8ClampedArray(d)
    for (let i = 0; i < h; i++)
      for (let j = 0; j < w; j++) {
        const idx = (i * w + j) * 4
        if (copy[idx + 3]! < 30) continue
        let lr = 0.2126 * copy[idx]! + 0.7152 * copy[idx + 1]! + 0.0722 * copy[idx + 2]!
        let br = copy[idx]!, bg = copy[idx + 1]!, bb = copy[idx + 2]!
        for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
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

function applyKernel(
  imgData: ImageData,
  w: number,
  h: number,
  kernel: number[],
  kW: number,
  kSum: number,
) {
  const d = imgData.data
  const copy = new Uint8ClampedArray(d)
  const half = Math.floor(kW / 2)
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++) {
      const idx = (i * w + j) * 4
      if (copy[idx + 3]! < 30) continue
      let r = 0, g = 0, b = 0
      for (let ki = 0; ki < kW; ki++)
        for (let kj = 0; kj < kW; kj++) {
          const ni = i + ki - half, nj = j + kj - half
          const nc = (Math.max(0, Math.min(h - 1, ni)) * w + Math.max(0, Math.min(w - 1, nj))) * 4
          const k = kernel[ki * kW + kj]!
          r += copy[nc]! * k; g += copy[nc + 1]! * k; b += copy[nc + 2]! * k
        }
      d[idx] = Math.max(0, Math.min(255, Math.round(r / kSum)))
      d[idx + 1] = Math.max(0, Math.min(255, Math.round(g / kSum)))
      d[idx + 2] = Math.max(0, Math.min(255, Math.round(b / kSum)))
    }
}

function bilateralFilter(imgData: ImageData, w: number, h: number, params: Record<string, number>) {
  const radius = Math.max(1, Math.round(params['radius'] ?? 2))
  const sigmaSpace = params['sigmaSpace'] ?? 10
  const sigmaColor = params['sigmaColor'] ?? 30
  const d = imgData.data
  const copy = new Uint8ClampedArray(d)

  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const idx = (i * w + j) * 4
      if (copy[idx + 3]! < 30) continue
      const cr = copy[idx]!, cg = copy[idx + 1]!, cb = copy[idx + 2]!
      let sumR = 0, sumG = 0, sumB = 0, sumW = 0
      for (let di = -radius; di <= radius; di++) {
        for (let dj = -radius; dj <= radius; dj++) {
          const ni = Math.max(0, Math.min(h - 1, i + di))
          const nj = Math.max(0, Math.min(w - 1, j + dj))
          const ni2 = (ni * w + nj) * 4
          const nr = copy[ni2]!, ng = copy[ni2 + 1]!, nb = copy[ni2 + 2]!
          const spaceDist = di * di + dj * dj
          const colorDist = (nr - cr) ** 2 + (ng - cg) ** 2 + (nb - cb) ** 2
          const w_ = Math.exp(-spaceDist / (2 * sigmaSpace * sigmaSpace)
                            - colorDist / (2 * sigmaColor * sigmaColor))
          sumR += nr * w_; sumG += ng * w_; sumB += nb * w_; sumW += w_
        }
      }
      d[idx]     = Math.round(sumR / sumW)
      d[idx + 1] = Math.round(sumG / sumW)
      d[idx + 2] = Math.round(sumB / sumW)
    }
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf)
  const d = max - min
  let h = 0, s = 0
  const l = (max + min) / 2
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) * 60
    else if (max === gf) h = ((bf - rf) / d + 2) * 60
    else h = ((rf - gf) / d + 4) * 60
  }
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const h1 = (h % 360 + 360) % 360 / 360
  return [
    Math.round(hue2rgb(h1 + 1/3) * 255),
    Math.round(hue2rgb(h1) * 255),
    Math.round(hue2rgb(h1 - 1/3) * 255),
  ]
}

function hslShift(imgData: ImageData, _w: number, _h: number, params: Record<string, number>) {
  const segments = ['r', 'y', 'g', 'c', 'b', 'm']
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 30) continue
    const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!
    let [h, s, l] = rgbToHsl(r, g, b)

    let seg: string
    if (h < 30 || h >= 330) seg = 'r'
    else if (h < 90) seg = 'y'
    else if (h < 150) seg = 'g'
    else if (h < 210) seg = 'c'
    else if (h < 270) seg = 'b'
    else seg = 'm'

    const hOff = params[`hsl_${seg}_hue`] ?? 0
    const sOff = params[`hsl_${seg}_sat`] ?? 0
    const lOff = params[`hsl_${seg}_lum`] ?? 0

    h = ((h + hOff) % 360 + 360) % 360
    s = Math.max(0, Math.min(1, s + sOff))
    l = Math.max(0, Math.min(1, l + lOff / 100))

    const [nr, ng, nb] = hslToRgb(h, s, l)
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb
  }
}

export const preprocessAlgorithms: Record<string, PreprocessFn> = {
  'none': none,
  'gaussian-blur': gaussianBlur,
  'box-blur': boxBlur,
  'sharpen': sharpen,
  'bcs': bcs,
  'erode': erode,
  'bilateral': bilateralFilter,
  'hsl-shift': hslShift,
}
