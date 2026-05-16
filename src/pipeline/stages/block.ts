import { nearestColor, rgbToLab } from './shared'

type RGB = [number, number, number]

type BlockFn = (
  imgData: ImageData,
  w: number,
  h: number,
  params: Record<string, number>,
) => void

function none() {}

function tilePalette(imgData: ImageData, w: number, h: number, params: Record<string, number>) {
  const blockSize = params['blockSize'] ?? 0
  const maxColors = params['maxColors'] ?? 4
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

export const blockAlgorithms: Record<string, BlockFn> = {
  'none': none,
  'tile-palette': tilePalette,
}
