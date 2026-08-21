const fs = require('fs');

let hero = fs.readFileSync('src/components/SearchHeroBanner.tsx', 'utf8');

// Fix badge position to prevent overlap
hero = hero.replace('left-[52%]', 'left-[65%]');
hero = hero.replace('w-[45%]', 'w-[40%]');
hero = hero.replace('max-w-[55%]', 'max-w-[50%]');

// Fix image alt text and add onError to hide it properly if not found
hero = hero.replace(
  '<img src="/pill-bottle.png" alt="Pill bottle" className="w-28 h-auto object-contain drop-shadow-xl rotate-12 mr-2" />',
  '<img src="/pill-bottle.png" alt="" className="w-32 h-auto object-contain drop-shadow-2xl rotate-12 mr-2" onError={(e) => { e.currentTarget.style.display = "none"; }} />'
);


fs.writeFileSync('src/components/SearchHeroBanner.tsx', hero);
