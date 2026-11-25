import React from "react";
import { Heart, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { useCart } from "./CartProvider";
import toast from "react-hot-toast";

export interface ProductCardProps {
  key?: React.Key;
  product: any;
  basePath?: string;
  onClick?: (product: any) => void;
  showSaleBadge?: boolean;
  onHeartClick?: (e: React.MouseEvent, product: any) => void;
  isWishlisted?: boolean;
}

export function ProductCard({ product, basePath, onClick, onHeartClick, isWishlisted = false }: ProductCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const handleClick = () => {
    if (onClick) {
      onClick(product);
    } else if (basePath) {
      navigate(`${basePath}/${product.id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.commercial_name || product.name || t('medicine_fallback', 'Médicament'),
      price: parseFloat(product.price) || 0,
      quantity: 1,
      pharmacyId: product.pharmacyId || 'default',
      pharmacyName: product.pharmacyName || t('partner_pharmacy', 'Pharmacie Partenaire'),
      requiresPrescription: String(product.requires_prescription || product.is_prescription_required).toLowerCase() === 'true'
    });
    toast.success(t('product_added_to_cart', 'Produit ajouté au panier'));
  };

  const title = product.commercial_name || product.name || t('unnamed_product', 'Produit sans nom');
  
  // Image retrieval
  const imgUrl = product.image_url || product.imageUrl || product.ImageURL || product.image || product.Image;

  return (
    <div 
      onClick={handleClick}
      className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3 sm:p-4 flex flex-col relative cursor-pointer hover:shadow-md transition-shadow h-full"
    >
      {/* Heart Top Left */}
      {onHeartClick && (
        <button 
          onClick={(e) => onHeartClick(e, product)}
          className="absolute top-3 left-3 z-10 p-1"
        >
          <Heart size={20} fill={isWishlisted ? "#F43F5E" : "none"} className={isWishlisted ? "text-rose-500" : "text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673]"} strokeWidth={isWishlisted ? 0 : 2} />
        </button>
      )}

      {/* Product Image */}
      <div className="w-full aspect-square mb-4 flex items-center justify-center p-2 relative bg-[#F5FAFA] dark:bg-[#062625] rounded-xl">
         {imgUrl ? (
           <img 
             src={imgUrl} 
             alt={title} 
             className="w-full h-full object-contain drop-shadow-sm"
             onError={(e) => {
               (e.target as HTMLElement).style.display = 'none';
             }}
           />
         ) : (
           <div className="w-16 h-16 bg-[#E7F1F1] dark:bg-[#0E4A47] rounded-full flex items-center justify-center">
             <span className="text-[#5C807F] dark:text-[#9FC8C7] text-xs">No img</span>
           </div>
         )}
      </div>

      {/* Info Section */}
      <div className="mt-auto">
        <h3 className="font-semibold text-[#0A3D3B] dark:text-white text-sm sm:text-[15px] truncate mb-1">
          {title}
        </h3>
        
        <div className="flex items-end justify-between mt-2">
          <span className="font-bold text-[#0E7673] dark:text-[#38B794] text-base tabular-nums">
            {formatCurrency(parseFloat(product.price) || 0)}
          </span>
          
          <button 
            onClick={handleAddToCart}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0E7673] flex items-center justify-center text-white shadow-sm hover:bg-[#0A5A58] active:scale-95 transition-all shrink-0"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
