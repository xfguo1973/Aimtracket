const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
    console.log(`Server running on http://localhost:${PORT}`);
    
    // 测试自连接
    const http = require('http');
    const testReq = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/test',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Self-test response:', data);
        });
    });
    
    testReq.on('error', (e) => {
        console.error('Self-test failed:', e.message);
    });
    
    testReq.end();
});
