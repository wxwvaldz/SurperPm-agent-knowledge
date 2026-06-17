---
target: mcp:feishu-doc
tags: [feishu, prd, parsing, noise-removal]
when: "拉取飞书 PRD/需求文档，目录页噪音大、富文本表情多"
priority: high

# === Lifecycle ===
created: 2026-06-04
last_accessed: 2026-06-04
hit_count: 0
ttl_days: 180
status: active

# === Provenance ===
source: session/distill-feishu-noise-20260530
---

调用 feishu-doc MCP 后必做的清洗：

1. **去目录页**：丢弃前 2 屏「H2 列表 + 无段落正文」
2. **保留 H1/H2，压平 H3+**：H3 及以下标题转为段落（避免层级噪音）
3. **丢弃富文本干扰**：飞书表情图标、@提醒块、内嵌评论一律剥离
4. **章节分块**：按 H1 分块，单块 ≤800 字符，超长按 H2 切
5. **输出 schema**：返回 `[{"title": "<h1>", "body": "<800字内>"}, ...]`
6. **如果文档体量过大**：先返回各 H1 标题列表让用户选感兴趣的章节再细读
