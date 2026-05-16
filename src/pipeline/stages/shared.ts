export function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
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

export function deltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0], da = lab1[1] - lab2[1], db = lab1[2] - lab2[2]
  return Math.sqrt(dL * dL + da * da + db * db)
}

export function nearestColor(
  r: number, g: number, b: number,
  palette: [number, number, number][],
  paletteLab?: [number, number, number][],
): [number, number, number] {
  let best = Infinity
  let res: [number, number, number] = palette[0] ?? [0, 0, 0]
  const lab = rgbToLab(r, g, b)
  const labs = paletteLab ?? palette.map(c => rgbToLab(c[0], c[1], c[2]))
  for (let i = 0; i < palette.length; i++) {
    const d = deltaE(lab, labs[i]!)
    if (d < best) { best = d; res = palette[i]! }
  }
  return res
}

export function nearestColorRGB(
  r: number, g: number, b: number,
  palette: [number, number, number][],
): [number, number, number] {
  let best = Infinity
  let res: [number, number, number] = palette[0] ?? [0, 0, 0]
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i]!
    const dr = r - c[0], dg = g - c[1], db = b - c[2]
    const d = dr * dr + dg * dg + db * db
    if (d < best) { best = d; res = c }
  }
  return res
}

export function applyBCS_(
  imgData: ImageData,
  brightness: number,
  contrast: number,
  saturation: number,
) {
  const d = imgData.data
  const cf = 259 * (contrast + 255) / (255 * (259 - contrast))
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 30) continue
    let r = d[i]! + brightness, g = d[i + 1]! + brightness, b = d[i + 2]! + brightness
    r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = l + saturation * (r - l); g = l + saturation * (g - l); b = l + saturation * (b - l)
    d[i] = Math.max(0, Math.min(255, r + 0.5)) | 0
    d[i + 1] = Math.max(0, Math.min(255, g + 0.5)) | 0
    d[i + 2] = Math.max(0, Math.min(255, b + 0.5)) | 0
  }
}
