---
target: skill:coding
tags: [frontend, react, component, typescript]
when: "写新 React 组件 / 改组件 props / 加 hooks"
priority: high

created: 2026-06-04
last_accessed: 2026-06-04
hit_count: 0
ttl_days: 180
status: active

source: session/frontend-redesign-20260604
---

# React 组件强约束

写新组件 / 改组件 props / 加 hooks 时必读：

## 必做

1. **TS 接口必填**：禁止 `any`，props 用 interface
2. **Props 默认值**：用解构默认值 `{ foo = 'bar' }` 而非 defaultProps
3. **回调命名 `on<Event>`**：onClick / onChange / onSubmit
4. **key 必填且稳定**：`key={item.id}`，禁止 `key={index}` 或 random
5. **hook 依赖必准**：用 `eslint-plugin-react-hooks` 强制
6. **错误边界**：每独立路由用 `<ErrorBoundary>` 包

## 必不做

- ❌ 上帝组件（单文件 >300 行 → 拆）
- ❌ Prop drilling >3 层（用 context 或状态提升）
- ❌ inline function 在 hot path（每次 render 新引用）
- ❌ `<button>` 漏 `type="button"`（form 内默认 submit 会刷新页面）
- ❌ `dangerouslySetInnerHTML` 不消毒

## 性能默认值

- 列表 >100 项 → 用 `react-window` 虚拟滚动
- 大列表的 child 组件 → 用 `React.memo`
- 重计算 derive → 用 `useMemo`
- 传给 memo 组件的回调 → 用 `useCallback`

但**先 profile 再优化**，反对到处 memo（浅比较本身有成本）。

## 关联

- 完整组件架构：`domain/frontend/foundations/component-architecture.md`
- 状态管理决策：`domain/frontend/foundations/state-management.md`
- 性能优化：`domain/frontend/foundations/performance-optimization.md`
- React 最佳实践：`domain/frontend/conventions/react-best-practices.md`
- 可访问性：`domain/frontend/conventions/accessibility-rules.md`
