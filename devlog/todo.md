# 待办 & 改进建议

> 更新时间: 2026-06-01

## 已完成（本轮迭代）

| 变更 | 文件 | 说明 |
|------|------|------|
| C2 localStorage 持久化 | `src/utils/persistence.ts` (新) + `src/composables/usePipeline.ts` | 自定义调色板、用户预设、`stages`/`paletteKey`/`displayPixelSize`/`compareMode` 全部 400ms debounce 写入 `localStorage`，启动时还原 |
| C2 executor 改造 | `src/pipeline/executor.ts` | 返回 `PipelineResult { processed, source }`；`source` 是小画布上未处理原图快照（compare 模式用） |
| C2 响应式封装 | `src/composables/usePipeline.ts` | `sourceImageData`/`baseImageData` 改为 `shallowRef`（大对象避免深响应），新增 `imageState` computed 透传 |
| C3 原图对比 | `src/components/PreviewPanel.vue` + `src/App.vue` | 新增 `compareMode` prop + 👁 对比按钮 + 状态徽章 + 黄色描边；切换时 `putImageData` 替换画布内容 |
| C5 键盘快捷键 | `src/composables/useShortcuts.ts` (新) + `src/App.vue` | Space=toggle compare、Cmd/Ctrl+S=下载、Cmd/Ctrl+Z & Cmd/Ctrl+Shift+Z=撤销/重做、1-9=应用前 9 个预设、`[`/`]`=±pixelSize、D=toggle dither；表单控件聚焦时让位 |
| C5 撤销历史 | `src/composables/usePipeline.ts` | 50 步上限，仅快照 `(paletteKey, displayPixelSize, stages)`；还原时 `suppressHistory` 防回环 |
| C5 toggleDither / adjustPixelSize | `src/composables/usePipeline.ts` | D 键依赖 |
| C6 保存为我的预设 | `src/composables/usePipeline.ts` + `src/components/StylePresets.vue` | `saveCurrentAsPreset(name)` 生成 `user-<base36 ts>` id；`deleteUserPreset(id)` |
| C6 UI 重做 | `src/components/StylePresets.vue` | 「内置」+「我的」分组 + 名称输入 + 保存按钮 + 行内 × 删除 |
| 文档刷新 | `devlog/structure.md` | 重写以反映当前实际状态：10 调色板 / 1 预设 / 7 组件 / 已删 registry & AdjustControl & FxControl / 无 Blue Noise |
| 编译验证 | — | `vue-tsc --build` 0 错误；`vite build` 49 modules / 121.6 KB JS (gzip 43.8 KB) |
| 浏览器实测 | Playwright (Chromium) | Space 切换: 中心像素 (168,148,40) ↔ (127,127,0) 双向验证；D 键: 调色板量化前后对比；[/] 键: 2→3→2；Ctrl+S: 触发 `pixel-art.png` 下载；Ctrl+Z: dither false→true；保存/删除/数字键预设: 全部通过；刷新后状态完整恢复 |

> 旧轮迭代

| 变更 | 文件 | 说明 |
|------|------|------|
| 死代码清理 | `src/composables/usePixelConverter.ts` | 删除 — 全文件 477 行无外部引用 |
| 死代码清理 | `src/pipeline/registry.ts` | 删除 — `ALGORITHM_REGISTRY`/`REGISTRY_BY_STAGE` 仅自引用 |
| 死代码清理 | `src/components/AdjustControl.vue` | 删除 — 无 import（App.vue 中是注释块） |
| 死代码清理 | `src/components/FxControl.vue` | 删除 — 同上 |
| 死代码清理 | `src/App.vue` | 移除 L16-29 注释块，WinFrame 内容只剩 PipelineControl |
| 调试残留 | `src/pipeline/executor.ts` | 移除 4 处 `console.log`（L105/108/109/112） |
| 编译验证（旧轮） | — | `vue-tsc --build` 0 错误；`vite build` 47 modules / 114 KB JS (gzip 41.6 KB) |
| 清空内置预设 | `src/data/presets.ts` | `BUILTIN_PRESETS = []`，`makeStages` 保留（后被 Pixeliaze 重新加入，现状见上） |
| 预设系统修复 | `src/composables/usePipeline.ts` + `src/components/StylePresets.vue` + `src/App.vue` | 新增 `applyPreset()`，合并 preset.stages 到当前管线，preset 不含 `palette`/`palette-post` 时不覆盖 |
| Bilateral Filter | `src/pipeline/stages/preprocess.ts` | 保边平滑预处理，半径/空间σ/色彩σ 三参数 |
| Wu's Quantization | `src/pipeline/stages/palette.ts` + `src/pipeline/executor.ts` | 3D 直方图按方差最大轴递归切分 |
| UI 补充 | `src/components/PipelineControl.vue` | erode/bilateral/wu 选项及参数控件；Bayer 系列 threshold 参数 |
| Blue Noise Dither | `src/pipeline/stages/dither.ts` | **已移除** — 早期版本的 64×64 void-and-cluster 矩阵在清理中删除，无外部依赖 |

---

## 待改进

### 1. 误差扩散抖动也有黑色噪点问题

**现状**: Floyd-Steinberg 和 Atkinson 使用固定 `strength` 缩放误差，没有调色盘密度感知。小调色盘（如 Game Boy 4 色）下同样会产生大量黑点。

**建议**: 引入 `recommendedStrength` 逻辑结合 `maxOffset`，根据 `avgNearestLabDistance` 自动钳制误差扩散强度上限。

**影响文件**: `src/pipeline/stages/dither.ts` — floydSteinberg() / atkinson()

> 原 #1「Bayer Dither 公式与 Blue Noise 统一」与原 #4「Blue Noise 矩阵质量」已删除 — Blue Noise 算法已从代码中移除，相关讨论无对象。

### 2. ~~预设系统持久化~~ ✅ 已由 C6 解决

> `BUILTIN_PRESETS` 保留作为出厂体验入口；用户自建预设通过 `usePipeline.saveCurrentAsPreset` / `deleteUserPreset` + `localStorage` 持久化。

### 3. Wu's Quantization 性能

**现状**: `cut()` 在每个轴上遍历所有可能切分点（`O(S²)` per box per axis），对于 64 色目标 + 64³ 直方图，耗时会显著上升。

**建议**:
- 用当前的前缀和已可 O(1) 取切分后的子盒方差，避免 inner `cut` 循环内重复 `volume()` 计算
- 或将切分粒度从 64³ 降为 16³，再对结果做 K-Means 精修

**影响文件**: `src/pipeline/stages/palette.ts` — wuQuantize() 内部算法

### 4. 类型安全增强

**现状**: 多处使用 `!` 非空断言（`canvas.getContext('2d')!`、`matrix![y]![x]` 等），运行时可能抛出。

**建议**:
- 替换为显式 `if (!x) return` 守卫
- `Uint16Array` / `Float64Array` 下标访问加默认值 `?? 0`
- 考虑启用 `strictNullChecks` + `noUncheckedIndexedAccess`

**影响文件**: 全局（`src/pipeline/stages/*.ts` 尤甚）

### 5. ~~缺失组件恢复~~ ✅ 已在本轮清理中解决（选择删除而非恢复）

**原状**: `App.vue` 中 `AdjustControl` 和 `FxControl` 已被注释掉。

**处理**: 经引用分析确认两个组件文件本身无任何 import，决定**直接删除**（避免 dead code 越积越多），postfx 的开关在 `PipelineControl` 内的 postfx stage 已有覆盖。如未来需要独立 FX 面板再新建组件。

---

## 便利性改进（v2.0 候选）

> 项目定位是「便利地将图片处理成风格化像素图」，以下条目围绕「开箱即用、调试友好、可分享」展开。
> 与上文「待改进」侧重算法/类型不同，本节专注**用户体验与上手成本**。

### ~~C2. localStorage 持久化~~ ✅ 已完成

### ~~C3. 原图 vs 效果对比~~ ✅ 已完成

### ~~C5. 键盘快捷键~~ ✅ 已完成

### ~~C6. 保存当前参数为我的预设~~ ✅ 已完成

### C1. 内置预设扩到 6-8 个

**现状**: `BUILTIN_PRESETS` 仅 `Pixeliaze` 一项，新用户打开后无「快速体验」入口。

**建议**: 覆盖主流像素画风格，差异化明显，每项给简短描述：

| 预设 | 风格 | 关键参数 |
|------|------|----------|
| `Pixeliaze`（已有） | 通用降采样像素化 | bicubic + wu 16色 + atkinson |
| `Game Boy` | 4 阶绿阶 | median-cut 4色 + bayer 4×4 + sepia 调色 |
| `PICO-8` | 16 色限制 | fixed pico8 调色 + nearest-lab |
| `NES` | 8-bit 红白机 | fixed nes 调色 + bayer 8×8 |
| `Watercolor` | 柔和水彩 | gaussian-blur + wu 32色 + split-toning |
| `Cyberpunk` | 霓虹紫蓝 | median-cut 16色 + split-toning (紫高光) |
| `Pixel Outline` | 卡通描边 | sharpen + wu 16色 + dither fade |
| `LowRes` | 极低分辨率 | pixelSize=4 + nearest + 无 dither |

**影响文件**: `src/data/presets.ts`（纯数据），`src/components/StylePresets.vue`（可能要分组：内置/我的）

### C4. URL hash 分享配置

**现状**: 调好参数无法分享给朋友。

**建议**:
- `usePipeline` 监听 `stages`/`paletteKey`/`displayPixelSize` 变化，写入 `location.hash`（base64 + zlib，或 LZ-string 压缩）
- `App.vue` 启动时读 `location.hash` 还原配置
- `PreviewPanel` 加个「复制配置链接」按钮

**影响文件**: `src/composables/usePipeline.ts`, `src/App.vue`, `src/components/PreviewPanel.vue`

### C7. 调色板导入（拖入文件）

**现状**: `CustomPaletteModal` 只能手动一行行加色。

**建议**:
- 接受 `.hex`（每行 `#rrggbb`）/ `.gpl`（GIMP Palette）/ `.json`
- 拖拽文件到 modal 区域即解析预览
- 也支持「截图取色」：上传图片，canvas 上点击取色

**影响文件**: `src/components/CustomPaletteModal.vue`

---

## 可新增

### 6. 更多预处理算法

| 算法 | 说明 |
|------|------|
| Median Filter | 中值滤波，用于去除椒盐噪声 / 简化纹理 |
| Kuwahara Filter | 保边油画效果，很适合像素画 |
| Contrast Limited AHE | 局部对比度增强，适合暗图预处理 |
| Sobel / Canny Edges | 边缘检测 → 叠加到量化结果上增强轮廓 |

### 7. 更多调色板生成算法

| 算法 | 说明 |
|------|------|
| K-Means | 迭代聚类，比 Wu 更精确但更慢 |
| Octree | 八叉树量化，内存效率高 |
| NeuQuant | Kohonen 神经网络，适合摄影图像 |

### 8. 输出格式支持

- **GIF 导出**: 限定 256 色以内，适合像素画分享
- **调色板导出**: 输出 `.hex` / `.gpl` / `.pal` 格式

### 9. 批处理模式

支持拖入多张图片，批量应用相同管线参数并导出。

---

## 管线当前阶段总览

```
scale → preprocess → palette(生成) → palette-post → quantize → block → dither → 放大 → postfx
```

| 阶段 | 算法 |
|------|------|
| scale | Nearest / Bilinear / Bicubic / Lanczos |
| preprocess | None / Gaussian Blur / Box Blur / Sharpen / BCS / Erode / Bilateral Filter / HSL Shift |
| palette | Fixed / Median Cut / Wu's Quantization |
| palette-post | None / Split Toning |
| quantize | Nearest CIELAB / Nearest RGB |
| block | None / Tile Palette |
| dither | None / Floyd-Steinberg / Atkinson / Bayer 2×2 / Bayer 4×4 / Bayer 8×8 |
| postfx | None / CRT / Glitch / Ghost / Palette Cycle / Dither Fade / Combined |
