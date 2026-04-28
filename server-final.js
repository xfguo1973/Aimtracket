const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aimtracker_secret_key_2026';

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
app.use(bodyParser.json());
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

function readGoals() {
    try {
        const data = fs.readFileSync(GOALS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function writeGoals(goals) {
    fs.writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2));
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

        users[username] = {
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        writeUsers(users);

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: '注册成功',
            token,
            username
        });
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

        res.json({
            message: '登录成功',
            token,
            username
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ username: req.user.username });
});

app.get('/api/goals', authenticateToken, (req, res) => {
    try {
        const goals = readGoals();
        const userGoals = goals[req.user.username] || [];
        res.json(userGoals);
    } catch (error) {
        console.error('获取目标错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.post('/api/goals', authenticateToken, (req, res) => {
    try {
        const { name, targetDays, completedDays } = req.body;
        const goals = readGoals();
        const userGoals = goals[req.user.username] || [];

        const newGoal = {
            id: Date.now(),
            name: name || '新目标',
            targetDays: targetDays || 30,
            completedDays: completedDays || 0,
            lastUpdate: new Date().toISOString()
        };

        userGoals.push(newGoal);
        goals[req.user.username] = userGoals;
        writeGoals(goals);

        res.status(201).json(newGoal);
    } catch (error) {
        console.error('创建目标错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.put('/api/goals/:id', authenticateToken, (req, res) => {
    try {
        const goalId = parseInt(req.params.id);
        const { name, targetDays, completedDays } = req.body;

        const goals = readGoals();
        const userGoals = goals[req.user.username];

        if (!userGoals) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const goalIndex = userGoals.findIndex(g => g.id === goalId);
        if (goalIndex === -1) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const goal = userGoals[goalIndex];
        if (name !== undefined) goal.name = name;
        if (targetDays !== undefined) goal.targetDays = targetDays;
        if (completedDays !== undefined) goal.completedDays = completedDays;
        goal.lastUpdate = new Date().toISOString();

        goals[req.user.username] = userGoals;
        writeGoals(goals);

        res.json(goal);
    } catch (error) {
        console.error('更新目标错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.patch('/api/goals/:id/completed', authenticateToken, (req, res) => {
    try {
        const goalId = parseInt(req.params.id);
        const { delta } = req.body;

        const goals = readGoals();
        const userGoals = goals[req.user.username];

        if (!userGoals) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const goal = userGoals.find(g => g.id === goalId);
        if (!goal) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const newCompleted = goal.completedDays + delta;
        if (newCompleted < 0) {
            return res.status(400).json({ error: '完成天数不能为负数' });
        }

        goal.completedDays = newCompleted;
        goal.lastUpdate = new Date().toISOString();

        goals[req.user.username] = userGoals;
        writeGoals(goals);

        res.json(goal);
    } catch (error) {
        console.error('更新完成天数错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.delete('/api/goals/:id', authenticateToken, (req, res) => {
    try {
        const goalId = parseInt(req.params.id);
        const goals = readGoals();
        const userGoals = goals[req.user.username];

        if (!userGoals) {
            return res.status(404).json({ error: '目标不存在' });
        }

        const filteredGoals = userGoals.filter(g => g.id !== goalId);
        goals[req.user.username] = filteredGoals;
        writeGoals(goals);

        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除目标错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 API 地址: http://localhost:${PORT}/api`);
    console.log(`🔐 注册: POST /api/register`);
    console.log(`🔐 登录: POST /api/login`);
    console.log(`🎯 获取目标: GET /api/goals`);
    console.log(`➕ 创建目标: POST /api/goals`);
    console.log(`✏️ 更新目标: PUT /api/goals/:id`);
    console.log(`🗑️ 删除目标: DELETE /api/goals/:id`);
});

module.exports = app;
