import React, { useEffect, useState } from "react";
import { doc, getDoc } from '../lib/firebase';
import { db } from "../lib/firebase";
import { AlertTriangle, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PharmAplyLogo } from "./common/PharmAplyLogo";

const CURRENT_VERSION = "1.0.0";

// Basic semantic version comparison
function isVersionLower(current: string, required: string) {
  const curParts = current.split(".").map(Number);
  const reqParts = required.split(".").map(Number);
  
  for (let i = 0; i < 3; i++) {
    const c = curParts[i] || 0;
    const r = reqParts[i] || 0;
    if (c < r) return true;
    if (c > r) return false;
  }
  return false;
}

export function AppUpdater({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().appVersion) {
            const requiredVersion = docSnap.data().appVersion;
            if (isVersionLower(CURRENT_VERSION, requiredVersion)) {
                setNeedsUpdate(true);
            }
        }
      } catch (error) {
        console.error("Failed to check app version", error);
      } finally {
        setLoading(false);
      }
    };
    checkVersion();
  }, []);

  if (loading) {
     return (
       <div className="min-h-screen w-full flex flex-col gap-4 bg-white dark:bg-[#062625] items-center justify-center p-6">
         <PharmAplyLogo variant="vertical" tone="color" showTagline size={130} />
         <p className="text-sm font-medium text-[#0E7673] dark:text-[#88D4BF] animate-pulse">
           {t('loading', 'Chargement...')}
         </p>
       </div>
     );
  }

  if (needsUpdate) {
     return (
       <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#E7F1F1] dark:bg-[#062625] p-6 text-center">
          <div className="bg-white dark:bg-[#0A3D3B] p-8 rounded-3xl shadow-sm border border-[#CFE4E3] dark:border-[#0E7673] max-w-md w-full flex flex-col items-center">
             <div className="w-16 h-16 bg-[#E7F1F1] dark:bg-[#0E7673]/40 text-[#0E7673] dark:text-[#38B794] rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
             </div>
             <h1 className="text-2xl font-bold text-[#0E7673] dark:text-white mb-2"> {t('update_required', 'Mise à jour requise')} </h1>
             <p className="text-[#0A3D3B]/80 dark:text-[#CFE4E3] text-sm mb-8">
                {t('your_current_version_of_the_ap', 'Votre version actuelle de PharmAply doit être mise à jour pour continuer en toute sécurité.')} </p>
             <button className="w-full bg-[#0E7673] hover:bg-[#0A3D3B] text-white font-bold rounded-full py-3.5 flex items-center justify-center gap-2 transition shadow-sm">
                <Download size={20} />  {t('download_update', 'Télécharger la mise à jour')} </button>
          </div>
       </div>
     );
  }

  return <>{children}</>;
}
