import React, { useState } from 'react';
import { Navigation, Compass, ChevronDown, ExternalLink } from 'lucide-react';
import {
  NavigationTarget,
  NavigationApp,
  getPreferredNavigationApp,
  launchNavigation
} from '../../lib/navigation';
import { NavigationModal } from './NavigationModal';
import toast from 'react-hot-toast';

interface QuickNavButtonProps {
  target: NavigationTarget;
  variant?: 'hud' | 'icon' | 'full' | 'compact';
  className?: string;
  label?: string;
}

export function QuickNavButton({
  target,
  variant = 'icon',
  className = '',
  label = 'GPS'
}: QuickNavButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const preferred = getPreferredNavigationApp();

    if (preferred) {
      const appName = preferred === 'google_maps' ? 'Google Maps' : preferred === 'waze' ? 'Waze' : 'GPS';
      toast.success(`Ouverture de ${appName}...`);
      launchNavigation(preferred, target);
    } else {
      setModalOpen(true);
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  const preferred = getPreferredNavigationApp();

  return (
    <>
      {variant === 'hud' && (
        <div className={`flex items-center gap-1 ${className}`}>
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold text-xs shadow-lg shadow-[#062625]/30 transition active:scale-95"
            title={`Lancer navigation (${preferred ? (preferred === 'waze' ? 'Waze' : 'Google Maps') : 'Google Maps / Waze'})`}
          >
            <Compass className="w-4 h-4 animate-spin text-[#38B794]" style={{ animationDuration: '6s' }} />
            <span>{preferred === 'waze' ? 'Waze' : preferred === 'google_maps' ? 'Google Maps' : 'Lancer GPS'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleOpenModal}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
            title="Choisir l'application GPS (Google Maps / Waze)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {variant === 'icon' && (
        <div className={`relative flex items-center ${className}`}>
          <button
            type="button"
            onClick={handleClick}
            className="w-10 h-10 rounded-full bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center hover:bg-[#D7F1EA] dark:hover:bg-[#145250] transition shadow-sm active:scale-95 group"
            title={`Lancer la navigation (${preferred === 'waze' ? 'Waze' : 'Google Maps'})`}
          >
            <Navigation size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0A3D3B] text-white flex items-center justify-center text-[9px] shadow hover:bg-[#0E7673]"
            title="Options GPS"
          >
            <ChevronDown size={10} />
          </button>
        </div>
      )}

      {variant === 'compact' && (
        <div className={`inline-flex items-center gap-1 ${className}`}>
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] hover:bg-[#CFE4E3] dark:hover:bg-[#145250] text-xs font-semibold transition shadow-xs"
            title="Lancer itinéraire GPS"
          >
            <Navigation size={13} />
            <span>{label}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="p-1.5 rounded-full bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#5C807F] dark:text-[#9FC8C7] hover:bg-[#CFE4E3] dark:hover:bg-[#145250] text-xs transition"
            title="Options (Google Maps / Waze)"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      )}

      {variant === 'full' && (
        <div className={`flex items-center gap-2 ${className}`}>
          <button
            type="button"
            onClick={handleClick}
            className="flex-1 py-3.5 px-4 rounded-full bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <Navigation size={18} className="text-[#38B794]" />
            <span>
              {preferred === 'waze' 
                ? 'Naviguer avec Waze' 
                : preferred === 'google_maps' 
                  ? 'Naviguer avec Google Maps' 
                  : 'Lancer Navigation GPS (Google Maps / Waze)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="py-3.5 px-3.5 rounded-full bg-[#E7F1F1] dark:bg-[#0E4A47] hover:bg-[#D7F1EA] dark:hover:bg-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] font-bold transition"
            title="Choisir Google Maps ou Waze"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      )}

      <NavigationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        target={target}
      />
    </>
  );
}
