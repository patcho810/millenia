export type StageId = 'preprocess' | 'scale' | 'palette' | 'quantize' | 'dither' | 'block' | 'postfx'

export interface StageNode {
  stageId: StageId
  enabled: boolean
  algorithm: string
  params: Record<string, number | boolean | string>
}

export interface PipelinePreset {
  id: string
  name: string
  paletteKey: string
  pixelSize: number
  stages: StageNode[]
}

export interface AlgorithmDef {
  id: string
  label: string
  stageId: StageId
  defaultParams: Record<string, number | boolean | string>
  paramDefs?: ParamDef[]
}

export interface ParamDef {
  key: string
  label: string
  type: 'range' | 'boolean' | 'select'
  min?: number
  max?: number
  step?: number
  options?: string[]
  default: number | boolean | string
}
