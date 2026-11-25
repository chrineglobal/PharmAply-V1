import { Users, TrendingUp, AlertTriangle, CheckCircle, Package, Store, Calendar, RotateCcw, MoreHorizontal, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, getDocs, onSnapshot, where } from '../../lib/firebase';
import { db } from "../../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { formatCurrency, parseDate, sortByDateDesc } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from '../../components/AuthProvider';

export function AdminHome() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const [stats, setStats] = useState({
    activeOrders: 0,
    pharmaciesCount: 0,
    patientsCount: 0,
    driversCount: 0,
    pendingPharmacies: 0,
    pendingDrivers: 0,
    totalRevenue: 0,
    todaySales: 0,
    pieData: [
      { name: 'Delivered', value: 1, color: '#38B794' },
      { name: 'Active', value: 1, color: '#0E7673' },
      { name: 'Pending', value: 1, color: '#F59E0B' },
      { name: 'Cancelled', value: 1, color: '#9FC8C7' }
    ]
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribeUsers: () => void;
    let unsubscribePharmacies: () => void;
    let unsubscribeOrders: () => void;

    try {
      const qUsers = collection(db, "users");
      unsubscribeUsers = onSnapshot(qUsers, (usersSnap) => {
        const users = usersSnap.docs.map(d => d.data());
        const patients = users.filter(u => u.role === "patient").length;
        const drivers = users.filter(u => u.role === "driver").length;
        const pendingDriversCount = users.filter(u => u.role === "driver" && u.status === "pending_verification").length;

        setStats(prev => ({
          ...prev,
          patientsCount: patients,
          driversCount: drivers,
          pendingDrivers: pendingDriversCount,
        }));
      });

      const qPharmacies = collection(db, "pharmacies");
      unsubscribePharmacies = onSnapshot(qPharmacies, (pharmaciesSnap) => {
        const pharmacies = pharmaciesSnap.docs.map(d => d.data());
        const approvedPharmacies = pharmacies.filter(p => p.status === "approved" || !p.status).length;
        const pendingPharmaciesCount = pharmacies.filter(p => p.status === "pending_verification").length;

        setStats(prev => ({
          ...prev,
          pharmaciesCount: approvedPharmacies,
          pendingPharmacies: pendingPharmaciesCount,
        }));
      });

      const qOrders = collection(db, "orders");
      unsubscribeOrders = onSnapshot(qOrders, (ordersSnap) => {
        const orders: any[] = sortByDateDesc(ordersSnap.docs.map(d => ({id: d.id, ...d.data()})));
        const activeOrdersCount = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;
        const totalRev = orders.reduce((acc, order) => acc + (Number(order.totalPrice || order.total) || 0), 0);

        setRecentOrders(orders.slice(0, 5));

        setStats(prev => ({
          ...prev,
          activeOrders: activeOrdersCount,
          totalRevenue: totalRev,
          todaySales: Math.min(totalRev, 120),
          pieData: [
            { name: 'Delivered', value: orders.filter(o => o.status === 'delivered').length || 1, color: '#38B794' },
            { name: 'Active', value: activeOrdersCount || 1, color: '#0E7673' },
            { name: 'Pending', value: orders.filter(o => o.status === 'pending').length || 1, color: '#F59E0B' },
            { name: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length || 1, color: '#9FC8C7' }
          ]
        }));
      });
    } catch (err) {
      console.error("Error setting up listeners:", err);
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribePharmacies) unsubscribePharmacies();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  const barData = [
    { name: 'Mon', uv: 4000, color: '#0E7673' },
    { name: 'Tue', uv: 3000, color: '#38B794' },
    { name: 'Wed', uv: 2000, color: '#5C807F' },
    { name: 'Thu', uv: 2780, color: '#0E7673' },
    { name: 'Fri', uv: 1890, color: '#38B794' },
    { name: 'Sat', uv: 2390, color: '#9FC8C7' },
  ];

  return (
    <div className="flex flex-col space-y-6">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
         <h1 className="text-2xl font-bold text-[#0A3D3B] dark:text-white">{userData?.name || user?.displayName || t('admin_welcome_text', 'Admin')}</h1>
         
         <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] px-4 py-2 rounded-full shadow-xs text-sm font-semibold text-[#0A3D3B] dark:text-white hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
              <Calendar size={16} className="text-[#0E7673] dark:text-[#38B794]" />  {t('this_month', 'This Month')} </button>
            <button className="w-10 h-10 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-full shadow-xs flex items-center justify-center text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673] dark:hover:text-[#38B794] transition">
              <RotateCcw size={16} />
            </button>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
         <div className="bg-gradient-to-br from-[#0A3D3B] to-[#0E7673] text-white rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40 shadow-xs border border-[#145250]">
           <div className="flex justify-between items-start">
             <div className="w-9 h-9 bg-white/15 rounded-2xl flex items-center justify-center">
               <TrendingUp size={16} className="text-[#38B794]" />
             </div>
             <button className="text-white/60 hover:text-white"><MoreHorizontal size={20} /></button>
           </div>
           <div>
             <p className="text-[#D7F1EA] text-sm font-medium mb-1">{t('admin_today_revenue', "Today's Revenue")}</p>
             <h3 className="text-3xl font-extrabold text-white tabular-nums">{formatCurrency(stats.todaySales)}</h3>
             <p className="text-[11px] text-[#38B794] font-bold mt-1"> {t('2_5_this_month', '+2.5% This Month')} </p>
           </div>
           <div className="absolute right-6 bottom-6 flex items-end gap-1 opacity-20">
             <div className="w-2 h-8 bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-12 bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-6 bg-[#38B794] rounded-full"></div>
           </div>
         </div>

         <div className="bg-[#D7F1EA] dark:bg-[#0A3D3B] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40 shadow-xs border border-[#CFE4E3] dark:border-[#145250]">
           <div className="flex justify-between items-start">
             <div className="w-9 h-9 bg-white/80 dark:bg-[#0E4A47] rounded-2xl flex items-center justify-center">
               <Store size={16} className="text-[#0E7673] dark:text-[#38B794]" />
             </div>
             <button className="text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white"><MoreHorizontal size={20} /></button>
           </div>
           <div>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm font-medium mb-1">{t('admin_pharmacies_count', "Pharmacies")}</p>
             <h3 className="text-3xl font-extrabold text-[#0A3D3B] dark:text-white tabular-nums">{stats.pharmaciesCount}</h3>
             <p className="text-[11px] text-[#0E7673] dark:text-[#38B794] font-bold mt-1"> {t('2_5_this_month', '+2.5% This Month')} </p>
           </div>
           <div className="absolute right-6 bottom-6 flex items-end gap-1 opacity-20">
             <div className="w-2 h-4 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-10 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-16 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
           </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40 shadow-xs border border-[#CFE4E3] dark:border-[#145250]">
           <div className="flex justify-between items-start">
             <div className="w-9 h-9 bg-[#D7F1EA] dark:bg-[#0E4A47] rounded-2xl flex items-center justify-center">
               <Package size={16} className="text-[#0E7673] dark:text-[#38B794]" />
             </div>
             <button className="text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white"><MoreHorizontal size={20} /></button>
           </div>
           <div>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm font-medium mb-1">{t('admin_active_deliveries', "Active Deliveries")}</p>
             <h3 className="text-3xl font-extrabold text-[#0A3D3B] dark:text-white tabular-nums">{stats.activeOrders}</h3>
             <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1"> {t('in_progress_right_now', 'In progress right now')} </p>
           </div>
           <div className="absolute right-6 bottom-6 flex items-end gap-1 opacity-20">
             <div className="w-2 h-6 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-16 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-4 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
           </div>
         </div>

         <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-40 shadow-xs border border-[#CFE4E3] dark:border-[#145250]">
           <div className="flex justify-between items-start">
             <div className="w-9 h-9 bg-[#D7F1EA] dark:bg-[#0E4A47] rounded-2xl flex items-center justify-center">
               <Users size={16} className="text-[#0E7673] dark:text-[#38B794]" />
             </div>
             <button className="text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white"><MoreHorizontal size={20} /></button>
           </div>
           <div>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm font-medium mb-1">{t('admin_system_users', "System Users")}</p>
             <h3 className="text-3xl font-extrabold text-[#0A3D3B] dark:text-white tabular-nums">{stats.patientsCount + stats.driversCount + stats.pharmaciesCount}</h3>
             <p className="text-[11px] text-[#0E7673] dark:text-[#38B794] font-bold mt-1"> {t('total_platform_accounts', 'Total platform accounts')} </p>
           </div>
           <div className="absolute right-6 bottom-6 flex items-end gap-1 opacity-20">
             <div className="w-2 h-10 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-6 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
             <div className="w-2 h-12 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
           </div>
         </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
         <div className="lg:col-span-2 bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#0A3D3B] dark:text-white">{t('admin_order_status_report', 'Order Status Report')}</h3>
              <button className="w-8 h-8 border border-[#CFE4E3] dark:border-[#145250] rounded-full flex items-center justify-center text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white">
                 <MoreHorizontal size={16} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px]">
               <ResponsiveContainer width="100%" height={220}>
                 <PieChart>
                   <Pie
                     data={stats.pieData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {stats.pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]"> {t('total_orders', 'Total Orders')} </p>
                  <p className="text-2xl font-extrabold text-[#0A3D3B] dark:text-white tabular-nums">{stats.activeOrders + stats.pieData[0].value + stats.pieData[2].value + stats.pieData[3].value}</p>
               </div>
            </div>
            
            <div className="flex justify-center flex-wrap gap-4 mt-4">
               {stats.pieData.map(item => (
                 <div key={item.name} className="flex items-center gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                   <span className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7] font-medium">{item.name}</span>
                 </div>
               ))}
            </div>
         </div>

         <div className="lg:col-span-3 bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#0A3D3B] dark:text-white">{t('admin_total_revenue_overview', 'Total Revenue Overview')}</h3>
              <button className="w-8 h-8 border border-[#CFE4E3] dark:border-[#145250] rounded-full flex items-center justify-center text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white">
                 <MoreHorizontal size={16} />
              </button>
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CFE4E3" strokeOpacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5C807F' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5C807F' }} tickFormatter={(val) => `${val / 1000}K`} />
                  <RechartsTooltip cursor={{fill: 'rgba(14, 118, 115, 0.08)'}} contentStyle={{ borderRadius: '14px', border: '1px solid #CFE4E3', boxShadow: '0 4px 12px rgba(10, 61, 59, 0.12)' }} />
                  <Bar dataKey="uv" radius={[10, 10, 10, 10]} barSize={24}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Recent Orders List */}
      <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250]">
         <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-[#0A3D3B] dark:text-white">{t('admin_recent_platform_orders', 'Recent Platform Orders')}</h3>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7]" size={14} />
                  <input type="text" placeholder={t('search', 'Search...')} className="pl-9 pr-4 py-2 bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-xs text-[#0A3D3B] dark:text-white placeholder:text-[#5C807F] dark:placeholder:text-[#9FC8C7] outline-none focus:border-[#0E7673] dark:focus:border-[#38B794]" />
               </div>
               <button className="px-4 py-2 bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-xs font-semibold text-[#0A3D3B] dark:text-white flex items-center gap-1.5 hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
                  {t('filter', 'Filter')} <span className="text-[10px]">▼</span>
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="text-xs text-[#5C807F] dark:text-[#9FC8C7] border-b border-[#CFE4E3] dark:border-[#145250]">
                  <tr>
                     <th className="pb-4 font-semibold px-4"> {t('order_id', 'Order ID')} </th>
                     <th className="pb-4 font-semibold px-4"> {t('pharmacy', 'Pharmacy')} </th>
                     <th className="pb-4 font-semibold px-4"> {t('status', 'Status')} </th>
                     <th className="pb-4 font-semibold px-4"> {t('total_price', 'Total Price')} </th>
                     <th className="pb-4 font-semibold px-4"> {t('date', 'Date')} </th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#E7F1F1] dark:divide-[#145250]">
                  {recentOrders.length > 0 ? recentOrders.map((order, idx) => (
                     <tr key={idx} className="hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]/50 transition">
                        <td className="py-4 px-4 font-bold text-[#0A3D3B] dark:text-white">{order.id?.slice(0, 8)}...</td>
                        <td className="py-4 px-4 text-[#5C807F] dark:text-[#9FC8C7]">{order.pharmacyId?.slice(0, 8)}</td>
                        <td className="py-4 px-4">
                           <span className="px-3 py-1 bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] rounded-full text-[10px] font-bold uppercase border border-[#CFE4E3] dark:border-[#145250]">{order.status || 'Pending'}</span>
                        </td>
                        <td className="py-4 px-4 text-[#0A3D3B] dark:text-white font-bold tabular-nums">{formatCurrency(Number(order.totalPrice || 0))}</td>
                        <td className="py-4 px-4 text-[#5C807F] dark:text-[#9FC8C7] text-xs"> {t('recently', 'Recently')} </td>
                     </tr>
                  )) : (
                     <tr>
                        <td colSpan={5} className="py-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('no_recent_orders', 'No recent orders.')} </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
         
         <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E7F1F1] dark:border-[#145250]">
            <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]"> {t('showing_recent_orders', 'Showing recent orders')} </p>
            <div className="flex items-center gap-1">
               <button className="px-3 py-1.5 text-xs font-medium text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white"> {t('prev', 'Prev')} </button>
               <button className="w-8 h-8 rounded-full bg-[#0E7673] text-white text-xs font-bold flex items-center justify-center">1</button>
               <button className="w-8 h-8 rounded-full text-[#5C807F] dark:text-[#9FC8C7] text-xs font-bold flex items-center justify-center hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]">2</button>
               <button className="px-3 py-1.5 text-xs font-medium text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white"> {t('next', 'Next')} </button>
            </div>
         </div>
      </div>
      
    </div>
  );
}
