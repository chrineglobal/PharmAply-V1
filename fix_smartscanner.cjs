const fs = require('fs');

let content = fs.readFileSync('src/pages/patient/SmartScanner.tsx', 'utf8');

// Replace hardcoded dark mode colors in the History tab and the entire page

content = content.replace(/bg-zinc-950/g, 'bg-slate-50 dark:bg-zinc-950');
content = content.replace(/text-white/g, 'text-gray-900 dark:text-white');
content = content.replace(/bg-zinc-900\/90/g, 'bg-white dark:bg-zinc-900/90');
content = content.replace(/bg-zinc-900/g, 'bg-white dark:bg-zinc-900');
content = content.replace(/border-zinc-800/g, 'border-gray-200 dark:border-zinc-800');
content = content.replace(/text-zinc-400/g, 'text-gray-500 dark:text-zinc-400');
content = content.replace(/bg-zinc-800/g, 'bg-gray-100 dark:bg-zinc-800');
content = content.replace(/text-zinc-300/g, 'text-gray-700 dark:text-zinc-300');
content = content.replace(/text-zinc-500/g, 'text-gray-500 dark:text-zinc-500');
content = content.replace(/border-zinc-700/g, 'border-gray-200 dark:border-zinc-700');
content = content.replace(/text-zinc-200/g, 'text-gray-800 dark:text-zinc-200');
content = content.replace(/bg-zinc-950\/60/g, 'bg-gray-50 dark:bg-zinc-950/60');
content = content.replace(/border-zinc-800\/80/g, 'border-gray-100 dark:border-zinc-800/80');

// Fix the image fallback issue
content = content.replace(
  /<img src=\{item\.fileUrl\} alt="Ordonnance" className="w-full h-full object-cover" \/>/g,
  `<img src={item.fileUrl} alt="Ordonnance" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; if(e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.classList.remove('hidden'); }} />\n<FileText size={20} className="text-teal-500 hidden" />`
);

// We should also replace the `text-gray-900 dark:text-gray-900 dark:text-white` if it doubled up.
content = content.replace(/text-gray-900 dark:text-gray-900 dark:text-white/g, 'text-gray-900 dark:text-white');
content = content.replace(/bg-white dark:bg-white dark:bg-zinc-900/g, 'bg-white dark:bg-zinc-900');

fs.writeFileSync('src/pages/patient/SmartScanner.tsx', content);

