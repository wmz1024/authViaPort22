# 系统架构文档

## 概览

本项目实现了一个基于 SSH 公钥的认证系统，由两个独立的服务组成：

1. **SSH 认证服务** (`auth-ssh-service.js`) - 独立的认证服务
2. **Demo 应用** (`demo-app.js`) - 完整的应用示例

## 架构设计原则

### 服务分离

SSH 认证服务和业务应用完全分离，这样设计的好处：

- **可复用性**: SSH 认证服务可以被多个应用使用
- **独立部署**: 两个服务可以部署在不同的服务器
- **灵活扩展**: 可以独立升级和扩展各个服务
- **安全隔离**: 认证逻辑与业务逻辑分离

## 系统组件

```
┌─────────────────────────────────────────────────────────────┐
│                    用户终端 / 浏览器                         │
│  - SSH 客户端 (ssh command)                                 │
│  - Web 浏览器 (HTTP/HTTPS)                                  │
└────────────┬──────────────────────────────┬─────────────────┘
             │                              │
             │ SSH (port 2222)              │ HTTP (port 4000)
             │                              │
             ▼                              ▼
┌────────────────────────┐     ┌────────────────────────────┐
│  SSH 认证服务           │     │  Demo 应用                  │
│  (auth-ssh-service.js) │◄────┤  (demo-app.js)             │
│                        │HTTP │                            │
│  ┌──────────────────┐  │     │  ┌──────────────────────┐  │
│  │ SSH Server       │  │     │  │ Express Server       │  │
│  │ - Port: 2222     │  │     │  │ - Port: 4000         │  │
│  │ - Extract PubKey │  │     │  │ - User Management    │  │
│  └──────────────────┘  │     │  │ - Password Login     │  │
│                        │     │  │ - SSH Login          │  │
│  ┌──────────────────┐  │     │  │ - JWT Auth           │  │
│  │ HTTP API Server  │  │     │  └──────────────────────┘  │
│  │ - Port: 3000     │  │     │                            │
│  │ - Generate Code  │  │     │  ┌──────────────────────┐  │
│  │ - Verify Status  │  │     │  │ JSON Database        │  │
│  └──────────────────┘  │     │  │ (users.json)         │  │
│                        │     │  └──────────────────────┘  │
│  ┌──────────────────┐  │     │                            │
│  │ Code Storage     │  │     │  ┌──────────────────────┐  │
│  │ (In-Memory Map)  │  │     │  │ Static Files         │  │
│  └──────────────────┘  │     │  │ (public/index.html)  │  │
└────────────────────────┘     └────────────────────────────┘
         Port 3000                      Port 4000
```

## 数据流

### 1. SSH 登录完整流程

```
步骤 1: 用户请求 SSH 登录
  浏览器 → Demo 应用: POST /login/ssh/init {username}
  
步骤 2: Demo 应用请求验证码
  Demo 应用 → SSH 认证服务: POST /api/auth/generate-code
  
步骤 3: SSH 认证服务生成验证码
  SSH 认证服务:
    - 生成随机验证码 (a1b2c3d4)
    - 存储到内存 Map
    - 设置过期时间 (5分钟)
  
步骤 4: 返回验证码
  SSH 认证服务 → Demo 应用:
    {code: "a1b2c3d4", sshCommand: "ssh a1b2c3d4@...", expiresAt: ...}
  
步骤 5: Demo 返回 SSH 命令给前端
  Demo 应用 → 浏览器:
    {sessionId: "uuid", sshCommand: "ssh a1b2c3d4@localhost -p 2222"}
  
步骤 6: 前端显示 SSH 命令
  浏览器显示: "请在终端执行: ssh a1b2c3d4@localhost -p 2222"
  
步骤 7: 前端开始轮询
  浏览器 → Demo 应用: GET /login/ssh/poll/uuid (每2秒)
  
步骤 8: Demo 查询认证状态
  Demo 应用 → SSH 认证服务: GET /api/auth/verify/a1b2c3d4
  
步骤 9: 用户在终端执行 SSH 命令
  用户终端 → SSH 认证服务: ssh a1b2c3d4@localhost -p 2222
  
步骤 10: SSH 服务器处理连接
  SSH 认证服务:
    - 接收公钥认证请求
    - 验证用户名 (a1b2c3d4) 是否存在
    - 提取用户公钥
    - 存储公钥到验证码记录
    - 标记状态为 "success"
    - 返回欢迎消息
    - 断开连接
  
步骤 11: 轮询获取到公钥
  SSH 认证服务 → Demo 应用:
    {status: "success", publicKey: "ssh-rsa AAAA..."}
  
步骤 12: Demo 验证公钥
  Demo 应用:
    - 从数据库查询用户的 SSH 公钥列表
    - 比对接收到的公钥
    - 匹配成功生成 JWT token
  
步骤 13: 返回登录成功
  Demo 应用 → 浏览器:
    {status: "success", token: "jwt-token", user: {...}}
  
步骤 14: 前端完成登录
  浏览器:
    - 保存 token 到 localStorage
    - 跳转到仪表板
```

### 2. 密码登录流程

```
用户输入 → 前端验证 → Demo 应用验证 → bcrypt 比对 → 生成 JWT → 返回 token
```

### 3. 添加 SSH 公钥流程

```
用户粘贴公钥 → 前端验证格式 → Demo 应用验证 → 保存到数据库 → 返回成功
```

## 数据模型

### SSH 认证服务 - 内存存储

```javascript
Map<code, {
  status: 'pending' | 'success' | 'expired',
  expiresAt: timestamp,
  publicKey: string | null,
  createdAt: timestamp
}>
```

**示例：**
```javascript
{
  "a1b2c3d4": {
    status: "success",
    expiresAt: 1698765432000,
    publicKey: "ssh-rsa AAAAB3NzaC1yc2E...",
    createdAt: 1698765132000
  }
}
```

### Demo 应用 - JSON 数据库

```json
{
  "users": [
    {
      "id": "uuid-v4",
      "username": "alice",
      "password": "bcrypt-hash",
      "sshKeys": [
        {
          "id": "uuid-v4",
          "name": "My Laptop",
          "publicKey": "ssh-rsa AAAAB3...",
          "addedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## API 接口设计

### SSH 认证服务 API

| 端点 | 方法 | 说明 | 状态码 |
|------|------|------|--------|
| `/api/auth/generate-code` | POST | 生成验证码 | 200 |
| `/api/auth/verify/:code` | GET | 查询验证状态 | 200 |
| `/health` | GET | 健康检查 | 200 |
| `/` | GET | API 文档 | 200 |

### Demo 应用 API

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/register` | POST | ❌ | 用户注册 |
| `/login/password` | POST | ❌ | 密码登录 |
| `/login/ssh/init` | POST | ❌ | 初始化 SSH 登录 |
| `/login/ssh/poll/:sessionId` | GET | ❌ | 轮询 SSH 登录状态 |
| `/user/me` | GET | ✅ | 获取当前用户 |
| `/user/ssh-keys` | GET | ✅ | 获取 SSH 公钥列表 |
| `/user/ssh-keys` | POST | ✅ | 添加 SSH 公钥 |
| `/user/ssh-keys/:id` | DELETE | ✅ | 删除 SSH 公钥 |
| `/health` | GET | ❌ | 健康检查 |

## 安全机制

### 1. 验证码安全

- **随机生成**: 使用 crypto.randomBytes 生成
- **时效性**: 5 分钟自动过期
- **一次性**: 使用后立即删除
- **定期清理**: 每分钟清理过期验证码

### 2. 密码安全

- **Bcrypt 加密**: 使用 bcrypt 加密存储
- **加密轮数**: 默认 10 轮
- **永不明文**: 密码永不以明文存储或传输

### 3. Token 安全

- **JWT 认证**: 使用 JSON Web Token
- **有效期**: 24 小时
- **Bearer 认证**: HTTP Authorization header

### 4. SSH 安全

- **公钥认证**: 只支持公钥认证，不接受密码
- **自动断开**: 认证完成后立即断开
- **主机密钥**: 自动生成和管理 RSA 主机密钥

### 5. 输入验证

- **用户名**: 至少 3 个字符
- **密码**: 至少 6 个字符
- **SSH 公钥**: 格式验证（ssh-rsa、ssh-ed25519 等）

## 扩展性

### 水平扩展

**SSH 认证服务：**
- 使用 Redis 替代内存 Map 存储验证码
- 支持多实例部署
- 使用负载均衡器分发请求

**Demo 应用：**
- 使用真实数据库（MySQL、PostgreSQL）
- Session 存储到 Redis
- 无状态设计，支持多实例

### 功能扩展

1. **多因素认证 (MFA)**
   - SSH + TOTP
   - SSH + 短信验证

2. **审计日志**
   - 记录所有认证尝试
   - 登录历史追踪

3. **WebSocket 支持**
   - 实时推送认证状态
   - 替代轮询机制

4. **OAuth 集成**
   - GitHub SSH 密钥导入
   - GitLab SSH 密钥同步

## 性能考虑

### 并发处理

- **SSH 连接**: 异步处理，支持数千并发
- **HTTP 请求**: Express 异步处理
- **轮询优化**: 前端 2 秒轮询间隔

### 内存管理

- **验证码存储**: 每个约 1KB
- **自动清理**: 定期清理过期数据
- **建议上限**: 10000 个并发验证码

### 网络优化

- **CORS**: 支持跨域请求
- **压缩**: 使用 gzip 压缩
- **CDN**: 静态资源 CDN 分发

## 监控和日志

### 日志级别

- **INFO**: 正常操作（生成验证码、登录成功）
- **WARN**: 警告信息（验证失败、公钥不匹配）
- **ERROR**: 错误信息（服务启动失败、数据库错误）

### 监控指标

- 活跃验证码数量
- 认证成功率
- 平均认证时间
- API 响应时间

## 部署架构

### 开发环境

```
localhost:2222 (SSH 认证服务 - SSH)
localhost:3000 (SSH 认证服务 - API)
localhost:4000 (Demo 应用)
```

### 生产环境

```
┌──────────────┐
│  Nginx       │
│  (80/443)    │
└──────┬───────┘
       │
       ├─── auth.example.com → localhost:3000
       └─── app.example.com  → localhost:4000

SSH: login.example.com:22 → SSH 认证服务
```

## 技术栈

### 后端

- **Node.js**: >= 14.0.0
- **Express**: Web 框架
- **ssh2**: SSH 服务器实现
- **bcrypt**: 密码加密
- **jsonwebtoken**: JWT 认证
- **uuid**: UUID 生成

### 前端

- **原生 JavaScript**: 无框架依赖
- **Fetch API**: HTTP 请求
- **LocalStorage**: Token 存储

### 工具

- **PM2**: 进程管理
- **Nginx**: 反向代理
- **Git**: 版本控制

## 最佳实践

1. **环境变量**: 使用 .env 文件管理配置
2. **错误处理**: 完善的错误处理和日志
3. **输入验证**: 严格的输入验证
4. **安全头部**: 设置安全相关的 HTTP 头部
5. **HTTPS**: 生产环境必须使用 HTTPS
6. **备份**: 定期备份用户数据
7. **更新**: 及时更新依赖包

---

**设计理念**: 简单、安全、可扩展

