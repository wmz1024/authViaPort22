// 配置文件示例
// Configuration Example
// 
// 如果需要自定义配置，可以创建 config.js 文件
// Create a config.js file if you need custom configuration

export const AUTH_SERVICE_CONFIG = {
  // SSH 服务器端口
  SSH_PORT: parseInt(process.env.SSH_PORT) || 2222,
  
  // HTTP API 端口
  HTTP_PORT: parseInt(process.env.HTTP_PORT) || 3000,
  
  // SSH 服务器主机名
  SSH_HOST: process.env.SSH_HOST || 'login.via.ssh.iscar.net',
  
  // 验证码有效期（毫秒）
  CODE_EXPIRY: 5 * 60 * 1000, // 5 分钟
  
  // 主机密钥路径
  HOST_KEY_PATH: './host_key'
};

export const DEMO_APP_CONFIG = {
  // Demo 应用端口
  PORT: parseInt(process.env.DEMO_PORT) || 4000,
  
  // JWT 密钥（生产环境务必修改）
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  
  // JWT 过期时间
  JWT_EXPIRES_IN: '24h',
  
  // SSH 认证服务地址
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
  
  // 数据文件路径
  DATA_FILE: './data/users.json',
  
  // 密码加密轮数
  BCRYPT_ROUNDS: 10
};

// 生产环境配置示例
export const PRODUCTION_CONFIG = {
  AUTH_SERVICE: {
    SSH_PORT: 22,
    HTTP_PORT: 3000,
    SSH_HOST: 'login.yourdomain.com',
    CODE_EXPIRY: 5 * 60 * 1000
  },
  
  DEMO_APP: {
    PORT: 4000,
    JWT_SECRET: 'your-very-secure-random-string-here',
    JWT_EXPIRES_IN: '24h',
    AUTH_SERVICE_URL: 'https://auth.yourdomain.com'
  }
};

