import { useState, useEffect, ChangeEvent, useRef } from "react";
import { doc, getDoc, setDoc } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from '../../../lib/firebase';
import { db, storage, handleFirestoreError, OperationType, auth } from "../../../lib/firebase";
import { Palette, Save, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function ThemeSettings() {
    const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPharmacyLogo, setUploadingPharmacyLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pharmacyLogoInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState({
    primaryColor: "#0E7673",
    logoUrl: "",
    defaultPharmacyLogo: "",
    dashboardWelcomeText: "Welcome to our application",
    dashboardSubtitleText: "Here's what is happening today."
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "theme");
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
      await setDoc(doc(db, "settings", "theme"), settings, { merge: true });
      toast.success("Theme settings saved successfully");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "settings/theme");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const userId = auth.currentUser?.uid || 'temp';
      const storageRef = ref(storage, `profiles/${userId}/theme_logo_${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      const url = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          null, 
          (error: any) => reject(error), 
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });
      
      setSettings(prev => ({ ...prev, logoUrl: url }));
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      console.error("Logo upload error", error);
      toast.error(error.message || "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePharmacyLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPharmacyLogo(true);
    try {
      const userId = auth.currentUser?.uid || 'temp';
      const storageRef = ref(storage, `profiles/${userId}/pharmacy_logo_${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      const url = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          null, 
          (error: any) => reject(error), 
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });
      
      setSettings(prev => ({ ...prev, defaultPharmacyLogo: url }));
      toast.success("Default pharmacy logo uploaded successfully");
    } catch (error: any) {
      console.error("Pharmacy logo upload error", error);
      toast.error(error.message || "Failed to upload pharmacy logo.");
    } finally {
      setUploadingPharmacyLogo(false);
      if (pharmacyLogoInputRef.current) pharmacyLogoInputRef.current.value = '';
    }
  };

  if (loading) return <div className="p-8 text-[#5C807F] dark:text-[#9FC8C7] bg-[#F5FAFA] dark:bg-[#062625] flex-1"> {t('loading_settings', 'Loading settings...')} </div>;

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0 flex items-center justify-between gap-4">
         <div>
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1 flex items-center gap-2"><Palette size={24} className="text-[#0E7673] dark:text-[#38B794]" />  {t('theme_visuals', 'Theme & Visuals')} </h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('configure_app_visuals_and_text', 'Configure app visuals and text for user dashboards')} </p>
         </div>
         <button 
           onClick={handleSave}
           disabled={saving || uploadingLogo}
           className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 shrink-0"
         >
           <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-3xl space-y-8">
         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-6"> {t('user_dashboard_texts', 'User Dashboard Texts')} </h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('welcome_text', 'Welcome Text')} </label>
                  <input 
                    type="text" 
                    name="dashboardWelcomeText"
                    value={settings.dashboardWelcomeText}
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1"> {t('subtitle_text', 'Subtitle Text')} </label>
                  <input 
                    type="text" 
                    name="dashboardSubtitleText"
                    value={settings.dashboardSubtitleText}
                    onChange={handleChange}
                    className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none"
                  />
               </div>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-6"> {t('colors_branding', 'Colors & Branding')} </h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-1">Primary App Color (Hex)</label>
                  <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        name="primaryColor"
                        value={settings.primaryColor}
                        onChange={handleChange}
                        className="h-10 w-10 rounded-xl cursor-pointer border border-[#CFE4E3] dark:border-[#145250]"
                      />
                      <input 
                        type="text" 
                        name="primaryColor"
                        value={settings.primaryColor}
                        onChange={handleChange}
                        className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl px-4 py-2.5 text-sm text-[#0A3D3B] dark:text-white focus:ring-2 focus:ring-[#0E7673] outline-none uppercase tabular-nums"
                      />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-3"> {t('app_logo', 'App Logo')} </label>
                  <div className="flex items-center gap-6">
                    {settings.logoUrl ? (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#CFE4E3] dark:border-[#145250] bg-[#F5FAFA] dark:bg-[#062625] flex items-center justify-center">
                        <img src={settings.logoUrl} alt="App Logo" className="w-full h-full object-contain" />
                        <button 
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, logoUrl: "" }))}
                          className="absolute top-1 right-1 bg-white/90 dark:bg-[#0A3D3B]/90 p-1 rounded-full text-[#0A3D3B] dark:text-white hover:text-red-600 transition shadow-sm backdrop-blur-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl border border-dashed border-[#CFE4E3] dark:border-[#145250] bg-[#F5FAFA] dark:bg-[#062625] flex flex-col items-center justify-center text-[#5C807F] dark:text-[#9FC8C7]">
                        <Upload size={20} className="mb-1" />
                        <span className="text-[10px] font-medium"> {t('no_logo', 'No Logo')} </span>
                      </div>
                    )}
                    <div>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="bg-white dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#E7F1F1] dark:hover:bg-[#145250] transition shadow-sm disabled:opacity-50"
                      >
                        {uploadingLogo ? "Uploading..." : "Upload Logo Image"}
                      </button>
                      <p className="mt-2 text-xs text-[#5C807F] dark:text-[#9FC8C7]"> {t('suggested_size_256x256px_png_o', 'Suggested size: 256x256px. PNG or SVG.')} </p>
                    </div>
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] mb-3"> {t('default_pharmacy_logo', 'Default Pharmacy Logo')} </label>
                  <div className="flex items-center gap-6">
                    {settings.defaultPharmacyLogo ? (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#CFE4E3] dark:border-[#145250] bg-[#F5FAFA] dark:bg-[#062625] flex items-center justify-center">
                        <img src={settings.defaultPharmacyLogo} alt="Default Pharmacy Logo" className="w-full h-full object-contain" />
                        <button 
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, defaultPharmacyLogo: "" }))}
                          className="absolute top-1 right-1 bg-white/90 dark:bg-[#0A3D3B]/90 p-1 rounded-full text-[#0A3D3B] dark:text-white hover:text-red-600 transition shadow-sm backdrop-blur-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl border border-dashed border-[#CFE4E3] dark:border-[#145250] bg-[#F5FAFA] dark:bg-[#062625] flex flex-col items-center justify-center text-[#5C807F] dark:text-[#9FC8C7]">
                        <Upload size={20} className="mb-1" />
                        <span className="text-[10px] font-medium"> {t('no_logo', 'No Logo')} </span>
                      </div>
                    )}
                    <div>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        ref={pharmacyLogoInputRef}
                        onChange={handlePharmacyLogoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => pharmacyLogoInputRef.current?.click()}
                        disabled={uploadingPharmacyLogo}
                        className="bg-white dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#E7F1F1] dark:hover:bg-[#145250] transition shadow-sm disabled:opacity-50"
                      >
                        {uploadingPharmacyLogo ? "Uploading..." : "Upload Pharmacy Logo"}
                      </button>
                      <p className="mt-2 text-xs text-[#5C807F] dark:text-[#9FC8C7]"> {t('suggested_size_256x256px_png_o', 'Suggested size: 256x256px. PNG or SVG.')} </p>
                    </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
