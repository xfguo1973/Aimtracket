const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    console.log('Received GET / request');
    res.send('Hello World!');
});

app.get('/api/health', (req, res) => {
    console.log('Received GET /api/health request');
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/test', (req, res) => {
    console.log('Received POST /api/test request:', req.body);
    res.json({ received: req.body, message: 'OK' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://localhost:${PORT}`);
    
    const http = require('http');
    const testReq = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/health',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Self-test passed:', data);
        });
    });
    
    testReq.on('error', (e) => {
        console.error('Self-test failed:', e.message);
    });
    
    testReq.end();
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

server.on('close', () => {
    console.log('Server closed');
});

process.on('exit', (code) => {
    console.log('Process exiting with code:', code);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM');
    server.close();
});

process.on('SIGINT', () => {
    console.log('Received SIGINT');
    server.close();
});

setInterval(() => {
    console.log('Server still running at', new Date().toISOString());
}, 5000);
