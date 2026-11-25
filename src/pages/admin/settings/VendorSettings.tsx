import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import toast from "react-hot-toast";

export function VendorSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    requireBusinessLicense: true,
    requireTaxId: true,
    requirePharmacistLicense: true,
    autoApproveVerified: false,
    allowCustomCommissions: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "vendor");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        toast.error("Failed to load vendor settings.");
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const { name, checked } = target;
    setSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "vendor"), {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
      toast.success("Vendor settings saved!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/vendor");
      toast.error("Failed to save vendor settings.");
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
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1">Vendor & Pharmacist Settings</h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm">Onboarding KYC, licensing, and approvals</p>
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
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-2">Onboarding KYC & Licensing Requirements</h2>
            <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] mb-4">Set requirements for uploaded pharmacy documents during registration.</p>
            <div className="space-y-4">
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="requireBusinessLicense"
                    checked={settings.requireBusinessLicense}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Require Operating License / Business License</h3>
                  </div>
               </label>
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="requireTaxId"
                    checked={settings.requireTaxId}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Require Taxpayer Card / VAT ID</h3>
                  </div>
               </label>
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="requirePharmacistLicense"
                    checked={settings.requirePharmacistLicense}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Require Pharmacy Board License</h3>
                  </div>
               </label>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4">Approval & Commissions</h2>
            <div className="space-y-4">
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="autoApproveVerified"
                    checked={settings.autoApproveVerified}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Auto-approve Verified Pharmacies</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">If unchecked, requires manual admin approval for all vendors.</p>
                  </div>
               </label>
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="allowCustomCommissions"
                    checked={settings.allowCustomCommissions}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Allow Custom Commission Rates</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Allow overriding global commission rates per pharmacy in vendor management.</p>
                  </div>
               </label>
            </div>
         </div>

      </div>
    </div>
  );
}
