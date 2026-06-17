---
target: skill:distill
tags: [distill, classification, business-area]
when: "执行 distill summary/auto/dream 时需要决定知识落到哪个领域"
priority: high

# === Lifecycle ===
created: 2026-06-04
last_accessed: 2026-06-04
hit_count: 0
ttl_days: 365
status: active

# === Provenance ===
source: domain/INDEX.md
---

distill 写入 domain/ 前必须做 area 分类：

**关键词 → area 映射表**：

| 关键词 | 落到 |
|--------|------|
| 支付 / 退款 / 对账 / Stripe / 网关 / settlement | `payment/` |
| 拉新 / 留存 / 转化 / 漏斗 / 归因 / A/B | `growth/` |
| 优惠券 / 活动 / 促销 / 大促 / 投放 | `marketing/` |
| 商户 / 入驻 / KYC / 佣金 / 分成 / 卖家 | `merchant/` |
| 反欺诈 / 限流 / 合规 / 审计 / 脱敏 | `risk/` |

**判定流程**：
1. 提取标题 + 首 3 个 heading + 关键术语
2. 匹配上表 → 选对应 area
3. **跨 ≥2 个 area** → 落 `_shared/`
4. 无任何匹配 → 在 PR 描述里 ask reviewer

**type 子目录判定**（在 area 选定后）：
- "几乎不会变"的事实 → `foundations/`
- "团队规则"（新人要遵守）→ `conventions/`
- "当下在做"（3 个月内可能变）→ `context/`

**禁止**：
- ❌ 把文件直接放在 `domain/foundations/` `domain/conventions/` `domain/context/`（顶层）
- ❌ area 选错就 commit（必须先 grep 同名 / 同义文件）
