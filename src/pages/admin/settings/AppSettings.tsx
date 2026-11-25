import { useState, useEffect, ChangeEvent } from "react";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import { Smartphone, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function AppSettings() {
    const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    forceUpdate: false,
    version: "1.0.0",
    maintenanceMode: false,
    supportEmail: "",
    termsUrl: "",
    privacyUrl: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "app");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({ ...settings, ...docSnap.data() });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "app"), settings, { merge: true });
      toast.success("App settings saved successfully");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "settings/app");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) return <div className="p-8 text-[#5C807F] dark:text-[#9FC8C7] bg-[#F5FAFA] dark:bg-[#062625] flex-1"> {t('loading_settings', 'Loading settings...')} </div>;

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0 flex items-center justify-between gap-4">
         <div>
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1 flex items-center gap-2"><Smartphone size={24} className="text-[#0E7673] dark:text-[#38B794]" />  {t('app_settings', 'App Settings')} </h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('configure_mobile_application_b', 'Configure mobile application behavior and parameters')} </p>
         </div>
         <button 
           onClick={handleSave}
           disabled={saving}
           className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 shrink-0"
         >
           <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-3xl space-y-8">
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-6"> {t('general_application_settings', 'General Application Settings')} </h2>
            
            <div className="space-y-5">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('current_app_version', 'Current App Version')} </label>
                  <input 
                    type="text" 
                    name="version"
                    value={settings.version}
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none tabular-nums"
                  />
               </div>

               <div className="flex items-center justify-between p-4 bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">
                  <div>
                    <p className="font-bold text-[#0A3D3B] dark:text-white"> {t('force_update_required', 'Force Update Required')} </p>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]"> {t('require_all_users_to_update_to', 'Require all users to update to the latest version to use the app.')} </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" name="forceUpdate" checked={settings.forceUpdate} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-[#CFE4E3] dark:bg-[#145250] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#CFE4E3] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E7673]"></div>
                  </label>
               </div>

               <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/30">
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-300"> {t('app_maintenance_mode', 'App Maintenance Mode')} </p>
                    <p className="text-xs text-amber-700 dark:text-amber-200/80"> {t('prevent_all_non_admin_users_fr', 'Prevent all non-admin users from accessing the app.')} </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" name="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-amber-200 dark:bg-amber-900/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-6"> {t('links_support', 'Links & Support')} </h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('support_email_address', 'Support Email Address')} </label>
                  <input 
                    type="email" 
                    name="supportEmail"
                    value={settings.supportEmail}
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('terms_of_service_url', 'Terms of Service URL')} </label>
                  <input 
                    type="url" 
                    name="termsUrl"
                    value={settings.termsUrl}
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('privacy_policy_url', 'Privacy Policy URL')} </label>
                  <input 
                    type="url" 
                    name="privacyUrl"
                    value={settings.privacyUrl}
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                  />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
