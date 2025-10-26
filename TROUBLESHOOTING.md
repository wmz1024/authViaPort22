# 故障排除指南

## 常见问题和解决方案

### 1. SSH 连接问题

#### 问题：无法连接到 SSH 服务器

**错误信息：**
```
ssh: connect to host localhost port 2222: Connection refused
```

**可能原因和解决方案：**

1. **SSH 服务未启动**
   ```bash
   # 检查是否运行
   netstat -an | grep 2222
   
   # 启动 SSH 认证服务
   node auth-ssh-service.js
   ```

2. **端口被占用**
   ```bash
   # Windows (PowerShell)
   netstat -ano | findstr :2222
   
   # Linux/Mac
   lsof -i :2222
   
   # 使用其他端口
   SSH_PORT=3022 node auth-ssh-service.js
   ```

3. **防火墙阻止**
   ```bash
   # Windows: 添加防火墙规则
   netsh advfirewall firewall add rule name="SSH Auth" dir=in action=allow protocol=TCP localport=2222
   
   # Linux: 使用 ufw
   sudo ufw allow 2222/tcp
   ```

#### 问题：SSH 连接后立即断开

**这是正常行为！** SSH 认证服务在提取公钥后会自动断开连接。

**确认成功的标志：**
```
╔════════════════════════════════════════╗
║     SSH 密钥认证服务                   ║
║     SSH Key Authentication Service    ║
╚════════════════════════════════════════╝

✓ 认证成功！您的SSH公钥已被记录。
✓ Authentication successful!
  Your SSH public key has been recorded.

您现在可以关闭此连接。
You can now close this connection.
```

#### 问题：权限被拒绝 (publickey)

**错误信息：**
```
Permission denied (publickey).
```

**解决方案：**

1. **确保有 SSH 密钥对**
   ```bash
   # 检查是否存在密钥
   ls -la ~/.ssh/
   
   # 如果不存在，生成密钥
   ssh-keygen -t rsa -b 4096
   ```

2. **指定密钥文件**
   ```bash
   ssh -i ~/.ssh/id_rsa a1b2c3d4@localhost -p 2222
   ```

3. **查看详细错误信息**
   ```bash
   ssh -v a1b2c3d4@localhost -p 2222
   ```

### 2. 端口和权限问题

#### 问题：Windows 端口 22 需要管理员权限

**错误信息：**
```
Error: listen EACCES: permission denied 0.0.0.0:22
```

**解决方案：**

**方式一：使用其他端口（推荐）**
```bash
# 使用 2222 端口
node auth-ssh-service.js
```

**方式二：以管理员身份运行**
```powershell
# 右键 PowerShell -> 以管理员身份运行
node auth-ssh-service.js
```

**方式三：修改 Windows OpenSSH 端口**
```powershell
# 停止 OpenSSH 服务
Stop-Service sshd

# 修改配置文件
# C:\ProgramData\ssh\sshd_config
# 将 Port 22 改为其他端口
```

#### 问题：端口已被占用

**错误信息：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**

1. **查找占用端口的进程**
   ```bash
   # Windows (PowerShell)
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```

2. **终止进程**
   ```bash
   # Windows (PowerShell)
   taskkill /PID <PID> /F
   
   # Linux/Mac
   kill -9 <PID>
   ```

3. **使用其他端口**
   ```bash
   HTTP_PORT=3001 node auth-ssh-service.js
   ```

### 3. 验证码和登录问题

#### 问题：验证码已过期

**错误信息：**
```json
{
  "success": false,
  "status": "expired",
  "message": "验证码已过期"
}
```

**原因：** 验证码有效期为 5 分钟

**解决方案：**
- 重新生成验证码
- 在 5 分钟内完成 SSH 连接
- 如需更长时间，修改 `auth-ssh-service.js` 中的 `CODE_EXPIRY` 常量

#### 问题：公钥不匹配

**错误信息：**
```json
{
  "success": false,
  "status": "key_mismatch",
  "message": "SSH公钥与账户不匹配"
}
```

**原因：** SSH 连接使用的公钥与数据库中存储的公钥不一致

**解决方案：**

1. **检查当前使用的公钥**
   ```bash
   # 查看默认公钥
   cat ~/.ssh/id_rsa.pub
   
   # 从私钥提取公钥
   ssh-keygen -y -f ~/.ssh/id_rsa
   ```

2. **确认数据库中的公钥**
   - 登录应用
   - 查看"SSH 公钥管理"
   - 确认公钥是否正确

3. **重新添加公钥**
   - 删除旧公钥
   - 添加正确的公钥
   - 确保完整复制（包括 ssh-rsa 前缀）

4. **指定特定密钥**
   ```bash
   ssh -i ~/.ssh/specific_key a1b2c3d4@localhost -p 2222
   ```

#### 问题：无效的会话 ID

**错误信息：**
```json
{
  "success": false,
  "status": "invalid",
  "message": "无效的会话ID"
}
```

**解决方案：**
- 会话可能已过期
- 重新初始化 SSH 登录
- 检查网络连接

### 4. 数据库和存储问题

#### 问题：无法读取 users.json

**错误信息：**
```
[DB] 读取错误: Error: ENOENT: no such file or directory
```

**解决方案：**

1. **创建数据目录**
   ```bash
   mkdir -p data
   echo '{"users":[]}' > data/users.json
   ```

2. **检查文件权限**
   ```bash
   # Linux/Mac
   chmod 644 data/users.json
   
   # Windows: 确保有读写权限
   ```

#### 问题：JSON 解析错误

**错误信息：**
```
SyntaxError: Unexpected token in JSON
```

**解决方案：**

1. **备份现有文件**
   ```bash
   cp data/users.json data/users.json.backup
   ```

2. **重置数据文件**
   ```bash
   echo '{"users":[]}' > data/users.json
   ```

3. **使用 JSON 验证工具**
   ```bash
   # 使用 jq 验证
   cat data/users.json | jq .
   ```

### 5. 依赖和安装问题

#### 问题：模块未找到

**错误信息：**
```
Error: Cannot find module 'express'
```

**解决方案：**
```bash
# 安装所有依赖
npm install

# 或单独安装
npm install express ssh2 uuid bcrypt jsonwebtoken cors
```

#### 问题：bcrypt 编译错误

**错误信息：**
```
node-gyp rebuild failed
```

**解决方案：**

**Windows:**
```bash
# 安装 Windows 构建工具
npm install --global windows-build-tools

# 重新安装 bcrypt
npm install bcrypt
```

**Linux:**
```bash
# 安装构建依赖
sudo apt-get install build-essential

# 重新安装
npm install bcrypt
```

**Mac:**
```bash
# 安装 Xcode 命令行工具
xcode-select --install

# 重新安装
npm install bcrypt
```

#### 问题：Node.js 版本不兼容

**错误信息：**
```
SyntaxError: Cannot use import statement outside a module
```

**解决方案：**

1. **检查 Node.js 版本**
   ```bash
   node --version
   # 需要 >= 14.0.0
   ```

2. **升级 Node.js**
   ```bash
   # 使用 nvm
   nvm install 18
   nvm use 18
   
   # 或从官网下载
   # https://nodejs.org/
   ```

3. **确认 package.json 设置**
   ```json
   {
     "type": "module"
   }
   ```

#### 问题：ssh2 模块导入错误

**错误信息：**
```
SyntaxError: Named export 'Server' not found. The requested module 'ssh2' is a CommonJS module
```

**原因：** `ssh2` 是 CommonJS 模块，在 ESM 中需要使用默认导入

**解决方案：** 已在代码中修复，使用以下导入方式：
```javascript
import pkg from 'ssh2';
const { Server } = pkg;
```

如果您自定义了代码，请确保使用这种导入方式。

### 6. 网络和 CORS 问题

#### 问题：CORS 错误

**错误信息（浏览器控制台）：**
```
Access to fetch at 'http://localhost:3000/api/auth/generate-code' 
from origin 'http://localhost:4000' has been blocked by CORS policy
```

**解决方案：**

已在代码中配置 CORS，如果仍有问题：

1. **检查服务是否启动**
   ```bash
   # 确认两个服务都在运行
   curl http://localhost:3000/health
   curl http://localhost:4000/health
   ```

2. **清除浏览器缓存**
   - Chrome: Ctrl+Shift+Delete
   - 选择"缓存的图像和文件"
   - 清除数据

3. **使用代理（开发环境）**
   配置 Nginx 或使用 http-proxy-middleware

#### 问题：无法连接到 SSH 认证服务

**错误信息：**
```
SSH认证服务连接失败
```

**解决方案：**

1. **确认 SSH 认证服务运行**
   ```bash
   curl http://localhost:3000/health
   ```

2. **检查配置**
   ```javascript
   // demo-app.js 中的配置
   AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3000'
   ```

3. **修改配置**
   ```bash
   AUTH_SERVICE_URL=http://localhost:3000 node demo-app.js
   ```

### 7. 前端问题

#### 问题：页面空白

**解决方案：**

1. **检查浏览器控制台**
   - F12 打开开发者工具
   - 查看 Console 标签的错误信息

2. **确认静态文件**
   ```bash
   ls -la public/index.html
   ```

3. **测试直接访问**
   ```bash
   curl http://localhost:4000/
   ```

#### 问题：轮询不工作

**现象：** SSH 连接成功但浏览器无响应

**解决方案：**

1. **检查浏览器控制台**
   - 查看 Network 标签
   - 确认轮询请求是否发送

2. **手动测试轮询**
   ```bash
   # 获取 sessionId 后测试
   curl http://localhost:4000/login/ssh/poll/<sessionId>
   ```

3. **清除 localStorage**
   ```javascript
   // 浏览器控制台执行
   localStorage.clear();
   location.reload();
   ```

### 8. SSH 密钥问题

#### 问题：公钥格式错误

**错误信息：**
```
无效的SSH公钥格式
```

**正确格式：**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC... user@host
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@host
ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlz... user@host
```

**解决方案：**

1. **完整复制公钥**
   - 包括类型前缀（ssh-rsa）
   - 包括 Base64 编码的密钥数据
   - 可选的注释部分（user@host）

2. **去除多余空格和换行**
   ```bash
   # Linux/Mac
   cat ~/.ssh/id_rsa.pub | tr -d '\n'
   ```

3. **验证公钥**
   ```bash
   ssh-keygen -l -f ~/.ssh/id_rsa.pub
   ```

#### 问题：密钥权限问题

**错误信息：**
```
WARNING: UNPROTECTED PRIVATE KEY FILE!
```

**解决方案：**
```bash
# 设置正确的权限
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

### 9. 性能问题

#### 问题：轮询响应慢

**解决方案：**

1. **调整轮询间隔**
   ```javascript
   // 前端 index.html 中
   // 将 2000ms 改为 1000ms（不建议低于1秒）
   ```

2. **检查服务器负载**
   ```bash
   # Linux/Mac
   top
   
   # Windows (PowerShell)
   Get-Process node
   ```

3. **考虑使用 WebSocket**
   - 替代轮询机制
   - 实时推送状态更新

#### 问题：内存占用过高

**解决方案：**

1. **清理过期验证码**
   - 代码中已实现定期清理
   - 每分钟自动清理过期验证码

2. **限制并发数**
   ```javascript
   // 在 auth-ssh-service.js 中添加
   if (authCodes.size > 10000) {
     return res.status(429).json({
       success: false,
       message: '服务器繁忙，请稍后重试'
     });
   }
   ```

## 调试技巧

### 1. 启用详细日志

```javascript
// 在服务启动前添加
process.env.DEBUG = '*';
```

### 2. 使用 SSH 详细模式

```bash
# 查看 SSH 连接详细信息
ssh -vvv a1b2c3d4@localhost -p 2222
```

### 3. 监控网络请求

```bash
# 使用 tcpdump (Linux/Mac)
sudo tcpdump -i lo port 2222

# 使用 Wireshark (Windows)
# 过滤器: tcp.port == 2222
```

### 4. 检查进程状态

```bash
# 查看 Node.js 进程
ps aux | grep node

# Windows (PowerShell)
Get-Process -Name node
```

## 获取帮助

如果以上方案都无法解决问题：

1. **查看日志**
   - 检查控制台输出
   - 查看错误堆栈

2. **最小化复现**
   - 使用最简单的测试用例
   - 排除其他因素

3. **提供信息**
   - Node.js 版本
   - 操作系统
   - 完整的错误信息
   - 复现步骤

4. **检查文档**
   - [README.md](./README.md)
   - [API.md](./API.md)
   - [EXAMPLES.md](./EXAMPLES.md)

---

**大部分问题都能通过重启服务解决！**

