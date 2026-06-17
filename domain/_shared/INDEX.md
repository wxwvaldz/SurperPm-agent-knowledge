# 共享领域知识索引

> **用途**：适用于所有 goal 的跨领域通用知识。
> **更新日期**：2026-06-04
> **加载方式**：始终加载（在任何业务领域知识之前）

## 结构

| 子目录 | 内容 | TTL |
|--------|------|-----|
| `foundations/` | PMPilot 跨域架构事实 | 365 天 |
| `conventions/` | PMPilot 跨域团队约定 | 180 天 |
| `context/` | PMPilot 跨域当前推进事项 | 60 天 |

## 文件列表

### 基础知识（Foundations）

> `foundations/` 目录尚未创建。待补充跨域架构知识。

### 团队约定（Conventions）

| 文件 | 标题 | 信任度 | 更新日期 |
|------|------|--------|----------|
| `conventions/git-branch-naming.md` | Git 分支命名规范 | 0.9 | 2026-06-04 |
| `conventions/pr-review-protocol.md` | PR 审核流程与 checklist | 0.85 | 2026-06-04 |

### 当前上下文（Context）

| 文件 | 标题 | 信任度 | 更新日期 |
|------|------|--------|----------|
| `context/v07-active-work.md` | v0.7 当前推进事项 | 0.8 | 2026-06-04 |

## 发现规则

**每次** goal 启动时，`find` skill 加载 `_shared/` 下所有文件：

```
加载顺序：
1. _shared/foundations/*.md  （始终读取全文）
2. _shared/conventions/*.md  （超过 10 个文件时按 tags grep）
3. _shared/context/*.md      （仅 status: active 的文件）
```

**预算**：约 500 tokens

## 蒸馏规则

### 何时写入 _shared vs. 业务领域

| 判断问题 | 目标路径 |
|---------|----------|
| 适用于所有业务领域？ | `_shared/` |
| 仅适用于某个领域？ | `<area>/`（如 `payment/`）|
| 全团队级约定？ | `_shared/conventions/` |
| 特定业务领域约定？ | `<area>/conventions/` |

### 示例

**写入 `_shared/foundations/`**：
- "所有 API 必须用 UUID 作主键"
- "数据库 migration 必须可回滚"
- "Git 分支：main ← develop ← feature"

**写入 `<area>/foundations/`**（例：payment）：
- "支付网关对接 Stripe"
- "退款必须校验 Idempotency-Key"
- "结算周期：T+1 到商户"

## 统一 Frontmatter

与 domain 标准相同（见父级 `INDEX.md`）。必填字段 `area: _shared`。

## 反模式

- ❌ 不要在这里写特定领域的知识（应放 `<area>/`）
- ❌ 不要重复 — 如果业务领域已存在，不要再加到 _shared
- ✅ 适用于 **2 个或以上**领域的知识才写在这里
