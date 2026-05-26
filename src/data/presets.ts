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
    id: 'pixeliaze',
    name: 'Pixeliaze',
    paletteKey: 'sora',
    pixelSize: 2,
    stages: [
      { stageId: 'scale', enabled: true, algorithm: 'bicubic', params: {} },
      {
        stageId: 'preprocess', enabled: true, algorithm: 'none',
        params: {
          algorithms: 'bcs,bilateral',
          algo_bcs_brightness: 0,
          algo_bcs_contrast: 0,
          algo_bcs_saturation: 1,
          algo_bilateral_radius: 2,
          algo_bilateral_sigmaSpace: 10,
          algo_bilateral_sigmaColor: 30,
        },
      },
      { stageId: 'palette', enabled: true, algorithm: 'wu', params: { colors: 16 } },
      { stageId: 'quantize', enabled: true, algorithm: 'nearest-lab', params: {} },
      { stageId: 'dither', enabled: true, algorithm: 'atkinson', params: { strength: 0.8 } },
      { stageId: 'block', enabled: false, algorithm: 'none', params: {} },
      { stageId: 'postfx', enabled: false, algorithm: 'none', params: {} },
    ],
  },
]
