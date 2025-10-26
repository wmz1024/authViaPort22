# 🚀 从这里开始

欢迎使用 **SSH 密钥认证系统**！

## ⚡ 三步快速启动

### 步骤 1：安装依赖

```bash
npm install
```

**重要提示：** 这将安装所有必需的依赖包，大约需要 1-2 分钟。

### 步骤 2：启动服务

**打开两个终端窗口：**

#### 终端 1 - SSH 认证服务
```bash
npm run start:auth
```

您应该看到：
```
==================================================
SSH 密钥认证服务
SSH Key Authentication Service
==================================================

[SSH] SSH服务器运行在端口 2222
[API] HTTP服务器运行在端口 3000
```

#### 终端 2 - Demo 应用
```bash
npm run start:demo
```

您应该看到：
```
==================================================
Demo 应用服务器
Demo Application Server
==================================================

服务器运行在: http://localhost:4000
```

### 步骤 3：打开浏览器

访问：**http://localhost:4000**

## 🎯 接下来做什么？

### 新用户体验流程

1. **注册账号**
   - 用户名：至少 3 个字符
   - 密码：至少 6 个字符

2. **生成 SSH 密钥**（如果还没有）
   ```bash
   # Windows PowerShell
   ssh-keygen -t rsa -b 4096
   type $env:USERPROFILE\.ssh\id_rsa.pub
   
   # Linux/Mac
   ssh-keygen -t rsa -b 4096
   cat ~/.ssh/id_rsa.pub
   ```

3. **添加 SSH 公钥**
   - 登录后进入仪表板
   - 粘贴您的公钥
   - 点击"添加"

4. **体验 SSH 登录**
   - 退出登录
   - 选择"SSH 登录"
   - 复制 SSH 命令
   - 在终端执行
   - 自动登录成功！

## 📖 文档导航

根据您的需求选择：

### 🔰 我是新手
→ 阅读 **使用说明.md** 或 **QUICK_START.md**

### 👨‍💻 我要集成到项目
→ 阅读 **API.md** 和 **EXAMPLES.md**

### 🏗️ 我想了解架构
→ 阅读 **ARCHITECTURE.md**

### ❓ 我遇到了问题
→ 查看 **TROUBLESHOOTING.md**

### 📚 我要全面了解
→ 阅读 **README.md** 和 **PROJECT_SUMMARY.md**

## ⚙️ 常用命令

```bash
# 安装依赖
npm install

# 启动 SSH 认证服务
npm run start:auth
# 或
node auth-ssh-service.js

# 启动 Demo 应用
npm run start:demo
# 或
node demo-app.js

# 同时启动两个服务（需要安装 concurrently）
npm run start:both
```

## 🔧 自定义配置

### 修改端口

**SSH 认证服务：**
```bash
# Windows PowerShell
$env:SSH_PORT=3022
$env:HTTP_PORT=3001
node auth-ssh-service.js

# Linux/Mac
SSH_PORT=3022 HTTP_PORT=3001 node auth-ssh-service.js
```

**Demo 应用：**
```bash
# Windows PowerShell
$env:DEMO_PORT=5000
node demo-app.js

# Linux/Mac
DEMO_PORT=5000 node demo-app.js
```

## 🌟 项目亮点

- ✅ **真实 SSH 服务器** - 不是模拟，是真正的 SSH 连接
- ✅ **服务分离** - SSH 认证服务可独立使用
- ✅ **完整 Demo** - 开箱即用的示例应用
- ✅ **详细文档** - 8 个文档文件，覆盖所有场景
- ✅ **安全可靠** - 多重安全机制
- ✅ **易于集成** - RESTful API + 代码示例

## 📦 项目包含

### 核心服务（2 个）
- `auth-ssh-service.js` - SSH 认证服务
- `demo-app.js` - Demo 应用

### 前端界面（1 个）
- `public/index.html` - 完整的 Web 界面

### 文档（8 个）
- `README.md` - 主文档
- `API.md` - API 文档
- `QUICK_START.md` - 快速开始
- `ARCHITECTURE.md` - 架构文档
- `EXAMPLES.md` - 代码示例
- `TROUBLESHOOTING.md` - 故障排除
- `PROJECT_SUMMARY.md` - 项目总结
- `使用说明.md` - 中文简要说明

## ❗ 重要提示

### Windows 用户

1. **端口 22 需要管理员权限**
   - 建议使用默认端口 2222
   - 或以管理员身份运行

2. **bcrypt 可能需要构建工具**
   ```bash
   npm install --global windows-build-tools
   ```

### Linux/Mac 用户

1. **确保有 SSH 客户端**
   ```bash
   which ssh
   ```

2. **检查端口是否被占用**
   ```bash
   lsof -i :2222
   lsof -i :3000
   lsof -i :4000
   ```

## 🆘 遇到问题？

### 快速检查清单

- [ ] 安装了所有依赖 (`npm install`)
- [ ] 两个服务都在运行
- [ ] 端口没有被占用
- [ ] 生成了 SSH 密钥
- [ ] 正确复制了公钥（包括 ssh-rsa 前缀）

### 常见错误

**连接被拒绝：**
→ 检查服务是否启动

**端口被占用：**
→ 使用其他端口或停止占用进程

**公钥不匹配：**
→ 确认公钥是否正确添加

**验证码过期：**
→ 重新生成验证码（5 分钟有效期）

更多问题请查看 **TROUBLESHOOTING.md**

## 🎓 学习路径

### 第 1 天：体验功能
1. 启动服务
2. 注册账号
3. 添加 SSH 公钥
4. 尝试 SSH 登录

### 第 2 天：理解原理
1. 阅读 ARCHITECTURE.md
2. 查看 auth-ssh-service.js 代码
3. 理解工作流程

### 第 3 天：集成应用
1. 阅读 API.md
2. 参考 EXAMPLES.md
3. 集成到自己的项目

## 🚀 准备好了吗？

执行以下命令开始：

```bash
# 1. 安装
npm install

# 2. 启动（两个终端）
npm run start:auth  # 终端 1
npm run start:demo  # 终端 2

# 3. 访问
# 打开浏览器：http://localhost:4000
```

---

**需要帮助？查看文档或搜索 TROUBLESHOOTING.md** 📚

**祝您使用愉快！** 🎉

