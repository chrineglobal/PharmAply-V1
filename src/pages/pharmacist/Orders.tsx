import { Search, Filter, Settings, ChevronDown, ArrowUpRight, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, onSnapshot } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { formatCurrency, parseDate, sortByDateDesc } from '../../lib/utils';
import { useTranslation } from "react-i18next";
import { useUserProfiles } from "../../lib/userSync";
import { UserAvatar } from "../../components/common/UserAvatar";
import dayjs from "dayjs";

export function PharmacistOrders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'All' | 'pending' | 'preparing' | 'ready' | 'cancelled' | 'rejected'>('All');

  // Extract patient IDs to subscribe in real-time
  const patientIds = useMemo(() => {
    return orders.map(o => o.patientId || o.userId).filter(Boolean);
  }, [orders]);

  const userProfiles = useUserProfiles(patientIds);

  useEffect(() => {
    let unsubscribeOrders: () => void;
    
    const fetchContext = async () => {
      if (!user) return;
      try {
        const pQuery = query(collection(db, 'pharmacies'), where("ownerId", "==", user.uid));
        const pSnap = await getDocs(pQuery);
        let pharmacyId = pSnap.docs[0]?.id;
        if (!pharmacyId) {
          setLoading(false);
          return;
        }

        const ordersQuery = query(collection(db, 'orders'), where('pharmacyId', '==', pharmacyId));
        unsubscribeOrders = onSnapshot(ordersQuery, (oSnap) => {
          const ordersData = sortByDateDesc(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setOrders(ordersData);
          setLoading(false);
        });
        
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchContext();
    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [user]);

  const filteredOrders = useMemo(() => {
    return sortByDateDesc(
      orders.filter(o => {
        const matchTab = activeTab === 'All' ? true : o.status === activeTab;
        const patientId = o.patientId || o.userId;
        const livePatientName = userProfiles[patientId]?.name || o.patientName || '';
        const matchSearch = !searchTerm.trim() || 
          o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          livePatientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.items?.some((i: any) => i.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchTab && matchSearch;
      })
    );
  }, [orders, activeTab, searchTerm, userProfiles]);

  return (
    <div className="flex-1 bg-transparent flex flex-col relative h-full overflow-hidden">
      
      {/* Top Navigation Area Header */}
      <div className="px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex-1 flex items-center">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7]" size={18} />
                <input 
                   type="text" 
                   placeholder={t('search_orders', 'Rechercher des commandes...')} 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] focus:border-[#0E7673] dark:focus:border-[#38B794] py-3 pl-12 pr-4 rounded-full text-sm outline-none text-[#0A3D3B] dark:text-white placeholder-[#5C807F] dark:placeholder-[#9FC8C7] transition-all shadow-sm"
                />
             </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar space-y-8">
         <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#0A3D3B] dark:text-white tracking-tight">
               {t('orders', 'Commandes')}
            </h1>
         </div>

         {/* Filtering Tabs & Actions */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex gap-2 pb-2 text-sm font-bold overflow-x-auto hide-scrollbar">
                {(['All', 'pending', 'preparing', 'ready', 'cancelled', 'rejected'] as const).map(tab => (
                 <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-[#0E7673] text-white shadow-sm' : 'bg-white dark:bg-[#0A3D3B] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]'}`}
                 >
                    {tab === 'All' ? t('all', 'Tous') : tab}
                 </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
               <button className="flex items-center gap-1.5 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] px-4 py-2.5 rounded-full text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors shadow-sm">
                  <Settings size={14} /> {t('filter', 'Filtrer')} <ChevronDown size={12} />
               </button>
               <button className="flex items-center gap-1.5 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] px-4 py-2.5 rounded-full text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors shadow-sm">
                  <ArrowUpRight size={14} /> {t('sort_by', 'Trier par')} <ChevronDown size={12} />
               </button>
            </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-[#CFE4E3] dark:border-[#145250]">
                        <th className="py-4 px-6 text-xs font-bold tracking-wider text-[#5C807F] dark:text-[#9FC8C7] uppercase">{t('name', 'Nom')}</th>
                        <th className="py-4 px-6 text-xs font-bold tracking-wider text-[#5C807F] dark:text-[#9FC8C7] uppercase">{t('medicine', 'Médicament')}</th>
                        <th className="py-4 px-6 text-xs font-bold tracking-wider text-[#5C807F] dark:text-[#9FC8C7] uppercase">{t('status', 'Statut')}</th>
                        <th className="py-4 px-6 text-xs font-bold tracking-wider text-[#5C807F] dark:text-[#9FC8C7] uppercase">{t('quantity', 'Quantité')}</th>
                        <th className="py-4 px-6 text-xs font-bold tracking-wider text-[#5C807F] dark:text-[#9FC8C7] uppercase">{t('total_price', 'Prix Total')}</th>
                        <th className="py-4 px-6 text-xs font-bold tracking-wider text-[#5C807F] dark:text-[#9FC8C7] uppercase flex items-center gap-1">{t('date', 'Date')} <ChevronDown size={12}/></th>
                        <th className="py-4 px-6 text-xs font-bold tracking-wider text-[#5C807F] dark:text-[#9FC8C7] uppercase text-right">{t('actions', 'Action')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFE4E3]/60 dark:divide-[#145250]">
                     {loading ? (
                        <tr><td colSpan={7} className="py-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-sm animate-pulse">{t('loading_orders', 'Chargement des commandes...')}</td></tr>
                     ) : filteredOrders.length === 0 ? (
                        <tr><td colSpan={7} className="py-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-sm">{t('no_active_orders', 'Aucune commande.')}</td></tr>
                     ) : (
                        filteredOrders.map((order) => {
                           const pId = order.patientId || order.userId;
                           const liveName = userProfiles[pId]?.name || order.patientName || 'Client';
                           const livePhoto = userProfiles[pId]?.photoUrl || order.patientPhoto || order.patientPhotoUrl || '';
                           return (
                           <tr key={order.id} className="hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]/50 transition-colors cursor-pointer" onClick={() => navigate(`/pharmacist/order/${order.id}`)}>
                              <td className="py-4 px-6">
                                 <div className="flex items-center gap-3">
                                    <UserAvatar
                                       userId={pId}
                                       name={liveName}
                                       photoUrl={livePhoto}
                                       sizeClassName="w-8 h-8"
                                    />
                                    <span className="font-bold text-[#0A3D3B] dark:text-white text-sm">{liveName}</span>
                                 </div>
                              </td>
                              <td className="py-4 px-6 text-sm font-medium text-[#5C807F] dark:text-[#D7F1EA]">
                                 {order.items && order.items[0] ? order.items[0].name : 'Item'}
                                 {order.items && order.items.length > 1 && ` (+${order.items.length - 1})`}
                              </td>
                              <td className="py-4 px-6 text-sm">
                                 <span className={`capitalize font-bold text-xs ${
                                     order.status === 'pending' ? 'text-amber-600 dark:text-amber-400' :
                                     order.status === 'preparing' ? 'text-[#0E7673] dark:text-[#38B794]' :
                                     order.status === 'ready' ? 'text-[#0A3D3B] dark:text-[#D7F1EA]' :
                                     order.status === 'delivered' ? 'text-emerald-600 dark:text-emerald-400' :
                                     'text-red-500'
                                 }`}>
                                    {order.status}
                                 </span>
                              </td>
                              <td className="py-4 px-6">
                                 <div className="flex items-center gap-2 bg-[#E7F1F1] dark:bg-[#062625] px-3 py-1.5 rounded-full w-max border border-[#CFE4E3] dark:border-[#145250]">
                                    <span className="text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] tabular-nums">{order.items ? order.items.reduce((acc: any, curr: any) => acc + curr.quantity, 0) : 0}</span>
                                 </div>
                              </td>
                              <td className="py-4 px-6 font-bold text-[#0E7673] dark:text-[#38B794] text-sm tabular-nums">
                                 {formatCurrency(order.total || 0)}
                              </td>
                              <td className="py-4 px-6 text-xs font-medium text-[#5C807F] dark:text-[#9FC8C7]">
                                 {order.createdAt ? dayjs(parseDate(order.createdAt)).format('MMM DD, YYYY hh:mm A') : 'N/A'}
                              </td>
                              <td className="py-4 px-6 text-right">
                                 <button
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       navigate(`/pharmacist/messages/${order.id}`, { state: { patientId: order.patientId } });
                                    }}
                                    className="bg-[#D7F1EA] text-[#0E7673] hover:bg-[#38B794] hover:text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794] dark:hover:bg-[#38B794] dark:hover:text-[#0A3D3B] px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                                 >
                                    {t('messages', 'Messagerie')}
                                 </button>
                              </td>
                           </tr>
                           );
                        })
                     )}
                  </tbody>
               </table>
            </div>
         </div>
         
      </div>
    </div>
  );
}
