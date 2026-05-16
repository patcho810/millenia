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

export const preprocessAlgorithms: Record<string, PreprocessFn> = {
  'none': none,
  'gaussian-blur': gaussianBlur,
  'box-blur': boxBlur,
  'sharpen': sharpen,
  'bcs': bcs,
  'erode': erode,
}
