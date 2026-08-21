import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, FileText, ChevronRight, Sparkles, ShieldCheck, 
  Clock, Plus, Pill
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryIcon } from "../lib/icons";
import { useTheme } from "./ThemeProvider";

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface GeneralProductItem {
  id: string;
  name: string;
  commercial_name?: string;
  dci?: string;
  dosage?: string;
  price?: number;
  category?: string;
  is_prescription_required?: boolean;
  is_essentiel?: boolean;
  image_url?: string;
  imageUrl?: string;
  image?: string;
  description?: string;
}

interface SearchHeroBannerProps {
  categories?: CategoryItem[];
  products?: GeneralProductItem[];
  onProductClick?: (product: GeneralProductItem) => void;
  onCategoryClick?: (category: CategoryItem) => void;
}

export function SearchHeroBanner({
  categories = [],
  products = [],
  onProductClick,
  onCategoryClick
}: SearchHeroBannerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const theme = useTheme();
  const primaryColor = theme.primaryColor || '#194B4B';
  const secondaryColor = theme.secondaryColor || '#F59E0B';

  const handleProductSelect = (product: GeneralProductItem) => {
    if (onProductClick) {
      onProductClick(product);
    } else {
      if (product.id && !product.id.startsWith("prod_")) {
        navigate(`/patient/product/${product.id}`);
      } else {
        const q = product.commercial_name || product.name || product.dci;
        navigate(`/patient/search?q=${encodeURIComponent(q || "")}`);
      }
    }
  };

  const handleCategorySelect = (cat: CategoryItem) => {
    if (onCategoryClick) {
      onCategoryClick(cat);
    } else {
      navigate(`/patient/search?q=${encodeURIComponent(cat.name)}`);
    }
  };

  const filteredProducts = selectedFilter === "all"
    ? products
    : products.filter(p => {
        const cat = (p.category || "").toLowerCase();
        return cat.includes(selectedFilter.toLowerCase());
      });

  return (
    <div id="search-hero-banner-container" className="space-y-7">
      
            {/* 1. PROMOTIONAL HERO BANNER */}
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

      {/* 2. PRESCRIPTION UPLOAD BANNER */}
      <button 
        id="banner-btn-upload-prescription"
        onClick={() => navigate('/patient/prescription-upload')}
        className="w-full bg-white dark:bg-zinc-900 rounded-[32px] p-5 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4 hover:shadow-md transition active:scale-95 text-left"
      >
        <div className="w-16 h-16 shrink-0 rounded-full bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center text-[var(--app-primary-color)] dark:text-teal-400">
           <img src="/prescription-3d.png" alt="" className="w-10 h-10 object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} /><FileText size={28} strokeWidth={2.5} className="hidden" />
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
   {categories.length > 0 && (
        <div id="hero-categories-section">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight">
                {t('search_hero.product_categories', 'Catégories de produits')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('search_hero.scroll_health_needs', 'Faites défiler pour explorer par besoin de santé')}
              </p>
            </div>
            <button 
              id="btn-see-all-categories"
              onClick={() => navigate('/patient/search')} 
              className="text-xs font-bold hover:underline flex items-center gap-0.5"
              style={{ color: primaryColor }}
            >
              <span>{t('search_hero.see_all', 'Tout voir')}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div 
            id="hero-categories-slider" 
            className="flex overflow-x-auto gap-3.5 hide-scrollbar -mx-6 px-6 pb-2 pt-1 snap-x scroll-smooth"
          >
            {categories.map((cat) => (
              <div 
                key={cat.id || cat.name} 
                id={`cat-card-${cat.id || cat.name.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => handleCategorySelect(cat)}
                className="flex flex-col flex-none w-[145px] sm:w-[160px] cursor-pointer group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-4 rounded-2xl items-start snap-start hover:shadow-sm transition-all duration-200"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gray-50 dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700 group-hover:scale-105 transition-transform"
                  style={{ color: primaryColor }}
                >
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-8 h-8 object-contain rounded-lg" />
                  ) : (
                    getCategoryIcon(cat.name, 24)
                  )}
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1 line-clamp-2">
                  {cat.name}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 line-clamp-1">
                  {cat.description || t('various_products', 'Voir les articles')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PRODUCTS AVAILABLE IN PHARMACIES */}
      <div id="hero-general-products-section">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight">
              {t('search_hero.essential_products', 'Médicaments & Produits Essentiels')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('search_hero.certified_catalog', 'Produits certifiés du catalogue')}
            </p>
          </div>
          <button 
            id="btn-see-all-products"
            onClick={() => navigate('/patient/search')} 
            className="text-xs font-bold hover:underline flex items-center gap-0.5"
            style={{ color: primaryColor }}
          >
            <span>{t('search_hero.catalog', 'Catalogue')}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {products.length > 0 ? (
          <>
            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 pt-1 -mx-1 px-1">
              {[
                { id: "all", label: t('search_hero.all_products', 'Tous les produits') },
                { id: "douleur", label: t('search_hero.pain_fever', 'Douleur & Fièvre') },
                { id: "matériel", label: t('search_hero.diagnostic_equipment', 'Matériel & Diagnostic') },
                { id: "premiers soins", label: t('search_hero.first_aid', 'Premiers Soins') }
              ].map(f => {
                const isActive = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    id={`filter-pill-${f.id}`}
                    onClick={() => setSelectedFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                      isActive
                        ? "text-white shadow-sm"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: isActive ? primaryColor : undefined
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* 2-Column Product Grid */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {filteredProducts.slice(0, 8).map((product) => (
                <div 
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => handleProductSelect(product)}
                  className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="w-full aspect-square bg-white dark:bg-zinc-800/80 border border-gray-100 dark:border-zinc-700/60 rounded-xl mb-2.5 overflow-hidden flex items-center justify-center p-2 relative shadow-xs">
                      <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10">
                        {t('search_hero.in_stock', 'En stock')}
                      </span>
                      {product.image_url || product.imageUrl || product.image ? (
                        <img 
                          src={product.image_url || product.imageUrl || product.image} 
                          alt={product.commercial_name || product.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div style={{ color: primaryColor }}>
                          {getCategoryIcon(product.category, 36)}
                        </div>
                      )}
                    </div>

                    <h4 
                      className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm line-clamp-1 transition-colors"
                    >
                      {product.commercial_name || product.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {product.dosage || product.dci || product.category}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">{t('search_hero.price', 'Prix')}</span>
                      <span className="font-extrabold text-sm" style={{ color: primaryColor }}>
                        {product.price ? `${Number(product.price).toLocaleString()} XAF` : t('search_hero.available', 'Disponible')}
                      </span>
                    </div>
                    <div 
                      className="w-7 h-7 rounded-lg text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus size={15} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-6 bg-gray-50 dark:bg-zinc-900 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl text-center space-y-2">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {t('search_hero.no_products_category', 'Aucun produit actuellement dans cette catégorie')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              {t('search_hero.use_search_or_upload', 'Utilisez la recherche ou transmettez votre ordonnance pour commander vos médicaments.')}
            </p>
          </div>
        )}

        <div className="pt-4">
          <button
            id="btn-explore-full-catalog"
            onClick={() => navigate('/patient/search')}
            className="w-full py-3.5 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-800 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <Search size={15} style={{ color: primaryColor }} />
            <span>{t('search_hero.explore_full_catalog', 'Explorer tout le catalogue de médicaments')}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
