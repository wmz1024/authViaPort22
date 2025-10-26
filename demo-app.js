import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  PORT: process.env.DEMO_PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
  DATA_FILE: path.join(__dirname, 'data', 'users.json')
};

// 数据库操作
class Database {
  constructor(filePath) {
    this.filePath = filePath;
    this.ensureDataFile();
  }

  ensureDataFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ users: [] }, null, 2));
    }
  }

  read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[DB] 读取错误:', error);
      return { users: [] };
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('[DB] 写入错误:', error);
      return false;
    }
  }

  findUserByUsername(username) {
    const data = this.read();
    return data.users.find(u => u.username === username);
  }

  findUserById(id) {
    const data = this.read();
    return data.users.find(u => u.id === id);
  }

  createUser(username, password) {
    const data = this.read();
    
    if (this.findUserByUsername(username)) {
      return { success: false, message: '用户名已存在' };
    }

    const user = {
      id: uuidv4(),
      username,
      password: bcrypt.hashSync(password, 10),
      sshKeys: [],
      createdAt: new Date().toISOString()
    };

    data.users.push(user);
    this.write(data);

    return { success: true, user: this.sanitizeUser(user) };
  }

  updateUser(userId, updates) {
    const data = this.read();
    const userIndex = data.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, message: '用户不存在' };
    }

    data.users[userIndex] = { ...data.users[userIndex], ...updates };
    this.write(data);

    return { success: true, user: this.sanitizeUser(data.users[userIndex]) };
  }

  addSSHKey(userId, keyData) {
    const data = this.read();
    const user = data.users.find(u => u.id === userId);
    
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    const sshKey = {
      id: uuidv4(),
      name: keyData.name || 'Unnamed Key',
      publicKey: keyData.publicKey,
      addedAt: new Date().toISOString()
    };

    user.sshKeys.push(sshKey);
    this.write(data);

    return { success: true, key: sshKey };
  }

  removeSSHKey(userId, keyId) {
    const data = this.read();
    const user = data.users.find(u => u.id === userId);
    
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    const initialLength = user.sshKeys.length;
    user.sshKeys = user.sshKeys.filter(k => k.id !== keyId);
    
    if (user.sshKeys.length === initialLength) {
      return { success: false, message: 'SSH密钥不存在' };
    }

    this.write(data);
    return { success: true, message: 'SSH密钥已删除' };
  }

  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

const db = new Database(CONFIG.DATA_FILE);

// SSH登录会话存储
const sshSessions = new Map();

// 中间件：验证JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '无效的令牌' });
    }
    req.user = user;
    next();
  });
}

// 创建Express应用
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== 用户注册 ====================
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: '用户名和密码不能为空' 
    });
  }

  if (username.length < 3) {
    return res.status(400).json({ 
      success: false, 
      message: '用户名至少3个字符' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: '密码至少6个字符' 
    });
  }

  const result = db.createUser(username, password);

  if (result.success) {
    console.log(`[注册] 新用户: ${username}`);
    res.json({ 
      success: true, 
      message: '注册成功',
      user: result.user 
    });
  } else {
    res.status(400).json(result);
  }
});

// ==================== 密码登录 ====================
app.post('/login/password', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: '用户名和密码不能为空' 
    });
  }

  const user = db.findUserByUsername(username);

  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: '用户名或密码错误' 
    });
  }

  const validPassword = bcrypt.compareSync(password, user.password);

  if (!validPassword) {
    return res.status(401).json({ 
      success: false, 
      message: '用户名或密码错误' 
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    CONFIG.JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log(`[密码登录] 用户: ${username}`);

  res.json({
    success: true,
    message: '登录成功',
    token,
    user: db.sanitizeUser(user)
  });
});

// ==================== SSH登录 - 初始化 ====================
app.post('/login/ssh/init', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ 
      success: false, 
      message: '用户名不能为空' 
    });
  }

  const user = db.findUserByUsername(username);

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: '用户不存在' 
    });
  }

  if (user.sshKeys.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: '该用户未添加SSH公钥，请先添加' 
    });
  }

  try {
    // 调用SSH认证服务生成验证码，传递用途信息
    const purpose = `登录到系统 - 用户: ${username}`;
    
    const response = await fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/generate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purpose })
    });

    if (!response.ok) {
      throw new Error('SSH认证服务不可用');
    }

    const authData = await response.json();

    // 创建SSH登录会话
    const sessionId = uuidv4();
    sshSessions.set(sessionId, {
      username,
      userId: user.id,
      code: authData.code,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: authData.expiresAt
    });

    console.log(`[SSH登录] 初始化: ${username}, 验证码: ${authData.code}`);

    res.json({
      success: true,
      sessionId,
      sshCommand: authData.sshCommand,
      code: authData.code,
      expiresAt: authData.expiresAt,
      expiresIn: authData.expiresIn
    });

  } catch (error) {
    console.error('[SSH登录] 错误:', error);
    res.status(500).json({ 
      success: false, 
      message: 'SSH认证服务连接失败' 
    });
  }
});

// ==================== SSH登录 - 轮询状态 ====================
app.get('/login/ssh/poll/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  if (!sshSessions.has(sessionId)) {
    return res.status(404).json({ 
      success: false, 
      status: 'invalid',
      message: '无效的会话ID' 
    });
  }

  const session = sshSessions.get(sessionId);

  // 检查会话是否过期
  if (session.expiresAt < Date.now()) {
    sshSessions.delete(sessionId);
    return res.json({ 
      success: false, 
      status: 'expired',
      message: '会话已过期' 
    });
  }

  try {
    // 查询SSH认证服务
    const response = await fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/verify/${session.code}`);
    const authResult = await response.json();

    if (authResult.status === 'success') {
      // 验证公钥是否属于该用户
      const user = db.findUserById(session.userId);
      const publicKey = authResult.publicKey;

      const matchingKey = user.sshKeys.find(k => 
        k.publicKey.trim() === publicKey.trim()
      );

      if (matchingKey) {
        // 生成JWT token
        const token = jwt.sign(
          { id: user.id, username: user.username },
          CONFIG.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // 删除会话
        sshSessions.delete(sessionId);

        console.log(`[SSH登录] 成功: ${user.username}`);

        return res.json({
          success: true,
          status: 'success',
          message: 'SSH登录成功',
          token,
          user: db.sanitizeUser(user)
        });
      } else {
        // 公钥不匹配
        sshSessions.delete(sessionId);
        console.log(`[SSH登录] 公钥不匹配: ${user.username}`);
        
        return res.json({
          success: false,
          status: 'key_mismatch',
          message: 'SSH公钥与账户不匹配'
        });
      }
    } else if (authResult.status === 'denied') {
      // 用户拒绝了鉴权
      sshSessions.delete(sessionId);
      console.log(`[SSH登录] 用户拒绝鉴权: ${session.username}`);
      
      return res.json({
        success: false,
        status: 'denied',
        message: '用户拒绝了鉴权请求'
      });
    } else if (authResult.status === 'expired') {
      sshSessions.delete(sessionId);
      return res.json({ 
        success: false, 
        status: 'expired',
        message: '验证码已过期' 
      });
    } else if (authResult.status === 'authenticating') {
      // 用户已连接，等待确认
      return res.json({
        success: true,
        status: 'authenticating',
        message: '等待用户确认鉴权请求',
        remainingTime: authResult.remainingTime
      });
    } else {
      // 仍在等待
      return res.json({ 
        success: true, 
        status: 'pending',
        message: '等待SSH连接',
        remainingTime: authResult.remainingTime
      });
    }

  } catch (error) {
    console.error('[SSH登录] 轮询错误:', error);
    res.status(500).json({ 
      success: false, 
      status: 'error',
      message: 'SSH认证服务连接失败' 
    });
  }
});

// ==================== 获取当前用户信息 ====================
app.get('/user/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: '用户不存在' 
    });
  }

  res.json({
    success: true,
    user: db.sanitizeUser(user)
  });
});

// ==================== SSH公钥管理 ====================

// 获取SSH公钥列表
app.get('/user/ssh-keys', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: '用户不存在' 
    });
  }

  res.json({
    success: true,
    keys: user.sshKeys
  });
});

// 添加SSH公钥
app.post('/user/ssh-keys', authenticateToken, (req, res) => {
  const { name, publicKey } = req.body;

  if (!publicKey) {
    return res.status(400).json({ 
      success: false, 
      message: 'SSH公钥不能为空' 
    });
  }

  // 简单验证公钥格式
  if (!publicKey.trim().match(/^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+=*/)) {
    return res.status(400).json({ 
      success: false, 
      message: '无效的SSH公钥格式' 
    });
  }

  const result = db.addSSHKey(req.user.id, { name, publicKey: publicKey.trim() });

  if (result.success) {
    console.log(`[SSH密钥] 添加: 用户=${req.user.username}, 名称=${name}`);
    res.json({ 
      success: true, 
      message: 'SSH公钥添加成功',
      key: result.key 
    });
  } else {
    res.status(400).json(result);
  }
});

// 删除SSH公钥
app.delete('/user/ssh-keys/:keyId', authenticateToken, (req, res) => {
  const { keyId } = req.params;

  const result = db.removeSSHKey(req.user.id, keyId);

  if (result.success) {
    console.log(`[SSH密钥] 删除: 用户=${req.user.username}, 密钥ID=${keyId}`);
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// ==================== 健康检查 ====================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Demo Application',
    status: 'running',
    timestamp: Date.now(),
    authServiceUrl: CONFIG.AUTH_SERVICE_URL
  });
});

// 主页重定向到前端
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(CONFIG.PORT, () => {
  console.log('='.repeat(50));
  console.log('Demo 应用服务器');
  console.log('Demo Application Server');
  console.log('='.repeat(50));
  console.log();
  console.log(`服务器运行在: http://localhost:${CONFIG.PORT}`);
  console.log(`SSH认证服务: ${CONFIG.AUTH_SERVICE_URL}`);
  console.log();
  console.log('API端点:');
  console.log('  POST   /register              - 用户注册');
  console.log('  POST   /login/password        - 密码登录');
  console.log('  POST   /login/ssh/init        - 初始化SSH登录');
  console.log('  GET    /login/ssh/poll/:id    - 轮询SSH登录状态');
  console.log('  GET    /user/me               - 获取当前用户');
  console.log('  GET    /user/ssh-keys         - 获取SSH公钥列表');
  console.log('  POST   /user/ssh-keys         - 添加SSH公钥');
  console.log('  DELETE /user/ssh-keys/:id     - 删除SSH公钥');
  console.log();
});

