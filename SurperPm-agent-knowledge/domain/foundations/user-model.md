---
title: "用户模型"
type: foundation
category: domain
tags: [user, model, database, authentication]

# === Confidence ===
confidence: 1.0
confidence_reason: "已在代码中实现"
last_verified: 2026-06-14

# === Lifecycle ===
created: 2026-06-14
last_accessed: 2026-06-14
access_count: 5
ttl_days: 365
status: active

# === Provenance ===
source: session/add-phone-field-20260614
---

# 用户模型

## 概述

用户（User）是系统的核心实体，代表使用产品的个人。每个用户有唯一的标识符、认证信息和基础资料。

## 决策内容

### 数据模型

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),  -- 可选，国内手机号
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 认证方式

- 使用 email + password 认证
- 密码使用 bcrypt 哈希存储
- 支持 JWT token 认证（有效期 24 小时）

### 字段说明

- `id`: UUID，全局唯一标识符
- `email`: 登录账号，唯一，必填
- `phone`: 国内手机号（可选），格式：`1XX-XXXX-XXXX`
- `name`: 显示名称（可选）
- `created_at/updated_at`: 时间戳，自动维护

## 理由

1. **UUID 而非自增 ID**: 分布式友好，避免枚举攻击
2. **email 作为主登录方式**: 符合行业惯例
3. **phone 可选**: MVP 阶段不强求手机号
4. **JWT 认证**: 无状态，适合微服务架构

## 影响

- 后端 API 需要验证 email 唯一性
- 前端登录表单需要 email + password 输入
- 所有需要用户身份的特性都依赖此模型
- 数据库迁移需要处理现有数据（如果有）

## 相关

- [[../conventions/api-design|API 设计规范]]
- [[../conventions/database-migrations|数据库迁移约定]]
