import { History, Star, Bug, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AdminChangelog() {
    const { t } = useTranslation();
  const versions = [
    {
      version: "v2.1.0",
      date: "May 8, 2026",
      type: "feature",
      title: "Delivery Zones Upgrade",
      features: [
        "Added granular map drawing for delivery zones.",
        "Automatic surge pricing depending on active driver density.",
        "New UI for Admin Dashboard."
      ]
    },
    {
      version: "v2.0.4",
      date: "April 20, 2026",
      type: "bugfix",
      title: "Hotfix: Order Sync",
      features: [
        "Fixed a rare race condition where pharmacy accepting and driver arriving triggered simultaneously.",
        "Memory leak in driver live tracking resolved."
      ]
    },
    {
      version: "v2.0.0",
      date: "March 15, 2026",
      type: "major",
      title: "The Scalability Update",
      features: [
        "Migrated to fully typed Firebase functions.",
        "New Analytics & Reporting engine.",
        "Released iOS patient App version."
      ]
    }
  ];

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0">
         <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> {t('changelog', 'Changelog')} </h1>
         <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('platform_updates_and_release_n', 'Platform updates and release notes')} </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
         <div className="relative border-l-2 border-[#CFE4E3] dark:border-[#145250] ml-4 space-y-10 py-4">
            {versions.map((ver, i) => (
              <div key={i} className="relative pl-8">
                 <div className={`absolute -left-[21px] top-0 w-10 h-10 rounded-full border-4 border-[#F5FAFA] dark:border-[#062625] flex items-center justify-center
                    ${ver.type === 'feature' ? 'bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794]' : ''}
                    ${ver.type === 'bugfix' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' : ''}
                    ${ver.type === 'major' ? 'bg-[#0E7673] text-white' : ''}
                 `}>
                    {ver.type === 'feature' && <Star size={16} />}
                    {ver.type === 'bugfix' && <Bug size={16} />}
                    {ver.type === 'major' && <Rocket size={16} />}
                 </div>
                 
                 <div className="bg-white dark:bg-[#0A3D3B] p-6 rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white">{ver.title}</h3>
                       <div className="text-right">
                          <span className="font-mono text-sm font-bold text-[#0E7673] dark:text-[#38B794]">{ver.version}</span>
                          <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">{ver.date}</p>
                       </div>
                    </div>
                    
                    <ul className="space-y-2 mt-2">
                       {ver.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-[#5C807F] dark:text-[#D7F1EA]">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#38B794] mt-1.5 shrink-0" />
                             {feat}
                          </li>
                       ))}
                    </ul>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
