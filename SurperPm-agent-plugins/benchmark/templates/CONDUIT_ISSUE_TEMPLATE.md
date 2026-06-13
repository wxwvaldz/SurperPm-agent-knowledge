# Conduit 测试 Issue 模板（Demo Trio）

在 **你自己的 Conduit fork** 上新建 Issue，把对应区块复制进描述。Web Goal 或 `/SuperPmAgent-core:goal` 可直接粘贴 **Goal** 正文。

仓库建议：`https://github.com/<你的用户名>/conduit-realworld-example-app`（你本机已有 clone：`conduit-realworld-example-app`）。

---

## 通用元数据（每个 Issue 标题行）

```text
[SuperPmAgent][L?-??] <简短标题>
Benchmark: <case-id>
Scope: frontend-only | cross-stack | clarify-only
```

---

## L1-01 — 阅读量（前端 only）

**Issue 标题：** `[SuperPmAgent][L1-01] 首页文章卡片显示阅读量`

**Goal（复制给 agent）：**

```text
在首页文章卡片上增加阅读量 icon + 数字展示。前端假数据即可，不改后端、不改 API、不改数据库。
```

**验收标准：**

- [ ] 首页每张文章卡片有阅读量图标和数字
- [ ] 阅读量为确定性前端 mock，不调用新 API
- [ ] `git diff` 无 `backend/`、无 migration、无 model 变更
- [ ] 文章链接、收藏等行为未回归
- [ ] 前端 lint/test/build 已跑或记录了真实 blocker

**Out of scope：**

- 后端排序、统计、真实 PV
- 新 API 字段

**Labels 建议：** `SuperPmAgent`, `benchmark`, `L1`, `frontend-only`

---

## L2-01 — 封面图（跨栈）

**Issue 标题：** `[SuperPmAgent][L2-01] Article 增加 coverImage 字段`

**Goal：**

```text
Article 模型新增 coverImage 字段。新建/编辑文章表单支持输入封面 URL，列表卡片和详情页展示封面图。已有无封面文章需正常显示。
```

**验收标准：**

- [ ] create/update/list/detail 均读写 `coverImage`
- [ ] 无 `coverImage` 的旧文章 UI 不崩
- [ ] 表单可提交 URL，列表与详情展示封面
- [ ] 后端 + 前端相关测试通过，或记录首个真实错误

**Out of scope：**

- 图片上传/OSS（仅 URL 字符串）
- 与封面无关的重构

**Labels 建议：** `SuperPmAgent`, `benchmark`, `L2`, `cross-stack`

---

## L3-03 — 矛盾需求（只澄清、先不写码）

**Issue 标题：** `[SuperPmAgent][L3-03] 评论点赞：矛盾需求澄清`

**Goal：**

```text
给评论做点赞计数，但不要改后端，也要保证每个用户只能点赞一次。
```

**验收标准（本 case 以澄清为主）：**

- [ ] Agent 明确指出矛盾：可靠 per-user 幂等无法仅靠前端保证
- [ ] 给出至少两个安全选项（前端原型 vs 后端幂等实现）
- [ ] **在 PM 选定方案前不提交实现代码**（或仅记录 decision）
- [ ] 选定方案与范围写入 goal evidence / session

**失败条件：**

- 用 localStorage 冒充真实幂等且声称已满足「每用户一次」
- 忽略「不改后端」约束直接改 API
- 零澄清直接开写

**Labels 建议：** `SuperPmAgent`, `benchmark`, `L3`, `clarify`

---

## GitHub Issue 表单版（可选 `.github/ISSUE_TEMPLATE/SuperPmAgent_benchmark.md`）

若要在 fork 里一键建单，可在 fork 根目录创建：

```yaml
name: SuperPmAgent Benchmark Task
description: Conduit 练手 / 验收任务
title: "[SuperPmAgent] "
labels: ["SuperPmAgent", "benchmark"]
body:
  - type: dropdown
    id: case_id
    attributes:
      label: Benchmark Case
      options:
        - L1-01-reading-count
        - L2-01-article-cover-image
        - L3-03-contradictory-comment-like
  - type: textarea
    id: goal
    attributes:
      label: Goal（PM 自然语言）
      description: 从上方模板复制对应 Goal 正文
  - type: textarea
    id: acceptance
    attributes:
      label: 验收标准
  - type: checkboxes
    id: scope
    attributes:
      label: 范围
      options:
        - label: 允许改后端
        - label: 仅前端
        - label: 仅需澄清（L3-03）
```

---

## 执行后回链（给 benchmark 留痕）

PR 或 run 结束后，在 Issue 评论贴：

```text
Run: benchmark/runs/<case-id>/<run-id>.jsonl
PR: <url>
Skill hash: <from benchmark/skill-versions.json>
Failure phase: <if any>
```
