const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\User\\Desktop\\projects\\mosaic-wall\\frontend\\src';

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            if (content.includes('revalidate:')) {
                // Replace any revalidate: X with revalidate: 0
                content = content.replace(/revalidate: \d+/g, 'revalidate: 0');
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
