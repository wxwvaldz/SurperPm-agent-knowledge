---
target: mcp:image-gen
tags: [image-generation, academic, scientific, prompt, mcp]
when: "调 image-gen MCP 工具生成科研 / 学术风格图"
priority: high

created: 2026-06-14
last_accessed: 2026-06-14
hit_count: 0
ttl_days: 180
status: active

source: session/research-paper-figure-20260614
---

# image-gen MCP 学术风格 prompt 注入

调 image-gen MCP 之前，自动用以下 prefix + suffix 包装用户 prompt：

## Prefix（在用户 prompt 前加）

```
Generate a clean scientific illustration in academic paper style.
Color palette: muted, max 3 colors (prefer #1f78b4 blue, #ff7f00 orange, #cccccc gray, white bg).
Typography: Helvetica/Arial sans-serif, all labels ≥10pt.
Style: flat design, no 3D, no shadows, no gradients, no decorative elements.
Composition: minimal and informative, like figures in Nature/ICML/NeurIPS papers.

User request: [USER PROMPT]
```

## Suffix（在用户 prompt 后追加）

```
Output specifications:
- Aspect ratio: 16:9 (paper figure) or 4:3 (slide)
- Format: prefer SVG-ready compositions
- No watermarks, no signatures
- Color-blind safe (avoid red-green only encoding)
- High contrast (≥4.5:1 for text)

Avoid: photorealistic, 3D rendering, shadows, gradients, decorative elements,
stock illustration style, neon colors, jet/rainbow colormap, cluttered backgrounds,
hand-drawn sketches, watermarks, text artifacts.
```

## 智能场景识别（建议 image-gen MCP 自动）

如果用户 prompt 包含以下关键词，自动追加对应模板：

| 关键词 | 自动追加 |
|--------|---------|
| "架构 / architecture" | "5-7 labeled blocks connected by directional arrows" |
| "数据流 / data flow" | "left-to-right flowchart with swim lanes" |
| "对比 / before-after" | "2-panel side-by-side, gray for before, blue for after" |
| "概念 / concept" | "central concept with surrounding components, clean lines" |
| "时序 / sequence" | "horizontal timeline with milestones" |

## 输出后处理建议（MCP 应该提示）

> Image generated. For publication:
> 1. Open in Inkscape/Figma to verify text and add precise labels
> 2. Export as SVG/PDF (vector) for paper figures
> 3. Run through color-blindness simulator to verify accessibility
> 4. Check label font matches your paper's typography
