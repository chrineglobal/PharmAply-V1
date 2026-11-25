import { Bell, Map, Settings, Tag, Shield, FileText, Database, Palette, DollarSign, Store, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function AdminSettings() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const sections = [
    { title: "Delivery Zones & Logistics", icon: Map, color: "text-[#0E7673] dark:text-[#38B794]", bg: "bg-[#D7F1EA] dark:bg-[#0E4A47]", desc: "Service areas, shipping rules", path: "/admin/settings/delivery-zones" },
    { title: "Financial & Payments", icon: DollarSign, color: "text-emerald-600 dark:text-[#38B794]", bg: "bg-[#D7F1EA] dark:bg-[#0E4A47]", desc: "Payment gateways, tax, commissions", path: "/admin/settings/financial" },
    { title: "Vendor & Pharmacist", icon: Store, color: "text-[#0E7673] dark:text-[#38B794]", bg: "bg-[#E7F1F1] dark:bg-[#0E4A47]", desc: "KYC, licensing requirements", path: "/admin/settings/vendors" },
    { title: "Catalog & Inventory", icon: ShoppingCart, color: "text-[#0A3D3B] dark:text-[#D7F1EA]", bg: "bg-[#D7F1EA] dark:bg-[#0E4A47]", desc: "Pricing rules, substitution config", path: "/admin/settings/catalog" },
    { title: "Audit & Security Logs", icon: Database, color: "text-[#0A3D3B] dark:text-[#D7F1EA]", bg: "bg-[#E7F1F1] dark:bg-[#0E4A47]", desc: "System audit trail, API logs", path: "/admin/audit" },
    { title: "Compliance & Security Controls", icon: Shield, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/15", desc: "TOS updates, HIPAA, verification", path: "/admin/settings/compliance" },
    { title: "Security Roles & Access", icon: Shield, color: "text-[#0E7673] dark:text-[#38B794]", bg: "bg-[#D7F1EA] dark:bg-[#0E4A47]", desc: "Admin permissions, 2FA settings", path: "/admin/settings/security" },
    { title: "Theme & Visuals", icon: Palette, color: "text-[#0E7673] dark:text-[#38B794]", bg: "bg-[#D7F1EA] dark:bg-[#0E4A47]", desc: "App colors, dashboard texts", path: "/admin/settings/theme" },
    { title: "Global Configuration", icon: Settings, color: "text-[#0A3D3B] dark:text-[#D7F1EA]", bg: "bg-[#E7F1F1] dark:bg-[#0E4A47]", desc: "App maintenance, localization, API keys", path: "/admin/settings/global" },
  ];

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0">
         <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> {t('system_settings', 'System Settings')} </h1>
         <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('platform_configuration_and_log', 'Platform configuration and logs')} </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-4">
         {sections.map((sec, i) => {
            const Icon = sec.icon;
            return (
               <div 
                 key={i} 
                 onClick={() => sec.path && navigate(sec.path)}
                 className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-4 shadow-sm border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-between cursor-pointer hover:border-[#0E7673] dark:hover:border-[#38B794] hover:shadow-md transition"
               >
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sec.bg} ${sec.color}`}>
                        <Icon size={24} />
                     </div>
                     <div>
                        <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm">{sec.title}</h3>
                        <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-0.5">{sec.desc}</p>
                     </div>
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
}
