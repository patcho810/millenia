# Millenia 项目结构

> 更新时间: 2026-06-01

## 根目录

```
Millenia/
├── .git/                          # Git 仓库
├── .vscode/                       # VS Code 配置
├── devlog/                        # 开发日志
│   ├── log.md                     # 主日志
│   ├── structure.md               # 本文件
│   └── todo.md                    # 待办 & 改进建议
├── dist/                          # 构建产物
├── node_modules/                  # 依赖
├── public/
│   └── favicon.ico
├── src/
│   ├── components/                # Vue 组件（7 个）
│   │   ├── CustomPaletteModal.vue # 自定义调色板弹窗
│   │   ├── PalettePanel.vue       # 调色板选择面板
│   │   ├── PipelineControl.vue    # 管线控制面板（阶段开关 + 参数调节）
│   │   ├── PreviewPanel.vue       # 预览面板（含 compare 模式）
│   │   ├── StylePresets.vue       # 风格预设（内置 / 我的）
│   │   ├── Taskbar.vue            # 任务栏
│   │   └── WinFrame.vue           # 窗口框架 (Win95 风格)
│   ├── composables/               # 组合式函数（2 个）
│   │   ├── usePipeline.ts         # 核心管线（状态 + 调度 + 持久化 + 历史）
│   │   └── useShortcuts.ts        # 全局键盘快捷键
│   ├── data/                      # 静态数据
│   │   ├── palettes.ts            # 10 套内置调色板
│   │   └── presets.ts             # 1 套内置预设（Pixeliaze）
│   ├── pipeline/                  # 模块化管线系统
│   │   ├── executor.ts            # 管线执行器（阶段编排 + 返回 {processed, source}）
│   │   ├── types.ts               # 类型定义
│   │   └── stages/                # 各阶段算法实现（8 个文件）
│   │       ├── preprocess.ts      # 预处理 (8 算法)
│   │       ├── scale.ts           # 缩放 (4 算法)
│   │       ├── palette.ts         # 调色板生成 (3 算法)
│   │       ├── palettePost.ts     # 调色板后处理 (2 算法)
│   │       ├── quantize.ts        # 颜色量化 (2 算法)
│   │       ├── dither.ts          # 抖动 (6 算法)
│   │       ├── block.ts           # 分块限色 (2 算法)
│   │       ├── postfx.ts          # 后处理特效 (7 算法)
│   │       └── shared.ts          # 共享函数 (srgb→Lab, BCS, nearest)
│   ├── types/
│   │   └── index.ts               # 核心类型 (RGB / Palette / FxKey)
│   ├── utils/
│   │   └── persistence.ts         # localStorage debounce 封装
│   ├── App.vue                    # 根组件
│   └── main.ts                    # 入口
├── .gitignore
├── env.d.ts                       # 环境类型声明
├── index.html                     # HTML 入口
├── LICENSE
├── package.json                   # 依赖与脚本
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json                  # TS 主配置
├── tsconfig.app.json              # 应用 TS 配置
├── tsconfig.node.json             # Node TS 配置
└── vite.config.ts                 # Vite 配置
```

> 已删除（死代码清理于本轮迭代）：`src/pipeline/registry.ts`、`src/composables/usePixelConverter.ts`、`src/components/AdjustControl.vue`、`src/components/FxControl.vue`。

## 技术栈

| 技术 | 版本 |
|------|------|
| Vue | ^3.5.32 |
| TypeScript | ~6.0.0 |
| Vite | ^8.0.8 |
| vue-tsc | ^3.2.6 |
| Node | >=20.19.0 |

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查 + 构建 |
| `pnpm preview` | 预览构建产物 |
| `pnpm build-only` | 仅构建 |
| `pnpm type-check` | 仅类型检查 |

## 组件层级

```
App.vue
├── WinFrame.vue              # Win95 窗口框架
│   └── PipelineControl.vue   # 管线控制面板
├── PreviewPanel.vue          # 图片预览区域（含 compare 模式渲染）
├── PalettePanel.vue          # 调色板选择面板
├── CustomPaletteModal.vue    # 自定义调色板弹窗
├── StylePresets.vue          # 风格预设（内置 / 我的 分组）
└── Taskbar.vue               # 状态栏
```

## 核心管线

### 阶段顺序

来自 `src/pipeline/executor.ts` 的 `STAGE_ORDER`：

```
scale → preprocess → palette(生成) → palette-post → quantize → block → dither → 放大 → postfx
```

- **scale**：源图下采样到小画布（pw × ph）
- **preprocess**：串行子算法（`preprocessStage.params.algorithms` 逗号分隔）
- **palette**：仅在 `median-cut` / `wu` 时启用，会改写 `palette` 数组
- **palette-post**：对生成/固定的调色板做色相/饱和度后处理
- **quantize** / **block** / **dither**：直接 mutate 像素
- **放大**：用 `imageSmoothingEnabled = false` 拉回主画布尺寸
- **postfx**：独立于管线，由 `usePipeline.startFx` 启动 `setInterval` 帧循环

### 阶段与算法

| 阶段 | 算法 | 文件 |
|------|------|------|
| `scale` | nearest / bilinear / bicubic / lanczos | `stages/scale.ts` |
| `preprocess` | none / gaussian-blur / box-blur / sharpen / bcs / erode / bilateral / hsl-shift | `stages/preprocess.ts` |
| `palette` | fixed / median-cut / wu | `stages/palette.ts` |
| `palette-post` | none / split-toning | `stages/palettePost.ts` |
| `quantize` | nearest-lab / nearest-rgb | `stages/quantize.ts` |
| `block` | none / tile-palette | `stages/block.ts` |
| `dither` | none / floyd-steinberg / atkinson / bayer-2x2 / bayer-4x4 / bayer-8x8 | `stages/dither.ts` |
| `postfx` | none / crt / glitch / ghost / palette-cycle / dither-fade / combined | `stages/postfx.ts` |

> 注：早期版本曾包含 `blue-noise` 抖动算法，已移除；`combined` 是 postfx 的聚合入口，可叠加多个 FX。

## 算法细节

### 颜色空间

- sRGB → Linear（γ=2.4 分段函数）→ XYZ(D65) → CIELAB
- 颜色距离：DeltaE CIE76 — CIELAB 欧几里得距离 √(ΔL² + Δa² + Δb²)
- `shared.ts` 暴露 `srgbToLinear` / `rgbToLab` / `deltaE` / `nearestColor` / `nearestColorRGB` / `applyBCS_`

### Split Toning（`palette-post`）

对每个颜色按亮度分为暗部/亮部，向目标色插值色相和饱和度：

- **暗部**（L < midpoint）：向 `shadowColor` 插值，强度 = `shadowStrength × (1 - L/midpoint)`
- **亮部**（L ≥ midpoint）：向 `highlightColor` 插值，强度 = `highlightStrength × (L-midpoint)/(100-midpoint)`
- 亮度不变，色相使用圆形最短路径插值
- 中间过渡线性平滑，无硬切

### 抖动

- **Floyd-Steinberg**：误差扩散核 `[右]7/16, [左下]3/16, [下]5/16, [右下]1/16`
- **Atkinson**：6 邻域误差扩散，每邻居 1/8 权重（剩余 2/8 故意丢弃以提亮）
- **Bayer**：有序抖动（2×2 / 4×4 / 8×8 矩阵），偏移公式 `bay × threshold × strength × 2`
- **自适应强度**（`executor.ts` recommendedStrength）：调色板 ≥ 33 色时禁用，≥ 17 色时上限 0.5

### Wu's Quantization（`palette`）

- SIDE=64（6-bit），三通道直方图 `64³ = 262144` bin
- `Float64Array` 避免 Int32 溢出
- 半透明像素按 `α/255` 加权贡献
- 三轮 3D 前缀和 → O(1) 子盒查询
- 贪心切分：每轮选当前方差最大的盒，沿三轴遍历所有可能切分点

## 状态管理

### `usePipeline`（`src/composables/usePipeline.ts`）

核心 composable，对外暴露：

- 状态：`stages` / `palettes` / `paletteKey` / `displayPixelSize` / `compareMode` / `userPresets` / `isProcessing` / `hasImage` / `currentPalette` / `imageState`
- 动作：`updateStage` / `addCustomPalette` / `removeCustomPalette` / `loadImageFile` / `toggleFx` / `reconvert` / `applyPreset` / `saveCurrentAsPreset` / `deleteUserPreset` / `toggleDither` / `adjustPixelSize` / `undo` / `redo` / `clearAllPersisted`
- 派生：`canUndo` / `canRedo`

`imageState` 是 `computed` ref，封装 `{ baseImageData, sourceImageData }` 供 `PreviewPanel` watch。

### 持久化（`src/utils/persistence.ts`）

- `STORAGE_KEYS`：`customPalettes` / `pipelineState` / `userPresets`
- 400ms debounce 写入
- `usePipeline` 启动时 `loadJSON` 还原
- 撤销历史 50 步上限，仅快照 `(paletteKey, displayPixelSize, stages)`

### 快捷键（`src/composables/useShortcuts.ts`）

| 键 | 动作 |
|----|------|
| Space | 切换 compare 模式 |
| D | 切换 dither |
| `[` / `]` | ±1 displayPixelSize |
| 1-9 | 应用前 9 个预设 |
| Cmd/Ctrl+S | 下载 PNG |
| Cmd/Ctrl+Z | 撤销 |
| Cmd/Ctrl+Shift+Z | 重做 |

表单控件聚焦时让位；带 modifier 的快捷键（Cmd+S 等）始终生效。
