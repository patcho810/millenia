import type { StylePreset } from '@/types'

export const PRESETS: StylePreset[] = [
  {
    name: 'Clean Pixel',
    pixelSize: 3,
    paletteKey: 'sweetie16',
    adjust: { dither: 0, erode: 0 },
    fx: {},
  },
  {
    name: 'CRT Retro',
    pixelSize: 2,
    paletteKey: 'nes',
    adjust: { dither: 0.3, contrast: 15 },
    fx: { crt: true },
  },
  {
    name: 'GameBoy',
    pixelSize: 3,
    paletteKey: 'gameboy',
    adjust: { dither: 0.2 },
    fx: {},
  },
  {
    name: 'PS1',
    pixelSize: 4,
    paletteKey: 'sweetie24',
    adjust: { dither: 0, contrast: 20, saturation: 0.8 },
    fx: {},
  },
  {
    name: 'Dreamcore',
    pixelSize: 2,
    paletteKey: 'pastel',
    adjust: { dither: 0.1, brightness: 10, saturation: 1.3 },
    fx: { ghost: true },
  },
  {
    name: 'PC98',
    pixelSize: 2,
    paletteKey: 'cyber',
    adjust: { dither: 0.1 },
    fx: {},
  },
  {
    name: 'VHS',
    pixelSize: 2,
    paletteKey: 'horror',
    adjust: { dither: 0.2, contrast: 10 },
    fx: { ghost: true, glitch: true },
  },
]
