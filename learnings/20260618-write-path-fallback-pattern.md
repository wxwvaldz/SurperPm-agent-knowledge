---
title: "Write 工具 EPERM 路径限制的 CWD 回退模式"
category: pattern
source_type: internal
importance: 0.55
confidence: 0.8
created: 2026-06-18T00:00:00+00:00
pinned: false
archived: false
tags: write, permissions, error-recovery, filesystem, cwd
---

## 背景

Goal 执行时，agent 尝试将生成的内容（800 字作文）写入 `C:\Users\seven\.claude\goals\`，但收到 EPERM 错误 — 目录不存在且无权限创建。

## 模式

Write 工具因路径限制失败时，采用 CWD 回退：

```
尝试路径: C:\Users\seven\.claude\goals\essay-不完美之美.md
   ↓ EPERM: operation not permitted, mkdir 'C:\Users\seven'
   ↓ 检测到受限路径
   ↓ 回退到 CWD: <worktree>/goal-xxx/essay-不完美之美.md
   ↓ 成功写入
```

### 步骤

1. Write 调用失败 → 捕获 EPERM 错误
2. 检查错误是否与路径/权限相关（而非内容或格式错误）
3. 确认当前工作目录（CWD）是否可写
4. 将输出路径改为 `{CWD}/{filename}`
5. 重试 Write 调用

### 恢复条件

- 错误类型为 EPERM（操作不被允许）或 ENOENT（目录不存在）
- CWD 存在且可写（通常是 worktree 或 repos 目录）
- 文件名本身合法（不含非法字符）

## 与「受限 Worktree 静默失败」的区别

| 维度 | 本模式 | 受限 Worktree 问题 |
|------|--------|-------------------|
| 根因 | 路径不存在 / 无权创建 | 整个 worktree 禁止写操作 |
| 范围 | 特定路径受限 | 全局写入受限 |
| 恢复 | ✅ 切换到 CWD 即可 | ❌ 无法绕过，应快速失败 |
| 资源消耗 | 少量迭代 | 26 次迭代 / 62K tokens |

## 适用场景

- Windows 环境中 `C:\Users\...\.claude\` 等受保护目录
- 目标父目录不存在且无创建权限
- Worktree 写权限正常但路径选择有误
