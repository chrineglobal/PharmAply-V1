const fs = require('fs');

let hero = fs.readFileSync('src/components/SearchHeroBanner.tsx', 'utf8');

// I need to replace the entire "PROMOTIONAL HERO BANNER" section up to "HORIZONTALLY SCROLLABLE PRODUCT CATEGORIES"
const promoStart = hero.indexOf('{/* 1. PROMOTIONAL HERO BANNER */}');
const promoEnd = hero.indexOf('{/* 2. HORIZONTALLY SCROLLABLE PRODUCT CATEGORIES */}');

if (promoStart !== -1 && promoEnd !== -1) {
  const newBanners = `      {/* 1. PROMOTIONAL HERO BANNER */}
      <div 
        id="search-promo-banner" 
        className="rounded-[32px] p-6 text-white shadow-sm relative overflow-hidden flex items-center min-h-[160px]"
        style={{ backgroundColor: 'var(--app-primary-color)' }}
      >
        {/* Abstract 3D-like Pills Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none flex items-center justify-end pr-2 overflow-hidden">
           {/* Big Pill Jar Glass effect */}
           <div className="relative w-28 h-32 mt-4 mr-2 rotate-[15deg]">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl shadow-xl z-10 flex items-center justify-center overflow-hidden">
                 {/* Inner pills */}
                 <div className="absolute top-4 left-2 rotate-45 text-white/90 drop-shadow-md"><Pill size={24} /></div>
                 <div className="absolute bottom-6 right-3 -rotate-12 text-white drop-shadow-md"><Pill size={28} /></div>
                 <div className="absolute bottom-4 left-4 rotate-90 text-white/70 drop-shadow-md"><Pill size={20} /></div>
                 
                 {/* Glass reflection */}
                 <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white/20 to-transparent skew-x-12"></div>
              </div>
              {/* Jar Cap */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-teal-500/80 backdrop-blur-md rounded-t-lg border-t border-x border-white/40 shadow-sm z-20"></div>
           </div>

           {/* Floating external pill */}
           <div className="absolute bottom-4 left-0 -rotate-45 text-white/90 drop-shadow-lg z-20">
              <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
                 <Pill size={24} className="text-white" />
              </div>
           </div>
        </div>

        {/* Badge / Sticker */}
        <div className="absolute top-1/2 left-[52%] -translate-x-1/2 -translate-y-1/2 w-16 h-16 z-20 drop-shadow-lg rotate-12">
          <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
            <path d="M50 2 L58 14 L72 10 L76 24 L90 24 L88 38 L100 46 L92 58 L98 72 L84 76 L84 90 L70 86 L60 98 L48 88 L36 98 L26 86 L12 90 L12 76 L-2 72 L4 58 L-4 46 L8 38 L6 24 L20 24 L24 10 L38 14 Z" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--app-primary-color)]">
            <span className="text-[16px] font-black leading-none tracking-tight">24/7</span>
            <span className="text-[9px] font-bold leading-none mt-0.5">DISPO</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-3 max-w-[55%]">
          <h2 className="text-[22px] sm:text-2xl font-black text-white leading-[1.15] tracking-tight">
            {t('search_hero.enhance_healthcare', 'Commandez vos médicaments en toute simplicité')}
          </h2>
        </div>
      </div>

      {/* 2. PRESCRIPTION UPLOAD BANNER */}
      <button 
        id="banner-btn-upload-prescription"
        onClick={() => navigate('/patient/prescription-upload')}
        className="w-full bg-white dark:bg-zinc-900 rounded-[32px] p-5 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4 hover:shadow-md transition active:scale-95 text-left"
      >
        <div className="w-16 h-16 shrink-0 rounded-full bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center text-[var(--app-primary-color)] dark:text-teal-400">
           <FileText size={28} strokeWidth={2.5} />
        </div>
        <div className="flex-1 pr-2">
           <h3 className="text-[17px] font-extrabold text-gray-900 dark:text-white mb-1 tracking-tight">
              {t('search_hero.medicine_prescription', 'Ordonnance médicale')}
           </h3>
           <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 leading-snug">
              {t('search_hero.upload_desc', "Téléchargez l'ordonnance de votre médecin et nous trouverons les médicaments pour vous")}
           </p>
        </div>
      </button>

      {/* 3. HORIZONTALLY SCROLLABLE PRODUCT CATEGORIES */}
`;
  
  const modified = hero.substring(0, promoStart) + newBanners + hero.substring(promoEnd + 57); // 57 is length of the comment
  fs.writeFileSync('src/components/SearchHeroBanner.tsx', modified);
} else {
  console.log("Could not find the markers");
}

