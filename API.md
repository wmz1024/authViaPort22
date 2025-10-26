# SSH 认证服务 API 文档

## 概述

SSH 认证服务是一个独立的认证服务，通过 SSH 公钥验证用户身份。该服务提供两个核心 HTTP API 接口，可被任何应用集成使用。

**服务特点：**
- 独立部署，与业务应用分离
- 基于真实 SSH 服务器实现
- 临时验证码机制，安全可靠
- RESTful API 设计，易于集成

## 服务配置

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SSH_PORT` | 2222 | SSH 服务器监听端口（生产环境使用 22） |
| `HTTP_PORT` | 3000 | HTTP API 服务端口 |
| `SSH_HOST` | login.via.ssh.iscar.net | SSH 服务器域名/IP |

### 启动服务

```bash
# 使用默认配置
node auth-ssh-service.js

# 使用自定义配置
SSH_PORT=22 HTTP_PORT=3000 SSH_HOST=login.example.com node auth-ssh-service.js
```

**注意：** 在 Windows 上使用端口 22 需要管理员权限。

---

## API 端点

### 基础信息

- **Base URL**: `http://localhost:3000`
- **内容类型**: `application/json`
- **字符编码**: UTF-8

---

## 1. 生成临时验证码

生成一个临时的 SSH 验证码，用户将使用此验证码作为 SSH 用户名进行连接。

### 请求

```http
POST /api/auth/generate-code
Content-Type: application/json
```

**请求体：**

```json
{
  "purpose": "登录到系统 - 用户: alice"
}
```

**请求字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `purpose` | string | 否 | 鉴权用途说明，将在用户SSH连接时显示 |

### 响应

**成功响应 (200 OK):**

```json
{
  "success": true,
  "code": "a1b2c3d4",
  "expiresAt": 1698765432000,
  "expiresIn": 300000,
  "sshCommand": "ssh a1b2c3d4@login.via.ssh.iscar.net -p 2222",
  "purpose": "登录到系统 - 用户: alice"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 操作是否成功 |
| `code` | string | 临时验证码（8位随机字符串） |
| `expiresAt` | number | 过期时间戳（毫秒） |
| `expiresIn` | number | 有效期（毫秒，默认 5 分钟） |
| `sshCommand` | string | 完整的 SSH 连接命令 |
| `purpose` | string | 鉴权用途说明 |

### 示例

**cURL:**

```bash
curl -X POST http://localhost:3000/api/auth/generate-code \
  -H "Content-Type: application/json" \
  -d '{"purpose": "登录到系统 - 用户: alice"}'
```

**JavaScript (fetch):**

```javascript
const response = await fetch('http://localhost:3000/api/auth/generate-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    purpose: '登录到系统 - 用户: alice'
  })
});
const data = await response.json();
console.log('SSH 命令:', data.sshCommand);
console.log('用途:', data.purpose);
```

**Node.js (axios):**

```javascript
const axios = require('axios');

const { data } = await axios.post('http://localhost:3000/api/auth/generate-code', {
  purpose: '登录到系统 - 用户: alice'
});
console.log('验证码:', data.code);
console.log('用途:', data.purpose);
```

---

## 2. 验证码状态查询

查询验证码的状态并获取用户的 SSH 公钥（如果用户已连接）。

### 请求

```http
GET /api/auth/verify/:code
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 之前生成的验证码 |

### 响应

#### 2.1 等待连接状态

```json
{
  "success": true,
  "status": "pending",
  "message": "等待用户SSH连接",
  "expiresAt": 1698765432000,
  "remainingTime": 245000
}
```

#### 2.2 等待用户确认状态

```json
{
  "success": true,
  "status": "authenticating",
  "message": "等待用户确认鉴权请求",
  "expiresAt": 1698765432000,
  "remainingTime": 240000
}
```

#### 2.3 验证成功状态

```json
{
  "success": true,
  "status": "success",
  "publicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC...",
  "message": "认证成功"
}
```

**注意：** 验证成功后，验证码会被自动删除，再次查询将返回无效状态。

#### 2.4 验证码过期

```json
{
  "success": false,
  "status": "expired",
  "message": "验证码已过期"
}
```

#### 2.5 验证码不存在

```json
{
  "success": false,
  "status": "invalid",
  "message": "验证码不存在"
}
```

#### 2.6 用户拒绝鉴权

```json
{
  "success": false,
  "status": "denied",
  "message": "用户拒绝了鉴权请求"
}
```

**状态说明：**

| 状态 | 说明 |
|------|------|
| `pending` | 等待用户 SSH 连接 |
| `authenticating` | 用户已连接，等待确认鉴权请求 |
| `success` | 用户已成功连接并确认，公钥已捕获 |
| `denied` | 用户拒绝了鉴权请求 |
| `expired` | 验证码已过期（超过 5 分钟） |
| `invalid` | 验证码不存在或已被使用 |

### 轮询建议

- 轮询间隔：**2-3 秒**
- 最大轮询时间：**5 分钟**（验证码有效期）
- 收到 `success`、`denied`、`expired` 或 `invalid` 状态后停止轮询

### 示例

**cURL:**

```bash
curl http://localhost:3000/api/auth/verify/a1b2c3d4
```

**JavaScript (轮询示例):**

```javascript
async function pollAuthStatus(code) {
  const maxAttempts = 150; // 5分钟 / 2秒
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(`http://localhost:3000/api/auth/verify/${code}`);
        const data = await response.json();
        
        if (data.status === 'success') {
          clearInterval(interval);
          resolve(data.publicKey);
        } else if (data.status === 'expired' || data.status === 'invalid') {
          clearInterval(interval);
          reject(new Error(data.message));
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('轮询超时'));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 2000);
  });
}

// 使用示例
try {
  const publicKey = await pollAuthStatus('a1b2c3d4');
  console.log('获取到公钥:', publicKey);
} catch (error) {
  console.error('认证失败:', error.message);
}
```

---

## 3. 健康检查

检查服务是否正常运行。

### 请求

```http
GET /health
```

### 响应

```json
{
  "success": true,
  "service": "SSH Authentication Service",
  "status": "running",
  "timestamp": 1698765432000,
  "activeCodes": 3
}
```

---

## 工作流程

### 完整认证流程

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  应用服务器  │         │  SSH 认证服务     │         │   用户终端   │
└──────┬──────┘         └────────┬─────────┘         └──────┬──────┘
       │                         │                          │
       │  1. POST /generate-code │                          │
       │    (含 purpose)         │                          │
       │────────────────────────>│                          │
       │                         │                          │
       │  2. 返回验证码和SSH命令   │                          │
       │<────────────────────────│                          │
       │                         │                          │
       │  3. 将SSH命令展示给用户   │                          │
       │──────────────────────────────────────────────────>│
       │                         │                          │
       │                         │  4. SSH 连接              │
       │                         │<─────────────────────────│
       │                         │                          │
       │                         │  5. 提取公钥并显示用途      │
       │                         │                          │
       │                         │  6. 要求用户确认 (y/n)     │
       │                         │─────────────────────────>│
       │                         │                          │
       │                         │  7. 用户输入 y 确认        │
       │                         │<─────────────────────────│
       │                         │                          │
       │                         │  8. 存储公钥              │
       │                         │                          │
       │                         │  9. 返回成功消息          │
       │                         │─────────────────────────>│
       │                         │                          │
       │  10. GET /verify/:code  │                          │
       │────────────────────────>│                          │
       │                         │                          │
       │  11. 返回公钥            │                          │
       │<────────────────────────│                          │
       │                         │                          │
       │  12. 验证公钥并完成登录   │                          │
       │                         │                          │
```

### 集成步骤

1. **调用生成验证码接口**
   - 传递 `purpose` 参数说明鉴权用途
   - 向用户展示 SSH 连接命令
   
2. **开始轮询验证状态**
   - 每 2 秒查询一次验证码状态
   
3. **用户执行 SSH 命令**
   - 用户在终端执行提供的 SSH 命令
   - SSH 服务器提取公钥并显示鉴权用途
   
4. **用户确认鉴权**
   - 系统显示鉴权用途和安全提示
   - 用户输入 `y` 同意或其他字符拒绝
   - 拒绝将返回 `denied` 状态
   
5. **获取公钥**
   - 用户确认后，轮询接口返回 `success` 状态和公钥
   - 如果用户拒绝，返回 `denied` 状态
   
6. **验证公钥**
   - 应用服务器比对公钥与数据库中存储的公钥
   - 匹配成功则完成认证

---

## 集成示例

### Express.js 集成示例

```javascript
import express from 'express';

const app = express();
const AUTH_SERVICE_URL = 'http://localhost:3000';

// 初始化 SSH 登录
app.post('/login/ssh/init', async (req, res) => {
  const { username } = req.body;
  
  // 从数据库查询用户
  const user = await db.findUser(username);
  if (!user || user.sshKeys.length === 0) {
    return res.status(400).json({ error: '用户不存在或未添加SSH公钥' });
  }
  
  // 调用 SSH 认证服务
  const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/generate-code`, {
    method: 'POST'
  });
  const authData = await response.json();
  
  // 创建会话
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    username,
    code: authData.code,
    expiresAt: authData.expiresAt
  });
  
  res.json({
    sessionId,
    sshCommand: authData.sshCommand
  });
});

// 轮询 SSH 登录状态
app.get('/login/ssh/poll/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  // 查询验证状态
  const response = await fetch(
    `${AUTH_SERVICE_URL}/api/auth/verify/${session.code}`
  );
  const authResult = await response.json();
  
  if (authResult.status === 'success') {
    // 验证公钥
    const user = await db.findUser(session.username);
    const isValid = user.sshKeys.some(
      key => key.publicKey === authResult.publicKey
    );
    
    if (isValid) {
      const token = generateJWT(user);
      sessions.delete(req.params.sessionId);
      return res.json({ success: true, token });
    }
  }
  
  res.json({ status: authResult.status });
});
```

---

## 安全建议

1. **HTTPS 部署**
   - 生产环境必须使用 HTTPS
   - 使用反向代理（如 Nginx）配置 SSL 证书

2. **验证码管理**
   - 验证码使用后立即删除
   - 定期清理过期验证码
   - 限制同一用户生成验证码的频率

3. **公钥验证**
   - 应用侧必须验证公钥的有效性
   - 比对公钥时使用严格的字符串匹配
   - 记录所有认证尝试

4. **网络安全**
   - SSH 端口应限制访问来源
   - 使用防火墙规则保护服务
   - 启用 DDoS 防护

5. **监控和日志**
   - 记录所有 API 调用
   - 监控异常认证尝试
   - 设置告警机制

---

## 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "status": "error",
  "message": "错误描述"
}
```

---

## 性能和限制

- **并发连接**: 支持数千个并发验证码
- **验证码有效期**: 5 分钟
- **建议轮询间隔**: 2-3 秒
- **内存占用**: 每个验证码约 1KB

---

## 常见问题

### Q: 为什么 SSH 连接后立即断开？

A: 这是正常行为。SSH 服务器在提取公钥后会自动断开连接，无需保持会话。

### Q: 可以修改验证码有效期吗？

A: 可以，在 `auth-ssh-service.js` 中修改 `CODE_EXPIRY` 常量。

### Q: 支持其他类型的 SSH 密钥吗？

A: 支持所有标准 SSH 密钥类型：RSA、Ed25519、ECDSA。

### Q: 如何在生产环境部署？

A: 建议使用 PM2 等进程管理器，配置 Nginx 反向代理，使用域名和 SSL 证书。

---

## 技术支持

如有问题或建议，请参考项目 README 或提交 Issue。

