import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import toast from "react-hot-toast";

export function FinancialSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    defaultCommissionRate: 5,
    deliveryFixedFee: 3,
    primaryGateway: "stripe",
    secondaryGateway: "paypal",
    taxRate: 7,
    autoCalculateTax: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "financial");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        toast.error("Failed to load financial settings.");
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setSettings(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value) 
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "financial"), {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
      toast.success("Financial settings saved!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/financial");
      toast.error("Failed to save financial settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0 flex items-center justify-between gap-4">
         <div>
             <button onClick={() => navigate("/admin/settings")} className="flex items-center text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673] dark:hover:text-[#38B794] mb-2 transition">
               <ArrowLeft size={16} className="mr-1" /> Back to Settings </button>
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1">Financial & Payment Settings</h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm">Gateways, taxes, and platform commission</p>
         </div>
         <button 
           onClick={handleSave} 
           disabled={loading}
           className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 shrink-0"
         >
            <Save size={16} /> Save Changes
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-6">
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4">Payment Gateways & Reconciliation</h2>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Primary Payment Gateway </label>
                  <select name="primaryGateway" value={settings.primaryGateway} onChange={handleChange} className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none">
                     <option value="stripe">Stripe</option>
                     <option value="paypal">PayPal</option>
                     <option value="square">Square</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Secondary Payment Gateway </label>
                  <select name="secondaryGateway" value={settings.secondaryGateway} onChange={handleChange} className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none">
                     <option value="none">None</option>
                     <option value="stripe">Stripe</option>
                     <option value="paypal">PayPal</option>
                     <option value="crypto">Cryptocurrency (Coinbase)</option>
                  </select>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4">Commission Rules & Fees</h2>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Default Commission Rate (%) </label>
                  <input 
                    type="number" 
                    name="defaultCommissionRate"
                    value={settings.defaultCommissionRate} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none tabular-nums"
                    placeholder="5.0"
                    step="0.1"
                  />
                  <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Applied to vendor subtotal</p>
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Standard Delivery Base Fee ($) </label>
                  <input 
                    type="number" 
                    name="deliveryFixedFee"
                    value={settings.deliveryFixedFee} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none tabular-nums"
                    placeholder="3.0"
                    step="0.5"
                  />
                  <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Paid directly to delivery driver</p>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4">Tax & Invoice Settings</h2>
            <div className="space-y-4">
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="autoCalculateTax"
                    checked={settings.autoCalculateTax}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Automated Tax Calculations</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Automatically calculate regional taxes on checkout based on user location.</p>
                  </div>
               </label>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Default Base Tax Rate (%) </label>
                  <input 
                    type="number" 
                    name="taxRate"
                    value={settings.taxRate} 
                    onChange={handleChange}
                    disabled={!settings.autoCalculateTax}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none disabled:opacity-50 disabled:bg-[#E7F1F1] dark:disabled:bg-[#0E4A47] tabular-nums"
                    placeholder="7.0"
                  />
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
