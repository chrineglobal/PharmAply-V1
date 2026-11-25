import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, Search, CreditCard, Truck, CheckCircle2, 
  Clock, Store, MapPin, Download, ArrowRight, ShieldCheck
} from "lucide-react";
import { collection, query, where, onSnapshot, updateDoc, doc } from '../../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { formatCurrency, parseDate, sortByDateDesc } from '../../lib/utils';
import { printInvoice } from '../../lib/invoice';
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

export function PatientOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unpaid" | "in_progress" | "delivered" | "cancelled">("all");
  
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'orders'), where('patientId', '==', user.uid));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const rawOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setOrders(sortByDateDesc(rawOrders));
          setLoading(false);
        });
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Actions
  const handleProceedToPayment = async (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPayingOrderId(order.id);

    try {
      // 1. Initialisation de la session de paiement via l'API
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: order.total,
          email: user?.email || "patient@pharmaply.cm",
          externalId: order.id,
          redirectUrl: window.location.origin + `/patient/orders`
        })
      });

      const data = await res.json();
      if (data && data.link) {
        window.location.href = data.link;
        return;
      }
    } catch (err) {
      console.warn("Payment API initialization notice, opening sandbox direct checkout:", err);
    }

    // Redirection directe
    const sandboxUrl = `/patient/fapshi-sandbox-checkout?amount=${order.total}&externalId=${order.id}&redirectUrl=${encodeURIComponent(window.location.origin + '/patient/orders')}`;
    navigate(sandboxUrl);
  };

  const handleCancelOrder = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updateData: any = { 
        status: 'cancelled',
        cancellationReason: cancelReason || "Annulé par le patient"
      };
      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      toast.success("Commande annulée.");
      setCancellingOrderId(null);
      setCancelReason("");
    } catch(error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
      toast.error("Impossible d'annuler la commande.");
    }
  };

  // KPIs & Compteurs
  const unpaidOrders = orders.filter(o => 
    (o.status === 'validated_awaiting_payment' || o.status === 'pending_payment' || (o.status === 'pending' && !o.paidAt && o.paymentStatus !== 'paid'))
  );
  const unpaidTotalSum = unpaidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const inProgressOrders = orders.filter(o => 
    ['paid', 'preparing', 'ready', 'ready_for_pickup', 'on_the_way', 'picked_up'].includes(o.status)
  );

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const deliveredTotalSpent = deliveredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const cancelledOrders = orders.filter(o => ['cancelled', 'rejected'].includes(o.status));

  // Filtrage selon l'onglet actif et le texte de recherche
  const filteredOrders = orders.filter(order => {
    const isUnpaid = (order.status === 'validated_awaiting_payment' || order.status === 'pending_payment' || (order.status === 'pending' && !order.paidAt && order.paymentStatus !== 'paid'));
    const isInProgress = ['paid', 'preparing', 'ready', 'ready_for_pickup', 'on_the_way', 'picked_up'].includes(order.status);
    const isDelivered = order.status === 'delivered';
    const isCancelled = ['cancelled', 'rejected'].includes(order.status);

    if (activeTab === "unpaid" && !isUnpaid) return false;
    if (activeTab === "in_progress" && !isInProgress) return false;
    if (activeTab === "delivered" && !isDelivered) return false;
    if (activeTab === "cancelled" && !isCancelled) return false;

    if (!searchTerm.trim()) return true;

    const s = searchTerm.toLowerCase();
    const matchId = order.id?.toLowerCase().includes(s);
    const matchPharm = order.pharmacyName?.toLowerCase().includes(s);
    const matchItems = order.items?.some((i: any) => i.name?.toLowerCase().includes(s));

    return matchId || matchPharm || matchItems;
  });

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* HEADER RESPONSIVE */}
      {/* ========================================================================= */}
      <header className="bg-white dark:bg-[#0A3D3B] px-4 sm:px-6 pt-4 sm:pt-6 pb-4 shadow-sm z-10 border-b border-[#CFE4E3] dark:border-[#145250] shrink-0">
        <div className="max-w-4xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2">
                <ShoppingBag size={24} className="text-[#0E7673] dark:text-[#38B794] shrink-0" />
                {t('patient_orders.my_orders', 'Mes Commandes')}
              </h1>
              <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-0.5">
                {t('patient_orders.track_orders_desc', 'Suivez vos commandes, vérifications de stock et effectuez vos paiements')}
              </p>
            </div>
          </div>

          {/* Barre de Recherche Rapide */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7]" size={16} />
            <input
              type="text"
              placeholder={t('patient_orders.search_placeholder', 'Rechercher une commande, un médicament ou une pharmacie...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F5FAFA] dark:bg-[#062625] py-2.5 pl-10 pr-4 rounded-full text-xs sm:text-sm outline-none text-[#0A3D3B] dark:text-white placeholder-[#5C807F] dark:placeholder-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] focus:border-[#0E7673] dark:focus:border-[#38B794] transition"
            />
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CORPS PRINCIPAL DU DASHBOARD */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-28">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          
          {/* CARTES KPI RÉSUMÉ */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* KPI 1 : Paiements en attente */}
            <div 
              onClick={() => setActiveTab("unpaid")}
              className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-[#0A3D3B] dark:text-amber-100 rounded-[2rem] p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[155px] shadow-sm cursor-pointer hover:opacity-95 transition active:scale-[0.99]"
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <CreditCard size={16} className="text-amber-800 dark:text-amber-300" />
                </div>
                {unpaidOrders.length > 0 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                    {t('patient_orders.action_required', 'Action requise')}
                  </span>
                )}
              </div>
              <div className="relative z-10">
                <p className="text-amber-900/80 dark:text-amber-200/80 text-xs sm:text-sm font-semibold mb-0.5">{t('patient_orders.to_pay', 'À Régler')}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-white">{unpaidOrders.length}</h3>
                <p className="text-[11px] sm:text-xs font-bold text-amber-900 dark:text-amber-300 mt-1 truncate">
                  {unpaidTotalSum > 0 ? formatCurrency(unpaidTotalSum) : t('patient_orders.no_unpaid', 'Aucun impayé')}
                </p>
              </div>
              <div className="absolute right-4 bottom-4 flex items-end gap-1 opacity-15 pointer-events-none">
                <div className="w-2 h-6 bg-amber-900 dark:bg-amber-300 rounded-full"></div>
                <div className="w-2 h-12 bg-amber-900 dark:bg-amber-300 rounded-full"></div>
                <div className="w-2 h-8 bg-amber-900 dark:bg-amber-300 rounded-full"></div>
              </div>
            </div>

            {/* KPI 2 : En cours (Mint Charte) */}
            <div 
              onClick={() => setActiveTab("in_progress")}
              className="bg-[#D7F1EA] dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-[2rem] p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[155px] shadow-sm cursor-pointer hover:opacity-95 transition active:scale-[0.99]"
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-[#0E7673]/15 dark:bg-[#38B794]/20 rounded-full flex items-center justify-center">
                  <Truck size={16} className="text-[#0E7673] dark:text-[#38B794]" />
                </div>
                <span className="text-[10px] font-bold text-[#0A3D3B] dark:text-[#D7F1EA] bg-white/70 dark:bg-[#062625]/60 px-2.5 py-0.5 rounded-full">
                  {t('patient_orders.live_tracking', 'Suivi direct')}
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[#0A3D3B]/80 dark:text-[#9FC8C7] text-xs sm:text-sm font-semibold mb-0.5">{t('patient_orders.in_progress', 'En Cours')}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-[#0A3D3B] dark:text-white">{inProgressOrders.length}</h3>
                <p className="text-[11px] sm:text-xs font-bold text-[#0E7673] dark:text-[#38B794] mt-1 truncate">
                  {t('patient_orders.prep_delivery', 'Préparation & Livraison')}
                </p>
              </div>
              <div className="absolute right-4 bottom-4 flex items-end gap-1 opacity-15 pointer-events-none">
                <div className="w-2 h-4 bg-[#0A3D3B] dark:bg-[#38B794] rounded-full"></div>
                <div className="w-2 h-10 bg-[#0A3D3B] dark:bg-[#38B794] rounded-full"></div>
                <div className="w-2 h-16 bg-[#0A3D3B] dark:bg-[#38B794] rounded-full"></div>
              </div>
            </div>

            {/* KPI 3 : Finalisées (Teal Surface Charte) */}
            <div 
              onClick={() => setActiveTab("delivered")}
              className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white rounded-[2rem] p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[155px] shadow-sm cursor-pointer hover:border-[#38B794] transition active:scale-[0.99]"
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-[#D7F1EA] dark:bg-[#0E4A47] rounded-full flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-[#0E7673] dark:text-[#38B794]" />
                </div>
                <span className="text-[10px] font-bold text-[#0A3D3B] dark:text-[#D7F1EA] bg-[#E7F1F1] dark:bg-[#062625] px-2.5 py-0.5 rounded-full">
                  {t('patient_orders.delivered', 'Livrées')}
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[#5C807F] dark:text-[#9FC8C7] text-xs sm:text-sm font-semibold mb-0.5">{t('patient_orders.completed', 'Terminées')}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-[#0A3D3B] dark:text-white">{deliveredOrders.length}</h3>
                <p className="text-[11px] sm:text-xs font-bold text-[#0E7673] dark:text-[#38B794] mt-1 truncate">
                  {t('patient_orders.orders_received', 'Commandes reçues')}
                </p>
              </div>
              <div className="absolute right-4 bottom-4 flex items-end gap-1 opacity-15 pointer-events-none">
                <div className="w-2 h-8 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
                <div className="w-2 h-12 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
                <div className="w-2 h-6 bg-[#0E7673] dark:bg-[#38B794] rounded-full"></div>
              </div>
            </div>

            {/* KPI 4 : Dépenses Totales (Primary Teal Charte) */}
            <div className="bg-[#0E7673] border border-[#145250] text-white rounded-[2rem] p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[155px] shadow-sm">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center">
                  <ShieldCheck size={16} className="text-[#D7F1EA]" />
                </div>
                <span className="text-[10px] font-bold text-[#0A3D3B] bg-[#D7F1EA] px-2.5 py-0.5 rounded-full">
                  {t('patient_orders.payments', 'Paiements')}
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[#D7F1EA] text-xs sm:text-sm font-semibold mb-0.5">{t('patient_orders.expenses', 'Dépenses')}</p>
                <h3 className="text-xl sm:text-2xl font-black text-white truncate">{formatCurrency(deliveredTotalSpent)}</h3>
                <p className="text-[11px] sm:text-xs font-bold text-[#D7F1EA] mt-1 truncate">
                  {t('patient_orders.total_paid', 'Total payé')}
                </p>
              </div>
              <div className="absolute right-4 bottom-4 flex items-end gap-1 opacity-20 pointer-events-none">
                <div className="w-2 h-10 bg-white rounded-full"></div>
                <div className="w-2 h-6 bg-white rounded-full"></div>
                <div className="w-2 h-14 bg-white rounded-full"></div>
              </div>
            </div>
          </div>

          {/* BANNIÈRE D'ALERTE : PAIEMENTS EN ATTENTE VALIDÉS PAR LA PHARMACIE */}
          {unpaidOrders.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-400 text-[#0A3D3B] flex items-center justify-center shrink-0 font-bold shadow-md">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 dark:text-amber-200 text-xs sm:text-sm">
                      {t('patient_orders.validated_pending_payment_alert', { count: unpaidOrders.length, defaultValue: `${unpaidOrders.length} Commande(s) Validée(s) en attente de règlement` })}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                      {t('patient_orders.pharmacy_confirmed_desc', 'La pharmacie a confirmé la disponibilité de vos médicaments. Réglez maintenant pour lancer la préparation immédiate.')}
                    </p>
                  </div>
                </div>

                <span className="font-black text-sm sm:text-base text-amber-950 dark:text-amber-200 shrink-0 self-end sm:self-auto">
                  {formatCurrency(unpaidTotalSum)}
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => handleProceedToPayment(unpaidOrders[0])}
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold shadow-md flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <ShieldCheck size={16} className="text-[#D7F1EA]" />
                  {t('patient_orders.pay_now', 'Payer maintenant')}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ONGLETS DE FILTRAGE HORIZONTAUX */}
          <div className="flex items-center gap-2 border-b border-[#CFE4E3] dark:border-[#145250] pb-3 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-[#0E7673] text-white shadow-sm"
                  : "bg-white dark:bg-[#0A3D3B] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#D7F1EA]/50 dark:hover:bg-[#0E4A47]"
              }`}
            >
              {t('patient_orders.all_tab', 'Toutes')} ({orders.length})
            </button>
            
            <button
              onClick={() => setActiveTab("unpaid")}
              className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "unpaid"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#0A3D3B] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#D7F1EA]/50 dark:hover:bg-[#0E4A47]"
              }`}
            >
              <CreditCard size={13} />
              {t('patient_orders.unpaid_tab', 'À Payer')} ({unpaidOrders.length})
            </button>

            <button
              onClick={() => setActiveTab("in_progress")}
              className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "in_progress"
                  ? "bg-[#0E7673] text-white shadow-sm"
                  : "bg-white dark:bg-[#0A3D3B] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#D7F1EA]/50 dark:hover:bg-[#0E4A47]"
              }`}
            >
              <Truck size={13} />
              {t('patient_orders.in_progress_tab', 'En Cours')} ({inProgressOrders.length})
            </button>

            <button
              onClick={() => setActiveTab("delivered")}
              className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition whitespace-nowrap ${
                activeTab === "delivered"
                  ? "bg-[#0E7673] text-white shadow-sm"
                  : "bg-white dark:bg-[#0A3D3B] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#D7F1EA]/50 dark:hover:bg-[#0E4A47]"
              }`}
            >
              {t('patient_orders.delivered_tab', 'Livrées')} ({deliveredOrders.length})
            </button>

            <button
              onClick={() => setActiveTab("cancelled")}
              className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-bold transition whitespace-nowrap ${
                activeTab === "cancelled"
                  ? "bg-red-700 text-white shadow-sm"
                  : "bg-white dark:bg-[#0A3D3B] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#D7F1EA]/50 dark:hover:bg-[#0E4A47]"
              }`}
            >
              {t('patient_orders.cancelled_tab', 'Annulées')} ({cancelledOrders.length})
            </button>
          </div>

          {/* LISTE DES CARTES DE COMMANDE */}
          {loading ? (
            <div className="py-20 text-center text-sm text-[#5C807F] dark:text-[#9FC8C7] animate-pulse">
              {t('patient_orders.loading_orders', 'Chargement de vos commandes...')}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-[#0A3D3B] rounded-3xl border border-dashed border-[#CFE4E3] dark:border-[#145250] p-8">
              <ShoppingBag size={48} className="mx-auto text-[#9FC8C7] dark:text-[#5C807F] mb-3" />
              <h3 className="font-bold text-base text-[#0A3D3B] dark:text-white">
                {t('patient_orders.no_orders_section', 'Aucune commande dans cette section')}
              </h3>
              <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1 max-w-sm mx-auto">
                {t('patient_orders.no_orders_sub', "Retrouvez ici l'état d'avancement de vos prescriptions et vos factures.")}
              </p>
              <button
                onClick={() => navigate("/patient/search")}
                className="mt-5 px-6 py-2.5 min-h-[44px] bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold transition shadow-sm"
              >
                {t('patient_orders.browse_meds', 'Parcourir les médicaments')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const dateObj = parseDate(order.createdAt);
                const isUnpaid = (order.status === 'validated_awaiting_payment' || order.status === 'pending_payment' || (order.status === 'pending' && !order.paidAt && order.paymentStatus !== 'paid'));
                const isDelivered = order.status === 'delivered';
                const isInDelivery = ['on_the_way', 'picked_up'].includes(order.status);
                const items = order.items || [];

                // Libellé et Style du Statut
                let statusLabel = t('status.pending', "En attente");
                let statusClass = "bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-[#D7F1EA]";

                if (order.status === 'validated_awaiting_payment' || (order.status === 'pending' && !order.paidAt)) {
                  statusLabel = t('status.validated_awaiting_payment', "Validée — À Payer");
                  statusClass = "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300";
                } else if (order.status === 'paid') {
                  statusLabel = t('status.paid', "Payé — Préparation");
                  statusClass = "bg-[#E7F1F1] text-[#0E7673] dark:bg-[#0E4A47] dark:text-[#D7F1EA] border border-[#CFE4E3] dark:border-[#145250]";
                } else if (order.status === 'preparing') {
                  statusLabel = t('status.preparing', "En préparation");
                  statusClass = "bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794]";
                } else if (order.status === 'ready' || order.status === 'ready_for_pickup') {
                  statusLabel = order.deliveryMethod === 'pickup' ? t('status.ready_counter', "Prêt au comptoir") : t('status.ready_delivery', "Prêt pour livraison");
                  statusClass = "bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794]";
                } else if (order.status === 'on_the_way' || order.status === 'picked_up') {
                  statusLabel = t('status.in_delivery', "En livraison");
                  statusClass = "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
                } else if (order.status === 'delivered') {
                  statusLabel = t('status.delivered', "Livrée");
                  statusClass = "bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794]";
                } else if (order.status === 'cancelled' || order.status === 'rejected') {
                  statusLabel = t('status.cancelled', "Annulée");
                  statusClass = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";
                }

                return (
                  <div
                    key={order.id}
                    className={`bg-white dark:bg-[#0A3D3B] rounded-3xl p-5 border shadow-sm transition flex flex-col gap-4 overflow-hidden ${
                      isUnpaid 
                        ? "border-amber-300 dark:border-amber-500/50 shadow-amber-500/10" 
                        : "border-[#CFE4E3] dark:border-[#145250] hover:border-[#38B794]"
                    }`}
                  >
                    {/* SECTION 1 : EN-TÊTE DE LA CARTE */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#CFE4E3] dark:border-[#145250] pb-3">
                      <div className="space-y-1">
                        <h3 className="font-black text-[#0A3D3B] dark:text-white text-base tracking-tight">
                          {t('patient_orders.order_hash', 'Commande')} #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                            {dateObj ? dateObj.toLocaleDateString(t('locale_code', 'fr-FR'), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : t('recently', "Récemment")}
                          </span>
                          {order.pharmacyName && (
                            <span className="flex items-center gap-1 font-medium text-[#0A3D3B] dark:text-[#D7F1EA]">
                              <Store size={13} className="text-[#0E7673] dark:text-[#38B794] shrink-0" />
                              {order.pharmacyName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold items-center gap-1.5 whitespace-nowrap ${statusClass}`}>
                          {isUnpaid && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* SECTION 2 : LISTE DES MÉDICAMENTS */}
                    <div className="bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl p-4 space-y-2.5 border border-[#CFE4E3]/60 dark:border-[#145250]">
                      <p className="text-[11px] font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">
                        {t('patient_orders.items_ordered_count', { count: items.length, defaultValue: `${items.length} Médicament(s) commandé(s)` })}
                      </p>
                      <div className="space-y-2">
                        {items.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs sm:text-sm gap-3">
                            <span className="text-[#0A3D3B] dark:text-[#D7F1EA] font-medium truncate">
                              <span className="font-bold text-[#0E7673] dark:text-[#38B794] mr-2">{it.quantity}x</span>
                              {it.name} {it.dosage ? `(${it.dosage})` : ""}
                            </span>
                            <span className="font-bold text-[#0A3D3B] dark:text-white shrink-0">
                              {formatCurrency((Number(it.price) || 0) * (Number(it.quantity) || 1))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SECTION 3 : ADRESSE DE LIVRAISON */}
                    <div className="flex items-center gap-2 text-xs text-[#5C807F] dark:text-[#9FC8C7] bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3]/60 dark:border-[#145250] p-3 rounded-xl">
                      {order.deliveryMethod === 'pickup' ? (
                        <div className="flex items-center gap-2">
                          <Store size={15} className="text-[#0E7673] dark:text-[#38B794] shrink-0" />
                          <span className="font-medium">{t('patient_orders.pickup_at_counter', 'Retrait sur place en pharmacie')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin size={15} className="text-orange-600 shrink-0" />
                          <span className="font-medium truncate">{order.deliveryAddress || t('patient_orders.home_delivery', "Livraison à domicile")}</span>
                        </div>
                      )}
                    </div>

                    {/* SECTION 4 : TOTAL TTC */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-[#5C807F] dark:text-[#9FC8C7]">
                        {t('patient_orders.total_incl_tax', 'Montant Total TTC')}
                      </span>
                      <span className="font-black text-[#0A3D3B] dark:text-white text-lg sm:text-xl">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    {/* SECTION 5 : BOUTONS D'ACTION */}
                    <div className="pt-3 border-t border-[#CFE4E3] dark:border-[#145250]">
                      
                      {/* Cas 1 : PAIEMENT EN ATTENTE */}
                      {isUnpaid && (
                        <div className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancellingOrderId(order.id);
                            }}
                            className="px-4 py-3 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 rounded-full transition text-center shrink-0"
                          >
                            {t('patient_orders.cancel', 'Annuler')}
                          </button>

                          <button
                            onClick={(e) => handleProceedToPayment(order, e)}
                            disabled={payingOrderId === order.id}
                            className="flex-1 py-3 px-4 min-h-[46px] bg-amber-500 hover:bg-amber-600 text-[#0A3D3B] font-extrabold text-xs sm:text-sm rounded-full shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
                          >
                            <ShieldCheck size={18} />
                            <span>{t('patient_orders.pay_order', 'Payer la commande')}</span>
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      )}

                      {/* Cas 2 : COMMANDE EN COURS DE LIVRAISON */}
                      {isInDelivery && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1.5 animate-pulse">
                            <Truck size={16} /> {t('patient_orders.courier_on_the_way', 'Coursier en route vers vous')}
                          </span>
                          <button
                            onClick={() => navigate(`/patient/tracking/${order.id}`)}
                            className="px-5 py-3 min-h-[44px] bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
                          >
                            <MapPin size={16} /> {t('patient_orders.track_live_map', 'Suivre sur la Carte Live')}
                          </button>
                        </div>
                      )}

                      {/* Cas 3 : COMMANDE LIVRÉE */}
                      {isDelivered && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
                          <span className="text-xs text-[#0E7673] dark:text-[#38B794] font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={16} /> {t('patient_orders.payment_validated_received', 'Paiement validé & Commande reçue')}
                          </span>
                          <button
                            onClick={() => printInvoice(order)}
                            className="px-5 py-3 min-h-[44px] bg-[#E7F1F1] dark:bg-[#062625] hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
                          >
                            <Download size={16} /> {t('patient_orders.download_pdf_invoice', 'Télécharger Facture PDF')}
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Formulaire Modal d'Annulation */}
                    {cancellingOrderId === order.id && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900 space-y-3 mt-1">
                        <p className="text-xs font-bold text-red-900 dark:text-red-300">
                          {t('patient_orders.cancel_reason_prompt', "Motif de l'annulation de la commande :")}
                        </p>
                        <select
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full bg-white dark:bg-[#0A3D3B] border border-red-200 dark:border-red-800 p-3 rounded-xl text-xs outline-none text-[#0A3D3B] dark:text-white"
                        >
                          <option value="Changement d'avis">{t('patient_orders.reasons.change_mind', "Changement d'avis")}</option>
                          <option value="Délai trop long">{t('patient_orders.reasons.too_long', "Délai trop long")}</option>
                          <option value="Médicament trouvé ailleurs">{t('patient_orders.reasons.found_elsewhere', "Médicament trouvé ailleurs")}</option>
                          <option value="Erreur dans la commande">{t('patient_orders.reasons.order_error', "Erreur dans la commande")}</option>
                        </select>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setCancellingOrderId(null)}
                            className="px-4 py-2.5 min-h-[38px] bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full text-xs font-bold"
                          >
                            {t('patient_orders.back', 'Retour')}
                          </button>
                          <button
                            onClick={(e) => handleCancelOrder(order.id, e)}
                            className="px-5 py-2.5 min-h-[38px] bg-red-600 text-white rounded-full text-xs font-bold shadow-sm hover:bg-red-700"
                          >
                            {t('patient_orders.confirm_cancel', "Confirmer l'annulation")}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
