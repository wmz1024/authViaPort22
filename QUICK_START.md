# 快速启动指南

## 第一步：安装依赖

```bash
npm install
```

## 第二步：启动服务

### 方式一：分别启动（推荐）

**终端 1 - 启动 SSH 认证服务：**
```bash
npm run start:auth
```

你应该看到：
```
==================================================
SSH 密钥认证服务
SSH Key Authentication Service
==================================================

[SSH] SSH服务器运行在端口 2222
[SSH] 连接命令示例: ssh <code>@login.via.ssh.iscar.net -p 2222
[API] HTTP服务器运行在端口 3000
[API] API地址: http://localhost:3000
```

**终端 2 - 启动 Demo 应用：**
```bash
npm run start:demo
```

你应该看到：
```
==================================================
Demo 应用服务器
Demo Application Server
==================================================

服务器运行在: http://localhost:4000
SSH认证服务: http://localhost:3000
```

### 方式二：同时启动

```bash
npm run start:both
```

## 第三步：访问应用

打开浏览器访问：http://localhost:4000

## 第四步：生成 SSH 密钥（如果还没有）

**Linux/Mac:**
```bash
# 生成密钥
ssh-keygen -t rsa -b 4096

# 查看公钥
cat ~/.ssh/id_rsa.pub
```

**Windows (PowerShell):**
```powershell
# 生成密钥
ssh-keygen -t rsa -b 4096

# 查看公钥
type $env:USERPROFILE\.ssh\id_rsa.pub
```

## 第五步：体验功能

### 1. 注册账号
- 点击"注册"标签
- 输入用户名（至少3个字符）
- 输入密码（至少6个字符）
- 点击"注册"

### 2. 密码登录
- 切换到"登录"标签
- 选择"密码登录"
- 输入用户名和密码
- 点击"登录"

### 3. 添加 SSH 公钥
- 登录后进入仪表板
- 在"SSH 公钥管理"区域
- 输入密钥名称（例如："我的笔记本"）
- 粘贴你的 SSH 公钥
- 点击"添加 SSH 公钥"

### 4. 体验 SSH 登录
- 点击右上角"退出登录"
- 切换到"SSH 登录"标签
- 输入用户名
- 点击"通过 SSH 登录"
- 复制显示的 SSH 命令
- 在新终端执行该命令

**示例：**
```bash
ssh a1b2c3d4@localhost -p 2222
```

成功后，浏览器会自动完成登录！

## 故障排除

### SSH 连接失败

1. **检查服务是否运行**
   - 确认 SSH 认证服务已启动
   - 查看终端输出是否有错误

2. **端口被占用**
   ```bash
   # 修改端口
   SSH_PORT=3022 npm run start:auth
   ```

3. **查看详细连接信息**
   ```bash
   ssh -v <code>@localhost -p 2222
   ```

### Windows 端口 22 权限问题

使用默认端口 2222 即可，或以管理员身份运行：

```powershell
# 右键 PowerShell -> 以管理员身份运行
$env:SSH_PORT=22; node auth-ssh-service.js
```

### 验证码过期

验证码有效期为 5 分钟，过期后需要重新生成。

### 公钥不匹配

确保添加的公钥与 SSH 客户端使用的私钥配对：

```bash
# 查看当前使用的公钥
ssh-keygen -y -f ~/.ssh/id_rsa
```

## 配置说明

### 自定义端口

创建 `.env` 文件：

```env
# SSH 认证服务
SSH_PORT=2222
HTTP_PORT=3000

# Demo 应用
DEMO_PORT=4000
```

然后正常启动服务。

### 生产环境配置

1. **修改 JWT 密钥**
```env
JWT_SECRET=your-very-secure-random-string-here
```

2. **配置域名**
```env
SSH_HOST=login.yourdomain.com
```

3. **使用 PM2 部署**
```bash
npm install -g pm2
pm2 start auth-ssh-service.js
pm2 start demo-app.js
pm2 save
```

## 下一步

- 查看 [README.md](./README.md) 了解完整功能
- 阅读 [API.md](./API.md) 学习如何集成到你的应用
- 修改 `demo-app.js` 自定义业务逻辑

---

**祝你使用愉快！🎉**

