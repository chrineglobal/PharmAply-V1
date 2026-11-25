import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-amber-600/95 text-white px-4 py-2.5 shadow-xl backdrop-blur-md animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-pulse shrink-0" />
        <WifiOff size={16} className="shrink-0" />
        <p className="text-xs font-medium truncate">
          Mode Hors-Ligne — Consultation de vos ordonnances et rappels en cache
        </p>
      </div>
    </div>
  );
};
