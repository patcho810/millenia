# Millenia 项目结构

> 生成时间: 2026-05-17

## 根目录

```
Millenia/
├── .git/                     # Git 仓库
├── .vscode/                  # VS Code 配置
│   ├── extensions.json
│   └── settings.json
├── devlog/                   # 开发日志
│   ├── log.md                # 主日志
│   └── structure.md          # 本文件
├── dist/                     # 构建产物
│   ├── assets/
│   │   ├── index-1UbyUvN8.js
│   │   └── index-BlHgffqf.css
│   ├── favicon.ico
│   └── index.html
├── node_modules/             # 依赖
├── public/
│   └── favicon.ico
├── src/                      # 源代码
│   ├── components/           # Vue 组件
│   │   ├── CustomPaletteModal.vue   # 自定义调色板弹窗
│   │   ├── PalettePanel.vue         # 调色板面板
│   │   ├── PipelineControl.vue      # 管线控制面板（阶段开关 + 参数调节）
│   │   ├── PreviewPanel.vue         # 预览面板
│   │   ├── StylePresets.vue         # 风格预设
│   │   ├── Taskbar.vue              # 任务栏
│   │   └── WinFrame.vue             # 窗口框架 (Win95 风格)
│   ├── composables/          # 组合式函数
│   │   └── usePipeline.ts           # 核心管线逻辑（阶段管理 + 转换调度 + 特效）
│   ├── data/                 # 静态数据
│   │   ├── palettes.ts       # 20 套内置调色板
│   │   └── presets.ts        # 7 套风格预设
│   ├── pipeline/             # 模块化管线系统
│   │   ├── types.ts                   # 类型定义 (StageId, StageNode, AlgorithmDef, ParamDef)
│   │   ├── registry.ts                # 集中注册所有阶段/算法/参数定义
│   │   ├── executor.ts                # 管线执行器 (阶段编排顺序)
│   │   └── stages/                    # 各阶段算法实现
│   │       ├── preprocess.ts          # 预处理 (Gaussian Blur/Box Blur/Sharpen/BCS/Erode)
│   │       ├── scale.ts               # 缩放 (Nearest/Bilinear/Bicubic/Lanczos)
│   │       ├── palette.ts             # 调色板 (Fixed/Median Cut)
│   │       ├── palettePost.ts         # 调色板后处理 (None/Split Toning)
│   │       ├── quantize.ts            # 颜色量化 (Nearest CIELAB/Nearest RGB)
│   │       ├── dither.ts              # 抖动 (Floyd-Steinberg/Atkinson/Bayer)
│   │       ├── block.ts               # 分块限色 (Tile Palette)
│   │       ├── postfx.ts              # 后处理特效
│   │       └── shared.ts              # 共享函数 (rgbToLab 等)
│   ├── types/                # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.vue               # 根组件
│   └── main.ts               # 入口
├── .gitignore
├── env.d.ts                  # 环境类型声明
├── index.html                # HTML 入口
├── LICENSE
├── package.json              # 依赖与脚本
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json             # TS 主配置
├── tsconfig.app.json         # 应用 TS 配置
├── tsconfig.node.json        # Node TS 配置
└── vite.config.ts            # Vite 配置
```

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

## 组件层级 (父子关系)

```
App.vue
├── WinFrame.vue              # Win95 窗口框架
├── PipelineControl.vue       # 管线控制面板
├── PreviewPanel.vue          # 图片预览区域
├── PalettePanel.vue          # 调色板选择面板
├── CustomPaletteModal.vue    # 自定义调色板弹窗
├── StylePresets.vue          # 风格预设
├── Taskbar.vue               # 状态栏
```

## 核心管线 (pipeline)

```
加载图片 → scale → preprocess → palette(生成) → palette-post → quantize → block → dither → 放大 → postfx → 输出
```

### 阶段说明

| 阶段 ID | 说明 | 算法 |
|---------|------|------|
| `scale` | 缩放 | Nearest / Bilinear / Bicubic / Lanczos |
| `preprocess` | 预处理 | None / Gaussian Blur / Box Blur / Sharpen / BCS / Erode |
| `palette` | 调色板 | Fixed / Median Cut |
| `palette-post` | 调色板后处理 | None / Split Toning |
| `quantize` | 颜色量化 | Nearest CIELAB / Nearest RGB |
| `block` | 分块限色 | None / Tile Palette |
| `dither` | 抖动 | None / Floyd-Steinberg / Atkinson / Bayer (2x2/4x4/8x8) |
| `postfx` | 后处理特效 | CRT / Glitch / Ghost / Palette Cycle / Dither Fade |

### Split Toning 算法

调色板后处理阶段，对每个颜色按亮度分为暗部/亮部，向目标色插值色相和饱和度：

- **暗部**（L < midpoint）：向 `shadowColor` 插值，强度 = `shadowStrength × (1 - L/midpoint)`
- **亮部**（L ≥ midpoint）：向 `highlightColor` 插值，强度 = `highlightStrength × (L-midpoint)/(100-midpoint)`
- 亮度不变，色相使用圆形最短路径插值
- 中间过渡线性平滑，无硬切

## 颜色空间转换

- sRGB → Linear (γ=2.4 分段函数) → XYZ(D65) → CIELAB
- 颜色距离: DeltaE CIE76 — CIELAB 欧几里得距离 √(ΔL² + Δa² + Δb²)

## 抖动算法

- **Floyd-Steinberg**: 误差扩散核 `[右]7/16, [左下]3/16, [下]5/16, [右下]1/16`
- **Atkinson**: 6 邻域误差扩散
- **Bayer**: 有序抖动 (2×2 / 4×4 / 8×8 矩阵)
- 自适应强度: 调色板 ≥ 33 色时禁用，≥ 17 色时上限 0.5
