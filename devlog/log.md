# Millenia 开发日志

## 2026-05-13 — 项目初始化

### 项目概况
Millenia 是一个复古风格像素画转换器，基于 Vue 3 + TypeScript + Vite 构建，采用 Windows 95 风格 UI。支持上传图片并转换为像素风格，内置 20 套复古调色板、实时特效及风格预设。

### 核心算法

| 模块 | 算法 | 说明 |
|------|------|------|
| **颜色空间** | sRGB → Linear → XYZ(D65) → CIELAB | 标准 sRGB 伽马校正（分段函数，γ=2.4），经 XYZ 转换到 CIELAB 色彩空间 |
| **颜色量化** | 最近邻匹配（CIELAB 空间） | `nearestColor()` — 将每个像素映射到调色板中 CIELAB 距离最近的颜色 |
| **颜色距离** | DeltaE CIE76 | `deltaE()` — CIELAB 空间中的欧几里得距离：√(ΔL² + Δa² + Δb²) |
| **抖动** | Floyd-Steinberg 误差扩散 | `applyDither()` — 核：`[右]7/16, [左下]3/16, [下]5/16, [右下]1/16`，支持 strength 参数控制扩散强度 |

### 辅助算法
- **侵蚀**：形态学侵蚀，4-邻域取最暗像素，基于 luminance 权重 (0.2126R + 0.7152G + 0.0722B)
- **BCS**：亮度/对比度/饱和度调整
- **局部限色**：分块限制每块最大颜色数
- **抖动静音**：调色板 ≥ 33 色时禁用抖动，≥ 17 色时强度上限 0.5

### 内置特效
- CRT 扫描线、Glitch、鬼影、调色板循环、抖动淡出（4×4 Bayer矩阵）

### 内置资源
- 20 套调色板（Game Boy、NES、C64、PICO-8、Sweetie16/24/32 等）
- 7 套风格预设（Clean Pixel、CRT Retro、GameBoy、PS1、Dreamcore、PC98、VHS）

### 当前状态
- 核心转换管线已完成（加载 → 缩放 → BCS → 量化/抖动 → 限色 → 放大 → 特效）
- 支持自定义调色板创建/编辑
- 支持拖拽、文件选择、剪贴板粘贴加载图片
- PNG 下载导出

---

## 2026-05-17 — 管线重构 + Palette Post（Split Toning）阶段

### 架构升级
将原有单体 `usePixelConverter.ts` 重构为模块化管线系统，src/pipeline/ 下按阶段拆分：

```
src/pipeline/
├── types.ts              # StageId 联合类型、StageNode、AlgorithmDef、ParamDef
├── registry.ts           # ALGORITHM_REGISTRY — 所有阶段/算法/参数定义集中注册
├── executor.ts           # executePipeline() — 按 STAGE_ORDER 顺序编排执行
└── stages/
    ├── preprocess.ts     # 预处理（Gaussian Blur / Box Blur / Sharpen / BCS / Erode）
    ├── scale.ts          # 缩放（Nearest / Bilinear / Bicubic / Lanczos）
    ├── palette.ts        # 调色板（Fixed / Median Cut）
    ├── palettePost.ts    # ★ 新增：调色板后处理
    ├── quantize.ts       # 颜色量化（Nearest CIELAB / Nearest RGB）
    ├── dither.ts         # 抖动（Floyd-Steinberg / Atkinson / Bayer 2x2/4x4/8x8）
    ├── block.ts          # 分块限色（Tile Palette）
    ├── postfx.ts         # 后处理特效
    └── shared.ts         # 共享函数（rgbToLab 等）
```

### 执行顺序
```
scale → preprocess → palette(生成) → palette-post → quantize → block → dither
```

### Palette Post（Split Toning / 影调分离）— 新增阶段

**阶段 ID**: `'palette-post'`

**接口签名**:
```ts
type PalettePostFn = (palette: RGB[], params: Record<string, number | string>) => RGB[]
```

**算法: split-toning（目标色 + 强度插值）**

对调色板中每个颜色转换到 HSL（H: 0-360, S: 0-1, L: 0-100），按亮度分为暗部/亮部：

| 区域 | 插值逻辑 |
|------|----------|
| **暗部**（L < midpoint） | hue/sat 向 `shadowColor` 插值，比例 = `shadowStrength × (1 - L/midpoint)` |
| **亮部**（L ≥ midpoint） | hue/sat 向 `highlightColor` 插值，比例 = `highlightStrength × (L-midpoint)/(100-midpoint)` |

- 亮度（L）保持不变，仅修改色相和饱和度
- 色相插值使用圆形最短路径（`lerpHue`），避免跨 0°/360° 边界跳变
- 线性过渡，无硬切

**参数**:

| 参数 | 类型 | 默认值 | 范围 | 说明 |
|------|------|--------|------|------|
| `shadowColor` | color (hex) | `#6644aa` | — | 暗部目标色 |
| `shadowStrength` | range | 0 | 0–1 | 暗部插值强度 |
| `highlightColor` | color (hex) | `#ffdd88` | — | 亮部目标色 |
| `highlightStrength` | range | 0 | 0–1 | 亮部插值强度 |
| `midpoint` | range | 50 | 0–100 | 明暗分界线（对应 L 值） |

**算法 `none`**：空操作，直接返回原 palette。

**辅助函数（模块内私有）**:
- `hexToRgb(hex)` — 6 位 hex → `[R, G, B]`
- `rgbToHsl(r, g, b)` — → `[H(0-360), S(0-1), L(0-100)]`
- `hslToRgb(h, s, l)` — → `[R, G, B]`
- `lerpHue(from, to, t)` — 色相圆形插值

### 涉及文件变更

| 文件 | 变更 |
|------|------|
| `src/pipeline/types.ts` | `StageId` 加入 `'palette-post'`；`ParamDef.type` 加入 `'color'` |
| `src/pipeline/stages/palettePost.ts` | **新建** — `none` + `split-toning` 算法实现 |
| `src/pipeline/registry.ts` | 注册 `palette-post` 阶段，含完整 `paramDefs` |
| `src/pipeline/executor.ts` | 在 palette 生成后、quantize 前插入 palette-post 执行段 |
| `src/pipeline/stages/palette.ts` | 确认 RGB 从 `@/types` 导入 |
| `src/composables/usePipeline.ts` | 默认 stages 加入 `palette-post`；`updateStage()` 自动触发 `reconvert` |
| `src/components/PipelineControl.vue` | 新增 Palette Post UI：algorithm 下拉（None/Split Toning）+ 5 参数编辑 |

### PipelineControl.vue UI 变更
- 新增 `'palette-post'` 栏位，位于 Palette 和 Quantize 之间
- `ParamInfo` 接口新增 `type?: 'range' | 'color'` 字段
- `formatVal` 支持 string 类型值
- 新增 `emitRange()` / `emitColor()` 替代原有 `onParamChange()`
- Split Toning 专用布局：
  - Shadow 行：`[color picker]` + `[strength slider]` + 数值
  - Highlight 行：`[color picker]` + `[strength slider]` + 数值
  - Midpoint 行：单独的 `[slider]`
- 通用 param 循环支持 `type === 'color'` 渲染 color input

### 调试验证
- palette-post 数据流正确：params → splitToning → 新 RGB 数组 → 原地替换 palette → 传给 quantize
- shadowStrength=0.51 + shadowColor=#6644aa 作用下，第一个颜色从 `[23,48,25]` 变为 `[22,49,47]`（深绿色 → 青绿色），H 从 124.8° 偏移至 174.6°

### 当前管线状态
```
加载图片 → scale → preprocess → palette(生成) → palette-post → quantize → block → dither → 放大 → postfx → 输出
```
