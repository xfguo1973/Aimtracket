const http = require('http');

const postData = JSON.stringify({
    username: '郭珊珊',
    password: '123456'
});

const options = {
    hostname: '127.0.0.1',
    port: 4567,
    path: '/api/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log('✓ 状态码:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('✓ 响应:', data);
    });
});

req.on('error', (e) => {
    console.error('✗ 请求错误:', e.message);
});

req.write(postData);
req.end();
