---
target: skill:coding
tags: [style, naming, refactor]
when: "重构、code review、新建模块"
priority: medium

# === Lifecycle ===
created: 2026-06-04
last_accessed: 2026-06-04
hit_count: 0
ttl_days: 365
status: active

# === Provenance ===
source: domain/_shared/conventions/coding-standards.md
---

代码风格强约束（团队级）：

1. **函数 ≤50 行**，超过先抽函数；类 ≤300 行，超过拆模块
2. **命名**：业务字段中英对齐（如 `merchant_tier` ↔ 商户分层），禁止缩写（`mt`）
3. **注释**：解释 WHY 不解释 WHAT；禁止 docstring 写多段
4. **错误处理**：内部模块互调用不做防御性 try/catch；只在**系统边界**（HTTP/MQ/DB）做
5. **避免**：feature flag 残留、`// TODO: remove`、`if False:` 死代码
