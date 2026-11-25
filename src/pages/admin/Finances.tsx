import { DollarSign, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from '../../lib/firebase';
import { db } from "../../lib/firebase";
import { formatCurrency } from "../../lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from "react-i18next";

export function AdminFinances() {
    const { t } = useTranslation();
  const [finances, setFinances] = useState({
    totalRevenue: 0,
    platformCommission: 0,
    pendingPayoutsCount: 0
  });

  const [revenueData, setRevenueData] = useState<{name: string, revenue: number}[]>([]);
  
  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsubscribe = onSnapshot(q, (ordersSnap) => {
      const orders = ordersSnap.docs.map(d => d.data());
      
      const totalRev = orders.reduce((acc, order) => acc + (Number(order.total) || 0), 0);
      const commission = totalRev * 0.05; // 5% commission
      
      const deliveredOrders = orders.filter(o => o.status === "delivered");
      
      setFinances({
        totalRevenue: totalRev,
        platformCommission: commission,
        pendingPayoutsCount: deliveredOrders.length // Mock logic
      });

      // Generate some mockup historical data for the chart or calculate if dates are available
      const now = new Date();
      const mockData = Array.from({ length: 7 }).map((_, i) => {
         const date = new Date(now);
         date.setDate(now.getDate() - (6 - i));
         return {
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: Math.floor(Math.random() * 500) + 100 // Mock data per day
         }
      });
      // Override the last day with actual today's calculated revenue as part of mock
      mockData[6].revenue = totalRev > 0 ? totalRev : mockData[6].revenue;
      
      setRevenueData(mockData);
    }, (err) => {
      console.error(err);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0">
         <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> {t('financial_center', 'Financial Center')} </h1>
         <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('revenue_payouts_and_commission', 'Revenue, payouts, and commissions')} </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
         {/* Balance Card */}
         <div className="bg-gradient-to-br from-[#0A3D3B] to-[#0E7673] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-[#145250]">
            <div className="absolute right-0 top-0 w-32 h-32 bg-[#38B794]/20 rounded-full translate-x-8 -translate-y-8 blur-2xl"></div>
            <p className="text-[#D7F1EA] text-xs font-semibold mb-1 uppercase tracking-wide"> {t('platform_escrow_balance', 'Platform Escrow Balance')} </p>
            <h2 className="text-3xl font-bold font-mono tabular-nums">{formatCurrency(finances.totalRevenue - finances.platformCommission)}</h2>
            <div className="flex justify-between items-end mt-4">
               <div>
                  <p className="text-[#9FC8C7] text-xs"> {t('total_platform_commission', 'Total Platform Commission')} </p>
                  <p className="text-[#38B794] font-bold text-sm tabular-nums">{formatCurrency(finances.platformCommission)}</p>
               </div>
            </div>
         </div>

         {/* Revenue Chart Section */}
         <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
               <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white"> {t('revenue_overview', 'Revenue Overview')} </h2>
               <select className="bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-sm font-medium text-[#0A3D3B] dark:text-[#D7F1EA] px-4 py-2 outline-none focus:ring-2 focus:ring-[#0E7673] cursor-pointer">
                 <option> {t('last_7_days', 'Last 7 days')} </option>
                 <option> {t('last_30_days', 'Last 30 days')} </option>
                 <option> {t('this_year', 'This Year')} </option>
               </select>
            </div>
            
            <div className="h-72 w-full">
               <ResponsiveContainer width="100%" height={288}>
                 <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#38B794" stopOpacity={0.75}/>
                       <stop offset="95%" stopColor="#0E7673" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5C807F', fontSize: 12}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#5C807F', fontSize: 12}} tickFormatter={(value) => formatCurrency(value)} />
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CFE4E3" strokeOpacity={0.5} />
                   <RechartsTooltip 
                     contentStyle={{ borderRadius: '12px', border: '1px solid #CFE4E3', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   />
                   <Area type="monotone" dataKey="revenue" stroke="#0E7673" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Commission Config Preview */}
           <div className="bg-white dark:bg-[#0A3D3B] p-5 rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] flex justify-between items-center">
            <div>
               <p className="font-bold text-[#0A3D3B] dark:text-white text-sm"> {t('platform_fee_rate', 'Platform Fee Rate')} </p>
               <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-0.5"> {t('applied_per_pharmacy_order', 'Applied per pharmacy order')} </p>
            </div>
            <div className="text-right">
               <p className="font-bold text-[#0E7673] dark:text-[#38B794] text-xl tabular-nums">5.0%</p>
               <button className="text-[10px] font-bold text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673] underline uppercase mt-1"> {t('configure', 'Configure')} </button>
            </div>
         </div>
         
         <div className="bg-white dark:bg-[#0A3D3B] p-5 rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] flex justify-between items-center">
            <div>
               <p className="font-bold text-[#0A3D3B] dark:text-white text-sm"> {t('delivery_fixed_fee', 'Delivery Fixed Fee')} </p>
               <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-0.5"> {t('base_fee_for_drivers', 'Base fee for drivers')} </p>
            </div>
            <div className="text-right">
               <p className="font-bold text-[#0E7673] dark:text-[#38B794] text-xl tabular-nums">{formatCurrency(3)}</p>
               <button className="text-[10px] font-bold text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0E7673] underline uppercase mt-1"> {t('configure', 'Configure')} </button>
            </div>
         </div>
         </div>

         {/* Recent Transactions */}
         <div>
            <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm mb-3 px-1"> {t('pending_payouts', 'Pending Payouts')} </h3>
            {finances.pendingPayoutsCount > 0 ? (
              <div className="bg-white dark:bg-[#0A3D3B] shadow-sm rounded-2xl border border-[#CFE4E3] dark:border-[#145250] overflow-hidden divide-y divide-[#CFE4E3]/60 dark:divide-[#145250]">
                 <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
                          <ArrowUpRight size={18} />
                       </div>
                       <div>
                          <p className="font-bold text-[#0A3D3B] dark:text-white text-sm tabular-nums">{finances.pendingPayoutsCount} {t('orders_pending', 'Orders Pending')} </p>
                          <p className="text-[10px] text-[#5C807F] dark:text-[#9FC8C7] font-medium"> {t('to_various_pharmacies_drivers', 'To various pharmacies/drivers')} </p>
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
                <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] px-1"> {t('no_pending_payouts', 'No pending payouts.')} </p>
            )}
         </div>

      </div>
    </div>
  );
}
