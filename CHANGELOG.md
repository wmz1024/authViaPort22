# 更新日志

## [1.0.3] - 2025-10-26

### 🐛 Bug 修复

- **修复用户确认流程**
  - 问题：在用户输入 y/n 确认之前就已经自动登录
  - 原因：SSH 认证阶段就将状态设置为 `success`
  - 解决方案：引入 `authenticating` 中间状态
    - SSH 认证时设置为 `authenticating`（等待用户确认）
    - 用户输入 `y` 确认后才设置为 `success`
    - 用户输入其他字符设置为 `denied`

### ✨ 功能改进

- **新增 `authenticating` 状态**
  - 表示用户已通过 SSH 连接，正在等待确认
  - API 返回："等待用户确认鉴权请求"
  - 前端显示："⏳ 等待用户在终端确认鉴权请求..."

### 📚 文档更新

- 更新 `API.md` 添加 `authenticating` 状态说明
- 更新状态流程图

### 🔄 影响的文件

- `auth-ssh-service.js` - 修复认证流程
- `demo-app.js` - 处理 authenticating 状态
- `public/index.html` - 显示等待确认消息
- `API.md` - 添加新状态文档

---

## [1.0.2] - 2025-10-26

### ✨ 新功能

- **鉴权用途显示**
  - API 支持传递 `purpose` 参数，说明鉴权用途
  - SSH 连接时向用户显示鉴权用途信息
  - Demo 应用自动传递用途："登录到系统 - 用户: {username}"
  
- **用户确认机制**
  - SSH 连接时要求用户确认鉴权请求
  - 用户输入 `y` 同意，输入其他字符拒绝
  - 拒绝后返回 `denied` 状态
  - 支持退格键编辑输入

### 🎨 界面优化

- **修复 SSH 客户端排版**
  - 使用 `\r\n` 替代 `\n` 确保正确换行
  - 优化提示信息的对齐和格式
  - 添加美观的边框和分隔线
  - 使用 emoji 图标增强可读性

### 🔧 API 更新

- **POST /api/auth/generate-code**
  - 新增可选参数：`purpose`（鉴权用途说明）
  - 响应中返回 `purpose` 字段
  
- **GET /api/auth/verify/:code**
  - 新增状态：`denied`（用户拒绝鉴权）
  - 更新状态说明文档

### 📚 文档更新

- 更新 `API.md` 添加 `purpose` 参数说明
- 添加 `denied` 状态的文档说明
- 更新工作流程图，包含用户确认步骤
- 更新所有示例代码

### 🔄 影响的文件

- `auth-ssh-service.js` - SSH 交互逻辑、API 更新
- `demo-app.js` - 传递用途参数、处理 denied 状态
- `public/index.html` - 前端处理 denied 状态
- `API.md` - 完整的 API 文档更新

---

## [1.0.1] - 2025-10-26

### 🐛 Bug 修复

- **修复 ssh2 模块导入错误**
  - 问题：在 Node.js v22+ 中，`ssh2` 作为 CommonJS 模块无法使用命名导入
  - 错误信息：`SyntaxError: Named export 'Server' not found`
  - 解决方案：改用默认导入方式
  ```javascript
  // 之前（错误）
  import { Server } from 'ssh2';
  
  // 现在（正确）
  import pkg from 'ssh2';
  const { Server } = pkg;
  ```
  - 影响文件：`auth-ssh-service.js`

### 📚 文档更新

- 在 `TROUBLESHOOTING.md` 中添加了 ssh2 模块导入错误的解决方案
- 说明了 CommonJS 和 ESM 模块兼容性问题

---

## [1.0.0] - 2025-10-26

### ✨ 初始版本

#### 核心功能

- **SSH 认证服务** (`auth-ssh-service.js`)
  - ✅ 真实 SSH 服务器实现（基于 ssh2）
  - ✅ HTTP API 接口（生成验证码、查询状态）
  - ✅ 临时验证码管理（5 分钟过期）
  - ✅ 自动清理过期数据
  - ✅ 支持所有标准 SSH 密钥类型

- **Demo 应用** (`demo-app.js`)
  - ✅ 用户注册和管理
  - ✅ 密码登录（bcrypt 加密）
  - ✅ SSH 公钥登录
  - ✅ SSH 公钥管理（添加、查看、删除）
  - ✅ JWT 令牌认证
  - ✅ JSON 文件存储

- **前端界面** (`public/index.html`)
  - ✅ 用户注册/登录表单
  - ✅ SSH 登录界面
  - ✅ SSH 公钥管理
  - ✅ 现代化 UI 设计
  - ✅ 实时轮询机制

#### 文档

- ✅ `README.md` - 完整项目文档
- ✅ `API.md` - API 详细文档
- ✅ `QUICK_START.md` - 快速开始指南
- ✅ `ARCHITECTURE.md` - 系统架构文档
- ✅ `EXAMPLES.md` - 代码示例
- ✅ `TROUBLESHOOTING.md` - 故障排除指南
- ✅ `PROJECT_SUMMARY.md` - 项目总结
- ✅ `使用说明.md` - 中文简要说明
- ✅ `START_HERE.md` - 新用户入门指南

#### 技术栈

- Node.js >= 14.0.0
- Express.js 4.18.2
- ssh2 1.15.0
- bcrypt 5.1.1
- jsonwebtoken 9.0.2
- uuid 9.0.1
- cors 2.8.5

#### 安全特性

- ✅ 密码 bcrypt 加密
- ✅ JWT 令牌认证
- ✅ 验证码自动过期
- ✅ 公钥严格匹配验证
- ✅ CORS 配置

---

## 兼容性说明

### Node.js 版本

- **推荐版本**：Node.js 18 LTS 或 20 LTS
- **最低版本**：Node.js 14.0.0
- **已测试版本**：Node.js v22.13.0

### 操作系统

- ✅ Windows 10/11
- ✅ Linux (Ubuntu, Debian, CentOS 等)
- ✅ macOS 10.15+

### 已知问题

1. **Windows 端口 22**
   - 需要管理员权限
   - 建议使用端口 2222

2. **bcrypt 编译**
   - Windows 可能需要 windows-build-tools
   - Linux 需要 build-essential

3. **ssh2 模块**
   - v1.0.1 已修复 ESM 导入问题

---

## 升级指南

### 从 1.0.0 升级到 1.0.1

如果您已经下载了 1.0.0 版本：

1. **更新代码**
   
   修改 `auth-ssh-service.js` 的第 1-2 行：
   ```javascript
   // 将这两行
   import { Server } from 'ssh2';
   
   // 改为
   import pkg from 'ssh2';
   const { Server } = pkg;
   ```

2. **重启服务**
   ```bash
   # 停止当前服务（Ctrl+C）
   # 重新启动
   npm run start:auth
   ```

3. **验证修复**
   - 应该不再出现 "Named export 'Server' not found" 错误
   - SSH 服务正常启动

---

## 贡献

感谢所有报告问题和提供反馈的用户！

如有问题或建议，欢迎提交 Issue。

