const http = require('http');

console.log('Testing API registration...');

const postData = JSON.stringify({
    username: 'guoshan',
    password: '123456'
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response:', data);
        if (res.statusCode === 201) {
            console.log('\n✅ Registration successful!');
        } else if (res.statusCode === 400) {
            console.log('\n⚠️ Username already exists, testing login...');
            testLogin();
        }
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});

req.write(postData);
req.end();

function testLogin() {
    const loginData = JSON.stringify({
        username: 'guoshan',
        password: '123456'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    const loginReq = http.request(loginOptions, (res) => {
        console.log('Login Status:', res.statusCode);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Login Response:', data);
            if (res.statusCode === 200) {
                console.log('\n✅ Login successful!');
            }
        });
    });

    loginReq.on('error', (e) => {
        console.error('Login Error:', e.message);
    });

    loginReq.write(loginData);
    loginReq.end();
}