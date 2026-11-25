import React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function GlobalSettings() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    supportEmail: "",
    appVersion: "1.0.0",
    appName: "",
    logoUrl: "",
    missionStatement: "",
    timeZone: "UTC",
    defaultLanguage: "en",
    defaultCurrency: "USD",
    mapsApiKey: "",
    smsGatewayKey: "",
    socialLoginsKey: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        toast.error("Failed to load global settings.");
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        ...settings,
        updatedAt: new Date()
      }, { merge: true });
      toast.success("Global settings saved!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/global");
      toast.error("Failed to save global settings.");
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
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> {t('global_settings', 'Global Settings')} </h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> Manage app names, branding, localization, and third-party integrations </p>
         </div>
         <button 
           onClick={handleSave} 
           disabled={loading}
           className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 shrink-0"
         >
            <Save size={16} />  {t('save_changes', 'Save Changes')} </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-3xl space-y-6">
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> {t('application_details', 'Application Details')} </h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> App Name </label>
                  <input 
                    type="text" 
                    name="appName"
                    value={settings.appName} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                    placeholder="Pharmaply"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Logo URL </label>
                  <input 
                    type="url" 
                    name="logoUrl"
                    value={settings.logoUrl} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                    placeholder="https://..."
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Mission Statement </label>
                  <textarea 
                    name="missionStatement"
                    value={settings.missionStatement} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                    placeholder="Deliver healthcare quickly..."
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('support_email', 'Support Email')} </label>
                  <input 
                    type="email" 
                    name="supportEmail"
                    value={settings.supportEmail} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                    placeholder={t('support_pharmaply_com', 'support@pharmaply.com')}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('required_minimum_app_version', 'Required Minimum App Version')} </label>
                  <input 
                    type="text" 
                    name="appVersion"
                    value={settings.appVersion} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none tabular-nums"
                    placeholder="1.0.0"
                  />
               </div>
               
               <div className="flex pt-4 mt-4 border-t border-[#CFE4E3] dark:border-[#145250] gap-4 items-center">
                  <input 
                    type="checkbox" 
                    id="maintenanceMode"
                    name="maintenanceMode"
                    checked={settings.maintenanceMode}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#0E7673] rounded"
                  />
                  <div>
                    <label htmlFor="maintenanceMode" className="font-medium text-red-600 dark:text-red-400 text-sm block cursor-pointer"> {t('maintenance_mode', 'Maintenance Mode')} </label>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-0.5"> {t('when_checked_the_client_apps_w', 'When checked, the client apps will display a maintenance screen and prevent logins.')} </p>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> Localization & Region </h2>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Default Language </label>
                  <select name="defaultLanguage" value={settings.defaultLanguage} onChange={handleChange} className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none">
                     <option value="en">English</option>
                     <option value="fr">French</option>
                     <option value="es">Spanish</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> UI Time Zone </label>
                  <select name="timeZone" value={settings.timeZone} onChange={handleChange} className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none">
                     <option value="UTC">UTC</option>
                     <option value="America/New_York">Eastern Time (US)</option>
                     <option value="Europe/London">London (UK)</option>
                     <option value="Europe/Paris">Paris (France)</option>
                     <option value="Asia/Tokyo">Tokyo (Japan)</option>
                  </select>
               </div>
               <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Default Currency </label>
                  <select name="defaultCurrency" value={settings.defaultCurrency} onChange={handleChange} className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none">
                     <option value="USD">USD ($)</option>
                     <option value="EUR">EUR (€)</option>
                     <option value="GBP">GBP (£)</option>
                  </select>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-4"> Third-Party Integrations </h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Google Maps API Key </label>
                  <input 
                    type="text" 
                    name="mapsApiKey"
                    value={settings.mapsApiKey} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                    placeholder="AIzaSy..."
                  />
                  <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1">Used for route optimization and map rendering.</p>
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> SMS Gateway Key (Twilio) </label>
                  <input 
                    type="password" 
                    name="smsGatewayKey"
                    value={settings.smsGatewayKey} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> Social Logins Key (OAuth) </label>
                  <input 
                    type="password" 
                    name="socialLoginsKey"
                    value={settings.socialLoginsKey} 
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                  />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
