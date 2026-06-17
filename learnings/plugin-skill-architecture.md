---
title: "Plugin/Skill 正确的使用方式"
category: decision
importance: 0.9
confidence: 0.95
created: 2026-06-03
tags: [architecture, plugin, skill, agent]
pinned: true
archived: false
---

## 决策

Agent 只通过 Plugin 系统获取能力，后端不做编排。

## 正确做法

- 后端调用 Claude SDK 启动 agent + 加载 plugin
- Agent 自己读取 plugin 的 command/skill 定义并执行
- 所有业务逻辑写在 plugin 的 SKILL.md / command.md 中

## 错误做法（已删除）

- 后端 Python 代码硬编码 agent 的对话逻辑（如 clarify_agent.py 原来的 500 行）
- 后端手动构建 prompt 塞入合约文件内容
- 后端 `discuss_session.py` 编排对话流
