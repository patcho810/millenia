import type { RGB } from '@/types'

export type PalettePostFn = (palette: RGB[], params: Record<string, number | string>) => RGB[]

function none(palette: RGB[], _params: Record<string, number | string>): RGB[] {
  return palette
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const l = ((max + min) / 2) * 100

  if (max === min) return [0, 0, l]

  const d = max - min
  const s = (l / 100) > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rf) h = ((gf - bf) / d) + (gf < bf ? 6 : 0)
  else if (max === gf) h = ((bf - rf) / d) + 2
  else h = ((rf - gf) / d) + 4
  h *= 60

  return [h, s, l]
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const lf = l / 100
  if (s === 0) {
    const v = Math.round(lf * 255)
    return [v, v, v]
  }
  const q = lf < 0.5 ? lf * (1 + s) : lf + s - lf * s
  const p = 2 * lf - q
  return [
    Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h / 360) * 255),
    Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255),
  ]
}

function lerpHue(from: number, to: number, t: number): number {
  let diff = to - from
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return from + diff * t
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function splitToning(palette: RGB[], params: Record<string, number | string>): RGB[] {
  console.log('splitToning params:', params)
  const shadowColor = (params['shadowColor'] as string) ?? '#6644aa'
  const shadowStrength = (params['shadowStrength'] as number) ?? 0
  console.log('shadowStrength:', shadowStrength, 'highlightStrength:', params['highlightStrength'])
  const highlightColor = (params['highlightColor'] as string) ?? '#ffdd88'
  const highlightStrength = (params['highlightStrength'] as number) ?? 0
  const midpoint = (params['midpoint'] as number) ?? 50

  const shadowRgb = hexToRgb(shadowColor)
  const highlightRgb = hexToRgb(highlightColor)
  const [shadowH, shadowS] = rgbToHsl(shadowRgb[0], shadowRgb[1], shadowRgb[2])
  const [highlightH, highlightS] = rgbToHsl(highlightRgb[0], highlightRgb[1], highlightRgb[2])

  return palette.map((color, i) => {
    const [h, s, l] = rgbToHsl(color[0], color[1], color[2])

    let newH = h
    let newS = s

    if (l < midpoint) {
      const ratio = shadowStrength * (1 - l / midpoint)
      newH = lerpHue(h, shadowH, ratio)
      newS = s + (shadowS - s) * ratio
    } else {
      const ratio = (100 - midpoint) > 0
        ? highlightStrength * (l - midpoint) / (100 - midpoint)
        : 0
      newH = lerpHue(h, highlightH, ratio)
      newS = s + (highlightS - s) * ratio
    }

    newS = clamp(newS, 0, 1)

    const result = hslToRgb(newH, newS, l)
    if (i === 0) {
      console.log('original rgb:', color[0], color[1], color[2])
      console.log('hsl:', h, s, l)
      console.log('interpolated hsl:', newH, newS, l)
      console.log('result rgb:', result[0], result[1], result[2])
    }
    return result
  })
}

export const palettePostAlgorithms: Record<string, PalettePostFn> = {
  'none': none,
  'split-toning': splitToning,
}
