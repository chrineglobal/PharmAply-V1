import { useState, useEffect } from "react";
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Download, TrendingUp, Users, Package, FileText, Truck } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useTranslation } from "react-i18next";

export function AdminReports() {
    const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalPharmacies: 0,
    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);

  const mockChartData = [
    { name: 'Mon', revenue: 4000, orders: 24 },
    { name: 'Tue', revenue: 3000, orders: 13 },
    { name: 'Wed', revenue: 2000, orders: 98 },
    { name: 'Thu', revenue: 2780, orders: 39 },
    { name: 'Fri', revenue: 1890, orders: 48 },
    { name: 'Sat', revenue: 2390, orders: 38 },
    { name: 'Sun', revenue: 3490, orders: 43 },
  ];

  const driverPerformanceData = [
    { driver: 'John D.', speed: 22, completionRate: 98, delay: 2 },
    { driver: 'Sarah W.', speed: 28, completionRate: 95, delay: 5 },
    { driver: 'Mike R.', speed: 31, completionRate: 88, delay: 12 },
    { driver: 'Emma L.', speed: 25, completionRate: 99, delay: 1 },
    { driver: 'Tom B.', speed: 29, completionRate: 92, delay: 8 },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ count: usersCount }, { count: ordersCount }, { count: pharmaciesCount }] = await Promise.all([
           supabase.from('users').select('*', { count: 'exact', head: true }),
           supabase.from('orders').select('*', { count: 'exact', head: true }),
           supabase.from('pharmacies').select('*', { count: 'exact', head: true }),
        ]);

        // Mock revenue for now since we don't have total calculated column easily
        setStats({
          totalUsers: usersCount || 0,
          totalOrders: ordersCount || 0,
          totalPharmacies: pharmaciesCount || 0,
          totalRevenue: 12450,
        });

      } catch (err) {
        console.error("Failed to fetch reports stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-white dark:bg-[#0A3D3B] px-8 pt-6 pb-6 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0 flex items-center justify-between flex-wrap gap-4">
         <div>
             <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl mb-1"> {t('reports_analytics', 'Reports & Analytics')} </h1>
             <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm"> {t('monitor_platform_metrics_and_e', 'Monitor platform metrics and extract data')} </p>
         </div>
         <button className="bg-[#0E7673] hover:bg-[#0A5A58] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-sm transition flex items-center gap-2">
            <Download size={18} /> {t('export_full_report', 'Export Full Report')} </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white dark:bg-[#0A3D3B] p-6 rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center mb-4">
                  <TrendingUp size={24} />
                </div>
                <p className="text-sm font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1"> {t('total_revenue', 'Total Revenue')} </p>
                <h3 className="text-2xl font-black text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(stats.totalRevenue)}</h3>
             </div>
             <div className="bg-white dark:bg-[#0A3D3B] p-6 rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center mb-4">
                  <Package size={24} />
                </div>
                <p className="text-sm font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1"> {t('total_orders', 'Total Orders')} </p>
                <h3 className="text-2xl font-black text-[#0A3D3B] dark:text-white tabular-nums">{stats.totalOrders}</h3>
             </div>
             <div className="bg-white dark:bg-[#0A3D3B] p-6 rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center mb-4">
                  <Users size={24} />
                </div>
                <p className="text-sm font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1"> {t('active_users', 'Active Users')} </p>
                <h3 className="text-2xl font-black text-[#0A3D3B] dark:text-white tabular-nums">{stats.totalUsers}</h3>
             </div>
             <div className="bg-white dark:bg-[#0A3D3B] p-6 rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <p className="text-sm font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-1"> {t('pharmacies', 'Pharmacies')} </p>
                <h3 className="text-2xl font-black text-[#0A3D3B] dark:text-white tabular-nums">{stats.totalPharmacies}</h3>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250] h-96">
                 <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-6"> {t('weekly_revenue_overview', 'Weekly Revenue Overview')} </h3>
                 <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={mockChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CFE4E3" strokeOpacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5C807F', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#5C807F', fontSize: 12}} dx={-10} tickFormatter={(val) => formatCurrency(val)} />
                      <Tooltip 
                         cursor={{fill: '#E7F1F1', opacity: 0.4}}
                         contentStyle={{borderRadius: '12px', border: '1px solid #CFE4E3', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Bar dataKey="revenue" fill="#0E7673" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
              
              <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250] h-96">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2"> 
                       <Truck className="text-[#0E7673] dark:text-[#38B794]" size={20} /> Driver Fleet Performance
                    </h3>
                 </div>
                 <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={driverPerformanceData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CFE4E3" strokeOpacity={0.5} />
                      <XAxis dataKey="driver" axisLine={false} tickLine={false} tick={{fill: '#5C807F', fontSize: 12}} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#5C807F', fontSize: 12}} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#5C807F', fontSize: 12}} />
                      <Tooltip 
                         contentStyle={{borderRadius: '12px', border: '1px solid #CFE4E3', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line yAxisId="left" type="monotone" name="Delivery Time (mins)" dataKey="speed" stroke="#0E7673" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                      <Line yAxisId="right" type="monotone" name="Success Rate (%)" dataKey="completionRate" stroke="#38B794" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                      <Line yAxisId="left" type="monotone" name="Avg Delay (mins)" dataKey="delay" stroke="#EF4444" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
}
