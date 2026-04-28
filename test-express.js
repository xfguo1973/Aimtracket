const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

app.get('/test', (req, res) => {
    res.send('Express test successful!');
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Express test server running on http://127.0.0.1:${PORT}`);
});
