const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

// The user wants the whole app to use the same font.
css = css.replace(/--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;/, '--font-sans: "Poppins", ui-sans-serif, system-ui, sans-serif;');
css = css.replace(/--font-body: "Inter", ui-sans-serif, system-ui, sans-serif;/, '--font-body: "Poppins", ui-sans-serif, system-ui, sans-serif;');

// Replace all font-sans references with just Poppins
fs.writeFileSync('src/index.css', css);
