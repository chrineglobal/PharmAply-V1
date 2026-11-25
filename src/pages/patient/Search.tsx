import React, { useState, useEffect } from "react";
import { ArrowLeft, SlidersHorizontal, Pill, Clock, X, Navigation, MapPin, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, getDocs, limit, where, addDoc, deleteDoc, doc } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useTranslation } from "react-i18next";
import { useAuth } from "../../components/AuthProvider";
import toast from 'react-hot-toast';
import { ProductCard } from '../../components/ProductCard';
import { getCategoryIcon } from '../../lib/icons';
import { StepMedicationSearchModal } from '../../components/patient/StepMedicationSearchModal';

// Formule Haversine pour calculer la distance géographique en km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function PatientSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [deduplicatedProducts, setDeduplicatedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('wishlist') || '{}');
    } catch {
      return {};
    }
  });

  // Géolocalisation du patient pour le tri par proximité
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Coordonnées par défaut (Douala)
          setUserLocation({ lat: 4.0511, lng: 9.7679 });
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    } else {
      setUserLocation({ lat: 4.0511, lng: 9.7679 });
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      saveRecentSearch(initialQuery);
    }
  }, [initialQuery]);

  const saveRecentSearch = (qStr: string) => {
    if (!qStr.trim()) return;
    const updated = [qStr.trim(), ...recentSearches.filter(s => s !== qStr.trim())].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const removeRecentSearch = (e: React.MouseEvent, qStr: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== qStr);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRecentSearch(searchQuery);
  };

    const handleHeartClick = async (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    if (!user) {
      toast(t('login_required', 'Veuillez vous connecter pour ajouter aux favoris'));
      return;
    }
    
    const isWished = wishlist[product.id];
    
    const updatedWishlist = { ...wishlist, [product.id]: !isWished };
    setWishlist(updatedWishlist); // Optimistic UI
    
    try {
      if (isWished) {
        // Find and delete the favorite doc
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('productId', '==', product.id));
        const snap = await getDocs(q);
        snap.docs.forEach(async (d) => {
          await deleteDoc(doc(db, 'favorites', d.id));
        });
      } else {
        // Add to favorites
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          productId: product.id,
          product: product,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to update favorites', err);
      // Revert optimistic update
      setWishlist({ ...wishlist, [product.id]: isWished });
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchFavs = async () => {
      try {
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const favsMap: Record<string, boolean> = {};
        snap.docs.forEach(d => {
          favsMap[d.data().productId] = true;
        });
        setWishlist(favsMap);
      } catch (err) {
        console.error('Error fetching favorites', err);
      }
    };
    fetchFavs();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Récupération des produits et pharmacies actives
        const [snapshotProducts, snapshotPharmacies, snapshotCategories] = await Promise.all([
          getDocs(query(collection(db, 'products'), limit(300))),
          getDocs(query(collection(db, 'pharmacies'), where('status', '==', 'approved'), limit(200))),
          getDocs(query(collection(db, 'ux_categories'), limit(20)))
        ]);

        const rawProducts = snapshotProducts.docs.map(d => ({ id: d.id, ...d.data() }));
        const pharmaciesMap = new Map<string, any>();
        snapshotPharmacies.docs.forEach(docSnap => {
          pharmaciesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });

        setCategories(snapshotCategories.docs.map(d => ({ id: d.id, ...d.data() })));

        // 2. Dédoublonnage & enrichissement de proximité masqué
        // Groupe par clé globale de médicament (productId / globalId / commercial_name)
        const productGroups = new Map<string, any>();

        const patientLat = userLocation?.lat || 4.0511;
        const patientLng = userLocation?.lng || 9.7679;

        rawProducts.forEach((p: any) => {
          // Ne conserver que si stock disponible en pharmacie
          const stock = Number(p.stock ?? 0);
          if (stock <= 0) return;

          const groupKey = (p.productId || p.global_product_id || p.commercial_name || p.name || p.id).trim().toLowerCase();
          const pharmacy = p.pharmacyId ? pharmaciesMap.get(p.pharmacyId) : null;

          const phLat = Number(pharmacy?.latitude || pharmacy?.lat || 4.0511);
          const phLng = Number(pharmacy?.longitude || pharmacy?.lng || 9.7679);
          const distance = calculateDistanceKm(patientLat, patientLng, phLat, phLng);
          const price = parseFloat(p.price) || 0;

          if (!productGroups.has(groupKey)) {
            productGroups.set(groupKey, {
              ...p,
              // Privacy : Nettoyage strict de toute information directe de la pharmacie
              pharmacyId: p.pharmacyId, // conservé en interne pour le panier/checkout
              pharmacyName: undefined,
              pharmacy_name: undefined,
              pharmacyAddress: undefined,
              pharmacyPhone: undefined,
              distance_km: Math.round(distance * 10) / 10,
              min_price: price,
              price: price,
              totalStockAvailable: stock,
            });
          } else {
            const existing = productGroups.get(groupKey);
            // Retenir la distance minimale et le meilleur prix
            if (distance < existing.distance_km) {
              existing.distance_km = Math.round(distance * 10) / 10;
              existing.pharmacyId = p.pharmacyId;
            }
            if (price > 0 && (existing.price === 0 || price < existing.price)) {
              existing.price = price;
              existing.min_price = price;
            }
            existing.totalStockAvailable += stock;
          }
        });

        // Tri initial par proximité géographique
        const deduplicatedList = Array.from(productGroups.values()).sort(
          (a, b) => (a.distance_km || 0) - (b.distance_km || 0)
        );

        setDeduplicatedProducts(deduplicatedList);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userLocation]);

  const sq = searchQuery.toLowerCase();

  const filteredProducts = deduplicatedProducts.filter(p => 
    (p.name?.toLowerCase() || '').includes(sq) || 
    (p.commercial_name?.toLowerCase() || '').includes(sq) || 
    (p.dci?.toLowerCase() || '').includes(sq) || 
    (p.category?.toLowerCase() || '').includes(sq) ||
    (p.description?.toLowerCase() || '').includes(sq) ||
    (p.scientific_name?.toLowerCase() || '').includes(sq) ||
    (p.active_ingredient?.toLowerCase() || '').includes(sq) ||
    (p.brand?.toLowerCase() || '').includes(sq) ||
    (Array.isArray(p.symptoms) && p.symptoms.some((sym: string) => sym.toLowerCase().includes(sq)))
  );

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-[#0A3D3B] px-6 pt-12 pb-4 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250]">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] rounded-full transition-colors">
            <ArrowLeft size={24} className="text-[#0A3D3B] dark:text-white" />
          </button>
          <form className="flex-1 relative" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              enterKeyHint="search"
              inputMode="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
              placeholder={t('search_products_desc', 'Rechercher un médicament, DCI, catégorie...')}
              className="w-full min-h-[54px] sm:min-h-[58px] bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] py-4 px-5 rounded-full text-[15px] sm:text-base focus:outline-none focus:ring-2 focus:ring-[#0E7673]/30 dark:focus:ring-[#38B794]/30 text-[#0A3D3B] dark:text-white placeholder-[#5C807F] dark:placeholder-[#9FC8C7]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit(e);
                  (document.activeElement as HTMLElement)?.blur();
                }
              }}
            />
          </form>
          <button 
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-ai-pharmacist', {
                detail: { query: searchQuery ? `Conseils et disponibilité pour : ${searchQuery}` : undefined }
              }));
            }}
            title="Assistant Pharmacien IA"
            className="p-3.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full shadow-sm active:scale-95 transition"
          >
            <Sparkles size={20} className="animate-pulse" />
          </button>
        </div>

        {/* Indicateur de localisation discrète */}
        <div className="flex items-center gap-1.5 text-xs text-[#5C807F] dark:text-[#9FC8C7] pl-1">
          <MapPin size={13} className="text-[#0E7673] dark:text-[#38B794]" />
          <span>Tri par proximité automatique • Place de marché sécurisée</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Step-by-Step Medication Search & Map Banner */}
        <div 
          onClick={() => setIsStepModalOpen(true)}
          className="bg-[#0E7673] text-white p-4 rounded-3xl cursor-pointer hover:bg-[#0A5A58] hover:shadow-lg transition-all flex items-center justify-between gap-4 border border-[#145250]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 text-[#D7F1EA]">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm text-white truncate">
                Recherche groupée par étapes & Carte des pharmacies
              </h4>
              <p className="text-xs text-[#D7F1EA] truncate">
                Sélectionnez vos médicaments et trouvez les pharmacies avec 100% de stock disponible
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="px-4 py-2 bg-[#D7F1EA] text-[#0A3D3B] hover:bg-[#38B794] text-xs font-extrabold rounded-full shrink-0 shadow-xs active:scale-95 transition"
          >
            Lancer
          </button>
        </div>

        {/* Filtres par catégorie */}
        <div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSearchQuery(cat.name)}
                className={`whitespace-nowrap border px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  searchQuery.toLowerCase() === cat.name.toLowerCase() 
                    ? 'bg-[#0E7673] text-white border-[#0E7673]' 
                    : 'bg-white dark:bg-[#0A3D3B] border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#D7F1EA]/50 dark:hover:bg-[#0E4A47]'
                }`}
              >
                <div className={searchQuery.toLowerCase() === cat.name.toLowerCase() ? 'opacity-100' : 'opacity-80'}>
                  {getCategoryIcon(cat.name, 14, "")}
                </div>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {!searchQuery && recentSearches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className="text-[#5C807F] dark:text-[#9FC8C7]" />
              <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm">{t('recent_searches', 'Recherches récentes')}</h3>
            </div>
            <div className="flex flex-col gap-2">
              {recentSearches.map((sqStr, idx) => (
                <div key={idx} onClick={() => setSearchQuery(sqStr)} className="flex items-center justify-between py-2 px-3 hover:bg-white dark:hover:bg-[#0A3D3B] rounded-xl cursor-pointer group transition-colors border border-transparent hover:border-[#CFE4E3] dark:hover:border-[#145250]">
                  <span className="text-[#0A3D3B] dark:text-[#D7F1EA] text-sm font-medium">{sqStr}</span>
                  <button onClick={(e) => removeRecentSearch(e, sqStr)} className="text-[#5C807F] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des produits uniques classés par proximité */}
        {loading ? (
          <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] text-center py-8">{t('loading_data', 'Chargement du catalogue...')}</p>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-[#0E7673] dark:text-[#38B794]" />
                <h3 className="font-bold text-[#0A3D3B] dark:text-white">
                  {searchQuery ? t('relevant_products', 'Médicaments disponibles') : t('suggested_products', 'Médicaments à proximité')}
                </h3>
              </div>
              <span className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                {filteredProducts.length} référence{filteredProducts.length > 1 ? 's' : ''}
              </span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250]">
                <p className="text-[#0A3D3B] dark:text-white font-semibold mb-1">
                  {t('no_results', 'Aucun médicament trouvé')}
                </p>
                <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7]">
                  {t('no_results_desc', 'Essayez un autre mot-clé ou filtrez par catégorie.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => (
                  <div key={product.id}>
                    <ProductCard 
                      product={product} 
                      basePath="/patient/product" 
                      showSaleBadge={false} 
                      onHeartClick={handleHeartClick}
                      isWishlisted={!!wishlist[product.id]}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-Step Medication Search Modal */}
      <StepMedicationSearchModal
        isOpen={isStepModalOpen}
        onClose={() => setIsStepModalOpen(false)}
        initialQuery={searchQuery}
      />
    </div>
  );
}

