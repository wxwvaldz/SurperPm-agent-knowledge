---
title: "编码规范"
type: convention
category: domain
tags: [coding, style, python, typescript]

# === Confidence ===
confidence: 1.0
confidence_reason: "已在代码中实现"
last_verified: 2026-06-14

# === Lifecycle ===
created: 2026-06-14
last_accessed: 2026-06-14
access_count: 5
ttl_days: 180
status: active

# === Provenance ===
source: session/add-phone-field-20260614
---

# 编码规范

## 规则

### Python 后端

1. **类型注解**: 所有函数必须有类型注解
2. **命名**: 变量/函数用 `snake_case`，类用 `PascalCase`
3. **文档**: 公共函数需要 docstring（Google 风格）
4. **错误处理**: 使用异常，不返回 None 表示错误

### TypeScript 前端

1. **类型**: 优先使用 interface，避免 any
2. **命名**: 变量/函数用 `camelCase`，组件用 `PascalCase`
3. **组件**: 使用函数组件 + hooks
4. **样式**: 业务组件只组合 `retroui/*`，不写 Tailwind 类（布局除外）

## 示例

### 正确示例

**Python**:
```python
def get_user_by_id(user_id: str) -> User | None:
    """根据用户 ID 获取用户信息。
    
    Args:
        user_id: 用户的 UUID
        
    Returns:
        User 对象，如果不存在返回 None
    """
    return db.query(User).filter(User.id == user_id).first()
```

**TypeScript**:
```typescript
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
}

function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <Card>
      <CardContent>
        <h3>{user.name}</h3>
        <Button onClick={() => onEdit(user)}>编辑</Button>
      </CardContent>
    </Card>
  );
}
```

### 错误示例

**Python** (缺少类型注解):
```python
def get_user(user_id):  # ❌ 缺少类型注解
    return db.query(User).filter(User.id == user_id).first()
```

**TypeScript** (直接写 Tailwind 类):
```typescript
function UserCard({ user }) {  // ❌ 缺少类型定义
  return (
    <div className="bg-yellow-300 border-2 rounded-lg p-4">  // ❌ 不应写 Tailwind 类
      <h3>{user.name}</h3>
    </div>
  );
}
```

## 理由

1. **类型安全**: 减少运行时错误，提高代码可读性
2. **一致性**: 团队代码风格统一，降低 review 成本
3. **可维护性**: 类型注解即文档，降低理解成本

## 执行方式

- **Python**: `ruff check .` (CI 强制)
- **TypeScript**: `pnpm lint` + `pnpm typecheck` (CI 强制)
- **Code Review**: 至少 1 人审批

## 例外情况

- 原型/POC 代码可以放宽类型要求（但需标注 `# POC`）
- 第三方库集成时如无法获取类型，可用 `Any` 但需注释说明
