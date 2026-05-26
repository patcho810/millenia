import type { RGB } from '@/types'

type PaletteFn = (
  imgData: ImageData,
  w: number,
  h: number,
  params: Record<string, number>,
) => RGB[]

function fixedPalette(
  _imgData: ImageData,
  _w: number,
  _h: number,
  _params: Record<string, number>,
): RGB[] {
  return []
}

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
  const SIDE = 32
  const SHIFT = 3

  const size = SIDE * SIDE * SIDE
  const weight = new Int32Array(size)
  const sumR = new Int32Array(size)
  const sumG = new Int32Array(size)
  const sumB = new Int32Array(size)

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 30) continue
    const r = d[i]! >> SHIFT
    const g = d[i + 1]! >> SHIFT
    const b = d[i + 2]! >> SHIFT
    const idx = r * SIDE * SIDE + g * SIDE + b
    weight[idx]!++
    sumR[idx]! += d[i]!
    sumG[idx]! += d[i + 1]!
    sumB[idx]! += d[i + 2]!
  }

  type Box = [number, number, number, number, number, number]

  function boxVolume([r0, r1, g0, g1, b0, b1]: Box): number {
    return (r1 - r0) * (g1 - g0) * (b1 - b0)
  }

  function boxStats(box: Box): { count: number; r: number; g: number; b: number } {
    const [r0, r1, g0, g1, b0, b1] = box
    let count = 0, tr = 0, tg = 0, tb = 0
    for (let r = r0; r < r1; r++)
      for (let g = g0; g < g1; g++)
        for (let b = b0; b < b1; b++) {
          const idx = r * SIDE * SIDE + g * SIDE + b
          count += weight[idx]!
          tr += sumR[idx]!; tg += sumG[idx]!; tb += sumB[idx]!
        }
    return { count, r: tr, g: tg, b: tb }
  }

  function variance(box: Box): number {
    const [r0, r1, g0, g1, b0, b1] = box
    let count = 0, sr = 0, sg = 0, sb = 0, sr2 = 0, sg2 = 0, sb2 = 0
    for (let r = r0; r < r1; r++)
      for (let g = g0; g < g1; g++)
        for (let b = b0; b < b1; b++) {
          const idx = r * SIDE * SIDE + g * SIDE + b
          const w = weight[idx]!
          if (w === 0) continue
          const mr = sumR[idx]! / w, mg = sumG[idx]! / w, mb = sumB[idx]! / w
          count += w; sr += mr * w; sg += mg * w; sb += mb * w
          sr2 += mr * mr * w; sg2 += mg * mg * w; sb2 += mb * mb * w
        }
    if (count === 0) return 0
    return (sr2 - sr * sr / count) + (sg2 - sg * sg / count) + (sb2 - sb * sb / count)
  }

  function splitBox(box: Box): [Box, Box] | null {
    const [r0, r1, g0, g1, b0, b1] = box
    let bestVar = -1, bestAxis = 0, bestSplit = 0
    for (let axis = 0; axis < 3; axis++) {
      const lo = axis === 0 ? r0 : axis === 1 ? g0 : b0
      const hi = axis === 0 ? r1 : axis === 1 ? g1 : b1
      for (let split = lo + 1; split < hi; split++) {
        const boxA: Box = axis === 0 ? [r0, split, g0, g1, b0, b1]
                        : axis === 1 ? [r0, r1, g0, split, b0, b1]
                        :              [r0, r1, g0, g1, b0, split]
        const boxB: Box = axis === 0 ? [split, r1, g0, g1, b0, b1]
                        : axis === 1 ? [r0, r1, split, g1, b0, b1]
                        :              [r0, r1, g0, g1, split, b1]
        const v = variance(boxA) + variance(boxB)
        if (v > bestVar) { bestVar = v; bestAxis = axis; bestSplit = split }
      }
    }
    if (bestSplit === 0) return null
    const a: Box = bestAxis === 0 ? [r0, bestSplit, g0, g1, b0, b1]
                 : bestAxis === 1 ? [r0, r1, g0, bestSplit, b0, b1]
                 :                  [r0, r1, g0, g1, b0, bestSplit]
    const b: Box = bestAxis === 0 ? [bestSplit, r1, g0, g1, b0, b1]
                 : bestAxis === 1 ? [r0, r1, bestSplit, g1, b0, b1]
                 :                  [r0, r1, g0, g1, bestSplit, b1]
    return [a, b]
  }

  let boxes: Box[] = [[0, SIDE, 0, SIDE, 0, SIDE]]
  while (boxes.length < colorCount) {
    let bestIdx = -1, bestVar = -1
    for (let i = 0; i < boxes.length; i++) {
      if (boxVolume(boxes[i]!) <= 1) continue
      const v = variance(boxes[i]!)
      if (v > bestVar) { bestVar = v; bestIdx = i }
    }
    if (bestIdx === -1) break
    const split = splitBox(boxes[bestIdx]!)
    if (!split) break
    boxes.splice(bestIdx, 1, split[0], split[1])
  }

  const result: RGB[] = []
  for (const box of boxes) {
    const { count, r, g, b } = boxStats(box)
    if (count === 0) continue
    result.push([Math.round(r / count), Math.round(g / count), Math.round(b / count)])
  }
  return result
}

export const paletteAlgorithms: Record<string, PaletteFn> = {
  'fixed': fixedPalette,
  'median-cut': medianCutPalette,
  'wu': wuQuantize,
}
