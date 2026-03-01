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
            
            // Match any pattern that looks like a backend URL assignment with a fallback
            // e.g. const backend = process.env.NEXT_PUBLIC_BACKEND_URL || '...';
            // or const backendUrl = ... || "..."
            const regex = /process\.env\.NEXT_PUBLIC_BACKEND_URL\s*\|\|\s*['"][^'"]*['"]/g;
            if (regex.test(content)) {
                content = content.replace(regex, verifiedUrl);
                changed = true;
            }
            
            // Also match where it might have been hardcoded already by me but maybe with a typo or different quote
            const previousHardcoded = /const\s+(backendUrl|backend|BACKEND_URL)\s*=\s*['"]https:\/\/mosaic-wall-backend\.salurprabha\.workers\.dev['"];/g;
            // No need to change if it's already exactly what we want, but let's ensure consistency
            
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

walk(targetDir);
