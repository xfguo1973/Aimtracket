const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/test',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response Body:', data);
    });
});

req.on('error', (e) => {
    console.error('Connection error:', e.message);
    console.error('Error code:', e.code);
});

req.end();

// 超时处理
setTimeout(() => {
    console.log('Timeout: No response received');
    req.destroy();
}, 3000);
