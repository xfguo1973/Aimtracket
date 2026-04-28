const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/health',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log('✓ Success! Status Code:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('✓ Response:', data);
    });
});

req.on('error', (e) => {
    console.error('✗ Connection error:', e.message);
});

req.end();
