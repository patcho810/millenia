import { nearestColor, nearestColorRGB } from './shared'

type RGB = [number, number, number]

type QuantizeFn = (
  imgData: ImageData,
  w: number,
  h: number,
  palette: RGB[],
  _params: Record<string, number>,
  paletteLab?: [number, number, number][],
) => void

function nearestLabQuantize(
  imgData: ImageData,
  w: number,
  h: number,
  palette: RGB[],
  _params: Record<string, number>,
  paletteLab?: [number, number, number][],
) {
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 30) continue
    const [r, g, b] = nearestColor(d[i]!, d[i + 1]!, d[i + 2]!, palette, paletteLab)
    d[i] = r; d[i + 1] = g; d[i + 2] = b
  }
}

function nearestRGBQuantize(
  imgData: ImageData,
  w: number,
  h: number,
  palette: RGB[],
  _params: Record<string, number>,
  _paletteLab?: [number, number, number][],
) {
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 30) continue
    const [r, g, b] = nearestColorRGB(d[i]!, d[i + 1]!, d[i + 2]!, palette)
    d[i] = r; d[i + 1] = g; d[i + 2] = b
  }
}

export const quantizeAlgorithms: Record<string, QuantizeFn> = {
  'nearest-lab': nearestLabQuantize,
  'nearest-rgb': nearestRGBQuantize,
}

export { nearestColor, nearestColorRGB }
