const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const JWT_SECRET = 'aimtracker_secret_key_2026';

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const GOALS_FILE = path.join(__dirname, 'data', 'goals.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}
if (!fs.existsSync(GOALS_FILE)) {
    fs.writeFileSync(GOALS_FILE, JSON.stringify({}, null, 2));
}

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function readUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '令牌无效' });
        }
        req.user = user;
        next();
    });
}

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度至少6位' });
        }
        const users = readUsers();
        if (users[username]) {
            return res.status(400).json({ error: '用户名已存在' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = { password: hashedPassword, createdAt: new Date().toISOString() };
        writeUsers(users);
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ message: '注册成功', token, username });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        const users = readUsers();
        const user = users[username];
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: '登录成功', token, username });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📝 请在浏览器中访问 http://localhost:${PORT} 开始使用目标追踪器`);
    
    // 延迟1秒后测试注册
    setTimeout(async () => {
        console.log('\n🧪 测试注册功能...');
        
        const postData = JSON.stringify({
            username: 'testuser',
            password: 'test123456'
        });
        
        const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`状态码: ${res.statusCode}`);
                console.log(`响应: ${data}`);
                
                if (res.statusCode === 201) {
                    console.log('\n✅ 注册测试成功！');
                } else {
                    console.log('\n⚠️ 注册测试结果:', res.statusCode);
                }
                console.log(`🔄 服务器持续运行中...`);
            });
        });
        
        req.on('error', (e) => {
            console.error('请求错误:', e.message);
        });
        
        req.write(postData);
        req.end();
    }, 1000);
});

server.on('error', (err) => {
    console.error('服务器启动失败:', err);
    process.exit(1);
});
