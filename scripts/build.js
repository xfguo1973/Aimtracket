const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const staticFiles = [
    'index.html',
    'auth.html',
    'habits.html',
    'config.js',
    'api-client.js'
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of staticFiles) {
    const source = path.join(root, file);
    if (!fs.existsSync(source)) {
        throw new Error(`Missing required static file: ${file}`);
    }
    fs.copyFileSync(source, path.join(dist, file));
}

fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`Built ${staticFiles.length} files into ${path.relative(root, dist)}`);
