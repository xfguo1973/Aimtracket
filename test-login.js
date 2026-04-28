const http = require('http');

const postData = JSON.stringify({
    username: 'testuser',
    password: 'test123456'
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log('状态码:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('响应:', data);
        if (res.statusCode === 200) {
            console.log('\n✅ 登录测试成功！');
        }
    });
});

req.on('error', (e) => {
    console.error('请求错误:', e.message);
});

req.write(postData);
req.end();
