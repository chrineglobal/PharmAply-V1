import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  HeartPulse, LayoutDashboard, Package, Grid, 
  ShoppingCart, BarChart2, Users, CreditCard, 
  Settings, LogOut, Truck, MessageCircle 
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { auth, signOut, db, collection, query, where, getDocs } from "../../lib/firebase";
import { useAuth } from "../AuthProvider";
import { PharmAplyLogo } from "../common/PharmAplyLogo";
import { useDarkMode } from "../DarkModeProvider";

interface RoleSidebarProps {
  role: "patient" | "pharmacist" | "delivery" | "admin";
}

export function RoleSidebar({ role }: RoleSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useDarkMode();
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    const fetchPharmacyCompletion = async () => {
      if (role !== "pharmacist" || !user) return;
      try {
        const q = query(collection(db, 'pharmacies'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        let percentage = 20; // Base 20% for having an account
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          if (data.name) percentage += 15;
          if (data.address) percentage += 15;
          if (data.phone) percentage += 15;
          if (data.photoUrl) percentage += 15;
          if (data.coverUrl) percentage += 10;
          if (data.workingHours) percentage += 10;
        }
        setCompletionPercentage(percentage);
      } catch (error) {
        console.error("Failed to fetch pharmacy for completion status", error);
      }
    };
    fetchPharmacyCompletion();
  }, [user, role]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const menuSections = [
    {
      title: t('main_menu', 'MENU PRINCIPAL'),
      links: [
        { to: "/pharmacist", icon: LayoutDashboard, label: t('dashboard', 'Tableau de bord'), exact: true },
        { to: "/pharmacist/inventory", icon: Package, label: t('products', 'Produits') },
      ]
    },
    {
      title: t('leads', 'GESTION & VENTES'),
      links: [
        { to: "/pharmacist/orders", icon: ShoppingCart, label: t('orders', 'Commandes') },
        { to: "/pharmacist/sales", icon: BarChart2, label: t('sales', 'Ventes') },
        { to: "/pharmacist/customers", icon: Users, label: t('customers', 'Clients') },
      ]
    },
    {
      title: t('comms', 'COMMUNICATIONS'),
      links: [
        { to: "/pharmacist/messages", icon: MessageCircle, label: t('messages', 'Messagerie') },
        { to: "/pharmacist/payments", icon: CreditCard, label: t('payments', 'Paiements') },
        { to: "/pharmacist/reports", icon: BarChart2, label: t('reports', 'Rapports') },
        { to: "/pharmacist/profile", icon: Settings, label: t('settings', 'Paramètres') },
      ]
    }
  ];

  if (role !== "pharmacist") {
    // Other roles can keep a simplified version for now, but focus is on pharmacist
    return null;
  }

  return (
    <aside className="w-full h-full flex flex-col py-7 overflow-y-auto custom-scrollbar">
      <div className="px-7 mb-9 flex items-center justify-between">
        <PharmAplyLogo variant="horizontal" tone={isDark ? "white" : "color"} size="sm" />
      </div>

      <div className="flex-1 space-y-7">
        {menuSections.map((section, idx) => (
          <div key={idx} className="px-4">
            <h3 className="px-4 text-[11px] font-bold text-[#6EADAB] tracking-wider mb-2.5">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.exact}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-[#0E7673] text-white font-bold shadow-sm"
                          : "text-[#0A3D3B]/80 dark:text-[#CFE4E3] hover:bg-[#E7F1F1] dark:hover:bg-[#062625] hover:text-[#0E7673] dark:hover:text-white"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        {link.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 mt-8 shrink-0">
         {completionPercentage < 100 && (
         <div className="bg-[#D7F1EA] dark:bg-[#062625] border border-[#AFE2D4] dark:border-[#145250] p-5 rounded-3xl mb-4 relative overflow-hidden">
            <div className="flex items-start gap-3.5 z-10 relative">
               <div className="w-12 h-12 rounded-full border-4 border-[#0E7673] flex items-center justify-center font-bold text-[#0A3D3B] dark:text-[#E7F1F1] text-sm shrink-0 bg-white dark:bg-[#0A3D3B]">
                  {Math.min(completionPercentage, 100)}%
               </div>
               <div>
                  <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm mb-1 leading-tight">{t('complete_profile', 'Complete Profile')}</h4>
                  <p className="text-xs text-[#0A3D3B]/80 dark:text-[#CFE4E3] mb-3 leading-snug">{t('complete_profile_desc', 'Complete Your Profile to Unlock all Features')}</p>
               </div>
            </div>
            <button 
               onClick={() => navigate('/pharmacist/profile')}
               className="w-full py-2.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold transition-colors relative z-10 shadow-sm"
            >
               {t('update_profile', 'Update Profile')}
            </button>
         </div>
         )}

         <button 
           onClick={handleLogout}
           className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
         >
            <LogOut size={18} />
            {t('logout', 'Sign Out')}
         </button>
      </div>
    </aside>
  );
}
