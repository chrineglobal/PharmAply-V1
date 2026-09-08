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
      className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-3 sm:p-4 flex flex-col relative cursor-pointer hover:shadow-md transition-shadow h-full"
    >
      {/* Heart Top Left */}
      {onHeartClick && (
        <button 
          onClick={(e) => onHeartClick(e, product)}
          className="absolute top-3 left-3 z-10 p-1"
        >
          <Heart size={20} fill={isWishlisted ? "#F43F5E" : "none"} className={isWishlisted ? "text-rose-500" : "text-gray-300 dark:text-gray-500 hover:text-gray-400"} strokeWidth={isWishlisted ? 0 : 2} />
        </button>
      )}

      {/* Product Image */}
      <div className="w-full aspect-square mb-4 flex items-center justify-center p-2 relative">
         {imgUrl ? (
           <img 
             src={imgUrl} 
             alt={title} 
             className="w-full h-full object-contain drop-shadow-sm"
             onError={(e) => {
               (e.target as HTMLElement).style.display = 'none';
               // fallback logic handled by next sibling ideally, but keep it simple
             }}
           />
         ) : (
           <div className="w-16 h-16 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
             <span className="text-gray-400 text-xs">No img</span>
           </div>
         )}
      </div>

      {/* Info Section */}
      <div className="mt-auto">
        <h3 className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-[15px] truncate mb-1">
          {title}
        </h3>
        
        <div className="flex items-end justify-between mt-2">
          <span className="font-bold text-gray-900 dark:text-white text-base">
            {formatCurrency(parseFloat(product.price) || 0)}
          </span>
          
          <button 
            onClick={handleAddToCart}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-teal-500 flex items-center justify-center text-white shadow-sm hover:bg-teal-600 active:scale-95 transition-all shrink-0"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
