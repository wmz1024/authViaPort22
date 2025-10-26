import pkg from 'ssh2';
const { Server } = pkg;
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  SSH_PORT: process.env.SSH_PORT || 2222,
  HTTP_PORT: process.env.HTTP_PORT || 3000,
  SSH_HOST: process.env.SSH_HOST || 'localhost',
  CODE_EXPIRY: 5 * 60 * 1000, // 5分钟
  HOST_KEY_PATH: path.join(__dirname, 'host_key')
};

// 存储临时验证码和对应的公钥
const authCodes = new Map();

// 生成随机验证码
function generateCode(length = 8) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

// 清理过期的验证码
function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [code, data] of authCodes.entries()) {
    if (data.expiresAt < now) {
      authCodes.delete(code);
    }
  }
}

// 定期清理过期验证码
setInterval(cleanupExpiredCodes, 60000); // 每分钟清理一次

// 生成或读取主机密钥
function getHostKey() {
  if (fs.existsSync(CONFIG.HOST_KEY_PATH)) {
    return fs.readFileSync(CONFIG.HOST_KEY_PATH);
  } else {
    // 生成新的主机密钥
    const { generateKeyPairSync } = crypto;
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
      },
      publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
      }
    });
    fs.writeFileSync(CONFIG.HOST_KEY_PATH, privateKey);
    return privateKey;
  }
}

// 启动SSH服务器
function startSSHServer() {
  const hostKey = getHostKey();

  const sshServer = new Server({
    hostKeys: [hostKey]
  }, (client) => {
    console.log('[SSH] 客户端连接');

    client.on('authentication', (ctx) => {
      const username = ctx.username;
      console.log(`[SSH] 认证尝试 - 用户名: ${username}, 方法: ${ctx.method}`);

      if (ctx.method === 'publickey') {
        const publicKey = ctx.key.algo + ' ' + ctx.key.data.toString('base64');
        
        // 检查验证码是否存在
        if (authCodes.has(username)) {
          const authData = authCodes.get(username);
          
          // 检查是否过期
          if (authData.expiresAt < Date.now()) {
            authData.status = 'expired';
            console.log(`[SSH] 验证码已过期: ${username}`);
            ctx.reject();
            return;
          }

          // 临时存储公钥，但不标记为成功（等待用户确认）
          authData.publicKey = publicKey;
          authData.status = 'authenticating'; // 认证中，等待用户确认
          authData.timestamp = Date.now();
          
          console.log(`[SSH] 公钥已捕获: ${username}`);
          console.log(`[SSH] 公钥: ${publicKey.substring(0, 50)}...`);
          console.log(`[SSH] 等待用户确认...`);
          
          ctx.accept();
        } else {
          console.log(`[SSH] 无效的验证码: ${username}`);
          ctx.reject();
        }
      } else if (ctx.method === 'none') {
        // 要求公钥认证
        ctx.reject(['publickey']);
      } else {
        ctx.reject();
      }
    });

    client.on('ready', () => {
      console.log('[SSH] 客户端认证成功');

      client.on('session', (accept, reject) => {
        const session = accept();
        let username = null;
        let userConfirmed = false;

        session.on('exec', (accept, reject, info) => {
          const stream = accept();
          stream.write('认证成功！您的SSH公钥已被记录。\n');
          stream.write('Authentication successful! Your SSH public key has been recorded.\n');
          stream.exit(0);
          stream.end();
        });

        session.on('shell', (accept, reject) => {
          const stream = accept();
          
          // 获取验证码对应的用途
          let purpose = '未知用途';
          let foundCode = null;
          
          // 查找当前认证中的验证码
          for (const [code, data] of authCodes.entries()) {
            if (data.status === 'authenticating' && data.timestamp && Date.now() - data.timestamp < 10000) {
              username = code;
              foundCode = code;
              purpose = data.purpose || '未指定用途';
              break;
            }
          }
          
          if (!foundCode) {
            stream.write('\r\n错误：无法找到对应的验证码\r\n');
            stream.write('Error: Cannot find corresponding verification code\r\n');
            stream.exit(1);
            stream.end();
            return;
          }
          
          // 显示欢迎信息和用途
          stream.write('\r\n');
          stream.write('┌────────────────────────────────────────────────────┐\r\n');
          stream.write('│           SSH 密钥认证服务                         │\r\n');
          stream.write('│      SSH Key Authentication Service               │\r\n');
          stream.write('└────────────────────────────────────────────────────┘\r\n');
          stream.write('\r\n');
          stream.write('✓ SSH 公钥认证成功！\r\n');
          stream.write('  SSH public key authenticated successfully!\r\n');
          stream.write('\r\n');
          stream.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n');
          stream.write(`📋 鉴权用途 | Purpose: ${purpose}\r\n`);
          stream.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n');
          stream.write('\r\n');
          stream.write('⚠️  安全提示 | Security Notice:\r\n');
          stream.write('   此操作将授权使用您的 SSH 公钥进行身份验证。\r\n');
          stream.write('   This will authorize the use of your SSH public key.\r\n');
          stream.write('\r\n');
          stream.write('❓ 是否同意此次鉴权请求？\r\n');
          stream.write('   Do you approve this authentication request?\r\n');
          stream.write('\r\n');
          stream.write('   输入 y 同意 | Type "y" to approve\r\n');
          stream.write('   输入其他拒绝 | Type anything else to deny\r\n');
          stream.write('\r\n');
          stream.write('您的选择 | Your choice: ');

          let inputBuffer = '';
          
          stream.on('data', (data) => {
            const input = data.toString('utf8');
            
            if (input === '\r' || input === '\n') {
              // 用户按下回车
              stream.write('\r\n\r\n');
              
              const response = inputBuffer.trim().toLowerCase();
              
              if (response === 'y' || response === 'yes') {
                // 用户同意
                userConfirmed = true;
                stream.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n');
                stream.write('✅ 已同意 | Approved\r\n');
                stream.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n');
                stream.write('\r\n');
                stream.write('✓ 鉴权成功！您的 SSH 公钥已被记录。\r\n');
                stream.write('  Authentication successful!\r\n');
                stream.write('  Your SSH public key has been recorded.\r\n');
                stream.write('\r\n');
                stream.write('您现在可以关闭此连接。\r\n');
                stream.write('You can now close this connection.\r\n');
                stream.write('\r\n');
                
                console.log(`[SSH] 用户确认鉴权: ${foundCode}`);
                
                // 更新状态为成功
                if (authCodes.has(foundCode)) {
                  const authData = authCodes.get(foundCode);
                  authData.status = 'success';
                  console.log(`[SSH] 状态已更新为 success: ${foundCode}`);
                }
                
                // 延迟关闭
                setTimeout(() => {
                  stream.exit(0);
                  stream.end();
                }, 2000);
              } else {
                // 用户拒绝
                stream.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n');
                stream.write('❌ 已拒绝 | Denied\r\n');
                stream.write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n');
                stream.write('\r\n');
                stream.write('✗ 鉴权已取消。\r\n');
                stream.write('  Authentication cancelled.\r\n');
                stream.write('\r\n');
                
                console.log(`[SSH] 用户拒绝鉴权: ${foundCode}`);
                
                // 标记为拒绝
                if (authCodes.has(foundCode)) {
                  const authData = authCodes.get(foundCode);
                  authData.status = 'denied';
                  authData.publicKey = null;
                  console.log(`[SSH] 状态已更新为 denied: ${foundCode}`);
                }
                
                setTimeout(() => {
                  stream.exit(1);
                  stream.end();
                }, 2000);
              }
            } else if (input === '\x03') {
              // Ctrl+C
              stream.write('\r\n\r\n已取消 | Cancelled\r\n');
              stream.exit(1);
              stream.end();
            } else if (input === '\x7f' || input === '\b') {
              // 退格键
              if (inputBuffer.length > 0) {
                inputBuffer = inputBuffer.slice(0, -1);
                stream.write('\b \b');
              }
            } else if (input >= ' ' && input <= '~') {
              // 可打印字符
              inputBuffer += input;
              stream.write(input);
            }
          });
        });

        session.on('pty', (accept, reject) => {
          accept();
        });
      });
    });

    client.on('error', (err) => {
      console.error('[SSH] 客户端错误:', err.message);
    });

    client.on('end', () => {
      console.log('[SSH] 客户端断开连接');
    });
  });

  sshServer.listen(CONFIG.SSH_PORT, '0.0.0.0', () => {
    console.log(`[SSH] SSH服务器运行在端口 ${CONFIG.SSH_PORT}`);
    console.log(`[SSH] 连接命令示例: ssh <code>@${CONFIG.SSH_HOST} -p ${CONFIG.SSH_PORT}`);
  });

  sshServer.on('error', (err) => {
    console.error('[SSH] 服务器错误:', err.message);
    if (err.code === 'EACCES') {
      console.error(`[SSH] 端口 ${CONFIG.SSH_PORT} 需要管理员权限`);
      console.error('[SSH] 请使用管理员权限运行或更改端口');
    }
  });

  return sshServer;
}

// 启动HTTP API服务器
function startHTTPServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // 生成临时验证码
  app.post('/api/auth/generate-code', (req, res) => {
    const { purpose } = req.body; // 获取用途信息
    const code = generateCode();
    const expiresAt = Date.now() + CONFIG.CODE_EXPIRY;

    authCodes.set(code, {
      status: 'pending',
      expiresAt,
      publicKey: null,
      purpose: purpose || '未指定用途', // 存储用途
      createdAt: Date.now()
    });

    console.log(`[API] 生成验证码: ${code}, 用途: ${purpose || '未指定'}, 过期时间: ${new Date(expiresAt).toISOString()}`);

    res.json({
      success: true,
      code,
      expiresAt,
      expiresIn: CONFIG.CODE_EXPIRY,
      sshCommand: `ssh ${code}@${CONFIG.SSH_HOST} -p ${CONFIG.SSH_PORT}`,
      purpose: purpose || '未指定用途'
    });
  });

  // 验证码状态查询（轮询接口）
  app.get('/api/auth/verify/:code', (req, res) => {
    const { code } = req.params;

    if (!authCodes.has(code)) {
      return res.json({
        success: false,
        status: 'invalid',
        message: '验证码不存在'
      });
    }

    const authData = authCodes.get(code);

    // 检查是否过期
    if (authData.expiresAt < Date.now()) {
      authData.status = 'expired';
      return res.json({
        success: false,
        status: 'expired',
        message: '验证码已过期'
      });
    }

    // 用户拒绝
    if (authData.status === 'denied') {
      authCodes.delete(code);
      console.log(`[API] 用户拒绝鉴权: ${code}`);
      
      return res.json({
        success: false,
        status: 'denied',
        message: '用户拒绝了鉴权请求'
      });
    }

    // 验证成功
    if (authData.status === 'success') {
      // 验证成功，返回公钥并删除验证码
      const { publicKey } = authData;
      authCodes.delete(code);
      
      console.log(`[API] 验证成功: ${code}`);
      
      return res.json({
        success: true,
        status: 'success',
        publicKey,
        message: '认证成功'
      });
    }

    // 认证中，等待用户确认
    if (authData.status === 'authenticating') {
      return res.json({
        success: true,
        status: 'authenticating',
        message: '等待用户确认鉴权请求',
        expiresAt: authData.expiresAt,
        remainingTime: authData.expiresAt - Date.now()
      });
    }

    // 还在等待
    res.json({
      success: true,
      status: 'pending',
      message: '等待用户SSH连接',
      expiresAt: authData.expiresAt,
      remainingTime: authData.expiresAt - Date.now()
    });
  });

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      service: 'SSH Authentication Service',
      status: 'running',
      timestamp: Date.now(),
      activeCodes: authCodes.size
    });
  });

  // API文档
  app.get('/', (req, res) => {
    res.json({
      service: 'SSH Authentication Service',
      version: '1.0.0',
      endpoints: {
        'POST /api/auth/generate-code': '生成临时SSH验证码',
        'GET /api/auth/verify/:code': '查询验证码状态和公钥',
        'GET /health': '健康检查'
      },
      documentation: 'See API.md for detailed documentation'
    });
  });

  app.listen(CONFIG.HTTP_PORT, () => {
    console.log(`[API] HTTP服务器运行在端口 ${CONFIG.HTTP_PORT}`);
    console.log(`[API] API地址: http://localhost:${CONFIG.HTTP_PORT}`);
  });

  return app;
}

// 主函数
function main() {
  console.log('='.repeat(50));
  console.log('SSH 密钥认证服务');
  console.log('SSH Key Authentication Service');
  console.log('='.repeat(50));
  console.log();

  startSSHServer();
  startHTTPServer();

  console.log();
  console.log('服务启动完成！');
  console.log(`SSH端口: ${CONFIG.SSH_PORT}`);
  console.log(`HTTP端口: ${CONFIG.HTTP_PORT}`);
  console.log();
}

// 启动服务
main();

