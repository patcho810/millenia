# Millenia 项目结构

> 生成时间: 2026-05-16

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
│   │   ├── AdjustControl.vue        # 亮度/对比度/饱和度调节
│   │   ├── CustomPaletteModal.vue   # 自定义调色板弹窗
│   │   ├── FxControl.vue            # 特效控制
│   │   ├── PalettePanel.vue         # 调色板面板
│   │   ├── PreviewPanel.vue         # 预览面板
│   │   ├── SizeControl.vue          # 尺寸控制
│   │   ├── StylePresets.vue         # 风格预设
│   │   ├── Taskbar.vue              # 任务栏
│   │   └── WinFrame.vue             # 窗口框架 (Win95 风格)
│   ├── composables/          # 组合式函数
│   │   └── usePixelConverter.ts     # 核心像素转换逻辑
│   ├── data/                 # 静态数据
│   │   ├── palettes.ts       # 20 套内置调色板
│   │   └── presets.ts        # 7 套风格预设
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
├── WinFrame.vue          # Win95 窗口框架
│   ├── Taskbar.vue       # 标题栏/任务栏
│   ├── PreviewPanel.vue  # 图片预览区域
│   ├── PalettePanel.vue  # 调色板选择面板
│   ├── CustomPaletteModal.vue  # 自定义调色板弹窗
│   ├── StylePresets.vue  # 风格预设
│   ├── AdjustControl.vue # 亮度/对比度/饱和度
│   ├── SizeControl.vue   # 输出尺寸控制
│   └── FxControl.vue     # 特效控制
```

## 核心管线 (pipeline)

```
加载图片 → 缩放 → BCS 调整 → 量化/抖动 → 局部限色 → 放大 → 特效 → 输出
```

## 算法模块 (usePixelConverter.ts)

- **颜色空间转换**: sRGB → Linear → XYZ(D65) → CIELAB
- **颜色量化**: CIELAB 最近邻匹配
- **颜色距离**: DeltaE CIE76
- **抖动**: Floyd-Steinberg 误差扩散 (支持 strength)
- **侵蚀**: 形态学 4-邻域
- **BCS**: 亮度/对比度/饱和度
- **局部限色**: 分块限制最大颜色数
- **特效**: CRT 扫描线, Glitch, 鬼影, 调色板循环, 抖动淡出
