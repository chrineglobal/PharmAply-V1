const fs = require('fs');
let content = fs.readFileSync('src/components/SearchHeroBanner.tsx', 'utf8');

// 1. Replace the promotional banner section completely
const promoStart = content.indexOf('{/* 1. PROMOTIONAL HERO BANNER */}');
const promoEnd = content.indexOf('{/* 2. PRESCRIPTION UPLOAD BANNER */}');

if (promoStart !== -1 && promoEnd !== -1) {
    const newPromo = `{/* 1. PROMOTIONAL HERO BANNER */}
      <div id="search-promo-banner-wrapper" className="relative">
        <div 
          id="search-promo-banner" 
          className="rounded-[32px] p-6 text-white shadow-sm relative overflow-hidden flex items-center min-h-[160px]"
          style={{ background: 'linear-gradient(135deg, var(--app-primary-color), #0d9488)' }}
        >
          {/* Background pills */}
          <div className="absolute -bottom-6 -left-4 w-24 h-10 rounded-full border-4 border-white/10 rotate-45 backdrop-blur-sm z-0" />
          <div className="absolute bottom-8 left-16 w-8 h-16 rounded-full border-4 border-white/10 -rotate-12 backdrop-blur-sm z-0" />
          <div className="absolute top-4 left-32 w-4 h-4 rounded-full bg-white/10 z-0" />

          {/* Texts */}
          <div className="relative z-10 flex flex-col gap-3 max-w-[60%]">
            <h2 className="text-[22px] sm:text-2xl font-black text-white leading-[1.15] tracking-tight">
              {t('search_hero.order_simply', 'Vos médicaments en 1 clic')}
            </h2>
          </div>

          {/* Badge 24/7 at bottom right (before the bottle) */}
          <div className="absolute bottom-2 right-[25%] sm:right-[30%] w-14 h-14 z-20 drop-shadow-lg -rotate-12">
            <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
              <path d="M50 2 L58 14 L72 10 L76 24 L90 24 L88 38 L100 46 L92 58 L98 72 L84 76 L84 90 L70 86 L60 98 L48 88 L36 98 L26 86 L12 90 L12 76 L-2 72 L4 58 L-4 46 L8 38 L6 24 L20 24 L24 10 L38 14 Z" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--app-primary-color)]">
              <span className="text-[14px] font-black leading-none tracking-tight">{t('search_hero.badge_247', '24/7')}</span>
              <span className="text-[8px] font-bold leading-none mt-0.5">{t('search_hero.badge_avail', 'DISPO')}</span>
            </div>
          </div>
        </div>
        
        {/* Overflowing Pill Bottle top right */}
        <img 
          src="/pill-bottle.png" 
          alt="" 
          className="absolute -top-6 -right-2 w-32 h-auto object-contain drop-shadow-2xl z-30 pointer-events-none" 
          onError={(e) => { e.currentTarget.style.display = "none"; }} 
        />
      </div>

      `;
    content = content.substring(0, promoStart) + newPromo + content.substring(promoEnd);
}

// 2. Replace the prescription upload banner icon
content = content.replace(
  '<FileText size={28} strokeWidth={2.5} />',
  '<img src="/prescription-3d.png" alt="" className="w-10 h-10 object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} /><FileText size={28} strokeWidth={2.5} className="hidden" />'
);

// Optional: fix any double spacing or syntax issues in the output
fs.writeFileSync('src/components/SearchHeroBanner.tsx', content);
console.log("SearchHeroBanner patched.");
