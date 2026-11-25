import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, Lock, Grid, Activity, Users, Settings, MoreHorizontal, CheckCircle, Package, ShieldAlert, AlertTriangle, Clock, TrendingUp, DollarSign, Pill, Moon, Sun, ArrowUpRight, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeProvider';
import { useDarkMode } from '../../components/DarkModeProvider';
import { formatCurrency, parseDate, sortByDateDesc } from '../../lib/utils';
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "../../components/NotificationBell";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { useUserProfiles } from "../../lib/userSync";
import { UserAvatar } from "../../components/common/UserAvatar";

export function PharmacistHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Set<string>>(new Set());

  // Real-time lookup for patient names & avatars
  const patientIds = useMemo(() => {
    return orders.map(o => o.patientId || o.userId).filter(Boolean);
  }, [orders]);

  const userProfiles = useUserProfiles(patientIds);

  useEffect(() => {
    let unsubscribeOrders: () => void;
    let unsubscribeProducts: () => void;

    const fetchContext = async () => {
      if (!user) return;
      try {
        const pQuery = query(collection(db, 'pharmacies'), where("ownerId", "==", user.uid));
        const pSnap = await getDocs(pQuery);
        if (pSnap.empty) {
          setLoading(false);
          return;
        }
        
        const pharmDoc = pSnap.docs[0];
        setPharmacy({ id: pharmDoc.id, ...pharmDoc.data() });
        const pharmacyId = pharmDoc.id;

        const ordersQuery = query(collection(db, 'orders'), where('pharmacyId', '==', pharmacyId));
        unsubscribeOrders = onSnapshot(ordersQuery, (oSnap) => {
           const fetchedOrders = sortByDateDesc(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
           setOrders(fetchedOrders);
           
           // Calculate unique customers
           const uniqueCustomers = new Set<string>();
           fetchedOrders.forEach(o => {
             if (o.userId) uniqueCustomers.add(o.userId);
           });
           setCustomers(uniqueCustomers);
        });

        const pProductsQuery = query(collection(db, 'products'), where('pharmacyId', '==', pharmacyId));
        unsubscribeProducts = onSnapshot(pProductsQuery, (pSnap2) => {
           setProducts(pSnap2.docs.map(d => ({ id: d.id, ...d.data() })));
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
      if (unsubscribeProducts) unsubscribeProducts();
    };
  }, [user]);

  const todayRevenue = orders.reduce((sum, order) => {
    if (order.createdAt && dayjs(parseDate(order.createdAt)).isSame(dayjs(), 'day')) {
      return sum + (order.total || 0);
    }
    return sum;
  }, 0);

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  
  const expiredCount = products.filter(p => p.expiryDate && dayjs(p.expiryDate).isBefore(dayjs())).length;
  const expiredPercentage = products.length > 0 ? (expiredCount / products.length) * 100 : 0;

  // Compute Weekly Sales Data
  const last7Days = Array.from({length: 6}).map((_, i) => dayjs().subtract(5 - i, 'day'));
  const salesData = last7Days.map(date => {
     const dayOrders = orders.filter(o => o.createdAt && dayjs(parseDate(o.createdAt)).isSame(date, 'day'));
     const dayTotal = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
     return {
        name: date.format('ddd'),
        total: dayTotal,
        date: date.format('MMM DD, YYYY')
     };
  });

  // Calculate Graph Report data (e.g. Sales by Category)
  const categorySalesMap = new Map<string, number>();
  orders.forEach(order => {
     if (order.items) {
        order.items.forEach((item: any) => {
           const product = products.find(p => p.id === item.productId);
           const cat = product?.category || product?.ux_category_id || 'Unknown';
           categorySalesMap.set(cat, (categorySalesMap.get(cat) || 0) + (item.price * item.quantity));
        });
     }
  });

  const rawPieData = Array.from(categorySalesMap.entries()).map(([name, value]) => ({ name, value }));
  const pieData = rawPieData.length > 0 ? rawPieData.sort((a,b) => b.value - a.value).slice(0, 4) : [{name: 'No Sales', value: 1}];
  
  const COLORS = ['#0E7673', '#38B794', '#5C807F', '#9FC8C7'];

  return (
    <div className="flex-1 bg-transparent flex flex-col relative h-full overflow-hidden">
      
      {/* Top Navigation Bar */}
      <div className="px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex-1 flex items-center">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7]" size={18} />
                <input 
                   type="text" 
                   placeholder={t('search', 'Rechercher...')} 
                   className="w-full bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] focus:border-[#0E7673] dark:focus:border-[#38B794] py-3 pl-12 pr-4 rounded-full text-sm outline-none text-[#0A3D3B] dark:text-white placeholder-[#5C807F] dark:placeholder-[#9FC8C7] transition-all shadow-sm"
                />
             </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
             <LanguageSwitcher variant="pill" />
             
             <button 
                onClick={toggleDarkMode}
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0A3D3B] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors rounded-full text-[#0A3D3B] dark:text-[#D7F1EA] shadow-sm border border-[#CFE4E3] dark:border-[#145250]"
                title={isDarkMode ? t('light_mode', 'Mode clair') : t('dark_mode', 'Mode sombre')}
             >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>

             <button 
                onClick={() => navigate('/pharmacist/messages')}
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0A3D3B] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors rounded-full text-[#0A3D3B] dark:text-[#D7F1EA] shadow-sm border border-[#CFE4E3] dark:border-[#145250]"
                title={t('messages', 'Messagerie')}
             >
                <MessageSquare size={18} />
             </button>

             <NotificationBell />

             <div className="flex items-center gap-3 cursor-pointer pl-2">
                <img 
                  src={user?.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover shadow-sm border border-[#CFE4E3] dark:border-[#145250]"
                />
                <div className="hidden sm:block">
                   <p className="font-bold text-[#0A3D3B] dark:text-white text-sm">{userData?.name || user?.displayName || pharmacy?.name || t('pharmacist', 'Pharmacien')}</p>
                   <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">{user?.email}</p>
                </div>
                <ChevronDown size={14} className="text-[#5C807F] dark:text-[#9FC8C7] hidden sm:block" />
             </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar space-y-8">
         
         {/* Welcome Section */}
         <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#0A3D3B] dark:text-white tracking-tight">
               {t('welcome', 'Bienvenue')} {userData?.name?.split(' ')[0] || ''} !
            </h1>
            <div className="bg-[#0E7673] text-white px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm cursor-pointer hover:bg-[#0A5A58] transition-colors">
               <span>{t('team_member', 'Membre de l\'équipe')}</span>
               <ChevronDown size={14} />
            </div>
         </div>

         {/* Stats Row */}
         <div>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-bold text-[#0A3D3B] dark:text-white">{t('pharmacy_sales_results', 'Résultats des Ventes de la Pharmacie')}</h2>
               <div className="flex items-center gap-3">
                  <div className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold text-[#0A3D3B] dark:text-[#D7F1EA] shadow-sm cursor-pointer">
                     <Clock size={14} className="text-[#0E7673] dark:text-[#38B794]" />
                     <span>{t('this_month', 'Ce mois')}</span>
                     <ChevronDown size={14} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                  </div>
                  <button className="w-9 h-9 rounded-full bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-center text-[#0E7673] dark:text-[#38B794] shadow-sm hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors">
                     <Activity size={16} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-[#D7F1EA] dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-3xl p-6 relative overflow-hidden shadow-sm">
                   <div className="flex justify-between items-start mb-6 z-10 relative">
                      <div className="w-9 h-9 rounded-full bg-white/80 dark:bg-[#062625] flex items-center justify-center text-[#0E7673] dark:text-[#38B794]">
                         <Lock size={15} />
                      </div>
                      <MoreHorizontal size={16} className="text-[#0A3D3B]/50 dark:text-[#9FC8C7]" />
                   </div>
                   <div className="z-10 relative">
                      <p className="text-[#0A3D3B]/80 dark:text-[#9FC8C7] text-sm font-bold mb-1">{t('todays_sales', 'Ventes du jour')}</p>
                      <h3 className="text-3xl font-black text-[#0A3D3B] dark:text-white mb-2 tabular-nums">{formatCurrency(todayRevenue)}</h3>
                      <p className="text-xs font-bold text-[#0E7673] dark:text-[#38B794] flex items-center gap-1">
                         <span>+2.5%</span> {t('this_month', 'Ce mois')}
                      </p>
                   </div>
                   <div className="absolute bottom-0 right-4 flex items-end gap-1.5 opacity-20 h-16">
                      <div className="w-3 bg-[#0E7673] dark:bg-[#38B794] rounded-t-sm h-full"></div>
                      <div className="w-3 bg-[#0E7673] dark:bg-[#38B794] rounded-t-sm h-3/4"></div>
                      <div className="w-3 bg-[#0E7673] dark:bg-[#38B794] rounded-t-sm h-1/2"></div>
                      <div className="w-3 bg-[#0E7673] dark:bg-[#38B794] rounded-t-sm h-full"></div>
                   </div>
               </div>

               <div className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-3xl p-6 relative overflow-hidden shadow-sm">
                   <div className="flex justify-between items-start mb-6 z-10 relative">
                      <div className="w-9 h-9 rounded-full bg-[#E7F1F1] dark:bg-[#062625] flex items-center justify-center text-[#0E7673] dark:text-[#38B794]">
                         <Grid size={15} />
                      </div>
                      <MoreHorizontal size={16} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                   </div>
                   <div className="z-10 relative">
                      <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm font-bold mb-1">{t('available_categories', 'Catégories disponibles')}</p>
                      <h3 className="text-3xl font-black text-[#0A3D3B] dark:text-white mb-2 tabular-nums">
                        {Array.from(new Set(products.map(p => p.category || p.ux_category_id))).filter(Boolean).length}
                      </h3>
                      <p className="text-xs font-bold text-[#38B794] flex items-center gap-1">
                         <span>+2.5%</span> {t('this_month', 'Ce mois')}
                      </p>
                   </div>
                   <div className="absolute bottom-0 right-4 flex items-end gap-1.5 opacity-15 h-16">
                      <div className="w-3 bg-[#38B794] rounded-t-sm h-1/2"></div>
                      <div className="w-3 bg-[#38B794] rounded-t-sm h-full"></div>
                      <div className="w-3 bg-[#38B794] rounded-t-sm h-3/4"></div>
                      <div className="w-3 bg-[#38B794] rounded-t-sm h-full"></div>
                   </div>
               </div>

               <div className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-3xl p-6 relative overflow-hidden shadow-sm">
                   <div className="flex justify-between items-start mb-6 z-10 relative">
                      <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
                         <Activity size={15} />
                      </div>
                      <MoreHorizontal size={16} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                   </div>
                   <div className="z-10 relative">
                      <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm font-bold mb-1">{t('expired_medicines', 'Médicaments expirés')}</p>
                      <h3 className="text-3xl font-black text-[#0A3D3B] dark:text-white mb-2 tabular-nums">{expiredPercentage.toFixed(2)}%</h3>
                      <p className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] flex items-center gap-1">
                         <span className="text-red-500 dark:text-red-400">{expiredCount}</span> {t('this_month', 'Ce mois')}
                      </p>
                   </div>
                   <div className="absolute bottom-0 right-4 flex items-end gap-1.5 opacity-15 h-16">
                      <div className="w-3 bg-red-500 rounded-t-sm h-full"></div>
                      <div className="w-3 bg-red-500 rounded-t-sm h-1/2"></div>
                      <div className="w-3 bg-red-500 rounded-t-sm h-3/4"></div>
                      <div className="w-3 bg-red-500 rounded-t-sm h-1/4"></div>
                   </div>
               </div>

               <div className="bg-[#0E7673] dark:bg-[#0E4A47] border border-[#0E7673] dark:border-[#145250] rounded-3xl p-6 relative overflow-hidden shadow-sm text-white">
                   <div className="flex justify-between items-start mb-6 z-10 relative">
                      <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-[#D7F1EA]">
                         <Users size={15} />
                      </div>
                      <MoreHorizontal size={16} className="text-white/60" />
                   </div>
                   <div className="z-10 relative">
                      <p className="text-[#D7F1EA] text-sm font-bold mb-1">{t('system_users', 'Utilisateurs du système')}</p>
                      <h3 className="text-3xl font-black text-white mb-2 tabular-nums">{customers.size}</h3>
                      <p className="text-xs font-bold text-[#D7F1EA] flex items-center gap-1">
                         <span className="text-[#38B794]">+{customers.size > 0 ? '1' : '0'}</span> {t('this_month', 'Ce mois')}
                      </p>
                   </div>
                   <div className="absolute bottom-0 right-4 flex items-end gap-1.5 opacity-20 h-16">
                      <div className="w-3 bg-[#D7F1EA] rounded-t-sm h-3/4"></div>
                      <div className="w-3 bg-[#D7F1EA] rounded-t-sm h-full"></div>
                      <div className="w-3 bg-[#D7F1EA] rounded-t-sm h-1/2"></div>
                      <div className="w-3 bg-[#D7F1EA] rounded-t-sm h-full"></div>
                   </div>
               </div>
            </div>
         </div>

         {/* Charts Section */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 relative overflow-hidden border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex flex-col">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white">{t('graph_report', 'Rapport Graphique')}</h3>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#5C807F] dark:text-[#9FC8C7] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors">
                     <MoreHorizontal size={14} />
                  </button>
               </div>
               <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] relative">
                  <ResponsiveContainer width="100%" height={250}>
                     <PieChart>
                        <Pie
                           data={pieData}
                           cx="50%"
                           cy="50%"
                           innerRadius={70}
                           outerRadius={100}
                           fill="#0E7673"
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <p className="text-[#5C807F] dark:text-[#9FC8C7] text-xs font-bold uppercase tracking-wider mb-1">{t('total', 'Total')}</p>
                     <p className="text-2xl font-black text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(totalRevenue)}</p>
                  </div>
               </div>
               <div className="flex justify-center flex-wrap gap-6 mt-4">
                  {pieData.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                         <span className="text-xs font-medium text-[#5C807F] dark:text-[#9FC8C7]">{entry.name}</span>
                      </div>
                  ))}
               </div>
            </div>

            <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 relative overflow-hidden border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex flex-col">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white">{t('total_sales_overview', 'Aperçu Total des Ventes')}</h3>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#5C807F] dark:text-[#9FC8C7] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors">
                     <MoreHorizontal size={14} />
                  </button>
               </div>
               <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height={250}>
                     <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#145250" : "#CFE4E3"} />
                        <XAxis 
                           dataKey="name" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{fill: isDarkMode ? '#9FC8C7' : '#5C807F', fontSize: 12, fontWeight: 600}} 
                           dy={10}
                        />
                        <YAxis 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{fill: isDarkMode ? '#9FC8C7' : '#5C807F', fontSize: 12}}
                           tickFormatter={(value) => `${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value} XAF`}
                        />
                        <Tooltip 
                           cursor={{fill: 'rgba(14, 118, 115, 0.06)'}}
                           contentStyle={{borderRadius: '16px', border: '1px solid #CFE4E3', boxShadow: '0 4px 12px rgba(10, 61, 59, 0.08)'}}
                           formatter={(value: number) => [formatCurrency(value), 'Sales']}
                           labelStyle={{fontWeight: 'bold', color: '#0A3D3B', marginBottom: '4px'}}
                        />
                        <Bar dataKey="total" radius={[8, 8, 8, 8]} barSize={32}>
                           {
                              salesData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={
                                    index === salesData.length - 1 ? '#0E7673' :
                                    index % 2 === 0 ? '#38B794' : '#9FC8C7'
                                 } />
                              ))
                           }
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* Recent Sales List */}
         <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4 mt-8">
               <h2 className="text-xl font-bold text-[#0A3D3B] dark:text-white">{t('recent_sales_list', 'Liste des Ventes Récentes')}</h2>
               <div className="flex items-center gap-3">
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7]" size={14} />
                     <input type="text" placeholder={t('search', 'Rechercher...')} className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] py-2.5 pl-9 pr-4 rounded-full text-xs font-medium text-[#0A3D3B] dark:text-white placeholder-[#5C807F] dark:placeholder-[#9FC8C7] w-48 outline-none shadow-sm" />
                  </div>
                  <button className="flex items-center gap-1.5 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] px-4 py-2.5 rounded-full text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors shadow-sm">
                     <Settings size={14} /> {t('filter', 'Filtrer')} <ChevronDown size={12} />
                  </button>
                  <button className="flex items-center gap-1.5 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] px-4 py-2.5 rounded-full text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors shadow-sm">
                     <ArrowUpRight size={14} /> {t('sort_by', 'Trier par')} <ChevronDown size={12} />
                  </button>
                  <button className="w-9 h-9 flex items-center justify-center bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-[#5C807F] dark:text-[#9FC8C7] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors shadow-sm">
                     <MoreHorizontal size={14} />
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
                        </tr>
                     </thead>
                      <tbody className="divide-y divide-[#CFE4E3]/60 dark:divide-[#145250]">
                        {loading ? (
                           <tr><td colSpan={6} className="py-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-sm">{t('loading_sales', 'Chargement des commandes...')}</td></tr>
                        ) : orders.length === 0 ? (
                           <tr><td colSpan={6} className="py-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-sm">{t('no_recent_sales', 'Aucune vente récente.')}</td></tr>
                        ) : (
                           orders.slice(0, 5).map((order) => {
                              const pId = order.patientId || order.userId;
                              const liveName = userProfiles[pId]?.name || order.patientName || 'Client';
                              const livePhoto = userProfiles[pId]?.photoUrl || order.patientPhoto || order.patientPhotoUrl || '';
                              return (
                              <tr key={order.id} className="hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]/50 transition-colors group">
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
                                 <td className="py-4 px-6 text-sm text-[#5C807F] dark:text-[#9FC8C7] capitalize">
                                    {order.status}
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
    </div>
  );
}
