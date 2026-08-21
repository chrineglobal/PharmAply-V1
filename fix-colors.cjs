const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replaces all color references to the CSS variable
            content = content.replace(/bg-indigo-600/g, 'bg-[var(--app-primary-color)]');
            content = content.replace(/bg-indigo-500/g, 'bg-[var(--app-primary-color)]/80');
            content = content.replace(/bg-indigo-700/g, 'bg-[var(--app-primary-color)]');
            content = content.replace(/bg-\[\#194B4B\]/g, 'bg-[var(--app-primary-color)]');
            
            content = content.replace(/text-indigo-600/g, 'text-[var(--app-primary-color)]');
            content = content.replace(/text-indigo-500/g, 'text-[var(--app-primary-color)]');
            content = content.replace(/text-indigo-400/g, 'text-[var(--app-primary-color)]');
            content = content.replace(/text-indigo-700/g, 'text-[var(--app-primary-color)]');
            content = content.replace(/text-indigo-900/g, 'text-[var(--app-primary-color)]');
            content = content.replace(/text-\[\#194B4B\]/g, 'text-[var(--app-primary-color)]');
            
            content = content.replace(/border-indigo-600/g, 'border-[var(--app-primary-color)]');
            content = content.replace(/border-indigo-500/g, 'border-[var(--app-primary-color)]');
            content = content.replace(/border-\[\#194B4B\]/g, 'border-[var(--app-primary-color)]');

            content = content.replace(/fill-indigo-600/g, 'fill-[var(--app-primary-color)]');
            content = content.replace(/fill-\[\#194B4B\]/g, 'fill-[var(--app-primary-color)]');
            
            content = content.replace(/ring-indigo-500/g, 'ring-[var(--app-primary-color)]');
            content = content.replace(/ring-indigo-600/g, 'ring-[var(--app-primary-color)]');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    }
}
processDir(path.join(process.cwd(), 'src'));
