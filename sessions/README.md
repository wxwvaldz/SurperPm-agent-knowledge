# sessions/

按 topic（会话主题）组织，每个 goal 一个文件。

## 结构（v0.8）

```
sessions/
├── topic-<id>-<slug>/           ← 一个 topic 一个目录（来自 .logs/topics.jsonl）
│   ├── INDEX.md                 ← topic 概览 + goals 列表
│   └── goal-<id>-<slug>.md      ← 一个 goal 一个文件（澄清事实 + decisions + scope + 执行结果）
└── archive/                     ← 归档的 topic
```

## 要点

- **对话来源**：`.logs/discussions/<topic_id>.jsonl`（唯一来源，sessions/ 不存对话）
- **goal 文件**：存澄清后的精华（facts / decisions / scope / execution result），不是对话副本
- **蒸馏输入**：distill 读 goal 文件 + .logs/ 对话 → 产出写 `domain/`
- **跨天 goal**：自然支持——goal 文件在 topic 目录下，不按日期归属
- **归档单位**：topic 目录（所有 goal 完成 + distilled + 90 天无 access）

详见 `INDEX.md`。
