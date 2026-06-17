---
target: skill:research-figure
tags: [matplotlib, style, science, publication, figure]
when: "用 matplotlib 画论文图 / 学术报告图"
priority: high

created: 2026-06-14
last_accessed: 2026-06-14
hit_count: 0
ttl_days: 180
status: active

source: session/research-paper-figure-20260614
---

# Matplotlib 科研图风格模板

画 matplotlib 图前，先用这套 rcParams 配置（投顶刊 / 顶会通用）：

```python
import matplotlib.pyplot as plt

plt.rcParams.update({
    # 字体
    "font.family": "Helvetica",         # 或 "Arial" / TeX Gyre Heros
    "font.size": 10,                    # 论文正文常用 9-10pt
    "axes.titlesize": 11,
    "axes.labelsize": 10,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "legend.fontsize": 9,

    # 极简边框（去掉上 + 右）
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.linewidth": 0.5,

    # 线条
    "lines.linewidth": 2,
    "lines.markersize": 6,
    "lines.markeredgewidth": 0.5,

    # 网格（默认关闭，需要时显式开）
    "axes.grid": False,
    "grid.linewidth": 0.3,
    "grid.alpha": 0.3,

    # Legend
    "legend.frameon": False,
    "legend.fontsize": 9,

    # Save
    "savefig.dpi": 300,                 # 投稿要求 ≥300
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.05,

    # Figure size（默认单栏图）
    "figure.figsize": (3.5, 2.5),       # inch（NeurIPS / ICML 单栏 ~3.25"）
})
```

## 双栏图尺寸

```python
# 双栏图（横跨整页）
fig, ax = plt.subplots(figsize=(7.0, 3.0))
```

## 必做

1. **保存用 PDF / SVG**（矢量，不糊）：`plt.savefig('fig1.pdf')`
2. **关闭 spines top + right**（数据墨水比）
3. **字号 ≥9pt**（即使打印缩小可读）
4. **markers 配合 line style**（黑白打印仍可分辨）

## 反模式

- ❌ 用 `plt.figure(figsize=(10, 8))` 默认大小（投稿会被压缩到难看）
- ❌ 字号 6pt（看不清）
- ❌ 保存 PNG（位图，缩放糊）
- ❌ 默认蓝色 `b` / 橙色 `o`（不是色盲安全）— 用下面的 academic-color-palette
