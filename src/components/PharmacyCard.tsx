import { Star, Clock, MapPin, Truck, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export interface PharmacyCardProps {
  pharmacy: any;
  basePath?: string;
  theme?: any;
}

export function PharmacyCard({ pharmacy, basePath = "/patient/pharmacy", theme = {} }: PharmacyCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`${basePath}/${pharmacy.id}`)} 
      className="cursor-pointer w-full bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250] overflow-hidden shadow-sm hover:border-[#0E7673] hover:shadow-md transition"
    >
      <div className="h-28 w-full bg-[#E7F1F1] dark:bg-[#062625] relative">
        {(pharmacy.bannerUrl || pharmacy.imageUrl || theme.defaultPharmacyLogo) ? (
          <img 
            src={pharmacy.bannerUrl || pharmacy.imageUrl || theme.defaultPharmacyLogo || "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80"} 
            alt={pharmacy.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full bg-[#E7F1F1] dark:bg-[#062625] flex items-center justify-center">
            <Store className="text-[#0E7673]/50 dark:text-[#38B794]/50" size={40} />
          </div>
        )}
      </div>

      <div className="p-4 relative bg-white dark:bg-[#0A3D3B]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E7F1F1] dark:bg-[#062625] rounded-2xl flex items-center justify-center text-[#0E7673] dark:text-[#38B794] shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  <path d="M12 2C8 2 5 5 5 9"></path>
               </svg>
            </div>
            <h4 className="font-bold text-[#0E7673] dark:text-white text-base truncate">{pharmacy.name}</h4>
          </div>
          
          <div className="flex items-center gap-1 font-bold text-sm text-[#0A3D3B] dark:text-white shrink-0">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span>{pharmacy.rating || "4.5"}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-[#0A3D3B] dark:text-[#E7F1F1] font-medium text-sm truncate">{pharmacy.address || t('address_not_provided', 'Address not provided')}</p>
          <p className="text-[#0E7673] dark:text-[#9FC8C7] text-xs mt-1 truncate">{pharmacy.city || pharmacy.area || "Douala, Cameroun"}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 border border-[#CFE4E3] dark:border-[#145250] rounded-full px-2.5 py-1 text-[#0A3D3B] dark:text-[#CFE4E3]">
            <Clock size={12} className="text-[#0E7673] dark:text-[#38B794]" />
            <span>15 {t('minutes', 'min')}</span>
          </div>
          <div className="flex items-center gap-1 border border-[#CFE4E3] dark:border-[#145250] rounded-full px-2.5 py-1 text-[#0A3D3B] dark:text-[#CFE4E3]">
            <MapPin size={12} className="text-[#0E7673] dark:text-[#38B794]" />
            <span>2.5 km</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#D7F1EA] text-[#0A3D3B] rounded-full px-2.5 py-1 font-bold">
            <Truck size={12} className="text-[#0E7673]" />
            {t('delivery_fees_ss', 'Livraison rapide')}
          </div>
        </div>
      </div>
    </div>
  );
}
