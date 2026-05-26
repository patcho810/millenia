import type { AlgorithmDef } from './types'

export const ALGORITHM_REGISTRY: AlgorithmDef[] = [
  // preprocess
  { id: 'none', stageId: 'preprocess', label: 'None', defaultParams: {} },
  {
    id: 'gaussian-blur', stageId: 'preprocess', label: 'Gaussian Blur', defaultParams: { radius: 1 },
    paramDefs: [
      { key: 'radius', label: '半径', type: 'range', min: 1, max: 2, step: 1, default: 1 },
    ],
  },
  {
    id: 'box-blur', stageId: 'preprocess', label: 'Box Blur', defaultParams: { radius: 1 },
    paramDefs: [
      { key: 'radius', label: '半径', type: 'range', min: 1, max: 3, step: 1, default: 1 },
    ],
  },
  {
    id: 'sharpen', stageId: 'preprocess', label: 'Sharpen', defaultParams: {},
    paramDefs: [],
  },
  {
    id: 'bcs', stageId: 'preprocess', label: 'BCS Adjust', defaultParams: { brightness: 0, contrast: 0, saturation: 1 },
    paramDefs: [
      { key: 'brightness', label: '亮度', type: 'range', min: -60, max: 60, step: 5, default: 0 },
      { key: 'contrast', label: '对比度', type: 'range', min: -60, max: 60, step: 5, default: 0 },
      { key: 'saturation', label: '饱和度', type: 'range', min: 0, max: 2, step: 0.1, default: 1 },
    ],
  },
  {
    id: 'erode', stageId: 'preprocess', label: 'Erode', defaultParams: { times: 1 },
    paramDefs: [
      { key: 'times', label: '次数', type: 'range', min: 1, max: 3, step: 1, default: 1 },
    ],
  },
  {
    id: 'bilateral', stageId: 'preprocess', label: 'Bilateral Filter', defaultParams: { radius: 2, sigmaSpace: 10, sigmaColor: 30 },
    paramDefs: [
      { key: 'radius', label: '半径', type: 'range', min: 1, max: 5, step: 1, default: 2 },
      { key: 'sigmaSpace', label: '空间σ', type: 'range', min: 1, max: 30, step: 1, default: 10 },
      { key: 'sigmaColor', label: '色彩σ', type: 'range', min: 5, max: 80, step: 5, default: 30 },
    ],
  },

  // scale
  { id: 'nearest', stageId: 'scale', label: 'Nearest Neighbor', defaultParams: {} },
  { id: 'bilinear', stageId: 'scale', label: 'Bilinear', defaultParams: {} },
  { id: 'bicubic', stageId: 'scale', label: 'Bicubic', defaultParams: {} },
  {
    id: 'lanczos', stageId: 'scale', label: 'Lanczos (approx)', defaultParams: {},
  },

  // palette
  { id: 'fixed', stageId: 'palette', label: 'Fixed', defaultParams: {} },
  {
    id: 'median-cut', stageId: 'palette', label: 'Median Cut', defaultParams: { colors: 16 },
    paramDefs: [
      { key: 'colors', label: '颜色数', type: 'range', min: 2, max: 64, step: 1, default: 16 },
    ],
  },
  {
    id: 'wu', stageId: 'palette', label: "Wu's Quantization", defaultParams: { colors: 16 },
    paramDefs: [
      { key: 'colors', label: '颜色数', type: 'range', min: 2, max: 64, step: 1, default: 16 },
    ],
  },

  // palette-post
  { id: 'none', stageId: 'palette-post', label: 'None', defaultParams: {} },
  {
    id: 'split-toning', stageId: 'palette-post', label: 'Split Toning', defaultParams: {
      shadowColor: '#6644aa', shadowStrength: 0,
      highlightColor: '#ffdd88', highlightStrength: 0, midpoint: 50,
    },
    paramDefs: [
      { key: 'shadowColor', label: 'Shadow', type: 'color', default: '#6644aa' },
      { key: 'shadowStrength', label: 'Shadow Strength', type: 'range', min: 0, max: 1, step: 0.01, default: 0 },
      { key: 'highlightColor', label: 'Highlight', type: 'color', default: '#ffdd88' },
      { key: 'highlightStrength', label: 'Highlight Strength', type: 'range', min: 0, max: 1, step: 0.01, default: 0 },
      { key: 'midpoint', label: 'Midpoint', type: 'range', min: 0, max: 100, step: 1, default: 50 },
    ],
  },

  // quantize
  { id: 'nearest-lab', stageId: 'quantize', label: 'Nearest (CIELAB)', defaultParams: {} },
  { id: 'nearest-rgb', stageId: 'quantize', label: 'Nearest (RGB)', defaultParams: {} },

  // dither
  { id: 'none', stageId: 'dither', label: 'None', defaultParams: {} },
  {
    id: 'floyd-steinberg', stageId: 'dither', label: 'Floyd-Steinberg', defaultParams: { strength: 0.8 },
    paramDefs: [
      { key: 'strength', label: '强度', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8 },
    ],
  },
  {
    id: 'atkinson', stageId: 'dither', label: 'Atkinson', defaultParams: { strength: 0.8 },
    paramDefs: [
      { key: 'strength', label: '强度', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8 },
    ],
  },
  {
    id: 'bayer-2x2', stageId: 'dither', label: 'Bayer 2×2', defaultParams: { strength: 0.8, threshold: 0.5 },
    paramDefs: [
      { key: 'strength', label: '强度', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8 },
      { key: 'threshold', label: '阈值', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 },
    ],
  },
  {
    id: 'bayer-4x4', stageId: 'dither', label: 'Bayer 4×4', defaultParams: { strength: 0.8, threshold: 0.5 },
    paramDefs: [
      { key: 'strength', label: '强度', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8 },
      { key: 'threshold', label: '阈值', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 },
    ],
  },
  {
    id: 'bayer-8x8', stageId: 'dither', label: 'Bayer 8×8', defaultParams: { strength: 0.8, threshold: 0.5 },
    paramDefs: [
      { key: 'strength', label: '强度', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8 },
      { key: 'threshold', label: '阈值', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 },
    ],
  },

  // block
  { id: 'none', stageId: 'block', label: 'None', defaultParams: {} },
  {
    id: 'tile-palette', stageId: 'block', label: 'Tile Palette', defaultParams: { blockSize: 4, maxColors: 4 },
    paramDefs: [
      { key: 'blockSize', label: '块大小', type: 'range', min: 2, max: 32, step: 2, default: 4 },
      { key: 'maxColors', label: '最大色数', type: 'range', min: 2, max: 8, step: 1, default: 4 },
    ],
  },

  // postfx
  { id: 'none', stageId: 'postfx', label: 'None', defaultParams: {} },
  { id: 'crt', stageId: 'postfx', label: 'CRT Scanlines', defaultParams: {} },
  {
    id: 'glitch', stageId: 'postfx', label: 'Glitch', defaultParams: { pixelSize: 2 },
    paramDefs: [
      { key: 'pixelSize', label: '像素大小', type: 'range', min: 1, max: 8, step: 1, default: 2 },
    ],
  },
  { id: 'ghost', stageId: 'postfx', label: 'Ghost', defaultParams: {} },
  {
    id: 'palette-cycle', stageId: 'postfx', label: 'Palette Cycle', defaultParams: {},
  },
  {
    id: 'dither-fade', stageId: 'postfx', label: 'Dither Fade', defaultParams: {},
  },
]

function groupBy<T, K extends string>(arr: T[], keyFn: (item: T) => K): Record<K, T[]> {
  const result = {} as Record<K, T[]>
  for (const item of arr) {
    const k = keyFn(item)
    if (!result[k]) result[k] = []
    result[k]!.push(item)
  }
  return result
}

export const REGISTRY_BY_STAGE = groupBy(ALGORITHM_REGISTRY, d => d.stageId)
