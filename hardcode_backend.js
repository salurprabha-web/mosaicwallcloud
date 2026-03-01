const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\User\\Desktop\\projects\\mosaic-wall\\frontend\\src';
const verifiedUrl = "'https://mosaic-wall-backend.salurprabha.workers.dev'";

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            // Look for patterns like:
            // const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '...';
            // const backend = process.env.NEXT_PUBLIC_BACKEND_URL || '...';
            // const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '...';
            
            const regex = /process\.env\.NEXT_PUBLIC_BACKEND_URL\s*\|\|\s*'[^']*'/g;
            const regexDouble = /process\.env\.NEXT_PUBLIC_BACKEND_URL\s*\|\|\s*"[^"]*"/g;
            
            if (regex.test(content) || regexDouble.test(content)) {
                content = content.replace(regex, verifiedUrl).replace(regexDouble, verifiedUrl);
                changed = true;
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

walk(targetDir);
