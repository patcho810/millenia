# 待办 & 改进建议

> 生成时间: 2026-05-26

## 已完成（本轮迭代）

| 变更 | 文件 | 说明 |
|------|------|------|
| 清空内置预设 | `src/data/presets.ts` | `BUILTIN_PRESETS = []`，`makeStages` 保留 |
| 预设系统修复 | `src/composables/usePipeline.ts` + `src/components/StylePresets.vue` + `src/App.vue` | 新增 `applyPreset()`，合并 preset.stages 到当前管线，preset 不含 `palette`/`palette-post` 时不覆盖 |
| Bilateral Filter | `src/pipeline/stages/preprocess.ts` + `src/pipeline/registry.ts` | 保边平滑预处理，半径/空间σ/色彩σ 三参数 |
| Blue Noise Dither | `src/pipeline/stages/dither.ts` + `src/pipeline/registry.ts` | 64×64 void-and-cluster 预埋矩阵，Lab 自适应强度 |
| Wu's Quantization | `src/pipeline/stages/palette.ts` + `src/pipeline/registry.ts` + `src/pipeline/executor.ts` | 3D 直方图按方差最大轴递归切分 |
| UI 补充 | `src/components/PipelineControl.vue` | erode/bilateral/wu/blue-noise 选项及参数控件；Bayer 系列 threshold 参数 |

---

## 待改进

### 1. Bayer Dither 公式与 Blue Noise 统一

**现状**: Bayer 抖动偏移公式中有 `* 2` 因子，但 Blue Noise 没有。两者在相同 strength/threshold 下强度不一致。

```
Bayer:     offset = bay * threshold * strength * 2
Blue:      offset = noise * maxOffset * threshold * strength
```

**建议**: 为 Bayer 也引入 `maxOffset` 自适应逻辑（基于调色盘密度），移除硬编码 `* 2`。或至少将 Blue Noise 的 `* 2` 补回以对齐行为。

**影响文件**: `src/pipeline/stages/dither.ts` — bayerDither() + bayer2x2/4x4/8x8 包装函数

### 2. 误差扩散抖动也有黑色噪点问题

**现状**: Floyd-Steinberg 和 Atkinson 使用固定 `strength` 缩放误差，没有调色盘密度感知。小调色盘（如 Game Boy 4 色）下同样会产生大量黑点。

**建议**: 引入类似的 `recommendedStrength` 逻辑结合 `maxOffset`，根据 `avgNearestLabDistance` 自动钳制误差扩散强度上限。

**影响文件**: `src/pipeline/stages/dither.ts` — floydSteinberg() / atkinson()

### 3. 预设系统持久化

**现状**: `BUILTIN_PRESETS` 已清空，用户无法保存/恢复预设。预设仅存在于内存中。

**建议**:
- 用 `localStorage` 持久化用户自建预设
- 提供 `savePreset` / `loadPresets` / `deletePreset` 接口
- 在 `StylePresets.vue` 中加入保存当前管线为预设的按钮

**影响文件**: `src/data/presets.ts`, `src/composables/usePipeline.ts`, `src/components/StylePresets.vue`

### 4. Blue Noise 矩阵质量

**现状**: 当前 64×64 矩阵由 Gaussian 模糊 + histogram equalization 生成，接近 void-and-cluster 但并非标准实现。边缘处可能存在轻微的低频痕迹。

**建议**: 替换为学术界标准 void-and-cluster 64×64 矩阵（如 SIGGRAPH 论文附录中的参考矩阵），或使用 dart-throwing 生成真正的泊松盘采样分布。

**影响文件**: `src/pipeline/stages/dither.ts` — 仅替换 `BLUE_NOISE_64` 数组

### 5. Wu's Quantization 性能

**现状**: `splitBox()` 在每个轴上遍历所有可能切分点 (`O(S²)` per box)，对于 64 色目标 + 32³ 直方图，耗时会显著上升。

**建议**: 
- 使用前缀和数组对 `variance()` 做 `O(1)` 增量计算
- 或将切分粒度从 32³ 降为 16³，再对结果做 K-Means 精修

**影响文件**: `src/pipeline/stages/palette.ts` — wuQuantize() 内部算法

### 6. 类型安全增强

**现状**: 多处使用 `!` 非空断言（`index.htmlCanvasElement!`, `matrix![y]![x]` 等），运行时可能抛出。

**建议**: 
- 替换为显式 `if (!x) return` 守卫
- `Uint16Array` 下标访问加默认值 `?? 0`
- 考虑启用 `strictNullChecks` + `noUncheckedIndexedAccess`

**影响文件**: 全局

### 7. 缺失组件恢复

**现状**: `App.vue` 中 `AdjustControl` 和 `FxControl` 已被注释掉。

**建议**: 
- 恢复 `FxControl` — CRT/Glitch/Ghost 已有的 postfx 参数可用独立的 toggle 面板控制
- `AdjustControl` 可考虑改为与 BCS 预处理整合，不单独保留

**影响文件**: `src/App.vue`, `src/components/FxControl.vue`

---

## 可新增

### 8. 更多预处理算法

| 算法 | 说明 |
|------|------|
| Median Filter | 中值滤波，用于去除椒盐噪声 / 简化纹理 |
| Kuwahara Filter | 保边油画效果，很适合像素画 |
| Contrast Limited AHE | 局部对比度增强，适合暗图预处理 |
| Sobel / Canny Edges | 边缘检测 → 叠加到量化结果上增强轮廓 |

### 9. 更多调色板生成算法

| 算法 | 说明 |
|------|------|
| K-Means | 迭代聚类，比 Wu 更精确但更慢 |
| Octree | 八叉树量化，内存效率高 |
| NeuQuant | Kohonen 神经网络，适合摄影图像 |

### 10. 输出格式支持

- **GIF 导出**: 限定 256 色以内，适合像素画分享
- **调色板导出**: 输出 `.hex` / `.gpl` / `.pal` 格式

### 11. 批处理模式

支持拖入多张图片，批量应用相同管线参数并导出。

---

## 管线当前阶段总览

```
scale → preprocess → palette(生成) → palette-post → quantize → block → dither → 放大 → postfx
```

| 阶段 | 算法 |
|------|------|
| scale | Nearest / Bilinear / Bicubic / Lanczos |
| preprocess | None / Gaussian Blur / Box Blur / Sharpen / BCS / Erode / **Bilateral Filter** |
| palette | Fixed / Median Cut / **Wu's Quantization** |
| palette-post | None / Split Toning |
| quantize | Nearest CIELAB / Nearest RGB |
| block | None / Tile Palette |
| dither | None / Floyd-Steinberg / Atkinson / Bayer 2×2 / Bayer 4×4 / Bayer 8×8 / **Blue Noise** |
| postfx | CRT / Glitch / Ghost / Palette Cycle / Dither Fade |
