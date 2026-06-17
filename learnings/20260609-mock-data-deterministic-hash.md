---
title: "前端 Mock 数据的确定性哈希模式"
category: pattern
source_type: internal
importance: 0.6
confidence: 0.8
created: 2026-06-09T23:20:00+00:00
pinned: false
archived: false
tags: frontend, mock, hash, deterministic, react
---

## 背景

在纯前端改动中，需要展示 mock 数据（如阅读量），但不能在每次 re-render 时变化。

## 模式

使用实体唯一标识（如 slug、id）的字符码求和哈希，生成确定性的模拟数据：

```javascript
function hashReadCount(slug) {
  const hash = slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 9000) + 100; // mock range: 100 - 9099
}
```

## 优势

- 同一实体每次渲染显示相同数值
- 无需额外依赖
- 足够简单，生产环境替换为真实 API 时只需删除哈希函数
- 范围可控（通过取模 + 偏移）

## 适用场景

- Demo/原型中的假数据展示
- 等待后端 API 时的前端先行开发
- UI 组件的视觉验证
