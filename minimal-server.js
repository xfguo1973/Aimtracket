const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
        return;
    }
    
    if (req.url === '/api/register' && req.method === 'POST') {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            try {
                const body = JSON.parse(data);
                console.log('Register:', body.username);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: '注册成功', username: body.username }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '无效数据' }));
            }
        });
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

console.log('Server starting...');
