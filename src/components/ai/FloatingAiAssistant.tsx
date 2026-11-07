import React, { useState } from 'react';
import { Sparkles, Bot, MessageSquare } from 'lucide-react';
import { AiPharmacistModal } from './AiPharmacistModal';

interface FloatingAiAssistantProps {
  className?: string;
}

export function FloatingAiAssistant({ className = '' }: FloatingAiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    const handleGlobalOpen = (e: any) => {
      const query = e.detail?.query;
      setInitialQuery(query);
      setIsOpen(true);
    };

    window.addEventListener('open-ai-pharmacist', handleGlobalOpen);
    return () => window.removeEventListener('open-ai-pharmacist', handleGlobalOpen);
  }, []);

  const handleOpen = (query?: string) => {
    setInitialQuery(query);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setInitialQuery(undefined);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div 
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 group ${className}`}
      >
        {/* Tooltip / Label visible on desktop hover or mobile pulse */}
        <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-semibold shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-1 group-hover:translate-x-0">
          <span>Conseil Pharmacien IA</span>
          <span className="ml-1 text-[10px] text-emerald-400 dark:text-emerald-600 font-bold">• Maps</span>
        </div>

        <button
          onClick={() => handleOpen()}
          aria-label="Ouvrir l'assistant pharmacien IA"
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border-2 border-white/30 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
        >
          {/* Animated ping glow ring */}
          <span className="absolute -inset-1 rounded-2xl bg-emerald-400 opacity-30 animate-pulse blur-sm -z-10" />

          {/* Icon */}
          <div className="relative">
            <Sparkles className="w-7 h-7 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-emerald-600 animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-emerald-600" />
          </div>
        </button>
      </div>

      {/* Modal Assistant */}
      <AiPharmacistModal
        isOpen={isOpen}
        onClose={handleClose}
        initialQuery={initialQuery}
      />
    </>
  );
}
