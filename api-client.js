/**
 * API 客户端 - 包含限流、队列、重试机制
 */
class APIClient {
    constructor(baseURL, options = {}) {
        this.baseURL = baseURL;
        this.token = null;

        // 限流配置
        this.rateLimit = {
            maxRequests: options.maxRequests || 10, // 每分钟最大请求数
            windowMs: options.windowMs || 60 * 1000, // 时间窗口（1分钟）
            queueEnabled: options.queueEnabled !== false, // 默认启用队列
            queueMaxSize: options.queueMaxSize || 5 // 最大队列大小
        };

        // 请求记录（滑动窗口）
        this.requestTimestamps = [];
        this.queue = [];
        this.processing = false;

        // 重试配置
        this.retryConfig = {
            maxRetries: options.maxRetries || 3,
            initialDelay: options.initialDelay || 1000,
            maxDelay: options.maxDelay || 10000,
            backoffMultiplier: options.backoffMultiplier || 2
        };

        // 缓存配置
        this.cacheEnabled = options.cacheEnabled !== false;
        this.cache = new Map();
        this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5分钟

        // 统计信息
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            rateLimited: 0,
            cachedHits: 0
        };
    }

    /**
     * 设置认证令牌
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * 生成请求键（用于去重和缓存）
     */
    getRequestKey(method, url, data) {
        const dataStr = data ? JSON.stringify(data) : '';
        return `${method}:${url}:${dataStr}`;
    }

    /**
     * 检查是否超过速率限制
     */
    isRateLimited() {
        const now = Date.now();
        const windowStart = now - this.rateLimit.windowMs;

        // 清理过期的时间戳
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => timestamp > windowStart
        );

        // 检查是否超过限制
        if (this.requestTimestamps.length >= this.rateLimit.maxRequests) {
            return {
                limited: true,
                retryAfter: Math.ceil(
                    (this.requestTimestamps[0] + this.rateLimit.windowMs - now) / 1000
                )
            };
        }

        return { limited: false };
    }

    /**
     * 记录请求
     */
    recordRequest() {
        this.requestTimestamps.push(Date.now());
    }

    /**
     * 指数退避延迟计算
     */
    calculateRetryDelay(attempt) {
        const delay = Math.min(
            this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelay
        );
        // 添加随机抖动，避免惊群效应
        return delay * (0.8 + Math.random() * 0.2);
    }

    /**
     * 从缓存获取
     */
    getFromCache(key) {
        if (!this.cacheEnabled) return null;

        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        this.stats.cachedHits++;
        return cached.data;
    }

    /**
     * 写入缓存
     */
    setCache(key, data) {
        if (!this.cacheEnabled) return;

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // 限制缓存大小
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 核心请求方法
     */
    async request(method, endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const key = this.getRequestKey(method, url, options.body);

        // 检查缓存（仅GET请求）
        if (method === 'GET' && options.useCache !== false) {
            const cached = this.getFromCache(key);
            if (cached) {
                console.log(`[APIClient] 缓存命中: ${endpoint}`);
                return cached;
            }
        }

        // 添加到队列
        return new Promise((resolve, reject) => {
            this.queue.push({
                method,
                url,
                options,
                key,
                resolve,
                reject,
                retryCount: 0,
                timestamp: Date.now()
            });

            // 处理队列
            this.processQueue();
        });
    }

    /**
     * 处理请求队列
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue[0];
            const now = Date.now();

            // 检查队列中的请求是否已超时
            if (now - item.timestamp > this.rateLimit.windowMs) {
                this.queue.shift();
                item.reject(new Error('请求超时，请重试'));
                continue;
            }

            // 检查速率限制
            const limitInfo = this.isRateLimited();
            if (limitInfo.limited) {
                // 等待限制重置
                const waitTime = limitInfo.retryAfter * 1000 + 1000; // 加1秒缓冲
                console.log(`[APIClient] 达到速率限制，等待 ${waitTime}ms`);

                // 重新排列队列（将当前项移到最后）
                this.queue.push(this.queue.shift());

                await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
                continue;
            }

            // 执行请求
            try {
                const response = await this.executeRequest(item);

                // 记录请求时间戳
                this.recordRequest();

                // 缓存GET请求结果
                if (item.method === 'GET' && item.options.useCache !== false) {
                    this.setCache(item.key, response);
                }

                this.stats.totalRequests++;
                this.stats.successfulRequests++;

                item.resolve(response);
            } catch (error) {
                this.stats.totalRequests++;
                this.stats.failedRequests++;

                // 处理重试逻辑
                if (this.shouldRetry(error) && item.retryCount < this.retryConfig.maxRetries) {
                    item.retryCount++;
                    const delay = this.calculateRetryDelay(item.retryCount);

                    console.log(`[APIClient] 请求失败，第${item.retryCount}次重试，延迟${Math.round(delay)}ms: ${error.message}`);

                    // 移到队列末尾并等待
                    this.queue.push(this.queue.shift());
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                item.reject(error);
            }

            // 移除已处理的请求
            this.queue.shift();

            // 处理请求间的延迟，避免突发流量
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        this.processing = false;
    }

    /**
     * 执行单个HTTP请求
     */
    async executeRequest(item) {
        const { method, url, options } = item;

        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, fetchOptions);

        // 检查HTTP状态
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // 忽略解析错误
            }

            // 特殊处理429状态码
            if (response.status === 429) {
                this.stats.rateLimited++;
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
                throw new Error(`请求过于频繁，请${Math.round(waitTime / 1000)}秒后重试`);
            }

            throw new Error(errorMessage);
        }

        // 处理无内容的响应
        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    /**
     * 判断是否应该重试
     */
    shouldRetry(error) {
        // 网络错误应该重试
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true;
        }

        // 5xx服务器错误应该重试
        if (error.message.includes('HTTP 5')) {
            return true;
        }

        // 429 限制应该重试（但会被延迟处理）
        if (error.message.includes('429') || error.message.includes('请求过于频繁')) {
            return true;
        }

        // 连接超时应该重试
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
            return true;
        }

        return false;
    }

    /**
     * GET请求
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, options);
    }

    /**
     * POST请求
     */
    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, { ...options, body: data });
    }

    /**
     * PUT请求
     */
    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, { ...options, body: data });
    }

    /**
     * PATCH请求
     */
    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, { ...options, body: data });
    }

    /**
     * DELETE请求
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, options);
    }

    /**
     * 清空队列
     */
    clearQueue() {
        const queuedRequests = this.queue.slice();
        this.queue = [];
        queuedRequests.forEach(item => {
            item.reject(new Error('请求已取消'));
        });
        this.processing = false;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            queueSize: this.queue.length,
            cacheSize: this.cache.size,
            currentRequests: this.requestTimestamps.length
        };
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            rateLimited: 0,
            cachedHits: 0
        };
    }
}

// 创建全局API客户端实例
const apiClient = new APIClient(APP_CONFIG.API_BASE_URL, {
    maxRequests: 10, // 匹配StepFun免费限制
    windowMs: 60 * 1000,
    queueEnabled: true,
    queueMaxSize: 5,
    maxRetries: 3,
    cacheEnabled: true,
    cacheTTL: 2 * 60 * 1000 // 2分钟缓存
});

// 导出供全局使用
window.apiClient = apiClient;