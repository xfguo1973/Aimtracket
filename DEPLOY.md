# 🚀 AimTracker 部署指南

## 方案一：使用 Railway（最简单，推荐）

Railway 提供免费套餐，支持 Node.js 应用一键部署。

### 步骤：

1. **注册 Railway 账户**
   - 访问 https://railway.app
   - 使用 GitHub 账户登录

2. **部署应用**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 连接你的 GitHub 仓库
   - 选择 `aimtracker` 项目
   - Railway 会自动检测 package.json 并部署

3. **配置环境变量**
   在 Railway 控制台，添加环境变量：
   ```
   JWT_SECRET=your_super_secret_key_here
   ```

4. **获取访问地址**
   部署完成后，你会得到一个类似 `https://aimtracker.up.railway.app` 的网址

5. **更新前端API地址**
   将 `index.html` 中的 `API_BASE_URL` 改为你的Railway地址：
   ```javascript
   const API_BASE_URL = 'https://aimtracker.up.railway.app/api';
   ```

---

## 方案二：使用 Vercel（推荐）

Vercel 支持静态网站和Node.js服务端，完全免费。

### 步骤：

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **部署**
   ```bash
   cd d:\项目郭\aimtracker
   vercel --prod
   ```

3. **配置环境变量**
   - 在 Vercel 控制台 → Project Settings → Environment Variables
   - 添加 `JWT_SECRET` 变量

---

## 方案三：使用 Heroku

Heroku 提供免费套餐（有一定限制）。

### 步骤：

1. **创建 Heroku 账户**
   - 访问 https://heroku.com

2. **安装 Heroku CLI 并登录**
   ```bash
   heroku login
   ```

3. **创建应用并部署**
   ```bash
   cd d:\项目郭\aimtracker
   heroku create aimtracker-yourname
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

4. **设置环境变量**
   ```bash
   heroku config:set JWT_SECRET=your_super_secret_key_here
   ```

---

## 方案四：使用腾讯云/阿里云服务器（最灵活）

### 步骤：

1. **购买云服务器**
   - 选择最低配置（1核2G即可）
   - 系统：Ubuntu 20.04/22.04 或 CentOS 7+

2. **连接服务器**
   ```bash
   ssh root@你的服务器IP
   ```

3. **安装环境**
   ```bash
   # Ubuntu/Debian
   apt update
   apt install -y nodejs npm nginx

   # CentOS/RHEL
   yum install -y nodejs npm nginx
   ```

4. **上传项目文件**
   ```bash
   # 在本地打包
   cd d:\项目郭\aimtracker
   tar -czf aimtracker.tar.gz .

   # 上传到服务器（使用SCP或FTP）
   scp aimtracker.tar.gz root@你的服务器IP:/var/www/
   ```

5. **在服务器上配置**
   ```bash
   cd /var/www
   tar -xzf aimtracker.tar.gz
   npm install --production

   # 创建systemd服务
   cat > /etc/systemd/system/aimtracker.service << EOF
   [Unit]
   Description=AimTracker
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/var/www/aimtracker
   ExecStart=/usr/bin/node /var/www/aimtracker/server.js
   Restart=always

   [Install]
   WantedBy=multi-user.target
   EOF

   # 启用服务
   systemctl enable aimtracker
   systemctl start aimtracker

   # 配置Nginx
   cat > /etc/nginx/sites-available/aimtracker << EOF
   server {
       listen 80;
       server_name 你的域名或IP;

       location / {
           root /var/www/aimtracker;
           index index.html;
           try_files \$uri \$uri/ =404;
       }

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade \$http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host \$host;
           proxy_cache_bypass \$http_upgrade;
       }
   }
   EOF

   ln -s /etc/nginx/sites-available/aimtracker /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

---

## 方案五：使用 Docker（最便捷的迁移方案）

### 1. 创建 Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### 2. 创建 docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
```

### 3. 部署到任何支持Docker的平台
- Docker Hub + 任何云服务器
- AWS ECS
- Google Cloud Run
- Azure Container Instances

---

## 🔐 安全建议

### 重要！修改 JWT 密钥

在生产环境中，**必须**修改 `server.js` 中的 JWT 密钥：

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_and_long_random_key_here';
```

然后通过环境变量设置：
```bash
export JWT_SECRET=your_random_key_here
```

生成安全密钥的方法：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 添加 HTTPS（SSL证书）

如果使用自己的域名，建议配置SSL证书：
- 免费证书：Let's Encrypt
- 使用 Certbot 自动配置：
  ```bash
  certbot --nginx -d yourdomain.com
  ```

---

## 📝 快速开始（推荐方案）

**最快的方式**：使用 Railway

1.  Fork 本项目到你的 GitHub
2.  访问 https://railway.app/new 并连接 GitHub
3.  选择你的仓库
4.  添加环境变量 `JWT_SECRET`
5.  部署完成！

**预计时间**：5分钟

---

## 🎯 测试部署

部署完成后，测试：

1. **访问主页**
   ```
   https://你的网址.com
   ```

2. **注册新用户**
   - 点击"立即注册"
   - 输入用户名和密码
   - 点击"注册"

3. **登录**
   - 使用注册的账户登录
   - 验证可以添加/编辑目标

4. **分享给朋友**
   - 将网址发送给朋友
   - 他们可以注册自己的账户
   - 每个人的数据完全独立

---

## 📊 数据备份

### 定期备份数据文件
```bash
# 备份到云端
cp data/users.json data/users.json.backup
cp data/goals.json data/goals.json.backup

# 或使用云存储同步整个data文件夹
```

### 自动备份脚本示例
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp data/users.json /backup/users_$DATE.json
cp data/goals.json /backup/goals_$DATE.json
```

设置crontab（每天凌晨3点备份）：
```
0 3 * * * /path/to/backup.sh
```

---

## 🔧 故障排除

### 问题：服务器启动失败
**解决**：
1. 检查端口是否被占用：`lsof -i :3000`
2. 查看日志：`journalctl -u aimtracker -f`

### 问题：前端无法连接API
**解决**：
1. 检查 `index.html` 中的 `API_BASE_URL` 是否正确
2. 确认服务器防火墙开放了3000端口
3. 如果使用了Nginx反向代理，检查配置

### 问题：数据丢失
**解决**：
1. 从备份文件恢复 `data/users.json` 和 `data/goals.json`
2. 检查服务器磁盘空间

---

## 💡 下一步优化

1. **添加邮箱验证**
2. **支持密码重置**
3. **添加管理员面板**
4. **数据导出功能（CSV/Excel）**
5. **添加数据统计图表**
6. **支持多语言**
7. **开发移动端APP**

---

需要我帮你执行某个特定方案的部署吗？