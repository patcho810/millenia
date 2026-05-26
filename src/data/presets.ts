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

export const BUILTIN_PRESETS: PipelinePreset[] = []
