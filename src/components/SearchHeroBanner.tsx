import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, FileText, ChevronRight, Sparkles, ShieldCheck, 
  Clock, Plus, Pill
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryIcon } from "../lib/icons";
import { useTheme } from "./ThemeProvider";
import { PatientSearchBar } from "./PatientSearchBar";

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
  onOpenStepSearch?: (queryText?: string) => void;
}

export function SearchHeroBanner({
  categories = [],
  products = [],
  onProductClick,
  onCategoryClick,
  onOpenStepSearch
}: SearchHeroBannerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const theme = useTheme();
  const primaryColor = theme.primaryColor || '#0E7673';
  const secondaryColor = theme.secondaryColor || '#38B794';

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
    <div id="search-hero-banner-container" className="space-y-6">
      
      {/* 1. CLEAN SEARCH BAR RIGHT BELOW THE #0E7673 HEADER (Page 13) */}
      <div id="patient-search-bar-between-banners" className="relative z-20">
        <PatientSearchBar onOpenStepSearch={onOpenStepSearch} />
      </div>

      {/* 2. TWO CLEAN QUICK ACTION CARDS: PRESCRIPTION & ON-DUTY PHARMACIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Prescription Upload Card */}
        <button 
          id="banner-btn-upload-prescription"
          onClick={() => navigate('/patient/prescription-upload')}
          className="group relative bg-white dark:bg-[#0A3D3B] rounded-3xl p-4 shadow-sm border border-[#CFE4E3] dark:border-[#145250] hover:border-[#0E7673] flex items-center gap-3.5 hover:shadow-md transition-all active:scale-[0.99] text-left"
        >
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#E7F1F1] dark:bg-[#062625] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center transition-transform group-hover:scale-105">
            <FileText size={22} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-0.5">
               <h3 className="text-sm sm:text-base font-bold text-[#0E7673] dark:text-white tracking-tight truncate">
                  {t('search_hero.medicine_prescription', 'Ordonnance médicale')}
               </h3>
               <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D7F1EA] text-[#0A3D3B] shrink-0">
                  Scan IA
               </span>
             </div>
             <p className="text-xs text-[#0A3D3B]/80 dark:text-[#CFE4E3] truncate leading-snug">
                {t('search_hero.upload_desc', "Téléchargez votre ordonnance en 1 clic")}
             </p>
          </div>
          <ChevronRight size={18} className="text-[#0E7673] dark:text-[#9FC8C7] shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* AI On-Duty Pharmacies Card */}
        <button 
          id="banner-btn-ai-pharmacist"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-ai-pharmacist', {
              detail: { query: 'Quelles sont les pharmacies de garde et ouvertes les plus proches de ma position ?' }
            }));
          }}
          className="group relative rounded-3xl p-4 shadow-sm bg-[#0E7673] border border-[#0E7673] flex items-center gap-3.5 hover:bg-[#0A5A58] hover:shadow-md transition-all active:scale-[0.99] text-left text-white overflow-hidden"
        >
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/15 flex items-center justify-center text-[#D7F1EA] transition-transform group-hover:scale-105">
             <Sparkles size={22} />
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-0.5">
               <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Pharmacies de garde
               </h3>
               <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#38B794] text-[#0A3D3B] shrink-0">
                 24h/24
               </span>
             </div>
             <p className="text-xs text-[#D7F1EA] truncate leading-snug">
                Trouver les officines ouvertes & itinéraires Maps
             </p>
          </div>
          <ChevronRight size={18} className="text-[#D7F1EA] shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 3. CLEAN BRAND BANNER */}
      <div id="search-promo-banner-wrapper" className="relative">
        <div 
          id="search-promo-banner" 
          className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] shadow-sm relative overflow-hidden flex items-center justify-between gap-4"
        >
          <div className="relative z-10 flex flex-col gap-2 max-w-[68%]">
            <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D7F1EA] text-[#0A3D3B] text-[11px] font-bold">
              <Clock size={12} className="text-[#0E7673]" />
              {t('search_hero.badge_247', '24/7')} · {t('search_hero.badge_avail', 'Disponible')}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0E7673] dark:text-white leading-snug">
              {t('search_hero.order_simply', 'Vos médicaments en 1 clic')}
            </h2>
            <p className="text-xs text-[#0A3D3B]/80 dark:text-[#CFE4E3] leading-relaxed">
              {t('slogan', 'Trouvez Commandez Recevez')} — livraison express depuis les officines agréées.
            </p>
          </div>

          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#E7F1F1] dark:bg-[#062625] flex items-center justify-center shrink-0 p-2">
            <img 
              src="/pill-bottle.png" 
              alt="" 
              className="w-full h-full object-contain" 
              onError={(e) => { e.currentTarget.style.display = "none"; }} 
            />
          </div>
        </div>
      </div>

      {/* 4. HORIZONTALLY SCROLLABLE PRODUCT CATEGORIES */}
      {categories.length > 0 && (
        <div id="hero-categories-section">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h3 className="font-bold text-[#0A3D3B] dark:text-white text-lg tracking-tight">
                {t('search_hero.product_categories', 'Catégories de produits')}
              </h3>
              <p className="text-xs text-[#0E7673] dark:text-[#9FC8C7]">
                {t('search_hero.scroll_health_needs', 'Faites défiler pour explorer par besoin de santé')}
              </p>
            </div>
            <button 
              id="btn-see-all-categories"
              onClick={() => navigate('/patient/search')} 
              className="text-xs font-bold text-[#0E7673] dark:text-[#38B794] hover:underline flex items-center gap-0.5"
            >
              <span>{t('search_hero.see_all', 'Tout voir')}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div 
            id="hero-categories-slider" 
            className="flex overflow-x-auto gap-3 hide-scrollbar -mx-5 sm:-mx-6 px-5 sm:px-6 pb-2 pt-1 snap-x scroll-smooth"
          >
            {categories.map((cat) => (
              <div 
                key={cat.id || cat.name} 
                id={`cat-card-${cat.id || cat.name.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => handleCategorySelect(cat)}
                className="flex flex-col flex-none w-[142px] sm:w-[156px] cursor-pointer group bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] p-4 rounded-3xl items-start snap-start hover:border-[#0E7673] hover:shadow-sm transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 bg-[#E7F1F1] dark:bg-[#062625] text-[#0E7673] dark:text-[#38B794] group-hover:scale-105 transition-transform">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-7 h-7 object-contain rounded-lg" />
                  ) : (
                    getCategoryIcon(cat.name, 22)
                  )}
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#0A3D3B] dark:text-white leading-tight mb-1 line-clamp-2">
                  {cat.name}
                </span>
                <span className="text-[11px] font-medium text-[#0E7673] dark:text-[#9FC8C7] line-clamp-1">
                  {cat.description || t('various_products', 'Voir les articles')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. PRODUCTS AVAILABLE IN PHARMACIES */}
      <div id="hero-general-products-section">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="font-bold text-[#0A3D3B] dark:text-white text-lg tracking-tight">
              {t('search_hero.essential_products', 'Médicaments & Produits Essentiels')}
            </h3>
            <p className="text-xs text-[#0E7673] dark:text-[#9FC8C7]">
              {t('search_hero.certified_catalog', 'Produits certifiés du catalogue')}
            </p>
          </div>
          <button 
            id="btn-see-all-products"
            onClick={() => navigate('/patient/search')} 
            className="text-xs font-bold text-[#0E7673] dark:text-[#38B794] hover:underline flex items-center gap-0.5"
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
                    className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${
                      isActive
                        ? "bg-[#0E7673] text-white shadow-sm"
                        : "bg-white dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-[#CFE4E3] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#E7F1F1]"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* 2-Column Product Grid (Page 13 clean white cards + #D7F1EA "En stock" badge) */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              {filteredProducts.slice(0, 8).map((product) => (
                <div 
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => handleProductSelect(product)}
                  className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-3xl p-3.5 flex flex-col justify-between cursor-pointer hover:border-[#0E7673] hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="w-full aspect-square bg-[#F5FAFA] dark:bg-[#062625] border border-[#E7F1F1] dark:border-[#145250] rounded-2xl mb-2.5 overflow-hidden flex items-center justify-center p-2 relative">
                      <span className="absolute top-2 left-2 bg-[#D7F1EA] text-[#0A3D3B] text-[10px] font-bold px-2.5 py-0.5 rounded-full z-10">
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
                        <div className="text-[#0E7673] dark:text-[#38B794]">
                          {getCategoryIcon(product.category, 36)}
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold text-[#0E7673] dark:text-white text-xs sm:text-sm line-clamp-1 transition-colors">
                      {product.commercial_name || product.name}
                    </h4>
                    <p className="text-[11px] text-[#0A3D3B]/75 dark:text-[#CFE4E3] line-clamp-1 mt-0.5">
                      {product.dosage || product.dci || product.category}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#E7F1F1] dark:border-[#145250] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#6EADAB] block font-medium">{t('search_hero.price', 'Prix')}</span>
                      <span className="font-bold text-sm text-[#0A3D3B] dark:text-[#38B794]">
                        {product.price ? `${Number(product.price).toLocaleString()} XAF` : t('search_hero.available', 'Disponible')}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#0E7673] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs">
                      <Plus size={15} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-6 bg-white dark:bg-[#0A3D3B] border border-dashed border-[#9FC8C7] dark:border-[#145250] rounded-3xl text-center space-y-2">
            <p className="text-sm font-bold text-[#0A3D3B] dark:text-white">
              {t('search_hero.no_products_category', 'Aucun produit actuellement dans cette catégorie')}
            </p>
            <p className="text-xs text-[#0E7673] dark:text-[#CFE4E3] max-w-xs mx-auto">
              {t('search_hero.use_search_or_upload', 'Utilisez la recherche ou transmettez votre ordonnance pour commander vos médicaments.')}
            </p>
          </div>
        )}

        <div className="pt-4">
          <button
            id="btn-explore-full-catalog"
            onClick={() => navigate('/patient/search')}
            className="w-full py-3.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Search size={15} />
            <span>{t('search_hero.explore_full_catalog', 'Explorer tout le catalogue de médicaments')}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
