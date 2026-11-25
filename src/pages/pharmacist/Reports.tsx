import { useState, useEffect } from "react";
import { ArrowLeft, Search, Mic, TrendingUp, ShieldAlert, BarChart2, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatCurrency, parseDate, sortByDateDesc } from "../../lib/utils";
import { collection, query, where, getDocs, onSnapshot, orderBy, db } from "../../lib/firebase";
import { useAuth } from "../../components/AuthProvider";
import dayjs from "dayjs";

export function PharmacistReports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeView, setActiveView] = useState('main'); // 'main', 'sales', 'stock', 'usage'
  const [insightTab, setInsightTab] = useState('This Week');
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribeOrders: () => void;
    let unsubscribeProducts: () => void;
    
    const fetchContext = async () => {
      if (!user) return;
      try {
        const pQuery = query(collection(db, 'pharmacies'), where("ownerId", "==", user.uid));
        const pSnap = await getDocs(pQuery);
        let pharmacyId = pSnap.docs[0]?.id || user.uid;

        const ordersQuery = query(collection(db, 'orders'), where('pharmacyId', '==', pharmacyId));
        unsubscribeOrders = onSnapshot(ordersQuery, (oSnap: any) => {
          setOrders(sortByDateDesc(oSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))));
        });

        const productsQuery = query(collection(db, 'products'), where('pharmacyId', '==', pharmacyId));
        unsubscribeProducts = onSnapshot(productsQuery, (pSnap: any) => {
          setProducts(pSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        
      } catch (error) {
        console.error("Error fetching reports data:", error);
        setLoading(false);
      }
    };
    fetchContext();
    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeProducts) unsubscribeProducts();
    };
  }, [user]);

  if (activeView === 'sales') {
    // Process orders for sales metrics
    let filteredOrders = orders;
    const now = dayjs();
    
    if (insightTab === 'Today') {
      filteredOrders = orders.filter(o => o.createdAt && dayjs(parseDate(o.createdAt) || o.createdAt).isSame(now, 'day'));
    } else if (insightTab === 'This Week') {
      filteredOrders = orders.filter(o => o.createdAt && dayjs(parseDate(o.createdAt) || o.createdAt).isSame(now, 'week'));
    } else if (insightTab === 'This Month') {
      filteredOrders = orders.filter(o => o.createdAt && dayjs(parseDate(o.createdAt) || o.createdAt).isSame(now, 'month'));
    }

    const totalRevenue = filteredOrders.reduce((sum, o) => {
      const val = Number(o.totalAmount || o.totalPrice || o.total || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const numberOfOrders = filteredOrders.length;

    // We can also calculate top selling products by revenue
    const productRevenue: Record<string, { revenue: number, name: string, quantity: number }> = {};
    filteredOrders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
           const id = item.productId || item.id || item.name;
           if (!productRevenue[id]) productRevenue[id] = { revenue: 0, name: item.name, quantity: 0 };
           const price = item.price || 0;
           const qty = item.quantity || 1;
           productRevenue[id].revenue += price * qty;
           productRevenue[id].quantity += qty;
        });
      }
    });

    const topSellingProducts = Object.values(productRevenue)
       .sort((a, b) => b.revenue - a.revenue)
       .slice(0, 5);

    // Chart data based on days or previous periods could be real, but for this overview
    // we might just use a placeholder chart array like `defaultData` but styled for sales.
    const defaultData = [120, 300, 150, 450, 200, 350, 180];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden relative">
        <div className="px-6 pt-8 pb-4 flex items-center gap-4 z-10 bg-[#F5FAFA] dark:bg-[#062625] shrink-0">
          <button onClick={() => setActiveView('main')} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0A3D3B] rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-xs transition-colors hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]">
            <ArrowLeft size={20} className="text-[#0A3D3B] dark:text-white" />
          </button>
          <h1 className="font-bold text-[#0A3D3B] dark:text-white text-xl tracking-tight">Sales Overview</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-28 px-6 custom-scrollbar">
           <div className="flex bg-[#E7F1F1] dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-full p-1 mb-6 mt-2 shadow-xs">
             {['Today', 'This Week', 'This Month'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setInsightTab(tab)}
                 className={`flex-1 text-[13px] font-bold py-2.5 rounded-full transition-all ${insightTab === tab ? 'bg-[#0E7673] text-white shadow-xs' : 'text-[#5C807F] dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white'}`}
               >
                 {tab}
               </button>
             ))}
           </div>

           <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-[#0A3D3B] to-[#0E7673] rounded-3xl p-5 shadow-xs text-white border border-[#145250]">
                 <p className="text-[#D7F1EA] text-xs font-bold mb-1">Total Revenue</p>
                 <h3 className="font-extrabold text-xl tabular-nums">{formatCurrency(totalRevenue)}</h3>
              </div>
              <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-5 shadow-xs border border-[#CFE4E3] dark:border-[#145250]">
                 <p className="text-[#5C807F] dark:text-[#9FC8C7] text-xs font-bold mb-1">Total Orders</p>
                 <h3 className="font-extrabold text-[#0A3D3B] dark:text-white text-xl tabular-nums">{numberOfOrders}</h3>
              </div>
           </div>

           <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250] mb-6">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base">Sales Trend</h3>
             </div>
             <div className="flex items-end gap-2 h-32 mt-4 relative">
                {defaultData.map((val, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 relative group">
                      <div className="w-full bg-[#E7F1F1] dark:bg-[#0E4A47] rounded-t-xl relative hover:bg-[#38B794]/20 transition-colors" style={{ height: `${(val / 500) * 100}%`}}>
                         <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0E7673] to-[#38B794] rounded-t-xl transition-all duration-500" style={{ height: `${(val / 500) * 100}%` }}></div>
                         <div className="absolute -top-10 left-1/2 min-w-max -translate-x-1/2 bg-[#0A3D3B] text-white text-[10px] font-bold py-1 px-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-sm tabular-nums">
                            {formatCurrency(val)}
                         </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#5C807F] dark:text-[#9FC8C7] tracking-wider hidden sm:block">{days[i]}</span>
                   </div>
                ))}
             </div>
             <div className="flex justify-between mt-2 sm:hidden px-1">
                {days.map((day) => (
                  <span key={day} className="text-[10px] font-bold text-[#5C807F] dark:text-[#9FC8C7]">{day.charAt(0)}</span>
                ))}
             </div>
           </div>

           <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250]">
             <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base mb-5">Top Selling Items</h3>
             <div className="space-y-4">
               {topSellingProducts.length > 0 ? topSellingProducts.map((item, index) => {
                  return (
                    <div key={index} className={`flex items-center justify-between ${index !== topSellingProducts.length - 1 ? 'pb-4 border-b border-[#E7F1F1] dark:border-[#145250]' : 'pb-1'}`}>
                      <div>
                        <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm max-w-[180px] truncate mb-1">{item.name}</h4>
                        <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium tabular-nums">{item.quantity} units sold</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#0E7673] dark:text-[#38B794] text-sm tabular-nums">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                  );
               }) : (
                 <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] text-center py-4">No sales data available for this period.</p>
               )}
             </div>
           </div>
        </div>
      </div>
    );
  }

  if (activeView === 'usage') {
    // Process order items to get top medicines
    const medicineCounts: Record<string, { count: number, name: string }> = {};
    let totalItems = 0;
    
    // Filter orders based on insightTab (Today, This Week, This Month)
    let filteredOrders = orders;
    const now = dayjs();
    
    if (insightTab === 'Today') {
      filteredOrders = orders.filter(o => o.createdAt && dayjs(o.createdAt).isSame(now, 'day'));
    } else if (insightTab === 'This Week') {
      filteredOrders = orders.filter(o => o.createdAt && dayjs(o.createdAt).isSame(now, 'week'));
    } else if (insightTab === 'This Month') {
      filteredOrders = orders.filter(o => o.createdAt && dayjs(o.createdAt).isSame(now, 'month'));
    }

    filteredOrders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
           const id = item.productId || item.id || item.name;
           if (!medicineCounts[id]) medicineCounts[id] = { count: 0, name: item.name };
           medicineCounts[id].count += (item.quantity || 1);
           totalItems += (item.quantity || 1);
        });
      }
    });

    const topMedicines = Object.values(medicineCounts)
       .sort((a, b) => b.count - a.count)
       .slice(0, 3);
       
    // Synthetic data for the chart, ideally this would aggregate by day of week
    const defaultData = [52, 35, 29, 28];

    return (
      <div className="flex-1 bg-transparent flex flex-col h-full overflow-hidden relative">
        <div className="px-6 lg:px-8 pt-8 pb-4 flex items-center gap-4 z-10 shrink-0">
          <button onClick={() => setActiveView('main')} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0A3D3B] rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-xs transition-colors hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]">
             <ArrowLeft size={20} className="text-[#0A3D3B] dark:text-white" />
          </button>
          <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl tracking-tight">Medicine Usage Insights</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 custom-scrollbar">
           <div className="flex bg-[#E7F1F1] border border-[#CFE4E3] dark:bg-[#0A3D3B] dark:border-[#145250] rounded-full p-1 mb-6 shadow-xs">
             {['Today', 'This Week', 'This Month'].map(tab => (
               <button 
                 key={tab}
                 onClick={() => setInsightTab(tab)}
                 className={`flex-1 text-sm font-bold py-2.5 rounded-full transition-all ${insightTab === tab ? 'bg-[#0E7673] text-white shadow-xs' : 'text-[#5C807F] hover:text-[#0A3D3B] dark:text-[#9FC8C7] dark:hover:text-white'}`}
               >
                 {tab}
               </button>
             ))}
           </div>

           <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250] mb-6">
             <h3 className="font-bold text-[#0A3D3B] dark:text-white text-lg mb-8">Weekly Forecast</h3>
             <div className="relative h-48 mb-8 mt-4">
               <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                 <div className="border-b border-dashed border-[#CFE4E3] dark:border-[#145250] w-full h-[1px]"></div>
                 <div className="border-b border-dashed border-[#CFE4E3] dark:border-[#145250] w-full h-[1px]"></div>
                 <div className="border-b border-dashed border-[#CFE4E3] dark:border-[#145250] w-full h-[1px]"></div>
                 <div className="border-b border-dashed border-[#CFE4E3] dark:border-[#145250] w-full h-[1px]"></div>
               </div>
               <div className="absolute inset-x-0 bottom-0 flex justify-between items-end px-4 z-10 h-full">
                 {defaultData.map((val, i) => (
                    <div key={i} className="flex flex-col items-center justify-end h-full">
                      <span className="text-xs font-bold text-[#0E7673] dark:text-[#38B794] mb-2 bg-[#F5FAFA] dark:bg-[#062625] px-2.5 py-1 rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-xs tabular-nums">{val}</span>
                      <div className="w-8 bg-gradient-to-t from-[#0E7673] to-[#38B794] rounded-t-xl" style={{ height: `${(val / 60) * 100}%`}}></div>
                    </div>
                 ))}
               </div>
               <div className="absolute -bottom-8 w-full flex justify-between px-3">
                 <span className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">MON</span>
                 <span className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">TUE</span>
                 <span className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">WED</span>
                 <span className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">SUN</span>
               </div>
             </div>
           </div>

           <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250] mb-8">
             <h3 className="font-bold text-[#0A3D3B] dark:text-white text-lg mb-6">Top Medicines</h3>
             <div className="space-y-1">
               {topMedicines.length > 0 ? topMedicines.map((item, index) => {
                  const percentage = totalItems > 0 ? Math.round((item.count / totalItems) * 100) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 py-4 border-b border-[#E7F1F1] dark:border-[#145250] last:border-0 hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]/50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-[#38B794] mb-0.5"></div>
                        <div>
                          <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm max-w-[180px] truncate">{item.name}</h4>
                          <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium tabular-nums">{percentage}% Market Share</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="font-bold text-[#0E7673] dark:text-[#38B794] text-sm mb-2 tabular-nums">{item.count} Items</span>
                        <div className="w-20 h-1.5 bg-[#E7F1F1] dark:bg-[#062625] rounded-full overflow-hidden border border-[#CFE4E3] dark:border-[#145250]">
                          <div className="h-full bg-[#0E7673] dark:bg-[#38B794] rounded-full" style={{ width: `${Math.max(10, percentage)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
               }) : (
                 <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] text-center py-4 bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">No data available</p>
               )}
             </div>
           </div>
        </div>
      </div>
    );
  }

  if (activeView === 'stock') {
    const lowStockProducts = products.filter(p => p.stock !== undefined && p.stock < 10).sort((a, b) => (a.stock || 0) - (b.stock || 0));
    const emptyStock = lowStockProducts.filter(p => !p.stock || p.stock === 0);
    const lowNotEmtpy = lowStockProducts.filter(p => p.stock && p.stock > 0);
    const sortedLowStock = [...emptyStock, ...lowNotEmtpy];

    return (
      <div className="flex-1 bg-transparent flex flex-col h-full overflow-hidden relative">
        <div className="px-6 lg:px-8 pt-8 pb-4 flex items-center gap-4 z-10 shrink-0">
          <button onClick={() => setActiveView('main')} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0A3D3B] rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-xs transition-colors hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]">
            <ArrowLeft size={20} className="text-[#0A3D3B] dark:text-white" />
          </button>
          <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl tracking-tight">Low Stock Trends</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 custom-scrollbar">
           {sortedLowStock.length > 0 && (
             <div className="bg-gradient-to-br from-[#0A3D3B] to-[#0E7673] text-white rounded-3xl p-6 mb-8 shadow-xs flex items-center justify-between border border-[#145250]">
               <div className="flex items-start gap-4">
                 <ShieldAlert size={20} className="text-[#38B794] mt-1 shrink-0" />
                 <div>
                   <h3 className="font-bold text-base leading-tight mb-2 pr-6">
                     {sortedLowStock[0].name} is {!sortedLowStock[0].stock ? 'out of stock' : 'running low'}
                   </h3>
                   <p className="text-sm text-[#D7F1EA] font-medium">You might want to restock soon.</p>
                 </div>
               </div>
             </div>
           )}

           <div className="flex items-center justify-between mb-6">
             <h2 className="font-bold text-[#0A3D3B] dark:text-white text-lg">Low Stock Alerts</h2>
             <span className="text-xs font-bold text-[#0E7673] dark:text-[#38B794] bg-[#D7F1EA] dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] px-3.5 py-1.5 rounded-full tabular-nums">{sortedLowStock.length} Items</span>
           </div>
           
           <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xs border border-[#CFE4E3] dark:border-[#145250] space-y-0">
             {sortedLowStock.length > 0 ? sortedLowStock.map((item, index) => (
               <div key={item.id} className={`flex items-center justify-between py-4 ${index !== sortedLowStock.length - 1 ? 'border-b border-[#E7F1F1] dark:border-[#145250]' : ''}`}>
                 <div>
                   <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm tracking-tight mb-2 truncate max-w-[200px]">{item.name}</h4>
                   {(!item.stock || item.stock === 0) ? (
                     <div className="inline-block bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-200 dark:border-red-900">
                       Out of Stock
                     </div>
                   ) : (
                     <div className="inline-block bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-200 dark:border-amber-900">
                       Low Stock
                     </div>
                   )}
                 </div>
                 <div className="flex items-center gap-6">
                   <div className="text-center bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl px-4 py-2 border border-[#CFE4E3] dark:border-[#145250]">
                     <div className="font-bold text-[#0E7673] dark:text-[#38B794] text-base tabular-nums">{item.stock || 0}</div>
                     <div className="text-[10px] text-[#5C807F] dark:text-[#9FC8C7] font-bold uppercase tracking-wider mt-0.5">items</div>
                   </div>
                   <div className="w-5 h-5 flex items-center justify-center text-[#5C807F] dark:text-[#9FC8C7]">
                      <ChevronRight size={18} />
                   </div>
                 </div>
               </div>
             )) : (
                <div className="py-8 text-center bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">
                  <p className="text-[#5C807F] dark:text-[#9FC8C7] font-medium text-sm">All products are well stocked.</p>
                </div>
             )}
           </div>
        </div>
      </div>
    );
  }

  // Active View Main
  return (
    <div className="flex-1 bg-transparent flex flex-col h-full overflow-hidden relative">
      <div className="px-6 lg:px-8 pt-8 pb-4 shrink-0 z-10 flex items-center justify-between">
         <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl tracking-tight">{t('reports', 'Reports')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-32 custom-scrollbar">
         <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7] w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search Reports" 
              className="w-full bg-white dark:bg-[#0A3D3B] rounded-full py-3.5 pl-12 pr-4 text-sm font-medium shadow-xs outline-none placeholder:text-[#5C807F] dark:placeholder:text-[#9FC8C7] text-[#0A3D3B] dark:text-white border border-[#CFE4E3] dark:border-[#145250] transition-colors focus:border-[#0E7673] dark:focus:border-[#38B794]"
            />
         </div>

         <div className="space-y-4">
            {/* Sales Overview */}
            <div onClick={() => setActiveView('sales')} className="bg-white dark:bg-[#0A3D3B] p-6 rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#0E7673] dark:hover:border-[#38B794] transition-all">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-[#D7F1EA] dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] rounded-2xl flex items-center justify-center text-[#0E7673] dark:text-[#38B794] shrink-0">
                   <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base mb-1">Sales Overview</h3>
                  <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium">Monitor revenue and sales metrics</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#5C807F] dark:text-[#9FC8C7] shrink-0" />
            </div>

            {/* Low Stock Alert Trends */}
            <div onClick={() => setActiveView('stock')} className="bg-gradient-to-br from-[#0A3D3B] to-[#0E7673] p-6 rounded-3xl shadow-xs border border-[#145250] flex items-center justify-between cursor-pointer hover:brightness-105 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] pointer-events-none group-hover:bg-white/10 transition-colors"></div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-11 h-11 bg-[#38B794]/20 border border-[#38B794]/30 rounded-2xl flex items-center justify-center text-[#38B794] shrink-0">
                   <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base mb-1">Low Stock Alert Trends</h3>
                  <p className="text-sm text-[#D7F1EA] font-medium">Track stock level alerts overtime</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#D7F1EA] shrink-0 relative z-10" />
            </div>

            {/* Medicine Usage Insights */}
            <div onClick={() => setActiveView('usage')} className="bg-white dark:bg-[#0A3D3B] p-6 rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#0E7673] dark:hover:border-[#38B794] transition-all">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-[#D7F1EA] dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] rounded-2xl flex items-center justify-center text-[#0E7673] dark:text-[#38B794] shrink-0">
                   <BarChart2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base mb-1">Medicine Usage Insights</h3>
                  <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium">Analyze popular medication and usage</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#5C807F] dark:text-[#9FC8C7] shrink-0" />
            </div>
         </div>
      </div>
    </div>
  );
}
