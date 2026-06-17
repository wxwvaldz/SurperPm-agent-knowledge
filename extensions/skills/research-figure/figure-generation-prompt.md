---
target: skill:research-figure
tags: [prompt, generation, ai-image, midjourney, dalle, scientific-illustration]
when: "用 AI 生图工具画科研示意图 / schematic / 概念插图"
priority: high

created: 2026-06-14
last_accessed: 2026-06-14
hit_count: 0
ttl_days: 180
status: active

source: session/research-paper-figure-20260614
---

# 科研图生图 Prompt 模板

## 场景 1：系统架构示意图

```
A clean, minimalist scientific diagram of a [SYSTEM NAME] architecture.
Style: technical illustration, flat design, isometric perspective.
Color palette: muted blues and grays (#1f78b4 primary, #cccccc secondary, white background).
Composition: 3-5 labeled blocks connected by directional arrows,
  each block labeled clearly with sans-serif text (Helvetica/Arial 12pt).
No 3D rendering, no shadows, no gradients.
Aspect ratio: 16:9 for paper, 1:1 for slides.
Negative prompt: photorealistic, cluttered, decorative, neon colors, jet colormap.
```

## 场景 2：算法/概念示意图

```
A scientific concept illustration showing [CONCEPT].
Style: textbook diagram, clean line art, schematic.
Color: 2-3 muted colors max (e.g., #1f78b4 blue, #ff7f00 orange, white bg).
Composition: clearly labeled components with arrows showing data flow / causation.
Typography: sans-serif, ≥10pt, no decorative fonts.
Style reference: like Nature paper schematic figures, ICML/NeurIPS paper diagrams.
Avoid: 3D, photorealistic, generic stock illustration style.
```

## 场景 3：数据流 / 时序图

```
A clean data flow diagram of [PROCESS].
Style: minimalist flowchart, swim lanes if multi-actor.
Direction: left-to-right (or top-to-bottom).
Boxes: rounded rectangles, color-coded by actor/stage.
Arrows: solid for main flow, dashed for optional/error path.
Labels: action verbs on arrows, noun phrases in boxes.
Style: like Mermaid output or draw.io clean export, no embellishments.
```

## 场景 4：对比插图（Before / After）

```
A side-by-side comparison illustration of "Before [METHOD]" and "After [METHOD]".
Layout: 2 panels horizontally aligned, with a center divider arrow.
Each panel: same composition with one variable changed.
Color: gray (#888) for "before", accent blue (#1f78b4) for "after".
Labels: panel headers in 14pt bold, callout annotations in 10pt regular.
Style: clean and minimal, like a research poster section.
```

## 通用 negative prompt（避免坑）

```
Negative: photorealistic, 3D rendering, shadows, gradients,
  decorative elements, stock illustration style, watermark,
  neon/saturated colors, jet/rainbow colormap, 
  cluttered, busy background, hand-drawn sketch style,
  multiple disconnected scenes, text artifacts.
```

## 后处理建议

1. **AI 生图后**：在 Inkscape / Figma 中重新绘制（保证矢量 + 字体准确）
2. **标签必须手工加**：AI 生图的文字常错（拼写 / 字体不一致）
3. **导出 SVG / PDF**：投稿要求矢量
4. **检查色盲友好**：用 [color-blindness.com simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)

## 反模式

- ❌ 直接用 AI 生图当 final figure（标签错误率高）
- ❌ Prompt 没指定字体 / 字号（结果不一致）
- ❌ Prompt 没排除 3D（AI 默认炫技加阴影）
- ❌ 没指定 negative（生成结果飘忽）
- ❌ 调色板没指明（出 jet 配色 → 论文 reviewer 直接 reject）
