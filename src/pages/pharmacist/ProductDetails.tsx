import React, { useState, useEffect } from "react";
import { ArrowLeft, MoreVertical, CheckCircle, AlertCircle, Edit2, History, Package, Activity, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, addDoc, serverTimestamp } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { useTranslation } from "react-i18next";
import { getCategoryIcon } from "../../lib/icons";
import dayjs from "dayjs";

export function PharmacistProductDetails() {
   const { t } = useTranslation();
   const navigate = useNavigate();
   const { id } = useParams();
   const { user } = useAuth();
   const [product, setProduct] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [showStockModal, setShowStockModal] = useState(false);
   const [editStockValue, setEditStockValue] = useState("");
   const [editExpiryDate, setEditExpiryDate] = useState("");
   const [savingStock, setSavingStock] = useState(false);
   const [markingOutOfStock, setMarkingOutOfStock] = useState(false);
   const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
   const [stockHistory, setStockHistory] = useState<any[]>([]);
   const [loadingHistory, setLoadingHistory] = useState(false);

   useEffect(() => {
      if (!user || !id) return;
      const fetchProduct = async () => {
         try {
            const docSnap = await getDoc(doc(db, 'products', id));
            if (docSnap.exists()) {
               setProduct({ id: docSnap.id, ...docSnap.data() });
            }
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };
      
      const fetchHistory = async () => {
         setLoadingHistory(true);
         try {
            const q = query(
               collection(db, `products/${id}/stock_history`),
               orderBy("date", "desc")
            );
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({
               id: doc.id,
               ...doc.data()
            }));
            setStockHistory(historyData);
         } catch(error) {
            console.error("Failed to fetch stock history:", error);
         } finally {
            setLoadingHistory(false);
         }
      };
      
      fetchProduct();
      fetchHistory();
   }, [user, id]);

   if (loading) {
      return (
         <div className="flex-1 bg-transparent p-8 text-center text-sm text-[#5C807F] dark:text-[#9FC8C7] animate-pulse">
            Loading...
         </div>
      );
   }

   if (!product) {
      return (
         <div className="flex-1 bg-transparent p-8 text-center text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium pb-20">
            <div className="bg-white dark:bg-[#0A3D3B] p-8 rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm inline-block mx-auto text-[#0A3D3B] dark:text-white">
               Product not found.
            </div>
         </div>
      );
   }

   const handleUpdateStock = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const newStock = parseInt(editStockValue, 10);
      if (isNaN(newStock) || newStock < 0) return;
      if (!editExpiryDate) return; // Expiry date is mandatory

      setSavingStock(true);
      try {
         await updateDoc(doc(db, 'products', product.id), { 
            stock: newStock,
            expiryDate: editExpiryDate 
         });
         
         const previousStock = product.stock || 0;
         const updatedHistoryItem = {
            type: newStock >= previousStock ? 'addition' : 'adjustment',
            quantity: Math.abs(newStock - previousStock),
            previousStock,
            newStock,
            date: serverTimestamp(),
            note: 'Manual adjustment'
         };
         await addDoc(collection(db, `products/${product.id}/stock_history`), updatedHistoryItem);
         
         setProduct({ ...product, stock: newStock, expiryDate: editExpiryDate });
         setStockHistory([{ ...updatedHistoryItem, date: { seconds: Date.now() / 1000 }, id: Date.now().toString() }, ...stockHistory]);
         setShowStockModal(false);
      } catch (error) {
         console.error('Failed to update stock', error);
      } finally {
         setSavingStock(false);
      }
   };

   const handleMarkOutOfStock = async () => {
      if (!window.confirm("Êtes-vous sûr de vouloir marquer ce produit comme étant en rupture de stock ?")) return;

      setMarkingOutOfStock(true);
      try {
         await updateDoc(doc(db, 'products', product.id), { stock: 0 });
         
         const previousStock = product.stock || 0;
         const historyItem = {
            type: 'adjustment',
            quantity: previousStock,
            previousStock,
            newStock: 0,
            date: serverTimestamp(),
            note: 'Marked out of stock'
         };
         await addDoc(collection(db, `products/${product.id}/stock_history`), historyItem);
         
         setProduct({ ...product, stock: 0 });
         setStockHistory([{ ...historyItem, date: { seconds: Date.now() / 1000 }, id: Date.now().toString() }, ...stockHistory]);
      } catch (error) {
         console.error('Failed to update stock', error);
      } finally {
         setMarkingOutOfStock(false);
      }
   };

   return (
      <div className="flex-1 bg-transparent flex flex-col h-full overflow-hidden relative">
         {/* Header */}
         <div className="px-8 pt-8 pb-4 flex items-center gap-4 shrink-0 z-10">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0A3D3B] rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-sm transition-colors hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]">
               <ArrowLeft size={20} className="text-[#0A3D3B] dark:text-[#D7F1EA]" />
            </button>
            <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl tracking-tight">Medication Details</h1>
         </div>

         <div className="flex-1 overflow-y-auto px-8 pb-32 custom-scrollbar">
            {/* Title & More */}
            <div className="flex justify-between items-start mt-2 mb-6">
               <div className="bg-white dark:bg-[#0A3D3B] p-6 rounded-3xl w-full border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex items-start justify-between">
                  <div>
                     <h2 className="text-2xl font-bold text-[#0A3D3B] dark:text-white leading-tight">
                        {product.name} {product.dosage ? product.dosage : ''}
                     </h2>
                     <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium mt-1">
                        {product.category || 'Tablet'} {product.dosage ? `- ${product.dosage}` : ''}
                     </p>
                  </div>
                  <button className="p-2.5 bg-[#E7F1F1] dark:bg-[#062625] rounded-full border border-[#CFE4E3] dark:border-[#145250] text-[#0E7673] dark:text-[#38B794] hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] transition-colors">
                     <Edit2 size={16} />
                  </button>
               </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#E7F1F1] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] p-1.5 rounded-full mb-6">
                <button
                   onClick={() => setActiveTab('details')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-full transition-colors ${activeTab === 'details' ? 'bg-white dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-white shadow-sm' : 'text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white'}`}
                >
                   <Package size={16} /> Details
                </button>
                <button
                   onClick={() => setActiveTab('history')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-full transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-white shadow-sm' : 'text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white'}`}
                >
                   <History size={16} /> Stock History
                </button>
            </div>

            {activeTab === 'details' ? (
               <>
                  {/* Image */}
                  <div className="w-full aspect-[16/9] mb-6 flex items-center justify-center bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm p-4 overflow-hidden relative group">
                     {product.imageUrl || product.ImageURL || product.image || product.Image ? (
                        <img
                           src={product.imageUrl || product.ImageURL || product.image || product.Image}
                           alt={product.name}
                           className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
                        />
                     ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#5C807F] dark:text-[#9FC8C7]">
                           {getCategoryIcon(product.category, 80)}
                           <span className="text-sm mt-4 font-bold uppercase tracking-widest opacity-50">No Image</span>
                        </div>
                     )}
                  </div>

                  {/* Status tags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       <div className="bg-[#D7F1EA]/60 dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] flex flex-col gap-1 px-5 py-4 rounded-3xl font-bold shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={18} className="text-[#0E7673] dark:text-[#38B794]" />
                            <span className="text-sm">Stock Status</span>
                          </div>
                          <span className="text-xl tabular-nums">{product.stock || 0} unit(s) available</span>
                       </div>
                       
                       {product.expiryDate && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 flex flex-col gap-1 px-5 py-4 rounded-3xl font-bold shadow-sm">
                             <div className="flex items-center gap-2 mb-1">
                                <AlertCircle size={18} className="text-red-500 dark:text-red-400" />
                                <span className="text-sm text-red-600 dark:text-red-400">Expiry Date</span>
                             </div>
                             <span className="text-xl tabular-nums">{product.expiryDate}</span>
                          </div>
                       )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 mb-8">
                     <button onClick={() => {
                        setEditStockValue(product.stock?.toString() || "0");
                        setEditExpiryDate(product.expiryDate || "");
                        setShowStockModal(true);
                     }} className="flex-1 bg-[#0E7673] hover:bg-[#0A5A58] transition-colors text-white py-4 rounded-full font-bold text-sm shadow-sm cursor-pointer whitespace-nowrap focus:outline-none">
                        Update Stock
                     </button>
                     <button 
                        disabled={markingOutOfStock}
                        onClick={handleMarkOutOfStock} 
                        className="flex-1 bg-white dark:bg-[#0A3D3B] hover:bg-red-50 dark:hover:bg-red-950/30 border border-[#CFE4E3] dark:border-[#145250] hover:border-red-200 hover:text-red-600 text-[#0A3D3B] dark:text-[#D7F1EA] py-4 rounded-full font-bold text-sm cursor-pointer transition-colors shadow-sm whitespace-nowrap focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                        {markingOutOfStock ? 'En cours...' : 'Mark Out of Stock'}
                     </button>
                  </div>

                  {/* Drug Info Block */}
                  <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 border border-[#CFE4E3] dark:border-[#145250] shadow-sm mb-6 space-y-4">
                     <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base pb-3 border-b border-[#CFE4E3]/60 dark:border-[#145250] flex items-center justify-between">
                        Drug Information
                     </h3>
                     
                     <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-[#5C807F] dark:text-[#9FC8C7] font-medium">Generic Name</span>
                        <span className="text-[#0A3D3B] dark:text-white font-bold">{product.name}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-[#5C807F] dark:text-[#9FC8C7] font-medium">Brand Name</span>
                        <span className="text-[#0A3D3B] dark:text-white font-bold">{product.brand || '---'}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-[#5C807F] dark:text-[#9FC8C7] font-medium">Category</span>
                        <div className="flex items-center gap-1.5 bg-[#E7F1F1] dark:bg-[#062625] px-3 py-1 rounded-full border border-[#CFE4E3] dark:border-[#145250]">
                           {getCategoryIcon(product.category, 14, "text-[#0E7673] dark:text-[#38B794]")}
                           <span className="text-[#0A3D3B] dark:text-[#D7F1EA] font-bold text-xs">{product.category || '---'}</span>
                        </div>
                     </div>
                     <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-[#5C807F] dark:text-[#9FC8C7] font-medium">Manufacturer</span>
                        <span className="text-[#0A3D3B] dark:text-white font-bold">{product.manufacturer || '---'}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-[#5C807F] dark:text-[#9FC8C7] font-medium">Prescription</span>
                        <span className="text-[#0A3D3B] dark:text-white font-bold">
                           {(product.RequiresPrescription || product.requiresPrescription || product.Prescription) ? 'Yes' : 'No'}
                        </span>
                     </div>
                  </div>

                  {/* Usage & Instructions Block */}
                  <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 border border-[#CFE4E3] dark:border-[#145250] shadow-sm mb-6">
                     <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base pb-3 border-b border-[#CFE4E3]/60 dark:border-[#145250] mb-4">
                        Usage & Instructions
                     </h3>

                     <div className="space-y-6">
                        <div>
                           <h4 className="text-sm font-bold text-[#0A3D3B] dark:text-white mb-2">Instructions</h4>
                           {product.instructions || product.description ? (
                              <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium whitespace-pre-line leading-relaxed bg-[#F5FAFA] dark:bg-[#062625] p-4 rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">{product.instructions || product.description}</p>
                           ) : (
                              <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium bg-[#F5FAFA] dark:bg-[#062625] p-4 rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">Please refer to the physical packaging for dosage and storage instructions.</p>
                           )}
                        </div>
                        <div>
                           <h4 className="text-sm font-bold text-[#0A3D3B] dark:text-white mb-2">Batch Details</h4>
                           {product.batchNumber || product.expiryDate ? (
                              <div className="bg-[#F5FAFA] dark:bg-[#062625] p-4 rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">
                                 <ul className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium space-y-2 list-disc list-inside">
                                    {product.batchNumber && <li>Batch: {product.batchNumber}</li>}
                                    {product.expiryDate && <li>Expiry Date: {product.expiryDate}</li>}
                                 </ul>
                              </div>
                           ) : (
                              <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium bg-[#F5FAFA] dark:bg-[#062625] p-4 rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">No batch details recorded.</p>
                           )}
                        </div>
                     </div>
                  </div>
               </>
            ) : (
               <div className="space-y-4">
                  {loadingHistory ? (
                     <div className="py-12 flex flex-col items-center justify-center text-[#5C807F] dark:text-[#9FC8C7]">
                        <Activity className="animate-spin text-[#0E7673] dark:text-[#38B794] mb-4" size={32} />
                        <p className="font-medium text-sm">Loading stock history...</p>
                     </div>
                  ) : stockHistory.length === 0 ? (
                     <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-12 text-center border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-[#E7F1F1] dark:bg-[#062625] rounded-full flex items-center justify-center mb-4">
                           <History className="text-[#5C807F] dark:text-[#9FC8C7]" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-1">No history yet</h3>
                        <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium max-w-sm">There are no recorded transactions for this product.</p>
                     </div>
                  ) : (
                     stockHistory.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-[#0A3D3B] p-5 rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border ${
                                 item.type === 'addition' ? 'bg-[#D7F1EA] border-[#CFE4E3] text-[#0E7673] dark:bg-[#062625] dark:border-[#145250] dark:text-[#38B794]' : 
                                 item.type === 'sale' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300' :
                                 'bg-[#E7F1F1] border-[#CFE4E3] text-[#0A3D3B] dark:bg-[#062625] dark:border-[#145250] dark:text-[#D7F1EA]'
                              }`}>
                                 {item.type === 'addition' ? <TrendingUp size={20} /> :
                                  item.type === 'sale' ? <TrendingDown size={20} /> :
                                  <Activity size={20} />}
                              </div>
                              <div>
                                 <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm capitalize">{item.type}</h4>
                                 <div className="flex items-center gap-2 mt-1 text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium">
                                    <Clock size={12} />
                                    <span>{item.date?.seconds ? dayjs(item.date.seconds * 1000).format('MMM DD, YYYY - HH:mm') : 'Just now'}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right tabular-nums">
                              <span className={`font-black text-lg ${
                                 item.type === 'addition' ? 'text-[#0E7673] dark:text-[#38B794]' :
                                 item.type === 'sale' ? 'text-red-500' : 'text-[#0A3D3B] dark:text-[#D7F1EA]'
                              }`}>
                                 {item.type === 'sale' ? '-' : '+'}{item.quantity}
                              </span>
                              <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium">Balance: {item.newStock}</p>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            )}
         </div>

         {/* Stock & Expiry Update Modal */}
         {showStockModal && (
            <div className="fixed inset-0 bg-[#062625]/70 backdrop-blur-sm z-[100] flex items-center justify-center p-5">
               <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border border-[#CFE4E3] dark:border-[#145250]">
                  <h3 className="text-xl font-bold text-[#0A3D3B] dark:text-white mb-6">Update Stock</h3>
                  <form onSubmit={handleUpdateStock} className="space-y-5">
                     <div>
                        <label className="text-sm font-bold text-[#0A3D3B] dark:text-[#D7F1EA] block mb-2">New Stock Level<span className="text-red-500 ml-1">*</span></label>
                        <input
                           type="number"
                           required
                           min="0"
                           value={editStockValue}
                           onChange={(e) => setEditStockValue(e.target.value)}
                           className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] py-3.5 px-4 rounded-xl text-sm font-medium focus:border-[#0E7673] outline-none text-[#0A3D3B] dark:text-white transition-colors"
                           placeholder="Enter quantity"
                        />
                     </div>
                     <div>
                        <label className="text-sm font-bold text-[#0A3D3B] dark:text-[#D7F1EA] block mb-2">Expiry Date<span className="text-red-500 ml-1">*</span></label>
                        <input
                           type="date"
                           required
                           value={editExpiryDate}
                           onChange={(e) => setEditExpiryDate(e.target.value)}
                           className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] py-3.5 px-4 rounded-xl text-sm font-medium focus:border-[#0E7673] outline-none text-[#0A3D3B] dark:text-white transition-colors"
                        />
                     </div>
                     <div className="flex gap-4 pt-4">
                        <button
                           type="button"
                           onClick={() => setShowStockModal(false)}
                           disabled={savingStock}
                           className="flex-1 py-4 bg-white dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full font-bold text-sm transition-colors disabled:opacity-50 focus:outline-none"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={savingStock || !editStockValue || !editExpiryDate}
                           className="flex-1 py-4 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold text-sm transition-colors disabled:opacity-50 focus:outline-none shadow-sm"
                        >
                           {savingStock ? 'Saving...' : 'Save'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
