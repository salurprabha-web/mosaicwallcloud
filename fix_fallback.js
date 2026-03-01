const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\User\\Desktop\\projects\\mosaic-wall\\frontend\\src';
const oldFallback = "'http://localhost:3001'";
const oldFallbackDouble = '"http://localhost:3001"';
const productionUrl = "'https://mosaic-wall-backend.salurprabha.workers.dev'";

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            if (content.includes(oldFallback) || content.includes(oldFallbackDouble)) {
                content = content.split(oldFallback).join(productionUrl).split(oldFallbackDouble).join(productionUrl);
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
