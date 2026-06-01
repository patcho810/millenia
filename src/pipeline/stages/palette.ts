import type { RGB } from '@/types'

type PaletteFn = (
  imgData: ImageData,
  w: number,
  h: number,
  params: Record<string, number>,
) => RGB[]

function medianCutPalette(
  imgData: ImageData,
  _w: number,
  _h: number,
  params: Record<string, number>,
): RGB[] {
  const colors = params['colors']
  if (!colors || colors < 2) return []

  const d = imgData.data
  const pixels: RGB[] = []
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 30) continue
    pixels.push([d[i]!, d[i + 1]!, d[i + 2]!])
  }
  if (pixels.length === 0) return []

  type Bucket = { colors: RGB[]; min: RGB; max: RGB }
  const initialMin: RGB = [255, 255, 255], initialMax: RGB = [0, 0, 0]
  for (const [r, g, b] of pixels) {
    if (r < initialMin[0]) initialMin[0] = r
    if (g < initialMin[1]) initialMin[1] = g
    if (b < initialMin[2]) initialMin[2] = b
    if (r > initialMax[0]) initialMax[0] = r
    if (g > initialMax[1]) initialMax[1] = g
    if (b > initialMax[2]) initialMax[2] = b
  }

  let buckets: Bucket[] = [{ colors: pixels, min: initialMin, max: initialMax }]

  while (buckets.length < colors) {
    let bestIdx = -1, bestRange = -1
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i]!
      const rR = b.max[0] - b.min[0], rG = b.max[1] - b.min[1], rB = b.max[2] - b.min[2]
      const range = Math.max(rR, rG, rB)
      if (range > bestRange && b.colors.length > 1) { bestRange = range; bestIdx = i }
    }
    if (bestIdx === -1) break

    const bucket = buckets[bestIdx]!
    const rR = bucket.max[0] - bucket.min[0]
    const rG = bucket.max[1] - bucket.min[1]
    const rB = bucket.max[2] - bucket.min[2]
    const channel = rR >= rG && rR >= rB ? 0 : rG >= rB ? 1 : 2

    bucket.colors.sort((a, b) => a[channel] - b[channel])
    const mid = Math.floor(bucket.colors.length / 2)
    const left = bucket.colors.slice(0, mid)
    const right = bucket.colors.slice(mid)

    const makeBounds = (cs: RGB[]): { min: RGB; max: RGB } => {
      const mn: RGB = [255, 255, 255], mx: RGB = [0, 0, 0]
      for (const [r, g, b] of cs) {
        if (r < mn[0]) mn[0] = r; if (g < mn[1]) mn[1] = g; if (b < mn[2]) mn[2] = b
        if (r > mx[0]) mx[0] = r; if (g > mx[1]) mx[1] = g; if (b > mx[2]) mx[2] = b
      }
      return { min: mn, max: mx }
    }

    buckets.splice(bestIdx, 1, { colors: left, ...makeBounds(left) }, { colors: right, ...makeBounds(right) })
  }

  const result: RGB[] = []
  for (const b of buckets) {
    if (b.colors.length === 0) continue
    let sr = 0, sg = 0, sb = 0
    for (const [r, g, bl] of b.colors) { sr += r; sg += g; sb += bl }
    const n = b.colors.length
    result.push([Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)])
  }
  return result
}

function wuQuantize(
  imgData: ImageData,
  _w: number,
  _h: number,
  params: Record<string, number>,
): RGB[] {
  const colorCount = Math.max(2, Math.min(256, params['colors'] ?? 16))
  const d = imgData.data

  // SIDE=64 (6-bit). Each channel shifted by SHIFT=2 bits, giving 64 histogram bins.
  // This balances precision (64³ ≈ 262k cells) against memory (~2 MB per moment array).
  const SIDE = 64
  const SHIFT = 8 - Math.log2(SIDE) // = 2

  const MAXSIDEINDEX = SIDE
  const SIDESIZE = MAXSIDEINDEX + 1 // 65 — includes index-0 zero-row for prefix sums
  const totalSize = SIDESIZE * SIDESIZE * SIDESIZE
  const cellIdx = (r: number, g: number, b: number) => r + g * SIDESIZE + b * SIDESIZE * SIDESIZE

  // Per-cell moments. Float64Array avoids Int32 overflow on large images.
  // moment stores M2 = sum(pixel_r² + pixel_g² + pixel_b²) per cell.
  const weight = new Float64Array(totalSize)
  const momentR = new Float64Array(totalSize)
  const momentG = new Float64Array(totalSize)
  const momentB = new Float64Array(totalSize)
  const moment = new Float64Array(totalSize)

  // Alpha-weighted histogram: semi-transparent pixels contribute proportionally
  // less, reflecting actual visual blending impact on the palette.
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]!
    if (a === 0) continue
    const r = (d[i]! >> SHIFT) + 1
    const g = (d[i + 1]! >> SHIFT) + 1
    const b = (d[i + 2]! >> SHIFT) + 1
    const idx = cellIdx(r, g, b)
    const aw = a / 255
    const pr = d[i]!, pg = d[i + 1]!, pb = d[i + 2]!
    weight[idx]! += aw
    momentR[idx]! += pr * aw
    momentG[idx]! += pg * aw
    momentB[idx]! += pb * aw
    moment[idx]! += (pr * pr + pg * pg + pb * pb) * aw
  }

  // In-place 3D prefix sums (reference: CalculateMoments).
  // Transforms raw per-cell data into inclusive prefix sums over [0..r]×[0..g]×[0..b].
  const prefix3d = (arr: Float64Array): void => {
    for (let r = 1; r <= MAXSIDEINDEX; r++)
      for (let g = 0; g <= MAXSIDEINDEX; g++)
        for (let b = 0; b <= MAXSIDEINDEX; b++)
          arr[cellIdx(r, g, b)]! += arr[cellIdx(r - 1, g, b)]!
    for (let r = 0; r <= MAXSIDEINDEX; r++)
      for (let g = 1; g <= MAXSIDEINDEX; g++)
        for (let b = 0; b <= MAXSIDEINDEX; b++)
          arr[cellIdx(r, g, b)]! += arr[cellIdx(r, g - 1, b)]!
    for (let r = 0; r <= MAXSIDEINDEX; r++)
      for (let g = 0; g <= MAXSIDEINDEX; g++)
        for (let b = 1; b <= MAXSIDEINDEX; b++)
          arr[cellIdx(r, g, b)]! += arr[cellIdx(r, g, b - 1)]!
  }

  prefix3d(weight)
  prefix3d(momentR)
  prefix3d(momentG)
  prefix3d(momentB)
  prefix3d(moment)

  // O(1) sub-box query via inclusion-exclusion.
  // Box bounds are direct indices [0..MAXSIDEINDEX]; the summed range is (min, max].
  const volume = (arr: Float64Array, r0: number, r1: number, g0: number, g1: number, b0: number, b1: number): number =>
    arr[cellIdx(r1, g1, b1)]!
    - arr[cellIdx(r0, g1, b1)]! - arr[cellIdx(r1, g0, b1)]! - arr[cellIdx(r1, g1, b0)]!
    + arr[cellIdx(r0, g0, b1)]! + arr[cellIdx(r0, g1, b0)]! + arr[cellIdx(r1, g0, b0)]!
    - arr[cellIdx(r0, g0, b0)]!

  type Box = [number, number, number, number, number, number]

  // Reference: CalculateVariance — M2 - M1²/M0
  function boxVariance(box: Box): number {
    const [r0, r1, g0, g1, b0, b1] = box
    const w = volume(weight, r0, r1, g0, g1, b0, b1)
    if (w <= 0) return -1
    const sr = volume(momentR, r0, r1, g0, g1, b0, b1)
    const sg = volume(momentG, r0, r1, g0, g1, b0, b1)
    const sb = volume(momentB, r0, r1, g0, g1, b0, b1)
    const m2 = volume(moment, r0, r1, g0, g1, b0, b1)
    return m2 - (sr * sr + sg * sg + sb * sb) / w
  }

  // Reference: Maximize + Cut — find best split plane across all 3 axes
  function cut(box: Box): [Box, Box] | null {
    const [r0, r1, g0, g1, b0, b1] = box
    const w = volume(weight, r0, r1, g0, g1, b0, b1)
    const sR = volume(momentR, r0, r1, g0, g1, b0, b1)
    const sG = volume(momentG, r0, r1, g0, g1, b0, b1)
    const sB = volume(momentB, r0, r1, g0, g1, b0, b1)

    let bestVal = -1, bestAxis = -1, bestPos = 0

    type Axis = 0 | 1 | 2
    for (let axis = 0 as Axis; axis < 3; axis++) {
      const [lo, hi] = axis === 0 ? [r0, r1] : axis === 1 ? [g0, g1] : [b0, b1]
      for (let p = lo + 1; p < hi; p++) {
        const get = (loVal: number, hiVal: number) => axis === 0 ? [loVal, p, g0, g1, b0, b1] as const : axis === 1 ? [r0, r1, loVal, p, b0, b1] as const : [r0, r1, g0, g1, loVal, p] as const
        const [a0, a1, a2, a3, a4, a5] = get(lo, hi)
        const wA = volume(weight, a0, a1, a2, a3, a4, a5)
        if (wA <= 0) continue
        const wB = w - wA
        if (wB <= 0) continue
        const sRA = volume(momentR, a0, a1, a2, a3, a4, a5)
        const sGA = volume(momentG, a0, a1, a2, a3, a4, a5)
        const sBA = volume(momentB, a0, a1, a2, a3, a4, a5)
        const sRB = sR - sRA, sGB = sG - sGA, sBB = sB - sBA
        const val = (sRA * sRA + sGA * sGA + sBA * sBA) / wA
                  + (sRB * sRB + sGB * sGB + sBB * sBB) / wB
        if (val > bestVal) { bestVal = val; bestAxis = axis; bestPos = p }
      }
    }

    if (bestAxis < 0) return null
    const [ar0, ar1, ag0, ag1, ab0, ab1] = bestAxis === 0 ? [r0, bestPos, g0, g1, b0, b1] as const : bestAxis === 1 ? [r0, r1, g0, bestPos, b0, b1] as const : [r0, r1, g0, g1, b0, bestPos] as const
    const [br0, br1, bg0, bg1, bb0, bb1] = bestAxis === 0 ? [bestPos, r1, g0, g1, b0, b1] as const : bestAxis === 1 ? [r0, r1, bestPos, g1, b0, b1] as const : [r0, r1, g0, g1, bestPos, b1] as const
    return [[ar0, ar1, ag0, ag1, ab0, ab1], [br0, br1, bg0, bg1, bb0, bb1]]
  }

  // Reference: SplitData — iterative box partitioning
  let boxes: Box[] = [[0, MAXSIDEINDEX, 0, MAXSIDEINDEX, 0, MAXSIDEINDEX]]
  while (boxes.length < colorCount) {
    let bestIdx = -1, bestVar = -1
    for (let i = 0; i < boxes.length; i++) {
      const v = boxVariance(boxes[i]!)
      if (v > bestVar) { bestVar = v; bestIdx = i }
    }
    if (bestIdx === -1) break
    const split = cut(boxes[bestIdx]!)
    if (!split) break
    boxes.splice(bestIdx, 1, split[0], split[1])
  }

  // Reference: BuildLookups — compute average color per box from prefix sums
  const result: RGB[] = []
  for (const box of boxes) {
    const [r0, r1, g0, g1, b0, b1] = box
    const w = volume(weight, r0, r1, g0, g1, b0, b1)
    if (w <= 0) continue
    const r = Math.round(volume(momentR, r0, r1, g0, g1, b0, b1) / w)
    const g = Math.round(volume(momentG, r0, r1, g0, g1, b0, b1) / w)
    const b = Math.round(volume(momentB, r0, r1, g0, g1, b0, b1) / w)
    result.push([r, g, b])
  }

  if (result.length === 0) result.push([0, 0, 0])

  return result
}

export const paletteAlgorithms: Record<string, PaletteFn> = {
  'median-cut': medianCutPalette,
  'wu': wuQuantize,
}
