const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/',
    method: 'GET'
}, (res) => {
    console.log('✅ Server is running! Status:', res.statusCode);
    res.on('data', () => {});
    res.on('end', () => {
        console.log('✅ You can now access the app at http://localhost:4000');
    });
});

req.on('error', (e) => {
    console.error('❌ Connection failed:', e.message);
});

req.end();
