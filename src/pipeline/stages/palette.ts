type RGB = [number, number, number]

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

export const paletteAlgorithms: Record<string, PaletteFn> = {
  'fixed': fixedPalette,
  'median-cut': medianCutPalette,
}
