import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, MessageSquare } from "lucide-react";

import { collection, query, limit, getDocs, where } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeProvider';
import { useTranslation } from "react-i18next";
import { NotificationBell } from "../../components/NotificationBell";
import { DarkModeToggle } from "../../components/DarkModeToggle";
import { SearchHeroBanner, CategoryItem, GeneralProductItem } from '../../components/SearchHeroBanner';
import { StepMedicationSearchModal } from '../../components/patient/StepMedicationSearchModal';
import { PharmAplyLogo } from '../../components/common/PharmAplyLogo';

// Fallback admin categories if not yet created in Firestore
const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "cat_douleur", name: "Douleur & Fièvre", description: "Paracétamol, anti-inflammatoires" },
  { id: "cat_materiel", name: "Matériel & Diagnostic", description: "Thermomètres, gants, tensiomètres" },
  { id: "cat_premiers_soins", name: "Premiers Soins", description: "Antiseptiques, pansements, compresses" },
  { id: "cat_vitamines", name: "Vitamines & Énergie", description: "Vitamine C, Zinc, Magnésium" },
  { id: "cat_digestion", name: "Digestion & Transit", description: "Antiacides, antispasmodiques" },
  { id: "cat_respiration", name: "Respiration & ORL", description: "Sirops, sprays nasaux, pastilles" },
  { id: "cat_bebe", name: "Maternité & Bébé", description: "Soins nourrissons, laits infantiles" },
  { id: "cat_hygiene", name: "Hygiène & Soins", description: "Gels hydroalcooliques, savons" }
];

export function PatientHome() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();
  const [exactLocation, setExactLocation] = useState<string>('');
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepInitialQuery, setStepInitialQuery] = useState('');
  
  useEffect(() => {
    if (userData?.deliveryAddress || userData?.address) {
       setExactLocation(userData.deliveryAddress || userData.address);
       return;
    }
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
           const { latitude, longitude } = position.coords;
           const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
           if (!apiKey) return;
           const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
           const data = await res.json();
           if (data.status === "OK" && data.results.length > 0) {
             // Try to find a short version (e.g. street + city)
             const comps = data.results[0].address_components;
             let route = comps.find(c => c.types.includes('route'))?.long_name;
             let city = comps.find(c => c.types.includes('locality'))?.long_name;
             
             let shortAddr = "";
             if (route && city) shortAddr = route + ", " + city;
             else if (city) shortAddr = city;
             else shortAddr = data.results[0].formatted_address;
             
             setExactLocation(shortAddr);
           }
        } catch (e) {
           console.error(e);
        }
      }, (err) => {
         console.warn("Geoloc err:", err);
      });
    }
  }, [userData]);


  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<GeneralProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch categories (from 'categories' or 'ux_categories')
    const fetchCategories = async () => {
      try {
        const [catSnap, uxCatSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), limit(20))),
          getDocs(query(collection(db, 'ux_categories'), limit(20)))
        ]);

        const loadedCats: CategoryItem[] = [];
        const seenNames = new Set<string>();

        // Admin categories
        catSnap.docs.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (data.name && !seenNames.has(data.name.toLowerCase().trim())) {
            seenNames.add(data.name.toLowerCase().trim());
            loadedCats.push({ id: docSnap.id, name: data.name, description: data.description, imageUrl: data.imageUrl });
          }
        });

        // UX categories
        uxCatSnap.docs.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (data.name && !seenNames.has(data.name.toLowerCase().trim())) {
            seenNames.add(data.name.toLowerCase().trim());
            loadedCats.push({ id: docSnap.id, name: data.name, description: data.description, imageUrl: data.imageUrl });
          }
        });

        if (loadedCats.length > 0) {
          setCategories(loadedCats);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      } catch (err) {
        console.warn("Using default categories fallback:", err);
        setCategories(DEFAULT_CATEGORIES);
      }
    };

    // 2. Fetch real products available in approved pharmacies with stock > 0
    const fetchAvailablePharmacyProducts = async () => {
      try {
        const [pSnap, pharmSnap] = await Promise.all([
          getDocs(query(collection(db, 'products'), limit(300))),
          getDocs(query(collection(db, 'pharmacies'), where('status', '==', 'approved'), limit(200)))
        ]);

        const approvedPharmacyIds = new Set(pharmSnap.docs.map(d => d.id));

        // Only keep products that belong to approved pharmacies and have stock > 0
        const rawProducts = pSnap.docs
          .map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as any) }))
          .filter(p => {
            const stock = Number(p.stock ?? 0);
            if (stock <= 0) return false;
            if (p.pharmacyId && approvedPharmacyIds.size > 0 && !approvedPharmacyIds.has(p.pharmacyId)) {
              return false;
            }
            return true;
          });

        // Deduplicate and group real valid products
        const availableGroups = new Map<string, GeneralProductItem>();

        rawProducts.forEach(p => {
          const rawName = (p.name || p.commercial_name || p.nom_commercial || '').trim();
          if (!rawName || rawName.toLowerCase() === 'unnamed product' || rawName.toLowerCase() === 'null') {
            return;
          }

          const groupKey = (p.productId || p.global_product_id || rawName).toLowerCase();
          const price = parseFloat(p.price) || 2500;
          const cat = (p.category && p.category !== 'Uncategorized')
            ? p.category
            : (p.categorie_ux || p.ux_category || p.ux_categories?.name || p.categorie || "Douleurs & Fièvre");

          if (!availableGroups.has(groupKey)) {
            availableGroups.set(groupKey, {
              id: p.id,
              name: rawName,
              commercial_name: rawName,
              dci: p.dci || p.scientific_name || rawName,
              dosage: p.dosage || p.forme || '',
              price: price,
              category: cat,
              is_prescription_required: Boolean(p.is_prescription_required || p.ordonnance_requise || p.requires_prescription),
              is_essentiel: Boolean(p.is_essentiel),
              image_url: p.image_url || p.imageUrl || p.image || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
              description: p.description
            });
          } else {
            const existing = availableGroups.get(groupKey)!;
            if (price > 0 && (existing.price === 0 || price < (existing.price || 0))) {
              existing.price = price;
              existing.id = p.id;
            }
            if (!existing.image_url && (p.image_url || p.imageUrl || p.image)) {
              existing.image_url = p.image_url || p.imageUrl || p.image;
            }
          }
        });

        setProducts(Array.from(availableGroups.values()));
      } catch (err) {
        console.error("Error loading products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    fetchAvailablePharmacyProducts();
  }, []);

  const handleProductClick = (product: GeneralProductItem) => {
    if (product.id) {
      navigate(`/patient/product/${product.id}`);
    } else {
      const q = product.commercial_name || product.name || product.dci;
      navigate(`/patient/search?q=${encodeURIComponent(q || "")}`);
    }
  };

  const handleCategoryClick = (cat: CategoryItem) => {
    navigate(`/patient/search?q=${encodeURIComponent(cat.name)}`);
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col relative pb-20 h-full overflow-hidden">
      
      {/* 1. Official Page 13 Header: #0E7673 with white PharmAply logo & actions */}
      <div className="bg-[#0E7673] text-white px-5 pt-10 pb-5 rounded-b-[1.75rem] shadow-sm z-20 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <PharmAplyLogo variant="horizontal" tone="white" size="sm" />

          <div className="flex items-center gap-2">
            <DarkModeToggle className="w-9 h-9 bg-white/15 hover:bg-white/25 text-white border border-white/20 shadow-none" />
            
            <button 
              onClick={() => navigate('/patient/messages')}
              className="w-9 h-9 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center border border-white/20 text-white transition-colors"
              title={t('messages', 'Messagerie')}
              aria-label={t('messages', 'Messagerie')}
            >
              <MessageSquare size={17} />
            </button>

            <NotificationBell className="[&_button]:w-9 [&_button]:h-9 [&_button]:bg-white/15 [&_button]:hover:bg-white/25 [&_button]:text-white [&_button]:border-white/20 [&_button]:shadow-none" />

            <button
              type="button"
              onClick={() => navigate('/patient/profile')}
              aria-label={t('nav.profile', 'Profil')}
              className="w-9 h-9 bg-white/20 rounded-full overflow-hidden border-2 border-[#38B794] flex items-center justify-center text-sm text-white font-bold uppercase shrink-0"
            >
              {(user?.photoURL || userData?.photoURL || userData?.photoUrl || userData?.avatar_url) ? (
                <img 
                  src={user?.photoURL || userData?.photoURL || userData?.photoUrl || userData?.avatar_url} 
                  alt={userData?.name || user?.displayName || 'User'} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                (userData?.name || user?.displayName) ? (userData?.name || user?.displayName)[0].toUpperCase() : 'U'
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/patient/profile')}
          className="flex items-center justify-between text-left bg-white/10 hover:bg-white/15 rounded-full px-3.5 py-2 transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={14} className="text-[#38B794] shrink-0" />
            <span className="text-xs font-bold text-white truncate">
              {t('hello', 'Bonjour')}, {userData?.name || user?.displayName || t('user', 'Client')}
            </span>
            <span className="text-[#D7F1EA] text-xs">·</span>
            <span className="text-xs text-[#D7F1EA] truncate">
              {exactLocation || t('home_delivery', 'Position en cours...')}
            </span>
          </div>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-5 sm:p-6">
        <SearchHeroBanner 
          categories={categories}
          products={products}
          onProductClick={handleProductClick}
          onCategoryClick={handleCategoryClick}
          onOpenStepSearch={(q) => {
            setStepInitialQuery(q || '');
            setIsStepModalOpen(true);
          }}
        />
      </div>

      {/* Multi-Step Medication Search & Ordering Modal */}
      <StepMedicationSearchModal
        isOpen={isStepModalOpen}
        onClose={() => setIsStepModalOpen(false)}
        initialQuery={stepInitialQuery}
      />

    </div>
  );
}
