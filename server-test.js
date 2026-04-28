const http = require('http');

const PORT = 4567;

const server = http.createServer((req, res) => {
    console.log(`收到请求: ${req.method} ${req.url}`);
    
    if (req.url === '/api/register' && req.method === 'POST') {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            try {
                const body = JSON.parse(data);
                console.log('注册数据:', body);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: '注册成功', username: body.username }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效的JSON' }));
            }
        });
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>目标追踪器</h1>');
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '未找到' }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    
    // 自测试
    const testReq = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('自测试成功:', data.trim());
        });
    });
    
    testReq.on('error', (e) => {
        console.error('自测试失败:', e.message);
    });
    
    testReq.end();
});

server.on('error', (e) => {
    console.error('服务器错误:', e.message);
});

console.log('服务器正在启动...');
