import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function Compliance() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    tosUrl: "",
    privacyPolicyUrl: "",
    hipaaAuditLogs: true,
    prescriptionApprovalRequired: false,
    requireNABPCheck: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "compliance");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        toast.error("Failed to load settings.");
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const { name, value, type, checked } = target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "compliance"), {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
      toast.success("Compliance settings saved!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/compliance");
      toast.error("Failed to save compliance settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0 flex items-center justify-between gap-4">
         <div>
             <button onClick={() => navigate("/admin/settings")} className="flex items-center text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673] dark:hover:text-[#38B794] mb-2 transition">
               <ArrowLeft size={16} className="mr-1" />  {t('back_to_settings', 'Back to Settings')} </button>
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> {t('compliance_legal', 'Compliance & Security Controls')} </h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> Audit logs, prescription verification, RBAC, and Legal </p>
         </div>
         <button 
           onClick={handleSave} 
           disabled={loading}
           className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 shrink-0"
         >
            <Save size={16} />  {t('save_changes', 'Save Changes')} </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-6">
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> HIPAA & Audit </h2>
            <div className="space-y-4">
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="hipaaAuditLogs"
                    checked={settings.hipaaAuditLogs}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Enable PHI Audit Logging</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1"> Log every time Protected Health Information (PHI) is accessed (timestamp, user, action) to ensure HIPAA compliance. </p>
                  </div>
               </label>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> Prescription Verification Rules </h2>
            <div className="space-y-4">
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="prescriptionApprovalRequired"
                    checked={settings.prescriptionApprovalRequired}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Require Admin/Pharmacist Approval for Uploaded E-Prescriptions</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1"> Define if and how prescriptions are required for certain drugs. If enabled, manual check is required. </p>
                  </div>
               </label>
               <label className="flex items-start gap-4 p-4 border border-[#CFE4E3] dark:border-[#145250] rounded-2xl hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="requireNABPCheck"
                    checked={settings.requireNABPCheck}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded mt-0.5"
                  />
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm block">Require NABP checks for pharmacies</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1"> Set requirements for uploaded pharmacy licenses, NABP checks, and government-issued documents. </p>
                  </div>
               </label>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> {t('legal_links', 'Legal Links')} </h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('terms_of_service_url', 'Terms of Service URL')} </label>
                  <input 
                    type="url" 
                    name="tosUrl"
                    value={settings.tosUrl} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                    placeholder={t('https_example_com_tos', 'https://example.com/tos')}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('privacy_policy_url', 'Privacy Policy URL')} </label>
                  <input 
                    type="url" 
                    name="privacyPolicyUrl"
                    value={settings.privacyPolicyUrl} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                    placeholder={t('https_example_com_privacy', 'https://example.com/privacy')}
                  />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
