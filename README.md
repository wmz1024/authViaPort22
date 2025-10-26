# SSH 密钥认证系统

一个基于 SSH 公钥验证的现代化认证解决方案，提供独立的 SSH 认证服务和完整的 Demo 应用。

## 🌟 特性

- **SSH 公钥认证**: 通过 SSH 连接验证用户身份，无需记忆复杂密码
- **临时验证码**: 安全的一次性验证码机制，5 分钟自动过期
- **独立服务**: SSH 认证服务与业务应用分离，可独立部署和集成
- **完整 Demo**: 提供用户注册、登录、SSH 公钥管理的完整示例
- **现代化界面**: 美观的 Web 界面，良好的用户体验
- **易于集成**: RESTful API 设计，提供详细的集成文档

## 📋 目录

- [快速开始](#快速开始)
- [系统架构](#系统架构)
- [使用指南](#使用指南)
- [API 文档](#api-文档)
- [配置说明](#配置说明)
- [部署指南](#部署指南)
- [常见问题](#常见问题)

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm 或 yarn
- SSH 客户端（系统自带或 OpenSSH）

### 安装依赖

```bash
npm install
```

### 启动服务

#### 方式一：分别启动（推荐用于开发）

```bash
# 终端 1 - 启动 SSH 认证服务
npm run start:auth

# 终端 2 - 启动 Demo 应用
npm run start:demo
```

#### 方式二：同时启动

```bash
npm run start:both
```

### 访问应用

- **Demo 应用**: http://localhost:4000
- **SSH 认证服务 API**: http://localhost:3000

### Windows 端口 22 权限说明

在 Windows 上使用端口 22 需要管理员权限。开发时建议使用默认端口 2222。

如需使用端口 22，请以管理员身份运行 PowerShell：

```powershell
# 以管理员身份运行
$env:SSH_PORT=22; node auth-ssh-service.js
```

## 🏗️ 系统架构

### 项目结构

```
authViaPort22/
├── auth-ssh-service.js    # SSH 认证服务（独立服务）
├── demo-app.js            # Demo 应用服务端
├── public/                # 前端静态资源
│   └── index.html        # 前端页面
├── data/                  # 数据存储
│   └── users.json        # 用户数据（JSON 数据库）
├── package.json          # 项目依赖
├── README.md             # 项目文档
└── API.md                # SSH 服务 API 文档
```

### 服务说明

#### 1. SSH 认证服务 (auth-ssh-service.js)

**独立的认证服务，可被任何应用集成**

- **SSH 服务器**: 监听 SSH 连接，提取用户公钥
- **HTTP API**: 提供验证码生成和查询接口
- **端口**: 
  - SSH: 2222（可配置为 22）
  - HTTP: 3000

**核心功能**:
- 生成临时 SSH 验证码
- 接收 SSH 连接并提取公钥
- 提供验证码状态查询接口

#### 2. Demo 应用 (demo-app.js)

**完整的用户认证系统演示**

- **端口**: 4000
- **数据存储**: JSON 文件（data/users.json）

**功能模块**:
- 用户注册和密码登录
- SSH 公钥登录
- SSH 公钥管理（添加、删除）
- JWT 令牌认证

### 工作流程

```
┌──────────────┐         ┌─────────────────┐         ┌──────────────┐
│   浏览器      │         │   Demo 应用     │         │ SSH 认证服务  │
└──────┬───────┘         └────────┬────────┘         └──────┬───────┘
       │                          │                         │
       │  1. 请求 SSH 登录         │                         │
       │─────────────────────────>│                         │
       │                          │                         │
       │                          │  2. 生成验证码           │
       │                          │────────────────────────>│
       │                          │                         │
       │                          │  3. 返回验证码和SSH命令   │
       │                          │<────────────────────────│
       │                          │                         │
       │  4. 显示 SSH 命令         │                         │
       │<─────────────────────────│                         │
       │                          │                         │
       │  5. 用户在终端执行 SSH 命令                          │
       │───────────────────────────────────────────────────>│
       │                          │                         │
       │                          │                         │  6. 提取公钥
       │                          │                         │
       │  7. 轮询登录状态          │                         │
       │─────────────────────────>│                         │
       │                          │                         │
       │                          │  8. 查询验证状态         │
       │                          │────────────────────────>│
       │                          │                         │
       │                          │  9. 返回公钥             │
       │                          │<────────────────────────│
       │                          │                         │
       │                          │ 10. 比对公钥             │
       │                          │                         │
       │ 11. 返回登录 Token        │                         │
       │<─────────────────────────│                         │
```

## 📖 使用指南

### 1. 生成 SSH 密钥对

如果您还没有 SSH 密钥，请先生成：

```bash
# 生成 RSA 密钥（推荐）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 或生成 Ed25519 密钥（更现代）
ssh-keygen -t ed25519 -C "your_email@example.com"
```

查看公钥：

```bash
# Linux/Mac
cat ~/.ssh/id_rsa.pub

# Windows (PowerShell)
type $env:USERPROFILE\.ssh\id_rsa.pub
```

### 2. 注册账号

1. 访问 http://localhost:4000
2. 点击"注册"标签
3. 输入用户名和密码
4. 点击"注册"按钮

### 3. 添加 SSH 公钥

1. 使用密码登录
2. 在"SSH 公钥管理"区域
3. 输入密钥名称（如"我的笔记本"）
4. 粘贴您的 SSH 公钥
5. 点击"添加 SSH 公钥"

### 4. 使用 SSH 登录

1. 退出当前登录
2. 切换到"SSH 登录"标签
3. 输入用户名
4. 点击"通过 SSH 登录"
5. 复制显示的 SSH 命令
6. 在终端执行该命令
7. 自动完成登录

**示例 SSH 命令**：
```bash
ssh a1b2c3d4@localhost -p 2222
```

## 📚 API 文档

详细的 API 文档请参考 [API.md](./API.md)

### SSH 认证服务 API

#### 生成验证码

```http
POST http://localhost:3000/api/auth/generate-code
```

#### 查询验证状态

```http
GET http://localhost:3000/api/auth/verify/:code
```

### Demo 应用 API

- `POST /register` - 用户注册
- `POST /login/password` - 密码登录
- `POST /login/ssh/init` - 初始化 SSH 登录
- `GET /login/ssh/poll/:sessionId` - 轮询 SSH 登录状态
- `GET /user/me` - 获取当前用户信息
- `GET /user/ssh-keys` - 获取 SSH 公钥列表
- `POST /user/ssh-keys` - 添加 SSH 公钥
- `DELETE /user/ssh-keys/:id` - 删除 SSH 公钥

## ⚙️ 配置说明

### SSH 认证服务配置

通过环境变量配置：

```bash
# SSH 端口（默认 2222）
SSH_PORT=2222

# HTTP API 端口（默认 3000）
HTTP_PORT=3000

# SSH 服务器域名（默认 login.via.ssh.iscar.net）
SSH_HOST=login.via.ssh.iscar.net

# 启动服务
SSH_PORT=22 HTTP_PORT=3000 node auth-ssh-service.js
```

### Demo 应用配置

```bash
# Demo 应用端口（默认 4000）
DEMO_PORT=4000

# JWT 密钥（生产环境请修改）
JWT_SECRET=your-secret-key

# SSH 认证服务地址
AUTH_SERVICE_URL=http://localhost:3000

# 启动服务
DEMO_PORT=4000 node demo-app.js
```

## 🚢 部署指南

### 开发环境

使用默认配置即可，SSH 服务运行在 2222 端口。

### 生产环境

#### 1. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动 SSH 认证服务
pm2 start auth-ssh-service.js --name ssh-auth

# 启动 Demo 应用
pm2 start demo-app.js --name demo-app

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

#### 2. Nginx 反向代理

```nginx
# SSH 认证服务
server {
    listen 80;
    server_name auth.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Demo 应用
server {
    listen 80;
    server_name demo.example.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. SSL 证书（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d auth.example.com
sudo certbot --nginx -d demo.example.com
```

#### 4. 防火墙配置

```bash
# 开放 SSH 端口（22 或 2222）
sudo ufw allow 22/tcp

# 开放 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 🔒 安全建议

1. **修改默认密钥**
   - 生产环境必须修改 `JWT_SECRET`
   
2. **使用 HTTPS**
   - 所有 HTTP 通信必须使用 SSL/TLS 加密
   
3. **限制 SSH 访问**
   - 使用防火墙限制 SSH 端口访问来源
   
4. **公钥验证**
   - 应用侧务必严格验证公钥匹配
   
5. **日志监控**
   - 记录所有认证尝试
   - 监控异常行为

## ❓ 常见问题

### Q1: SSH 连接失败怎么办？

**检查项**:
1. SSH 服务是否正常运行（查看控制台输出）
2. 端口是否正确（默认 2222）
3. 防火墙是否开放端口
4. 验证码是否已过期（5 分钟有效期）

**测试连接**:
```bash
# 查看详细连接信息
ssh -v a1b2c3d4@localhost -p 2222
```

### Q2: 公钥格式错误？

确保公钥格式正确，应该以下列之一开头：
- `ssh-rsa`
- `ssh-ed25519`
- `ecdsa-sha2-nistp256`
- `ecdsa-sha2-nistp384`
- `ecdsa-sha2-nistp521`

### Q3: Windows 上端口 22 无法使用？

Windows 需要管理员权限才能使用端口 22。解决方案：

1. 以管理员身份运行
2. 使用其他端口（如 2222）
3. 修改 Windows OpenSSH 服务端口

### Q4: 如何在其他应用中集成 SSH 认证服务？

参考 [API.md](./API.md) 的集成示例，主要步骤：

1. 调用 `/api/auth/generate-code` 生成验证码
2. 展示 SSH 命令给用户
3. 轮询 `/api/auth/verify/:code` 获取公钥
4. 验证公钥并完成业务逻辑

### Q5: 数据库可以换成 MySQL/PostgreSQL 吗？

当然可以！Demo 应用使用 JSON 文件只是为了简化演示。您可以：

1. 修改 `demo-app.js` 中的 `Database` 类
2. 使用 Sequelize、TypeORM 等 ORM
3. 直接使用数据库驱动

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 技术支持

- 查看 [API 文档](./API.md)
- 提交 Issue
- 查看示例代码

---

**Enjoy secure authentication with SSH keys! 🔐**

