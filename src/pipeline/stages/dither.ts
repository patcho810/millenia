import { nearestColor } from './shared'

type RGB = [number, number, number]

type DitherFn = (
  imgData: ImageData,
  w: number,
  h: number,
  palette: RGB[],
  params: Record<string, number>,
  paletteLab?: [number, number, number][],
) => void

const BAYER_4X4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

function none() {}

function floydSteinberg(
  imgData: ImageData,
  w: number,
  h: number,
  palette: RGB[],
  params: Record<string, number>,
  paletteLab?: [number, number, number][],
) {
  const d = imgData.data
  const strength = params['strength'] ?? 0.8
  if (strength <= 0) return
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
      for (const [dj, di, w_] of [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]] as [number, number, number][]) {
        const nj = j + dj, ni = i + di
        if (nj >= 0 && nj < w && ni < h) {
          const nb2 = (ni * w + nj) * 3
          buf[nb2]! += er * w_; buf[nb2 + 1]! += eg * w_; buf[nb2 + 2]! += eb * w_
        }
      }
    }
}

function atkinson(
  imgData: ImageData,
  w: number,
  h: number,
  palette: RGB[],
  params: Record<string, number>,
  paletteLab?: [number, number, number][],
) {
  const d = imgData.data
  const strength = params['strength'] ?? 0.8
  if (strength <= 0) return
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
      const div = 1 / 8
      for (const [dj, di] of [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]] as [number, number][]) {
        const nj = j + dj, ni = i + di
        if (nj >= 0 && nj < w && ni < h) {
          const nb2 = (ni * w + nj) * 3
          buf[nb2]! += er * div; buf[nb2 + 1]! += eg * div; buf[nb2 + 2]! += eb * div
        }
      }
    }
}

function bayerDither(
  imgData: ImageData,
  w: number,
  h: number,
  palette: RGB[],
  params: Record<string, number>,
  matrix: number[][],
  paletteLab?: [number, number, number][],
) {
  const d = imgData.data
  const strength = params['strength'] ?? 0.8
  const threshold = params['threshold'] ?? 0.5
  const n = matrix.length
  const scale = 255 / (n * n)
  for (let i = 0; i < h; i++)
    for (let j = 0; j < w; j++) {
      const idx = (i * w + j) * 4
      if (d[idx + 3]! < 30) continue
      const or = d[idx]!, og = d[idx + 1]!, ob = d[idx + 2]!
      const bay = (matrix[i % n]![j % n]! + 0.5) * scale - 128
      const rr = Math.max(0, Math.min(255, or + bay * threshold * strength * 2))
      const rg = Math.max(0, Math.min(255, og + bay * threshold * strength * 2))
      const rb = Math.max(0, Math.min(255, ob + bay * threshold * strength * 2))
      const [nr, ng, nb] = nearestColor(rr, rg, rb, palette, paletteLab)
      d[idx] = nr; d[idx + 1] = ng; d[idx + 2] = nb
    }
}

function bayer4x4(
  imgData: ImageData, w: number, h: number,
  palette: RGB[], params: Record<string, number>, paletteLab?: [number, number, number][],
) {
  bayerDither(imgData, w, h, palette, params, BAYER_4X4, paletteLab)
}

function bayer8x8(
  imgData: ImageData, w: number, h: number,
  palette: RGB[], params: Record<string, number>, paletteLab?: [number, number, number][],
) {
  bayerDither(imgData, w, h, palette, params, BAYER_8X8, paletteLab)
}

export const ditherAlgorithms: Record<string, DitherFn> = {
  'none': none as DitherFn,
  'floyd-steinberg': floydSteinberg,
  'atkinson': atkinson,
  'bayer-4x4': bayer4x4,
  'bayer-8x8': bayer8x8,
}

export { BAYER_4X4 }
