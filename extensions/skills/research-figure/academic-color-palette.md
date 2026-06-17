---
target: skill:research-figure
tags: [color, palette, science, accessibility, colorblind]
when: "画科研图选颜色 / 多类别对比 / 热力图 / 等高线"
priority: high

created: 2026-06-04
last_accessed: 2026-06-04
hit_count: 0
ttl_days: 180
status: active

source: session/research-paper-figure-20260604
---

# 学术配色调色板

## 推荐场景 → 调色板

| 场景 | 调色板 | 工具 |
|------|--------|------|
| 分类（≤8 类）| **ColorBrewer Set2 / Set3** | `palettable.colorbrewer.qualitative.Set2_8` |
| 渐变（连续值）| **viridis** / **magma** / **plasma** | matplotlib 内置 |
| 双向（diverging：负 → 0 → 正）| **RdBu** / **PuOr** | matplotlib 内置 |
| 色盲安全 + 印刷友好 | **Okabe-Ito** 8 色 | 见下方代码 |
| Nature 风格 | 蓝/橙/绿/红/紫 | 见下方代码 |

## Okabe-Ito 8 色（色盲安全 + 黑白可分辨）

```python
OKABE_ITO = {
    'black':      '#000000',
    'orange':     '#E69F00',
    'sky_blue':   '#56B4E9',
    'green':      '#009E73',
    'yellow':     '#F0E442',
    'blue':       '#0072B2',
    'vermillion': '#D55E00',
    'purple':     '#CC79A7',
}
```

## Nature 风格

```python
NATURE_PALETTE = ['#1f78b4', '#ff7f00', '#33a02c', '#e31a1c', '#6a3d9a']
# 深蓝 / 橙 / 绿 / 红 / 紫
```

## 灰度基线 + 彩色突出（Tufte 风格）

```python
# 多线对比，焦点用彩色，其他用灰
COLORS = {
    'focus': '#1f78b4',      # 焦点深蓝
    'baseline': '#cccccc',   # 灰色对照
    'highlight': '#e31a1c',  # 突出红
}

for line_name, ys in data.items():
    color = COLORS['focus'] if line_name == 'OurMethod' else COLORS['baseline']
    ax.plot(xs, ys, color=color, label=line_name)
```

## 反模式

- ❌ **jet / rainbow**（感知非线性 + 色盲不友好，科研禁忌）
- ❌ 默认 matplotlib `tab10`（前几色不色盲安全）
- ❌ 红绿单独编码（最常见色盲不友好）
- ❌ 6+ 类用同一色相区分（饱和度不够，看不出）
- ❌ 调色板跨论文不一致（每篇换一套）

## 工具

- [ColorBrewer](https://colorbrewer2.org/) — 在线选
- `palettable` PyPI — 内置所有 colorbrewer + cmocean 等
- `colorblind-friendly` 工具：[oracleofcolor.com](https://www.oracleofcolor.com/)
