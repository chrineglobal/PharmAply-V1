const fs = require('fs');

let content = fs.readFileSync('src/pages/patient/Checkout.tsx', 'utf8');

// Replace any hardcoded light mode colors that are lacking dark equivalents
content = content.replace(/bg-white([^a-zA-Z0-9_-])/g, 'bg-white dark:bg-zinc-900$1');
// if it becomes 'bg-white dark:bg-zinc-900 dark:bg-zinc-900' by accident, fix it
content = content.replace(/dark:bg-zinc-\d+ dark:bg-zinc-\d+/g, 'dark:bg-zinc-900');

content = content.replace(/text-gray-900([^a-zA-Z0-9_-])/g, 'text-gray-900 dark:text-white$1');
content = content.replace(/text-gray-800([^a-zA-Z0-9_-])/g, 'text-gray-800 dark:text-zinc-200$1');
content = content.replace(/text-gray-500([^a-zA-Z0-9_-])/g, 'text-gray-500 dark:text-zinc-400$1');
content = content.replace(/text-gray-400([^a-zA-Z0-9_-])/g, 'text-gray-400 dark:text-zinc-500$1');

content = content.replace(/border-gray-100([^a-zA-Z0-9_-])/g, 'border-gray-100 dark:border-zinc-800$1');
content = content.replace(/border-gray-200([^a-zA-Z0-9_-])/g, 'border-gray-200 dark:border-zinc-800$1');
content = content.replace(/bg-gray-50([^a-zA-Z0-9_-])/g, 'bg-gray-50 dark:bg-zinc-800$1');
content = content.replace(/bg-gray-100([^a-zA-Z0-9_-])/g, 'bg-gray-100 dark:bg-zinc-800$1');

// specific to dark:text-white dark:text-white etc.
content = content.replace(/dark:text-white dark:text-white/g, 'dark:text-white');
content = content.replace(/dark:text-zinc-200 dark:text-zinc-200/g, 'dark:text-zinc-200');

fs.writeFileSync('src/pages/patient/Checkout.tsx', content);

console.log("Checkout dark mode updated.");
