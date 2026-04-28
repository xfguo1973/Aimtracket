# 🎯 AimTracker - 月度目标追踪器

一个简洁优雅的单页Web应用，帮助你追踪每月的目标完成进度。

## ✨ 功能特性

- 📊 **进度追踪**：实时显示本月已过去天数和剩余天数
- 🎯 **目标管理**：创建、编辑、删除多个目标
- ➕➖ **快速操作**：一键增减目标完成天数
- 📱 **响应式设计**：完美适配手机和电脑
- 🔐 **用户认证**：每个用户独立管理自己的目标
- 💾 **数据持久化**：数据保存到云端，随时随地访问
- 🌟 **精美UI**：现代化卡片设计，渐变色彩

## 🚀 快速开始

### 在线体验
访问在线版本：[https://aimtracker.up.railway.app](https://aimtracker.up.railway.app)

### 本地部署

#### 1. 克隆项目
```bash
git clone <你的仓库地址>
cd aimtracker
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，设置 JWT 密钥
JWT_SECRET=your_random_secret_key_here
```

#### 4. 启动服务器
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动

#### 5. 打开前端
在浏览器中打开 `index.html`

## 📖 使用说明

### 注册账户
1. 点击"立即注册"
2. 输入用户名（至少3个字符）
3. 输入密码（至少6位）
4. 确认密码并提交

### 管理目标
- **添加目标**：点击"+ 添加新目标"按钮
- **编辑目标**：点击目标卡片上的✏️按钮
- **调整进度**：使用目标和完成天数旁边的 +/- 按钮
- **删除目标**：在编辑弹窗中点击"删除"按钮

### 查看进度
顶部卡片显示：
- 本月总天数
- 已过去天数
- 剩余天数
- 当前日期

## 🔧 技术栈

### 后端
- Node.js + Express
- JWT 身份认证
- bcrypt 密码加密
- JSON 文件存储

### 前端
- 原生 HTML5 + CSS3 + JavaScript
- 响应式布局
- LocalStorage 本地缓存

## 📁 项目结构

```
aimtracker/
├── index.html          # 前端页面
├── server.js           # 后端服务器
├── package.json        # 依赖配置
├── .gitignore          # Git忽略文件
├── .env.example        # 环境变量示例
├── README.md           # 项目说明
└── data/              # 数据目录（运行时生成）
    ├── users.json     # 用户数据
    └── goals.json     # 目标数据
```

## 🔐 安全特性

- 密码使用 bcrypt 加密存储
- JWT 令牌认证（7天有效期）
- 用户数据完全隔离
- 支持HTTPS部署

## 🌐 部署到生产环境

### 推荐平台

#### Railway（最简单）
```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 部署
vercel --prod
```

详细部署指南请查看 [DEPLOY.md](DEPLOY.md)

### 环境变量配置

生产环境必须配置以下环境变量：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `JWT_SECRET` | JWT签名密钥 | ✅ 必需 |
| `PORT` | 服务器端口（默认3000） | ⚪ 可选 |
| `NODE_ENV` | 运行环境 | ⚪ 可选 |

生成安全密钥：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🎨 自定义配置

### 修改默认月份
在 `server.js` 中修改：
```javascript
let appData = {
    year: 2026,
    month: 5, // 修改这里
    goals: []
};
```

### 修改默认目标
在 `index.html` 的 `loadData()` 函数中修改默认目标数组。

### 更换主题色
在 CSS 中修改颜色变量：
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## 📊 API 文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/register` | 用户注册 |
| POST | `/api/login` | 用户登录 |
| GET | `/api/me` | 获取当前用户信息 |

### 目标接口（需要认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/goals` | 获取所有目标 |
| POST | `/api/goals` | 创建新目标 |
| PUT | `/api/goals/:id` | 更新目标 |
| DELETE | `/api/goals/:id` | 删除目标 |
| PATCH | `/api/goals/:id/completed` | 更新完成天数 |

### 请求示例

```javascript
// 获取目标
fetch('/api/goals', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})

// 创建目标
fetch('/api/goals', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        name: '每日阅读',
        targetDays: 30,
        completedDays: 0
    })
})
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 许可证

MIT License - 详见 LICENSE 文件

## 💡 功能建议

如果你有新功能建议，欢迎在 Issues 中提出：
- 数据导出（CSV/Excel）
- 统计图表
- 多月份支持
- 团队协作
- 移动端APP

---

**Made with ❤️ by AimTracker Team**