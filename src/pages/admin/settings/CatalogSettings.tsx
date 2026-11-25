import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import toast from "react-hot-toast";

export function CatalogSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    enforceBatchTracking: true,
    enableSubstitutions: true,
    priceCapMultiplier: 2.0,
    allowPrescriptionDrugs: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "catalog");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        toast.error("Failed to load catalog settings.");
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const { name, value, type, checked } = target;
    setSettings(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "catalog"), {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
      toast.success("Catalog settings saved!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/catalog");
      toast.error("Failed to save catalog settings.");
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
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1">Catalog & Inventory</h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm">Medicine database, substitutions, and pricing rules</p>
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
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4">Inventory Data Management</h2>
            <div className="space-y-4">
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="enforceBatchTracking"
                    checked={settings.enforceBatchTracking}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Enforce Batch Number & Expiry Date Tracking</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Require pharmacists to enter batch and expiry for all medications added to stock.</p>
                  </div>
               </label>
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="enableSubstitutions"
                    checked={settings.enableSubstitutions}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Allow Medication Substitution</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Allow pharmacies to provide generic equivalent options if brand name is out of stock.</p>
                  </div>
               </label>
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="allowPrescriptionDrugs"
                    checked={settings.allowPrescriptionDrugs}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Allow Sale of Prescription Drugs</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Turn off to restrict the marketplace to OTC products only.</p>
                  </div>
               </label>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4">Pricing Rules</h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Global Price Cap Multiplier </label>
                  <input 
                    type="number" 
                    name="priceCapMultiplier"
                    value={settings.priceCapMultiplier} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none max-w-sm tabular-nums"
                    step="0.1"
                  />
                  <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Limits maximum vendor price. (e.g. 2.0 = Vendor cannot charge more than 2x the base MSRP catalog value).</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
