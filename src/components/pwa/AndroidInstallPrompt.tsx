import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Sparkles, CheckCircle2, X, ShieldCheck, MapPin, Bell } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface AndroidInstallPromptProps {
  forceShowForDemo?: boolean;
}

export const AndroidInstallPrompt: React.FC<AndroidInstallPromptProps> = ({ forceShowForDemo = false }) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('pharmaply_android_prompt_dismissed');
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (days < 5) {
        setIsDismissed(true);
      }
    }
  }, []);

  // Hide if already running in standalone mode (already installed as PWA)
  if (isInstalled && !forceShowForDemo) {
    return null;
  }

  // Hide if user explicitly dismissed recently
  if (isDismissed && !forceShowForDemo) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pharmaply_android_prompt_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstallSuccess(true);
      }
    } else {
      // Show guided instructions for Android Chrome / Samsung Browser
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Mobile Android App Install Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0E7673] text-white p-4 shadow-md border border-[#38B794]/30 mx-4 mt-2 mb-4 animate-in fade-in duration-300">
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            {/* App Icon */}
            <div className="w-12 h-12 rounded-2xl bg-white/15 p-1.5 border border-white/25 shrink-0 flex items-center justify-center">
              <img 
                src="/icon.svg" 
                alt="PharmAply Android" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#38B794] text-[#0A3D3B] px-2.5 py-0.5 rounded-full">
                  Application Android
                </span>
                <span className="text-[10px] text-[#D7F1EA]">Officielle</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5 truncate">
                PharmAply Espace Client
              </h3>
              <p className="text-[11px] text-[#D7F1EA] leading-snug line-clamp-1">
                Scan IA, pharmacies de garde & suivi GPS en direct
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Fermer l'invitation"
            className="text-white/70 hover:text-white p-1 -mr-1 -mt-1 rounded-full hover:bg-white/15 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/15 text-[10px] text-[#D7F1EA] font-medium">
          <div className="flex items-center gap-1">
            <Sparkles size={12} className="text-[#38B794] shrink-0" />
            <span className="truncate">Scan Ordonnance</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} className="text-[#38B794] shrink-0" />
            <span className="truncate">Garde 24h/24</span>
          </div>
          <div className="flex items-center gap-1">
            <Bell size={12} className="text-[#38B794] shrink-0" />
            <span className="truncate">Rappels Prises</span>
          </div>
        </div>

        {/* Action CTA */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 h-10 px-4 rounded-full bg-[#38B794] hover:bg-[#60C5A9] text-[#0A3D3B] font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
          >
            <Download size={14} className="stroke-[2.5]" />
            <span>Installer l'application Android</span>
          </button>

          <button
            onClick={() => setShowGuideModal(true)}
            className="h-10 px-4 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition"
          >
            Détails
          </button>
        </div>
      </div>

      {/* Installation Guide & Features Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#062625]/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0A3D3B] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#CFE4E3] dark:border-[#145250] max-h-[90vh] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-[#CFE4E3] dark:bg-[#145250] rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0E7673] p-2 flex items-center justify-center text-white shadow-sm">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A3D3B] dark:text-white">
                    Application Android PharmAply
                  </h3>
                  <p className="text-xs text-[#0E7673] dark:text-[#9FC8C7]">
                    Version PWA Mobile Native 2.0
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                className="text-[#6EADAB] hover:text-[#0E7673] p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#E7F1F1] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] flex items-start gap-3">
                <CheckCircle2 size={18} className="text-[#0E7673] dark:text-[#38B794] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-[#0A3D3B] dark:text-white font-bold block">
                    Installation instantanée sur l'écran d'accueil
                  </strong>
                  <span className="text-[#0A3D3B]/80 dark:text-[#CFE4E3]">
                    S'ouvre comme une application native sans barre d'adresse de navigateur, prête en moins de 2 secondes.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#D7F1EA] dark:bg-[#062625] border border-[#AFE2D4] dark:border-[#145250] flex items-start gap-3">
                <Sparkles size={18} className="text-[#0E7673] dark:text-[#38B794] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-[#0A3D3B] dark:text-white font-bold block">
                    Scan d'ordonnance par IA ultra-rapide
                  </strong>
                  <span className="text-[#0A3D3B]/80 dark:text-[#CFE4E3]">
                    Prenez une photo de votre ordonnance ou boîte pour obtenir les stocks en pharmacie et la posologie instantanée.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#E7F1F1] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] flex items-start gap-3">
                <MapPin size={18} className="text-[#0E7673] dark:text-[#38B794] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-[#0A3D3B] dark:text-white font-bold block">
                    Suivi GPS en direct du coursier
                  </strong>
                  <span className="text-[#0A3D3B]/80 dark:text-[#CFE4E3]">
                    Visualisez la progression de votre livraison de médicaments en temps réel sur la carte.
                  </span>
                </div>
              </div>
            </div>

            {/* How to install instructions on Android Chrome */}
            <div className="mt-5 p-3.5 rounded-2xl bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250]">
              <h4 className="text-xs font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-[#0E7673] dark:text-[#38B794]" />
                Comment l'installer manuellement sur Android :
              </h4>
              <ol className="text-xs text-[#0A3D3B]/80 dark:text-[#CFE4E3] space-y-1.5 list-decimal list-inside pl-1">
                <li>Appuyez sur le menu <strong>(3 points ⋮)</strong> de Google Chrome ou Samsung Internet.</li>
                <li>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
                <li>Confirmez l'installation : l'icône PharmAply apparaîtra directement parmi vos applications Android.</li>
              </ol>
            </div>

            <div className="mt-6 flex items-center gap-3">
              {isInstallable ? (
                <button
                  onClick={async () => {
                    const outcome = await install();
                    if (outcome) {
                      setShowGuideModal(false);
                      setInstallSuccess(true);
                    }
                  }}
                  className="flex-1 h-12 rounded-full bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition"
                >
                  <Download size={16} />
                  <span>Installer maintenant</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="flex-1 h-12 rounded-full bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold text-xs flex items-center justify-center transition"
                >
                  J'ai compris
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Notification after install */}
      {installSuccess && (
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-3xl bg-[#0E7673] text-white p-4 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={24} className="text-[#38B794] shrink-0" />
          <div className="text-xs">
            <strong className="block font-bold">PharmAply est installée sur votre Android !</strong>
            <span className="text-[#D7F1EA]">Retrouvez-la désormais sur votre écran d'accueil comme vos autres applications.</span>
          </div>
        </div>
      )}
    </>
  );
};
