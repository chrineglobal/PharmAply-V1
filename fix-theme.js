const fs = require('fs');

const tpPath = 'src/components/ThemeProvider.tsx';
let tp = fs.readFileSync(tpPath, 'utf8');

// Ensure hover, focus, dark variants for primary colors are handled, or just replace all instances in code.
