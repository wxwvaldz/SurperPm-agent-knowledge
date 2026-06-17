---
target: skill:coding
tags: [tdd, testing, business-logic]
when: "开发业务功能、改核心模块（payment/risk）、写新的 API endpoint"
priority: high

# === Lifecycle ===
created: 2026-06-14
last_accessed: 2026-06-14
hit_count: 0
ttl_days: 180
status: active

# === Provenance ===
source: profiles/users/bob-wang.md
author: bob-wang
---

调用 coding skill 时必须遵守 TDD（Bob 团队强约束）：

1. **先写 failing test**：在写实现前，必须先在 `<module>.test.ts` / `test_<module>.py` 添加一个**红色**的测试用例
2. **断言可读**：用 `expect(x).toBe(y)` / `assert x == y`，禁止裸 `assert(condition)`
3. **测试边界**：null / 0 / 空集合 / 超大输入 / 并发 — 至少覆盖 2 个边界场景
4. **支付/风控模块**：每个写操作必须有 idempotency 测试
5. **输出格式**：每个改动文件后附 `<file>:<line>` 链接，方便 review
