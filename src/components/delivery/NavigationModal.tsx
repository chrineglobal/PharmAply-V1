import React, { useState } from 'react';
import { Navigation, MapPin, X, Check, ExternalLink, Compass } from 'lucide-react';
import {
  NavigationApp,
  NavigationTarget,
  getPreferredNavigationApp,
  setPreferredNavigationApp,
  launchNavigation
} from '../../lib/navigation';
import toast from 'react-hot-toast';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: NavigationTarget;
}

export function NavigationModal({ isOpen, onClose, target }: NavigationModalProps) {
  const [preferredApp, setPreferredState] = useState<NavigationApp | null>(getPreferredNavigationApp());
  const [setAsDefault, setSetAsDefault] = useState(false);

  if (!isOpen) return null;

  const handleLaunch = (app: NavigationApp) => {
    if (setAsDefault) {
      setPreferredNavigationApp(app);
      setPreferredState(app);
    }

    const appName = app === 'google_maps' ? 'Google Maps' : app === 'waze' ? 'Waze' : 'Application GPS';
    toast.success(`Lancement de ${appName}...`);
    launchNavigation(app, target);
    onClose();
  };

  const handleClearDefault = () => {
    setPreferredNavigationApp(null);
    setPreferredState(null);
    toast.success('Préférence réinitialisée.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Lancer la Navigation GPS
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Coordonnées GPS pré-remplies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Destination Info Box */}
        <div className="p-5 pb-3">
          <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-3.5 border border-slate-100 dark:border-zinc-800 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {target.label || 'Destination'}
              </p>
              {target.address && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {target.address}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                  {target.lat.toFixed(5)}, {target.lng.toFixed(5)}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  • GPS exact
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Apps Choices */}
        <div className="px-5 space-y-2.5">
          {/* Google Maps */}
          <button
            onClick={() => handleLaunch('google_maps')}
            className="w-full group p-3.5 rounded-2xl border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-zinc-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition flex items-center justify-between text-left shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              {/* Google Maps Icon Badge */}
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-700 shadow-sm border border-gray-100 dark:border-zinc-600 flex items-center justify-center p-2">
                <svg viewBox="0 0 48 48" className="w-full h-full">
                  <path fill="#4caf50" d="M34.5 4h-21C7.2 4 2 9.2 2 15.5v21C2 42.8 7.2 48 13.5 48h21c6.3 0 11.5-5.2 11.5-11.5v-21C46 9.2 40.8 4 34.5 4z"/>
                  <path fill="#ffffff" d="M24 10c-5.5 0-10 4.5-10 10 0 7.5 10 18 10 18s10-10.5 10-18c0-5.5-4.5-10-10-10zm0 14c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                  <circle cx="24" cy="20" r="3" fill="#ea4335" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    Google Maps
                  </span>
                  {preferredApp === 'google_maps' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Itinéraire vocal complet, trafic en temps réel
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
          </button>

          {/* Waze */}
          <button
            onClick={() => handleLaunch('waze')}
            className="w-full group p-3.5 rounded-2xl border border-gray-200 dark:border-zinc-700 hover:border-cyan-500 dark:hover:border-cyan-500 bg-white dark:bg-zinc-800/80 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition flex items-center justify-between text-left shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              {/* Waze Icon Badge */}
              <div className="w-11 h-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 shadow-sm border border-cyan-100 dark:border-cyan-900 flex items-center justify-center p-2 text-cyan-600 dark:text-cyan-400">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 2.4.84 4.6 2.25 6.33L3.5 21.5l3.32-.82C8.38 21.49 10.14 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-3 8.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3 6.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    Waze
                  </span>
                  {preferredApp === 'waze' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Alertes trafic communautaires, radars & travaux
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-600 transition" />
          </button>

          {/* Default / System GPS URI */}
          <button
            onClick={() => handleLaunch('default_geo')}
            className="w-full group p-3.5 rounded-2xl border border-gray-200 dark:border-zinc-700 hover:border-teal-500 dark:hover:border-teal-500 bg-white dark:bg-zinc-800/80 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition flex items-center justify-between text-left shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    Application GPS du téléphone
                  </span>
                  {preferredApp === 'default_geo' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Ouvrir avec le sélecteur d'application système (geo:)
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition" />
          </button>
        </div>

        {/* Set as default preference checkbox */}
        <div className="p-5 pt-4 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-600 dark:text-gray-300 select-none">
            <input
              type="checkbox"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-gray-300 dark:border-zinc-700 focus:ring-teal-500"
            />
            <span>Mémoriser mon choix pour les prochains lancements</span>
          </label>

          {preferredApp && (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <span>App favorite active : <strong className="text-gray-800 dark:text-gray-200 capitalize">{preferredApp.replace('_', ' ')}</strong></span>
              <button
                type="button"
                onClick={handleClearDefault}
                className="text-red-500 hover:text-red-600 font-semibold"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
