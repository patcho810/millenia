export type RGB = [number, number, number]

export interface Palette {
    name: string
    colors: RGB[]
    custom?: boolean
}

export type PaletteMap = Record<string, Palette>

export type FxKey = 'glitch' | 'crt' | 'paletteCycle' | 'ghost' | 'ditherFade'

export interface FxState {
    glitch: boolean
    crt: boolean
    paletteCycle: boolean
    ghost: boolean
    ditherFade: boolean
}

export interface AdjustState {
    dither: number
    erode: number
    brightness: number
    contrast: number
    saturation: number
    blockSize: number
    blockMaxColors: number
}

export interface StylePreset {
  name: string
  pixelSize: number
  paletteKey: string
  adjust: Partial<AdjustState>
  fx: Partial<FxState>
}

export interface AppState {
    pixelSize: number
    paletteKey: string
    adjust: AdjustState
    fx:FxState
}