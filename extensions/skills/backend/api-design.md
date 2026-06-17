---
target: skill:coding
tags: [backend, api, rest, idempotency, security]
when: "写新 API endpoint / 改 API / 加 endpoint"
priority: high

created: 2026-06-14
last_accessed: 2026-06-14
hit_count: 0
ttl_days: 180
status: active

source: session/backend-api-20260614
---

# 后端 API endpoint 强约束

写新 API endpoint / 改 API 必读：

## 必做

1. **RESTful 资源命名**：复数名词 `/users` 不是 `/getUser`
2. **HTTP 方法语义正确**：GET 只读 / PUT 全量 / PATCH 部分 / DELETE 幂等
3. **状态码精准**：201 Created / 204 No Content / 422 Business / 429 Rate Limited
4. **POST 幂等**：必须接受 `Idempotency-Key` header
5. **错误响应统一格式**：含 `code` + `message` + `request_id`
6. **版本号**：URL 路径 `/v1/...` 不在 query 里
7. **列表必分页**：默认 limit ≤50
8. **认证检查**：每个 endpoint 必有 auth middleware

## 必不做

- ❌ 200 OK + body `{"success": false}`（破坏 HTTP 语义）
- ❌ 错误 message 暴露内部（"Could not connect to db at 10.x.x.x"）
- ❌ DELETE 返回大对象（用 204）
- ❌ URL 含动词（`/getUsers`）
- ❌ 无版本号（不可演化）
- ❌ 不分页（崩 DB）

## 安全 checklist

- [ ] 输入校验（SQL injection / XSS / 路径穿越）
- [ ] 鉴权（用户必登 + 权限校验）
- [ ] CSRF 防护（cookie 类）
- [ ] 限流（按用户 / IP）
- [ ] 敏感字段不进日志

## 关联

- 完整 API 设计：`domain/backend/foundations/api-design.md`
- DB 设计：`domain/backend/foundations/database-design.md`
- 并发：`domain/backend/foundations/concurrency-patterns.md`
- 错误处理：`domain/backend/conventions/error-handling.md`
- 日志规范：`domain/backend/conventions/logging-standards.md`
