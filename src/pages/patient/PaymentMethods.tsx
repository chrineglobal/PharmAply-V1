import { ArrowLeft, CreditCard, Plus, Smartphone, Wallet, ArrowUpRight, ArrowDownRight, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import { formatCurrency, parseDate } from "../../lib/utils";

export function PatientPaymentMethods() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Fetch transaction history
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', user.uid)
          .order('created_at', { ascending: false });
          
        if (data && !error) {
          setTransactions(data);
        }
      } catch (err) {
        console.warn("Could not fetch transactions:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
    
    // Subscribe to new transactions
    const channel = supabase.channel(`wallet_tx_${user.uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.uid}` }, (payload) => {
        setTransactions(prev => [payload.new, ...prev]);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden">
      <div className="bg-[#0E7673] text-white px-6 pt-12 pb-4 shadow-sm z-10 flex items-center justify-between">
         <div className="flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white border border-white/20 rounded-full bg-white/15 shadow-sm hover:bg-white/25 transition">
              <ArrowLeft size={20} />
           </button>
           <h1 className="font-bold text-white text-xl">{t('wallet_payments', 'Paiements & Historique')}</h1>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 custom-scrollbar">
         
         {/* Fapshi Setup Card */}
         <div className="bg-[#0E7673] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-[#145250]">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#38B794] opacity-15 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Wallet size={20} className="text-white" />
                </div>
                <h2 className="font-bold text-lg tracking-tight">Moyens de Paiement</h2>
              </div>
              
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center justify-between mb-4">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#0E7673]">
                       <Smartphone size={24} />
                    </div>
                    <div>
                       <p className="font-bold text-sm">Mobile Money via Fapshi</p>
                       <p className="text-xs text-[#D7F1EA] mt-0.5">Orange Money / MTN / Cartes</p>
                    </div>
                 </div>
                 <div className="px-3 py-1 bg-[#38B794] text-[#0A3D3B] rounded-full text-[10px] font-bold">
                    Actif par défaut
                 </div>
              </div>

              <p className="text-xs text-[#D7F1EA]/90 leading-relaxed">
                Les paiements par Mobile Money sont gérés de manière sécurisée par l'API Fapshi. Aucune information bancaire n'est stockée sur nos serveurs.
              </p>
            </div>
         </div>

         {/* Transactions History */}
         <div>
            <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2">
                 <FileText size={18} className="text-[#0E7673] dark:text-[#38B794]" />
                 Historique des Transactions
               </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E7673]"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                 {transactions.map((tx) => (
                    <div key={tx.id} className="bg-white dark:bg-[#0A3D3B] rounded-2xl p-4 border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'credit' ? 'bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794]' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                          {tx.type === 'credit' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#0A3D3B] dark:text-white text-sm truncate">{tx.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <Clock size={12} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                             <span className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7]">{parseDate(tx.created_at)}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={`font-bold text-sm ${tx.type === 'credit' ? 'text-[#0E7673] dark:text-[#38B794]' : 'text-[#0A3D3B] dark:text-white'}`}>
                             {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          {tx.reference && <p className="text-[10px] text-[#5C807F] dark:text-[#9FC8C7] mt-0.5">Réf: {tx.reference.substring(0,8)}</p>}
                       </div>
                    </div>
                 ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10 bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250] border-dashed">
                  <div className="w-16 h-16 bg-[#E7F1F1] dark:bg-[#062625] rounded-full flex items-center justify-center mb-4 text-[#0E7673] dark:text-[#38B794]">
                     <FileText size={24} />
                  </div>
                  <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm mb-1">Aucune transaction</h3>
                  <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] max-w-[200px]">Vous n'avez pas encore effectué de paiement via l'application.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
