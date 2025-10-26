# 使用示例和测试

## API 调用示例

### 1. 使用 cURL 测试 SSH 认证服务

#### 生成验证码

```bash
curl -X POST http://localhost:3000/api/auth/generate-code
```

**响应示例：**
```json
{
  "success": true,
  "code": "a1b2c3d4",
  "expiresAt": 1698765432000,
  "expiresIn": 300000,
  "sshCommand": "ssh a1b2c3d4@login.via.ssh.iscar.net -p 2222"
}
```

#### 查询验证状态

```bash
# 将 a1b2c3d4 替换为实际的验证码
curl http://localhost:3000/api/auth/verify/a1b2c3d4
```

**响应示例（等待中）：**
```json
{
  "success": true,
  "status": "pending",
  "message": "等待用户SSH连接",
  "expiresAt": 1698765432000,
  "remainingTime": 245000
}
```

**响应示例（成功）：**
```json
{
  "success": true,
  "status": "success",
  "publicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC...",
  "message": "认证成功"
}
```

### 2. 使用 cURL 测试 Demo 应用

#### 用户注册

```bash
curl -X POST http://localhost:4000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

#### 密码登录

```bash
curl -X POST http://localhost:4000/login/password \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**响应示例：**
```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "testuser",
    "sshKeys": [],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 添加 SSH 公钥

```bash
# 先保存 token
TOKEN="your-jwt-token-here"

# 添加公钥
curl -X POST http://localhost:4000/user/ssh-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Laptop",
    "publicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC..."
  }'
```

#### 获取 SSH 公钥列表

```bash
curl http://localhost:4000/user/ssh-keys \
  -H "Authorization: Bearer $TOKEN"
```

#### 初始化 SSH 登录

```bash
curl -X POST http://localhost:4000/login/ssh/init \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser"
  }'
```

**响应示例：**
```json
{
  "success": true,
  "sessionId": "uuid",
  "sshCommand": "ssh a1b2c3d4@localhost -p 2222",
  "code": "a1b2c3d4",
  "expiresAt": 1698765432000,
  "expiresIn": 300000
}
```

#### 轮询 SSH 登录状态

```bash
# 将 SESSION_ID 替换为实际的会话ID
curl http://localhost:4000/login/ssh/poll/SESSION_ID
```

## JavaScript 集成示例

### 使用 Fetch API

```javascript
// 生成 SSH 验证码
async function generateSSHCode() {
  const response = await fetch('http://localhost:3000/api/auth/generate-code', {
    method: 'POST'
  });
  const data = await response.json();
  console.log('SSH 命令:', data.sshCommand);
  return data;
}

// 轮询验证状态
async function pollSSHStatus(code) {
  const maxAttempts = 150; // 5分钟
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`http://localhost:3000/api/auth/verify/${code}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return data.publicKey;
    } else if (data.status === 'expired' || data.status === 'invalid') {
      throw new Error(data.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
  }
  
  throw new Error('轮询超时');
}

// 使用示例
async function sshLogin() {
  try {
    const authData = await generateSSHCode();
    console.log('请在终端执行:', authData.sshCommand);
    
    const publicKey = await pollSSHStatus(authData.code);
    console.log('获取到公钥:', publicKey);
    
    // 验证公钥并完成登录...
  } catch (error) {
    console.error('SSH 登录失败:', error);
  }
}
```

### 使用 Axios

```javascript
const axios = require('axios');

// Demo 应用完整登录示例
class AuthClient {
  constructor(baseURL = 'http://localhost:4000') {
    this.client = axios.create({ baseURL });
    this.token = null;
  }

  // 注册
  async register(username, password) {
    const { data } = await this.client.post('/register', {
      username,
      password
    });
    return data;
  }

  // 密码登录
  async loginWithPassword(username, password) {
    const { data } = await this.client.post('/login/password', {
      username,
      password
    });
    this.token = data.token;
    return data;
  }

  // SSH 登录
  async loginWithSSH(username) {
    // 初始化 SSH 登录
    const { data: initData } = await this.client.post('/login/ssh/init', {
      username
    });
    
    console.log('请在终端执行:', initData.sshCommand);
    
    // 轮询登录状态
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const { data } = await this.client.get(
            `/login/ssh/poll/${initData.sessionId}`
          );
          
          if (data.status === 'success') {
            clearInterval(interval);
            this.token = data.token;
            resolve(data);
          } else if (data.status === 'expired' || data.status === 'key_mismatch') {
            clearInterval(interval);
            reject(new Error(data.message));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2000);
    });
  }

  // 添加 SSH 公钥
  async addSSHKey(name, publicKey) {
    const { data } = await this.client.post('/user/ssh-keys', {
      name,
      publicKey
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return data;
  }

  // 获取 SSH 公钥列表
  async getSSHKeys() {
    const { data } = await this.client.get('/user/ssh-keys', {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return data.keys;
  }

  // 删除 SSH 公钥
  async deleteSSHKey(keyId) {
    const { data } = await this.client.delete(`/user/ssh-keys/${keyId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return data;
  }
}

// 使用示例
async function main() {
  const auth = new AuthClient();
  
  try {
    // 注册
    await auth.register('alice', 'password123');
    console.log('注册成功');
    
    // 密码登录
    await auth.loginWithPassword('alice', 'password123');
    console.log('登录成功');
    
    // 添加 SSH 公钥
    const fs = require('fs');
    const publicKey = fs.readFileSync(
      require('os').homedir() + '/.ssh/id_rsa.pub',
      'utf8'
    );
    
    await auth.addSSHKey('My Laptop', publicKey);
    console.log('SSH 公钥添加成功');
    
    // 退出登录
    auth.token = null;
    
    // 使用 SSH 登录
    const result = await auth.loginWithSSH('alice');
    console.log('SSH 登录成功:', result);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}
```

## Python 集成示例

```python
import requests
import time
import os

class AuthClient:
    def __init__(self, base_url='http://localhost:4000'):
        self.base_url = base_url
        self.token = None
    
    def register(self, username, password):
        """用户注册"""
        response = requests.post(f'{self.base_url}/register', json={
            'username': username,
            'password': password
        })
        return response.json()
    
    def login_with_password(self, username, password):
        """密码登录"""
        response = requests.post(f'{self.base_url}/login/password', json={
            'username': username,
            'password': password
        })
        data = response.json()
        if data['success']:
            self.token = data['token']
        return data
    
    def login_with_ssh(self, username):
        """SSH 登录"""
        # 初始化 SSH 登录
        response = requests.post(f'{self.base_url}/login/ssh/init', json={
            'username': username
        })
        init_data = response.json()
        
        if not init_data['success']:
            raise Exception(init_data['message'])
        
        print(f"请在终端执行: {init_data['sshCommand']}")
        
        # 轮询登录状态
        session_id = init_data['sessionId']
        max_attempts = 150  # 5分钟
        
        for _ in range(max_attempts):
            response = requests.get(
                f'{self.base_url}/login/ssh/poll/{session_id}'
            )
            data = response.json()
            
            if data['status'] == 'success':
                self.token = data['token']
                return data
            elif data['status'] in ['expired', 'key_mismatch']:
                raise Exception(data['message'])
            
            time.sleep(2)
        
        raise Exception('轮询超时')
    
    def add_ssh_key(self, name, public_key):
        """添加 SSH 公钥"""
        response = requests.post(
            f'{self.base_url}/user/ssh-keys',
            json={'name': name, 'publicKey': public_key},
            headers={'Authorization': f'Bearer {self.token}'}
        )
        return response.json()
    
    def get_ssh_keys(self):
        """获取 SSH 公钥列表"""
        response = requests.get(
            f'{self.base_url}/user/ssh-keys',
            headers={'Authorization': f'Bearer {self.token}'}
        )
        return response.json()['keys']

# 使用示例
def main():
    auth = AuthClient()
    
    try:
        # 注册
        auth.register('bob', 'password123')
        print('注册成功')
        
        # 密码登录
        auth.login_with_password('bob', 'password123')
        print('登录成功')
        
        # 添加 SSH 公钥
        home = os.path.expanduser('~')
        with open(f'{home}/.ssh/id_rsa.pub', 'r') as f:
            public_key = f.read().strip()
        
        auth.add_ssh_key('My Computer', public_key)
        print('SSH 公钥添加成功')
        
        # SSH 登录
        auth.token = None  # 清除 token
        result = auth.login_with_ssh('bob')
        print('SSH 登录成功:', result)
        
    except Exception as e:
        print(f'错误: {e}')

if __name__ == '__main__':
    main()
```

## 集成到现有应用

### Express.js 应用集成

```javascript
import express from 'express';

const app = express();
const AUTH_SERVICE_URL = 'http://localhost:3000';

// SSH 登录中间件
async function initSSHLogin(username) {
  const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/generate-code`, {
    method: 'POST'
  });
  const authData = await response.json();
  
  // 存储到 session 或 Redis
  return {
    code: authData.code,
    sshCommand: authData.sshCommand,
    expiresAt: authData.expiresAt
  };
}

async function verifySSHLogin(code, userPublicKeys) {
  const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify/${code}`);
  const result = await response.json();
  
  if (result.status === 'success') {
    // 验证公钥
    const isValid = userPublicKeys.some(
      key => key.publicKey === result.publicKey
    );
    return { success: isValid, publicKey: result.publicKey };
  }
  
  return { success: false, status: result.status };
}

// 使用示例
app.post('/auth/ssh/init', async (req, res) => {
  const { username } = req.body;
  const user = await db.findUser(username);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  const sshData = await initSSHLogin(username);
  res.json(sshData);
});

app.get('/auth/ssh/verify/:code', async (req, res) => {
  const { code } = req.params;
  const user = req.session.user; // 从 session 获取
  
  const result = await verifySSHLogin(code, user.sshKeys);
  res.json(result);
});
```

## 测试脚本

### 完整测试流程

```bash
#!/bin/bash

echo "=== SSH 认证服务测试 ==="

# 1. 生成验证码
echo "1. 生成验证码..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/generate-code)
CODE=$(echo $RESPONSE | jq -r '.code')
SSH_CMD=$(echo $RESPONSE | jq -r '.sshCommand')

echo "验证码: $CODE"
echo "SSH 命令: $SSH_CMD"

# 2. 在后台监控状态
echo ""
echo "2. 开始监控验证状态..."
(
  while true; do
    STATUS=$(curl -s http://localhost:3000/api/auth/verify/$CODE | jq -r '.status')
    echo "状态: $STATUS"
    
    if [ "$STATUS" = "success" ]; then
      echo "✓ 验证成功！"
      exit 0
    elif [ "$STATUS" = "expired" ]; then
      echo "✗ 验证码已过期"
      exit 1
    fi
    
    sleep 2
  done
) &
MONITOR_PID=$!

# 3. 提示用户执行 SSH 命令
echo ""
echo "3. 请在另一个终端执行以下命令："
echo "   $SSH_CMD"
echo ""
echo "等待 SSH 连接..."

# 等待监控进程
wait $MONITOR_PID
```

---

**更多示例请参考项目代码！**

