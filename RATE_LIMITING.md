# 🛡️ API限流保护说明

## 概述

为防止触发第三方API（如StepFun）的速率限制，系统已添加完整的请求限流、队列和重试机制。

---

## 🔒 后端限流配置

### 限流策略

#### 1. 全局限流
- **时间窗口**：1分钟
- **最大请求数**：100次/分钟
- **队列大小**：10
- **适用对象**：所有未认证请求

#### 2. 用户级限流
- **时间窗口**：1分钟
- **最大请求数**：30次/分钟（每个用户）
- **队列大小**：5
- **适用对象**：已认证用户

#### 3. AI API限流（可选）
- **时间窗口**：1分钟
- **最大请求数**：10次/分钟（匹配StepFun免费限制）
- **队列大小**：3
- **适用路径**：`/api/ai/*`

### 响应头

每次响应都包含限流信息：

```
X-RateLimit-Limit: 10          # 当前时间窗口最大请求数
X-RateLimit-Remaining: 8       # 剩余可用请求数
X-RateLimit-Reset: 60          # 重置时间（秒）
```

### 429错误响应

当触发限流时，返回：

```json
{
  "error": "请求过于频繁，请稍后再试",
  "retryAfter": 45
}
```

---

## ⚡ 前端API客户端

### 核心特性

1. **自动限流**：客户端自行控制请求频率
2. **请求队列**：超过限制时自动排队
3. **指数退避重试**：失败后智能重试
4. **智能缓存**：GET请求自动缓存
5. **统计监控**：实时查看API使用情况

### 配置选项

```javascript
const apiClient = new APIClient(baseURL, {
    maxRequests: 10,           // 每分钟最大请求数
    windowMs: 60 * 1000,       // 时间窗口（1分钟）
    queueEnabled: true,        // 启用队列
    queueMaxSize: 5,           // 最大队列大小
    maxRetries: 3,             // 最大重试次数
    initialDelay: 1000,        // 初始延迟（ms）
    maxDelay: 10000,           // 最大延迟（ms）
    backoffMultiplier: 2,      // 退避倍数
    cacheEnabled: true,        // 启用缓存
    cacheTTL: 2 * 60 * 1000    // 缓存有效期（2分钟）
});
```

### 使用示例

#### 基本调用
```javascript
// GET请求
const goals = await apiClient.get('/goals');

// POST请求
const newGoal = await apiClient.post('/goals', {
    name: '新目标',
    targetDays: 30,
    completedDays: 0
});

// PUT请求
await apiClient.put(`/goals/${id}`, goal);

// DELETE请求
await apiClient.delete(`/goals/${id}`);
```

#### 缓存控制
```javascript
// 强制不使用缓存
const freshData = await apiClient.get('/goals', { useCache: false });

// 清理缓存
apiClient.clearCache();
```

#### 错误处理
```javascript
try {
    const data = await apiClient.get('/goals');
} catch (error) {
    if (error.message.includes('429')) {
        // 限流错误
        console.log('请求过于频繁，请稍后再试');
    } else {
        // 其他错误
        console.error('请求失败:', error.message);
    }
}
```

#### 查看统计信息
```javascript
const stats = apiClient.getStats();
console.log(stats);
// {
//     totalRequests: 150,
//     successfulRequests: 148,
//     failedRequests: 2,
//     rateLimited: 5,
//     cachedHits: 20,
//     queueSize: 0,
//     cacheSize: 10,
//     currentRequests: 3
// }
```

---

## 🎯 优化策略

### 1. 请求合并

**不好的做法**：
```javascript
// ❌ 频繁请求
for (let goal of goals) {
    await apiClient.put(`/goals/${goal.id}`, goal);
}
```

**好的做法**：
```javascript
// ✅ 批量更新（如果API支持）
await apiClient.post('/goals/batch-update', goals);
```

### 2. 缓存优化

```javascript
// GET请求自动缓存2分钟
const goals = await apiClient.get('/goals', { useCache: true });

// 强制刷新
const freshGoals = await apiClient.get('/goals', { useCache: false });
```

### 3. 避免重复请求

```javascript
// 使用防抖（debounce）或节流（throttle）
let updateTimeout;
function onGoalChange(goal) {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        apiClient.put(`/goals/${goal.id}`, goal);
    }, 500); // 延迟500ms，避免频繁更新
}
```

### 4. 离线支持

```javascript
// 即使离线也能操作，恢复连接后自动同步
async function updateGoal(goal) {
    try {
        await apiClient.put(`/goals/${goal.id}`, goal);
    } catch (error) {
        // 保存到待同步队列
        saveToSyncQueue(goal);
        showToast('已保存到本地，网络恢复后自动同步');
    }
}
```

---

## 📊 与StepFun API集成建议

### 配置AI限流

```javascript
// 创建专用的AI API客户端
const aiClient = new APIClient('https://api.stepfun.com', {
    maxRequests: 10,        // StepFun免费版限制
    windowMs: 60 * 1000,
    queueEnabled: true,
    queueMaxSize: 3,
    maxRetries: 2,
    cacheEnabled: false     // AI响应通常不缓存
});

// 调用AI接口
async function askAI(question) {
    try {
        const response = await aiClient.post('/chat', {
            model: 'step-1',
            messages: [{ role: 'user', content: question }]
        });
        return response;
    } catch (error) {
        if (error.message.includes('429')) {
            // 达到StepFun限制
            showUpgradePrompt(); // 提示用户充值升级
        }
        throw error;
    }
}
```

### 优雅降级

```javascript
async function generateInsights(goals) {
    // 1. 首先尝试使用缓存
    const cacheKey = 'insights_' + goals.hashCode();
    const cached = apiClient.getFromCache(cacheKey);
    if (cached) return cached;

    // 2. 检查是否达到StepFun限制
    const stats = aiClient.getStats();
    if (stats.rateLimited > 0) {
        // 使用本地简单算法替代
        return generateSimpleInsights(goals);
    }

    // 3. 尝试调用AI
    try {
        const insights = await aiClient.post('/analyze', { goals });
        return insights;
    } catch (error) {
        // 4. 降级到本地算法
        return generateSimpleInsights(goals);
    }
}
```

---

## 🔧 监控和调试

### 启用调试日志

```javascript
// 在浏览器控制台
apiClient.debug = true;  // 开启详细日志

// 查看统计
console.log(apiClient.getStats());
```

### 监控限流事件

```javascript
// 监听队列变化
setInterval(() => {
    const stats = apiClient.getStats();
    if (stats.rateLimited > 0) {
        console.warn(`当前已触发${stats.rateLimited}次限流`);
    }
}, 60000); // 每分钟检查一次
```

---

## 📋 检查清单

部署前确保：

- [ ] 后端限流中间件已启用（server.js）
- [ ] 前端使用api-client.js而非直接fetch
- [ ] JWT_SECRET已修改为强密码
- [ ] HTTPS已配置（生产环境）
- [ ] 数据备份机制就绪
- [ ] 监控告警设置完成

---

## 🚨 故障排除

### 问题1：频繁触发429错误

**原因**：请求过于频繁
**解决**：
1. 检查是否有多余的重复请求
2. 增加缓存时间
3. 调整限流阈值（`maxRequests`）
4. 检查是否应该在本地处理某些请求

### 问题2：请求卡住不响应

**原因**：队列积压
**解决**：
```javascript
// 清空队列
apiClient.clearQueue();

// 或增加队列大小
const client = new APIClient(API_URL, {
    queueMaxSize: 20  // 增大队列
});
```

### 问题3：缓存不更新

**原因**：缓存TTL过长
**解决**：
```javascript
// 强制刷新
await apiClient.get('/goals', { useCache: false });

// 或清理缓存
apiClient.clearCache();
```

---

## 💡 最佳实践总结

1. **始终使用apiClient**：不要直接使用fetch/axios
2. **合理设置缓存**：GET请求使用缓存，POST/PUT/DELETE使缓存失效
3. **添加用户反馈**：当请求排队时显示加载状态
4. **实现离线支持**：使用localStorage保存待同步数据
5. **监控API使用**：定期查看统计信息
6. **设置警报**：当rateLimited次数过多时通知

---

需要我帮你调整限流参数或添加其他优化功能吗？