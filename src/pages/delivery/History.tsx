import { useState, useEffect } from "react";
import { ArrowLeft, Clock, MapPin, Package, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { formatCurrency, parseDate, sortByDateDesc } from '../../lib/utils';
import { useTranslation } from "react-i18next";

export function DeliveryHistory() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'orders'), 
          where('driverId', '==', user.uid),
          where('status', '==', 'delivered')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setHistory(sortByDateDesc(data));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-[#0E7673] text-white px-6 pt-12 pb-4 shadow-sm z-10">
         <h1 className="font-bold text-white text-xl mb-4"> {t('history', 'History')} </h1>
         <div className="flex gap-4 border-b border-white/20 pb-2 text-sm font-medium">
            <button className="text-white border-b-2 border-[#38B794] pb-2 font-bold"> {t('all', 'All')} </button>
            <button className="text-[#D7F1EA]/70 hover:text-white pb-2"> {t('today', 'Today')} </button>
            <button className="text-[#D7F1EA]/70 hover:text-white pb-2"> {t('this_week', 'This Week')} </button>
            <button className="text-[#D7F1EA]/70 hover:text-white pb-2"> {t('this_month', 'This Month')} </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
         {loading ? (
           <p className="text-center text-sm text-[#5C807F] dark:text-[#9FC8C7] py-4"> {t('loading_history', 'Loading history...')} </p>
         ) : history.length === 0 ? (
           <p className="text-center text-sm text-[#5C807F] dark:text-[#9FC8C7] py-4"> {t('no_completed_deliveries_yet', 'No completed deliveries yet.')} </p>
         ) : history.map((item, i) => (
            <div key={i} className="bg-white dark:bg-[#0A3D3B] rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm p-4 text-sm">
               <div className="flex justify-between items-start border-b border-[#E7F1F1] dark:border-[#145250] pb-3 mb-3">
                  <div className="flex items-center gap-2 text-[#5C807F] dark:text-[#9FC8C7] text-xs font-semibold uppercase tracking-wider">
                     <span> {t('order', 'Order #')} {item.id.slice(0,8)}</span>
                  </div>
                  <span className="bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#D7F1EA] px-2.5 py-0.5 rounded-full font-bold text-xs flex items-center gap-1 uppercase tracking-wide">
                     <CheckCircle size={10} /> {item.status}
                  </span>
               </div>
               
               <div className="font-bold text-[#0A3D3B] dark:text-white mb-0.5">{item.deliveryAddress || 'Customer Address'}</div>
               <div className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mb-4">{parseDate(item.createdAt) ? parseDate(item.createdAt)!.toLocaleDateString() : 'Recently'}</div>
               
               <div className="flex items-center gap-4 text-xs font-semibold text-[#0A3D3B] dark:text-white bg-[#F5FAFA] dark:bg-[#062625] p-3 rounded-xl border border-[#CFE4E3] dark:border-[#145250]">
                  <div className="flex-1 flex justify-center items-center gap-1.5"><MapPin size={12} className="text-[#0E7673] dark:text-[#38B794]" />  {t('local', 'Local')} </div>
                  <div className="w-[1px] h-4 bg-[#CFE4E3] dark:bg-[#145250]"></div>
                  <div className="flex-1 flex justify-center items-center gap-1.5 text-[#0E7673] dark:text-[#38B794] font-bold">{formatCurrency((item.total || 0) * 0.1)}</div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
