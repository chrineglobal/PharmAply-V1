import { NavLink } from "react-router-dom";
import { Home, ClipboardList, User, Package, Settings, History, MapPin, ScanLine, ShoppingCart, BarChart2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useTranslation } from "react-i18next";
import { useCart } from "../CartProvider";
import { useTheme } from "../ThemeProvider";

interface BottomNavProps {
  role: "patient" | "pharmacist" | "delivery" | "admin";
}

export function BottomNav({ role }: BottomNavProps) {
  const { t } = useTranslation();
  const { cartCount } = useCart();
  const theme = useTheme();
  const primaryColor = theme.primaryColor || '#0E7673';

  const patientLinks = [
    { to: "/patient", icon: Home, label: t('nav.home', 'Accueil'), badge: 0 },
    { to: "/patient/orders", icon: ClipboardList, label: t('nav.orders', 'Commandes'), badge: 0 },
    { to: "/patient/prescription-upload", icon: ScanLine, label: t('nav.scan', 'Scanner'), badge: 0, isCenter: true },
    { to: "/patient/cart", icon: ShoppingCart, label: t('nav.cart', 'Panier'), badge: cartCount },
    { to: "/patient/profile", icon: User, label: t('nav.profile', 'Profil'), badge: 0 },
  ];

  const pharmacistLinks = [
    { to: "/pharmacist", icon: Home, label: t('nav.home', 'Accueil') },
    { to: "/pharmacist/orders", icon: ClipboardList, label: t('nav.orders', 'Commandes') },
    { to: "/pharmacist/inventory", icon: Package, label: t('nav.inventory', 'Inventaire') },
    { to: "/pharmacist/reports", icon: BarChart2, label: t('nav.reports', 'Rapports') },
    { to: "/pharmacist/profile", icon: User, label: t('nav.profile', 'Profil') },
  ];

  const deliveryLinks = [
    { to: "/delivery", icon: Home, label: t('nav.home', 'Accueil') },
    { to: "/delivery/history", icon: History, label: t('nav.history', 'Historique') },
    { to: "/delivery/deliveries", icon: MapPin, label: t('nav.deliveries', 'Livraisons') },
    { to: "/delivery/profile", icon: User, label: t('nav.profile', 'Profil') },
  ];

  const adminLinks = [
    { to: "/admin", icon: Home, label: t('nav.home', "Tableau de bord") },
    { to: "/admin/users", icon: User, label: t('nav.users', "Utilisateurs") },
    { to: "/admin/finances", icon: BarChart2, label: t('nav.finances', "Finances") },
    { to: "/admin/settings", icon: Settings, label: t('nav.settings', "Paramètres") },
  ];

  const links =
    role === "patient"
      ? patientLinks
      : role === "pharmacist"
      ? pharmacistLinks
      : role === "delivery"
      ? deliveryLinks
      : adminLinks;

  return (
    <div className="h-[4.5rem] bg-white/95 dark:bg-[#0A3D3B]/95 backdrop-blur-xl border-t border-[#CFE4E3] dark:border-[#145250] flex items-center justify-around px-2 sm:px-6 z-40 pb-[env(safe-area-inset-bottom)] transition-colors shrink-0 shadow-sm relative">
      {links.map((link) => {
        const Icon = link.icon;
        const isCenter = (link as any).isCenter;

        if (isCenter) {
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className="group relative flex flex-col items-center justify-center w-16 h-full transition-all duration-300 z-50"
            >
              <div className="absolute -top-6 flex items-center justify-center">
                <div 
                  className="rounded-full w-14 h-14 flex items-center justify-center text-white transition-all active:scale-95 border-4 border-white dark:border-[#062625] shadow-md"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 8px 20px ${primaryColor}45`
                  }}
                >
                  <Icon size={24} strokeWidth={2.5} />
                </div>
              </div>
              <span className="font-headline text-[10px] font-bold text-[#0A3D3B] dark:text-[#CFE4E3] mt-6 group-hover:text-[#0E7673] transition-colors">
                {link.label}
              </span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/patient" || link.to === "/pharmacist" || link.to === "/delivery" || link.to === "/admin"}
            className={({ isActive }) =>
              cn(
                "group relative flex flex-col items-center justify-center w-16 h-full transition-all duration-300",
                isActive 
                  ? "font-bold text-[#0E7673] dark:text-[#38B794]" 
                  : "text-[#6EADAB] dark:text-[#6EADAB] hover:text-[#0E7673] dark:hover:text-[#E7F1F1]"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div 
                  className={cn(
                    "flex items-center justify-center transition-all duration-300 rounded-full relative z-10",
                    isActive ? "h-8 w-14 mb-1 bg-[#E7F1F1] dark:bg-[#062625]" : "h-8 w-8 mb-0.5 group-hover:bg-[#E7F1F1]/60 dark:group-hover:bg-[#062625]/60"
                  )}
                >
                   <Icon 
                     size={20} 
                     strokeWidth={isActive ? 2.5 : 2} 
                     className={cn("transition-all duration-300", isActive ? "scale-105 text-[#0E7673] dark:text-[#38B794]" : "scale-100")} 
                   />
                   {(link as any).badge > 0 && (
                     <span 
                       className="absolute -top-1 -right-1 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-[#0E7673] border border-white dark:border-[#0A3D3B]"
                     >
                       {(link as any).badge}
                     </span>
                   )}
                </div>
                <span 
                  className={cn(
                    "font-headline transition-all duration-300", 
                    isActive ? "text-[11px] font-bold tracking-wide text-[#0E7673] dark:text-[#38B794]" : "text-[10px] font-medium"
                  )}
                >
                  {link.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
