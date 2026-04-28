const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aimtracker_secret_key_2026_change_this_in_production';

// ============ 请求限流配置 ============
const RATE_LIMIT = {
    // 全局限制
    global: {
        windowMs: 60 * 1000, // 1分钟窗口
        maxRequests: 100,    // 最大请求数（可根据StepFun限制调整）
        queueEnabled: true,  // 启用队列
        queueMaxSize: 10     // 最大队列大小
    },
    // 用户级限制
    user: {
        windowMs: 60 * 1000,
        maxRequests: 30,     // 每个用户每分钟最多30个请求
        queueEnabled: true,
        queueMaxSize: 5
    },
    // AI API调用限制（如果调用StepFun等）
    ai: {
        windowMs: 60 * 1000,
        maxRequests: 10,     // AI调用每分钟最多10次（匹配StepFun免费限制）
        queueEnabled: true,
        queueMaxSize: 3,
        skipPaths: ['/api/goals', '/api/register', '/api/login'] // 这些路径不受限流
    }
};

// 数据文件路径
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const GOALS_FILE = path.join(__dirname, 'data', 'goals.json');

// 确保数据目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// 初始化数据文件
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}
if (!fs.existsSync(GOALS_FILE)) {
    fs.writeFileSync(GOALS_FILE, JSON.stringify({}, null, 2));
}

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // 提供静态文件服务

// ============ 请求限流中间件 ============

// 简单的限流器类
class RateLimiter {
    constructor(windowMs, maxRequests, queueEnabled = true, queueMaxSize = 10) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.queueEnabled = queueEnabled;
        this.queueMaxSize = queueMaxSize;
        this.requests = new Map(); // 存储请求记录
        this.queue = []; // 请求队列
        this.processing = false;
    }

    // 获取客户端标识
    getClientIdentifier(req) {
        // 优先使用用户ID（如果已认证）
        if (req.user && req.user.username) {
            return `user:${req.user.username}`;
        }
        // 否则使用IP地址
        return req.ip || req.connection.remoteAddress || 'unknown';
    }

    // 检查是否超过限制
    isLimited(clientId) {
        const now = Date.now();
        const clientRequests = this.requests.get(clientId) || [];

        // 清理过期请求（滑动窗口）
        const validRequests = clientRequests.filter(time => now - time < this.windowMs);

        // 检查是否超过限制
        if (validRequests.length >= this.maxRequests) {
            return {
                limited: true,
                remaining: 0,
                resetTime: validRequests[0] + this.windowMs
            };
        }

        // 记录当前请求
        validRequests.push(now);
        this.requests.set(clientId, validRequests);

        // 计算剩余请求数
        const remaining = Math.max(0, this.maxRequests - validRequests.length);

        return {
            limited: false,
            remaining,
            resetTime: now + this.windowMs
        };
    }

    // 添加到队列
    async addToQueue(req, res, next, checkLimitFn) {
        if (!this.queueEnabled) {
            return next();
        }

        const clientId = this.getClientIdentifier(req);
        const queueKey = `${clientId}:queue`;

        // 检查该客户端的队列大小
        const clientQueue = this.queue.filter(item => item.clientId === clientId);
        if (clientQueue.length >= this.queueMaxSize) {
            return res.status(429).json({
                error: '请求过于频繁，请稍后再试',
                retryAfter: Math.ceil(this.windowMs / 1000)
            });
        }

        // 添加到队列
        const queueItem = {
            clientId,
            req,
            res,
            next,
            timestamp: Date.now()
        };

        this.queue.push(queueItem);

        // 开始处理队列
        this.processQueue();

        // 返回一个Promise，将在请求完成时resolve
        return new Promise((resolve, reject) => {
            queueItem.resolve = resolve;
            queueItem.reject = reject;
        });
    }

    // 处理队列
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue[0];
            const now = Date.now();

            // 检查请求是否过期（在队列中等待太久）
            if (now - item.timestamp > this.windowMs) {
                this.queue.shift();
                item.res.status(429).json({
                    error: '请求超时，请重试',
                    retryAfter: 0
                });
                if (item.resolve) item.resolve();
                continue;
            }

            // 检查限流
            const limitInfo = this.isLimited(item.clientId);

            if (limitInfo.limited) {
                // 超过限制，返回429
                item.res.status(429).json({
                    error: '请求过于频繁',
                    retryAfter: Math.ceil((limitInfo.resetTime - now) / 1000)
                });
                this.queue.shift();
                if (item.resolve) item.resolve();
                continue;
            }

            // 设置响应头
            item.res.setHeader('X-RateLimit-Limit', this.maxRequests);
            item.res.setHeader('X-RateLimit-Remaining', limitInfo.remaining);
            item.res.setHeader('X-RateLimit-Reset', Math.ceil(limitInfo.resetTime / 1000));

            // 处理请求
            try {
                await item.next();
                this.queue.shift();
                if (item.resolve) item.resolve();
            } catch (error) {
                this.queue.shift();
                if (item.resolve) item.resolve();
            }

            // 在处理下一个请求前等待一段时间（避免突发流量）
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        this.processing = false;
    }
}

// 创建限流器实例
const globalLimiter = new RateLimiter(
    RATE_LIMIT.global.windowMs,
    RATE_LIMIT.global.maxRequests,
    RATE_LIMIT.global.queueEnabled,
    RATE_LIMIT.global.queueMaxSize
);

const userLimiter = new RateLimiter(
    RATE_LIMIT.user.windowMs,
    RATE_LIMIT.user.maxRequests,
    RATE_LIMIT.user.queueEnabled,
    RATE_LIMIT.user.queueMaxSize
);

const aiLimiter = new RateLimiter(
    RATE_LIMIT.ai.windowMs,
    RATE_LIMIT.ai.maxRequests,
    RATE_LIMIT.ai.queueEnabled,
    RATE_LIMIT.ai.queueMaxSize
);

// 限流中间件工厂函数
function createRateLimitMiddleware(limiter, options = {}) {
    return async (req, res, next) => {
        // 跳过某些路径
        if (options.skipPaths && options.skipPaths.includes(req.path)) {
            return next();
        }

        // 检查是否超过限制
        const clientId = limiter.getClientIdentifier(req);
        const limitInfo = limiter.isLimited(clientId);

        if (limitInfo.limited) {
            return res.status(429).json({
                error: '请求过于频繁，请稍后再试',
                retryAfter: Math.ceil((limitInfo.resetTime - Date.now()) / 1000)
            });
        }

        // 设置响应头
        res.setHeader('X-RateLimit-Limit', limiter.maxRequests);
        res.setHeader('X-RateLimit-Remaining', limitInfo.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(limitInfo.resetTime / 1000));

        next();
    };
}

// 应用限流中间件
// 全局限流：适用于所有请求
app.use(createRateLimitMiddleware(globalLimiter));

// 用户级限流：针对已认证用户
app.use('/api/', authenticateToken, createRateLimitMiddleware(userLimiter));

// AI API限流：针对AI相关接口（未来扩展）
app.use('/api/ai/', createRateLimitMiddleware(aiLimiter, {
    skipPaths: ['/api/goals', '/api/register', '/api/login']
}));

// 辅助函数：读取用户数据
function readUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// 辅助函数：写入用户数据
function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 辅助函数：读取目标数据
function readGoals() {
    try {
        const data = fs.readFileSync(GOALS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// 辅助函数：写入目标数据
function writeGoals(goals) {
    fs.writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2));
}

// 中间件：验证JWT令牌
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

// ============ 用户认证 API ============

// 用户注册
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

        // 检查用户是否已存在
        if (users[username]) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 保存用户
        users[username] = {
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        writeUsers(users);

        // 生成JWT令牌
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

// 用户登录
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

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成JWT令牌
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

// 获取当前用户信息
app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ username: req.user.username });
});

// ============ 目标数据 API ============

// 获取用户的所有目标
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

// 创建新目标
app.post('/api/goals', authenticateToken, (req, res) => {
    try {
        const { name, targetDays, completedDays } = req.body;
        const goals = readGoals();

        if (!req.user.username) {
            return res.status(401).json({ error: '未授权' });
        }

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

// 更新目标
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

        // 更新目标
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

// 更新完成天数
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

// 删除目标
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

// 启动服务器
app.listen(PORT, () => {
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