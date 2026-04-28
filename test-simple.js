const http = require('http');

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log('Success! Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response received');
    });
});

req.on('error', (e) => {
    console.error('Connection failed:', e.message);
    console.error('Error code:', e.code);
});

req.end();
