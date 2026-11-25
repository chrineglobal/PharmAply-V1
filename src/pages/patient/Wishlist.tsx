import React, { useEffect, useState } from "react";
import { ArrowLeft, Heart, ShoppingBag, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../components/AuthProvider";
import { collection, query, where, getDocs, doc, deleteDoc } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import { ProductCard } from "../../components/ProductCard";

export function PatientWishlist() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        
        const favs = snap.docs.map(d => ({
          id: d.id, // The favorite doc ID
          ...d.data()
        }));

        setFavorites(favs);
      } catch (err) {
        console.error("Failed to fetch favorites:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [user]);

  const handleRemove = async (e: React.MouseEvent, fav: any) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'favorites', fav.id));
      setFavorites(prev => prev.filter(f => f.id !== fav.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-6 pt-12 pb-4 shadow-sm z-10 flex items-center gap-4 border-b border-[#CFE4E3] dark:border-[#145250]">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#0E7673] dark:text-[#38B794] border border-[#CFE4E3] dark:border-[#145250] rounded-full bg-[#F5FAFA] dark:bg-[#062625] shadow-sm hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
            <ArrowLeft size={20} />
         </button>
         <h1 className="font-bold text-[#0A3D3B] dark:text-white text-xl">{t('wishlist', 'Wishlist & Saved')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
         {loading ? (
           <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#0E7673] dark:text-[#38B794]" size={32} /></div>
         ) : favorites.length === 0 ? (
           <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-[#D7F1EA] dark:bg-[#0E4A47] rounded-full flex items-center justify-center mb-4 text-[#0E7673] dark:text-[#38B794]">
                 <Heart size={32} />
              </div>
              <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-2">{t('wishlist_empty', 'Your wishlist is empty')}</h2>
              <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] max-w-[220px] mb-6">{t('save_favorite_desc', 'Save your favorite pharmacy products here.')}</p>
              <button onClick={() => navigate('/patient/search')} className="bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold py-3 px-6 rounded-full flex items-center gap-2 transition">
                 <ShoppingBag size={20} /> {t('browse_products', 'Browse Products')}
              </button>
           </div>
         ) : (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {favorites.map(fav => (
               <ProductCard
                 key={fav.id}
                 product={fav.product}
                 basePath="/patient/product"
                 isWishlisted={true}
                 onHeartClick={(e) => handleRemove(e, fav)}
               />
             ))}
           </div>
         )}
      </div>
    </div>
  );
}
