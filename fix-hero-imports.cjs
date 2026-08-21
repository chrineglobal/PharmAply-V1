const fs = require('fs');

let hero = fs.readFileSync('src/components/SearchHeroBanner.tsx', 'utf8');
if (!hero.includes('Pill')) {
  hero = hero.replace('Clock, Plus', 'Clock, Plus, Pill');
}
fs.writeFileSync('src/components/SearchHeroBanner.tsx', hero);
