const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running!\n');
});

server.listen(3000, '127.0.0.1', () => {
    console.log('Test server running on http://127.0.0.1:3000');
    
    // 测试自连接
    const testReq = http.request({
        hostname: '127.0.0.1',
        port: 3000,
        path: '/',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Self-test successful! Response:', data);
        });
    });
    
    testReq.on('error', (e) => {
        console.error('Self-test failed:', e.message);
    });
    
    testReq.end();
});
