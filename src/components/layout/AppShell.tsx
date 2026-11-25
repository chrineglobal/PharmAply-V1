import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { cn } from "../../lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isDesktopRole = pathname.startsWith('/admin') || pathname === '/admin-login' || pathname.startsWith('/pharmacist');
  const { isImpersonating, stopImpersonating, user } = useAuth();
  const navigate = useNavigate();

  const handleStop = () => {
    stopImpersonating();
    navigate('/admin');
  };

  const renderBanner = () => {
    if (!isImpersonating) return null;
    return (
      <div className="bg-red-500 text-white text-xs font-bold py-2 px-4 shadow flex items-center justify-between shrink-0 z-50 absolute top-0 w-full left-0">
        <span>Viewing as: {user?.email || 'User'}</span>
        <button onClick={handleStop} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition">Stop Impersonating</button>
      </div>
    );
  };

  if (isDesktopRole) {
    const isPharmacy = pathname.startsWith('/pharmacist');
    
    return (
      <div className={cn(
        "w-full h-screen font-sans overflow-hidden relative flex justify-center",
        isPharmacy ? "bg-[#E7F1F1] dark:bg-[#062625] p-4 md:p-6" : "bg-[#E7F1F1] dark:bg-[#062625]"
      )}>
        {renderBanner()}
        <div className={cn(
          "w-full h-full flex flex-col overflow-hidden shadow-sm",
          isPharmacy ? "bg-white dark:bg-[#0A3D3B] rounded-[2rem] max-w-[1600px] border border-[#CFE4E3] dark:border-[#145250]" : "max-w-[1600px]",
          isImpersonating ? 'pt-8' : ''
        )}>
           {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E7F1F1] dark:bg-[#062625] flex flex-col items-center justify-center font-sans">
      <div className="w-full h-[100dvh] bg-white dark:bg-[#062625] sm:max-w-[400px] sm:h-[850px] sm:rounded-[3rem] sm:border-[12px] sm:border-[#0A3D3B] dark:sm:border-[#0A3D3B] overflow-hidden relative shadow-2xl flex flex-col transition-colors duration-200">
        {renderBanner()}
        <div className={`w-full h-full flex flex-col ${isImpersonating ? 'pt-8' : ''} overflow-hidden`}>
           {children}
        </div>
      </div>
    </div>
  );
}
