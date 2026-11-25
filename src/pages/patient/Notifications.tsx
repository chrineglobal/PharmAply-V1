import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Star, Tag, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../hooks/useNotifications";

type TabType = 'All' | 'Medicine Reminders' | 'Rating';

export function PatientNotifications() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('All');
  
  const { items: allItems, readIds, markAllAsRead, markAsRead } = useNotifications();

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'Medicine Reminders': return allItems.filter(i => i.type === 'reminder');
      case 'Rating': return allItems.filter(i => i.type === 'rating');
      default: return allItems;
    }
  };

  const filteredItems = getFilteredItems();

  const handleItemClick = (item: any) => {
    markAsRead(item.id);
    if (item.type === 'rating' || item.type === 'order_status') {
      navigate(`/patient/tracking/${item.relatedId || item.id}`);
    } else if (item.type === 'payment_required') {
      navigate('/patient/orders');
    } else if (item.type === 'reminder') {
      navigate('/patient/reminders');
    } else if (item.relatedId) {
      navigate(`/patient/tracking/${item.relatedId}`);
    }
  };

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey as TabType);
  };

  const tabs: { key: TabType, label: string }[] = [
    { key: 'All', label: t('all', 'All') },
    { key: 'Medicine Reminders', label: t('medicine_reminders', 'Medicine Reminders') },
    { key: 'Rating', label: t('rating', 'Rating') }
  ];

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-[#0E7673] text-white px-6 pt-12 pb-2 shadow-sm z-10">
         <div className="flex items-center justify-between mb-4">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white border border-white/20 rounded-full bg-white/15 shadow-sm hover:bg-white/25 transition">
             <ArrowLeft size={20} />
           </button>
           <h1 className="text-lg font-bold text-white">{t('notification', 'Notification')}</h1>
           <div className="w-10"></div>
         </div>
         
         <div className="flex gap-4 text-sm font-medium overflow-x-auto hide-scrollbar">
            {tabs.map(tab => (
              <button 
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={`pb-2.5 capitalize whitespace-nowrap transition-colors ${activeTab === tab.key ? 'text-white border-b-2 border-[#38B794] font-bold' : 'text-[#D7F1EA]/70 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
         <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-[#0A3D3B] dark:text-white">{t('all_notification', 'All Notification')}</h2>
            <button onClick={markAllAsRead} className="text-xs text-[#0E7673] dark:text-[#38B794] font-bold">{t('mark_as_read', 'Mark as read')}</button>
         </div>

         <div className="space-y-4">
            {filteredItems.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-[#D7F1EA] dark:bg-[#0A3D3B] rounded-full flex items-center justify-center mb-4">
                     <Bell size={24} className="text-[#0E7673] dark:text-[#38B794]" />
                  </div>
                  <h3 className="font-bold text-[#0A3D3B] dark:text-white">{t('no_notifications_yet', 'No notifications yet')}</h3>
                  <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] mt-2 px-8">{t('no_notifications_desc', 'When you receive notifications, they will appear here immediately')}</p>
               </div>
            ) : (
               filteredItems.map(item => (
                  <div key={item.id} onClick={() => handleItemClick(item)} className={`bg-white dark:bg-[#0A3D3B] p-4 rounded-3xl border ${readIds.includes(item.id) ? 'border-[#CFE4E3]/60 dark:border-[#145250]' : 'border-[#38B794] dark:border-[#38B794]'} shadow-sm relative cursor-pointer transition`}>
                     {!readIds.includes(item.id) && <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full"></div>}

                     {item.type === 'rating' && (
                        <div className="flex flex-col items-center justify-center text-center py-2">
                           <div className="w-12 h-12 bg-[#D7F1EA] dark:bg-[#0E4A47] flex items-center justify-center rounded-full text-[#0E7673] dark:text-[#38B794] mb-2">
                              <Star size={24} />
                           </div>
                           <span className="text-[10px] text-[#5C807F] dark:text-[#9FC8C7] mb-2 block w-full text-center">2h {t('ago', 'ago')}</span>
                           <h3 className="font-bold text-[#0A3D3B] dark:text-white">{t('rate_delivery_experience', 'Rate your delivery experience')}</h3>
                           <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1 mb-4">{t('rate_delivery_desc', 'How was your order from City Pharmacy? Share your feedback.')}</p>
                           <div className="flex gap-2 w-full">
                             <button className="flex-1 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full py-3 font-bold text-sm shadow-md transition">{t('rate_now', 'Rate Now')}</button>
                             <button className="flex-1 bg-white dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full py-3 font-bold text-sm">{t('close', 'Close')}</button>
                           </div>
                        </div>
                     )}
                     
                     {item.type === 'reminder' && (
                        <div className="flex gap-4">
                           <div className="mt-1 w-10 h-10 bg-[#E7F1F1] dark:bg-[#0E4A47] flex items-center justify-center rounded-2xl shrink-0 text-[#0E7673] dark:text-[#38B794] border border-[#CFE4E3] dark:border-[#145250]">
                             <Clock size={18} />
                           </div>
                           <div>
                              <h3 className="font-bold text-sm text-[#0A3D3B] dark:text-white">{item.title}</h3>
                              <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1 leading-relaxed">{item.description}</p>
                              <span className="text-[10px] text-[#5C807F] dark:text-[#9FC8C7] mt-2 block w-full text-left">2h {t('ago', 'ago')}</span>
                           </div>
                        </div>
                     )}
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}
