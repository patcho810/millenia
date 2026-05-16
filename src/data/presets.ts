import type { PipelinePreset } from '@/pipeline/types'

function makeStages(
  overrides: Partial<Record<string, { enabled?: boolean; algorithm?: string; params?: Record<string, number | boolean | string> }>> = {},
) {
  const defaults: Record<string, { enabled: boolean; algorithm: string; params: Record<string, number | boolean | string> }> = {
    scale: { enabled: true, algorithm: 'nearest', params: {} },
    preprocess: { enabled: false, algorithm: 'none', params: { brightness: 0, contrast: 0, saturation: 1, times: 1 } },
    quantize: { enabled: true, algorithm: 'nearest-lab', params: {} },
    block: { enabled: false, algorithm: 'none', params: { blockSize: 0, maxColors: 4 } },
    dither: { enabled: false, algorithm: 'none', params: { strength: 0, threshold: 0.5 } },
    postfx: { enabled: false, algorithm: 'combined', params: { crt: false, glitch: false, ghost: false, paletteCycle: false, ditherFade: false, pixelSize: 2 } },
  }
  for (const [stageId, o] of Object.entries(overrides)) {
    if (!o || !defaults[stageId]) continue
    if (o.enabled !== undefined) defaults[stageId]!.enabled = o.enabled
    if (o.algorithm !== undefined) defaults[stageId]!.algorithm = o.algorithm
    if (o.params !== undefined) Object.assign(defaults[stageId]!.params, o.params)
  }
  return Object.entries(defaults).map(([stageId, v]) => ({
    stageId: stageId as 'preprocess' | 'scale' | 'quantize' | 'dither' | 'block' | 'postfx',
    enabled: v.enabled,
    algorithm: v.algorithm,
    params: { ...v.params },
  }))
}

export const BUILTIN_PRESETS: PipelinePreset[] = [
  {
    id: 'clean-pixel',
    name: 'Clean Pixel',
    paletteKey: 'sweetie16',
    pixelSize: 3,
    stages: makeStages({
      dither: { enabled: false, algorithm: 'none', params: { strength: 0 } },
      postfx: { enabled: false, algorithm: 'none', params: {} },
    }),
  },
  {
    id: 'crt-retro',
    name: 'CRT Retro',
    paletteKey: 'nes',
    pixelSize: 2,
    stages: makeStages({
      preprocess: { enabled: true, algorithm: 'bcs', params: { brightness: 0, contrast: 15, saturation: 1, times: 1 } },
      dither: { enabled: true, algorithm: 'floyd-steinberg', params: { strength: 0.3, threshold: 0.5 } },
      postfx: { enabled: true, algorithm: 'crt', params: { crt: true, glitch: false, ghost: false, paletteCycle: false, ditherFade: false, pixelSize: 2 } },
    }),
  },
  {
    id: 'gameboy',
    name: 'GameBoy',
    paletteKey: 'gameboy',
    pixelSize: 3,
    stages: makeStages({
      dither: { enabled: true, algorithm: 'bayer-2x2', params: { strength: 0.2, threshold: 0.5 } },
      postfx: { enabled: false, algorithm: 'none', params: {} },
    }),
  },
  {
    id: 'ps1',
    name: 'PS1',
    paletteKey: 'sweetie24',
    pixelSize: 4,
    stages: makeStages({
      preprocess: { enabled: true, algorithm: 'bcs', params: { brightness: 0, contrast: 20, saturation: 0.8, times: 1 } },
      dither: { enabled: false, algorithm: 'none', params: { strength: 0 } },
      postfx: { enabled: false, algorithm: 'none', params: {} },
    }),
  },
  {
    id: 'dreamcore',
    name: 'Dreamcore',
    paletteKey: 'pastel',
    pixelSize: 2,
    stages: makeStages({
      preprocess: { enabled: true, algorithm: 'bcs', params: { brightness: 10, contrast: 0, saturation: 1.3, times: 1 } },
      dither: { enabled: true, algorithm: 'floyd-steinberg', params: { strength: 0.1, threshold: 0.5 } },
      postfx: { enabled: true, algorithm: 'ghost', params: {} },
    }),
  },
  {
    id: 'pc98',
    name: 'PC98',
    paletteKey: 'cyber',
    pixelSize: 2,
    stages: makeStages({
      dither: { enabled: true, algorithm: 'floyd-steinberg', params: { strength: 0.1, threshold: 0.5 } },
      postfx: { enabled: false, algorithm: 'none', params: {} },
    }),
  },
  {
    id: 'vhs',
    name: 'VHS',
    paletteKey: 'horror',
    pixelSize: 2,
    stages: makeStages({
      preprocess: { enabled: true, algorithm: 'bcs', params: { brightness: 0, contrast: 10, saturation: 1, times: 1 } },
      dither: { enabled: true, algorithm: 'floyd-steinberg', params: { strength: 0.2, threshold: 0.5 } },
      postfx: { enabled: true, algorithm: 'combined', params: { ghost: true, glitch: true, crt: false, paletteCycle: false, ditherFade: false, pixelSize: 2 } },
    }),
  },
]
