import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import toast from "react-hot-toast";

interface Promo {
  code: string;
  discountPer: number;
}

export function Promotions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(10);
  const [settings, setSettings] = useState({
    dealOfTheDayEnabled: false,
    dealOfTheDayDiscount: 20,
    orderStatusTemplate: "Your order {orderId} is now {status}",
    refillReminderTemplate: "It's time to refill your prescription for {drugName}"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "promotions");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPromos(data.list || []);
          if(data.settings) setSettings(prev => ({...prev, ...data.settings}));
        }
      } catch (error) {
        toast.error("Failed to load promotions.");
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "promotions"), {
        list: promos,
        settings,
        updatedAt: new Date()
      }, { merge: true });
      toast.success("Promotions & Marketing settings saved!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/promotions");
      toast.error("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addPromo = () => {
    if (!newCode.trim()) return;
    setPromos([...promos, { code: newCode.toUpperCase(), discountPer: newDiscount }]);
    setNewCode("");
    setNewDiscount(10);
  };

  const removePromo = (index: number) => {
    setPromos(promos.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0 flex items-center justify-between gap-4">
         <div>
             <button onClick={() => navigate("/admin/settings")} className="flex items-center text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673] dark:hover:text-[#38B794] mb-2 transition">
               <ArrowLeft size={16} className="mr-1" /> Back to Settings </button>
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> Marketing & Promotions </h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> Deal of the Day, notifications, discount campaigns </p>
         </div>
         <button 
           onClick={handleSave} 
           disabled={loading}
           className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 shrink-0"
         >
            <Save size={16} /> Save Changes </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-6">
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> Active Promo Codes </h2>
            
            <div className="flex gap-4 mb-6">
              <input 
                type="text" 
                placeholder="Code (e.g. SUMMER20)"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none uppercase"
              />
              <div className="relative w-32">
                 <input 
                   type="number" 
                   value={newDiscount}
                   onChange={e => setNewDiscount(Number(e.target.value))}
                   className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none tabular-nums"
                 />
                 <span className="absolute right-4 top-2.5 text-[#5C807F] dark:text-[#9FC8C7] text-sm">%</span>
              </div>
              <button 
                onClick={addPromo}
                className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-5 py-2 rounded-full text-sm font-bold transition flex items-center justify-center shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>

            {promos.length > 0 ? (
              <div className="space-y-3">
                 {promos.map((promo, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">
                       <div>
                          <p className="font-bold text-[#0E7673] dark:text-[#38B794]">{promo.code}</p>
                          <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] tabular-nums">{promo.discountPer}% discount </p>
                       </div>
                       <button 
                         onClick={() => removePromo(idx)}
                         className="text-red-500 hover:text-red-600 dark:text-red-400 text-sm font-bold"
                       >
                          Remove </button>
                    </div>
                 ))}
              </div>
            ) : (
              <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] text-center py-4 bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl border border-dashed border-[#CFE4E3] dark:border-[#145250]"> No active promotions </p>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
               <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> Deal of the Day </h2>
               <div className="space-y-4">
                  <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                     <input 
                       type="checkbox" 
                       name="dealOfTheDayEnabled"
                       checked={settings.dealOfTheDayEnabled}
                       onChange={handleChange}
                       className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                     />
                     <div>
                       <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Enable Deal of the Day</h3>
                       <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Automatically highlight one discounted item daily.</p>
                     </div>
                  </label>
                  <div>
                     <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Default Discount Allocation (%) </label>
                     <input 
                       type="number" 
                       name="dealOfTheDayDiscount"
                       value={settings.dealOfTheDayDiscount} 
                       onChange={handleChange}
                       disabled={!settings.dealOfTheDayEnabled}
                       className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none disabled:bg-[#E7F1F1] dark:disabled:bg-[#0E4A47] disabled:opacity-50 tabular-nums"
                     />
                  </div>
               </div>
            </div>

            <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
               <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> Notification Templates </h2>
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Order Status Push Note </label>
                     <textarea 
                       name="orderStatusTemplate"
                       value={settings.orderStatusTemplate} 
                       onChange={handleChange}
                       className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none h-20"
                     />
                     <p className="text-xs text-[#0E7673] dark:text-[#38B794] mt-1">Variables: {'{orderId}'}, {'{status}'}</p>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Refill Reminder </label>
                     <textarea 
                       name="refillReminderTemplate"
                       value={settings.refillReminderTemplate} 
                       onChange={handleChange}
                       className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none h-20"
                     />
                     <p className="text-xs text-[#0E7673] dark:text-[#38B794] mt-1">Variables: {'{drugName}'}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
