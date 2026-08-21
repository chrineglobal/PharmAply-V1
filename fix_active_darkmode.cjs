const fs = require('fs');

let content = fs.readFileSync('src/pages/delivery/Active.tsx', 'utf8');

// The loading state:
content = content.replace(
  'bg-slate-900 text-white',
  'bg-white dark:bg-zinc-950 text-gray-900 dark:text-white'
);

content = content.replace(
  'text-slate-300',
  'text-gray-500 dark:text-slate-300'
);

// Map overlays
content = content.replace(
  /bg-slate-900\/95/g,
  'bg-white/95 dark:bg-slate-900/95'
);
content = content.replace(
  /bg-slate-900\/90/g,
  'bg-white/90 dark:bg-slate-900/90'
);
content = content.replace(
  /text-slate-300/g,
  'text-gray-600 dark:text-slate-300'
);
content = content.replace(
  /bg-slate-800/g,
  'bg-gray-100 dark:bg-slate-800'
);
content = content.replace(
  /bg-slate-700/g,
  'bg-gray-200 dark:bg-slate-700'
);
content = content.replace(
  /text-white/g, // Only replace if it's not already handled, let's be careful. Actually let's just let it be, white text on the map is sometimes fine, but the user complained about "le coté chauffeur dans la partie du chargement de deliveries" which is the loading screen.
  'text-gray-900 dark:text-white'
);
// Undo mistakes with text-white
content = content.replace(/text-gray-900 dark:text-gray-900 dark:text-white/g, 'text-gray-900 dark:text-white');
content = content.replace(/text-gray-900 dark:text-gray-900 dark:text-white/g, 'text-gray-900 dark:text-white'); // double check

fs.writeFileSync('src/pages/delivery/Active.tsx', content);

console.log("Active dark mode updated.");
