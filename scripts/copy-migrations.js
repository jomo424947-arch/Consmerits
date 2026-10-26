const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/main/db/migrations');
const destDir = path.resolve(__dirname, '../dist-electron/main/migrations');

if (!fs.existsSync(srcDir)) {
  console.error(`Migrations source dir not found: ${srcDir}`);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.sql'));
for (const file of files) {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
}
console.log(`✓ Copied ${files.length} migration files to ${destDir}`);
