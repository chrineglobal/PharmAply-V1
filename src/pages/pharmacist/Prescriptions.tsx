import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import { useAuth } from "../../components/AuthProvider";
import { useTranslation } from "react-i18next";
import { FileText, CheckCircle, XCircle, Search, Clock, MessageSquare, Loader2, Image as ImageIcon, Sparkles, ShieldCheck } from "lucide-react";
import { parseDate, sortByDateDesc } from "../../lib/utils";
import { PrescriptionAiModal, PrescriptionScanResult } from "../../components/PrescriptionAiModal";

export function PharmacistPrescriptions() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal State for AI DPML Audit
  const [selectedScan, setSelectedScan] = useState<PrescriptionScanResult | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;
    
    const init = async () => {
      if (!user) return;
      
      try {
        const pQuery = query(collection(db, 'pharmacies'), where("ownerId", "==", user.uid));
        const pSnap = await getDocs(pQuery);
        let pId = null;
        if (!pSnap.empty) {
          pId = pSnap.docs[0].id;
          setPharmacyId(pId);
        }
        
        const q = query(collection(db, 'prescriptions'));
        unsubscribe = onSnapshot(q, async (snapshot) => {
          const allDocs = sortByDateDesc(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          
          // Fetch associated AI scans
          const scanSnap = await getDocs(collection(db, 'prescription_scans'));
          const scansByPrescriptionId: Record<string, any> = {};
          scanSnap.docs.forEach(d => {
            const data = d.data();
            if (data.prescriptionId) {
              scansByPrescriptionId[data.prescriptionId] = data.mappedItems;
            }
          });

          // Filter to those belonging to this pharmacy, or general ones (no pharmacyId)
          const filtered = allDocs.filter(d => !d.pharmacyId || d.pharmacyId === pId).map(d => ({
            ...d,
            aiScanData: scansByPrescriptionId[d.id] || d.aiAnalysis || null
          }));

          setPrescriptions(filtered);
          setLoading(false);
        });
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleOpenAiModal = (prescription: any) => {
    setSelectedPrescription(prescription);
    setSelectedScan(prescription.aiScanData || null);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      setProcessingId(id);
      await updateDoc(doc(db, 'prescriptions', id), {
        status,
      });
      if (selectedPrescription?.id === id) {
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert(t('error_updating_status', 'Error updating status.'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex-1 bg-transparent flex flex-col h-full overflow-hidden relative">
      <div className="px-8 pt-8 pb-4 shrink-0 z-10 flex items-center justify-between">
         <div>
            <h1 className="font-bold text-[#0A3D3B] dark:text-white text-2xl tracking-tight">{t('prescriptions', 'Prescriptions')}</h1>
            <p className="text-[#5C807F] dark:text-[#9FC8C7] font-medium text-sm mt-1">{t('review_uploaded_rx', 'Review and approve uploaded prescriptions with DPML AI assistance')}</p>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-12 text-[#0E7673] dark:text-[#38B794]"><Loader2 className="animate-spin" size={32} /></div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex flex-col items-center">
             <div className="w-16 h-16 bg-[#E7F1F1] dark:bg-[#062625] rounded-full flex items-center justify-center mb-4">
               <FileText size={32} className="text-[#5C807F] dark:text-[#9FC8C7] stroke-[1.5]" />
             </div>
             <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white mb-1">{t('no_prescriptions', 'No prescriptions to review')}</h3>
             <p className="text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7]">{t('no_prescriptions_desc', 'When a patient uploads a prescription it will appear here.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {prescriptions.map(p => {
               const isImage = p.fileName ? /\.(jpg|jpeg|png|gif|webp)$/i.test(p.fileName) : /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(p.fileUrl);
               const isPdf = p.fileName ? /\.pdf$/i.test(p.fileName) : /\.pdf(\?.*)?$/i.test(p.fileUrl);
               const displayFilename = p.fileName || p.fileUrl?.split('%2F').pop()?.split('?')[0] || 'Document';
               const isPending = p.status === 'pending_review';
               const hasAiScan = Boolean(p.aiScanData);

               return (
                  <div key={p.id} className="bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex flex-col overflow-hidden group">
                     {/* Preview Area */}
                     <div className="h-48 bg-[#F5FAFA] dark:bg-[#062625] w-full flex flex-col relative overflow-hidden group-hover:bg-[#E7F1F1] dark:group-hover:bg-[#0E4A47] transition-colors">
                        <div className="absolute top-4 left-4 z-10 flex gap-2">
                           <span className={`text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 border ${p.status === 'approved' ? 'bg-[#D7F1EA]/95 text-[#0E7673] border-[#CFE4E3] backdrop-blur-md' : p.status === 'rejected' ? 'bg-red-50/90 text-red-700 border-red-200 backdrop-blur-md' : 'bg-white/95 dark:bg-[#0A3D3B]/95 text-amber-700 dark:text-amber-300 border-[#CFE4E3] dark:border-[#145250] backdrop-blur-md'}`}>
                             {p.status === 'approved' ? <CheckCircle size={12} /> : p.status === 'rejected' ? <XCircle size={12} /> : <Clock size={12} className="text-amber-500" />}
                             {t(p.status || 'pending', p.status || 'Pending')}
                           </span>

                           {hasAiScan && (
                             <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0E7673] text-[#D7F1EA] shadow-sm flex items-center gap-1 backdrop-blur-md">
                               <Sparkles size={11} className="text-[#38B794]" /> AI DPML
                             </span>
                           )}
                        </div>

                        <div className="flex-1 flex items-center justify-center cursor-pointer p-4 h-full" onClick={() => handleOpenAiModal(p)}>
                           {isImage ? (
                              <img src={p.fileUrl} className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-all duration-300" alt={displayFilename} />
                           ) : (
                              <div className="w-20 h-20 bg-white dark:bg-[#0A3D3B] rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-center group-hover:-translate-y-1 transition-transform">
                                <FileText size={36} strokeWidth={1.5} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                              </div>
                           )}
                        </div>
                     </div>
                     
                     <div className="p-5 flex flex-col flex-1 border-t border-[#CFE4E3] dark:border-[#145250]">
                        <div className="flex items-center gap-3 mb-2">
                           <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center border ${isPdf ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-950/40 dark:border-red-900/40' : isImage ? 'bg-[#E7F1F1] border-[#CFE4E3] text-[#0E7673] dark:bg-[#062625] dark:border-[#145250] dark:text-[#38B794]' : 'bg-[#F5FAFA] dark:bg-[#062625] border-[#CFE4E3] dark:border-[#145250] text-[#5C807F] dark:text-[#9FC8C7]'}`}>
                              {isPdf ? <FileText size={16} /> : isImage ? <ImageIcon size={16} /> : <FileText size={16} />}
                           </div>
                           <div className="flex-1 overflow-hidden">
                             <p className="font-bold text-[#0A3D3B] dark:text-white text-sm truncate" title={displayFilename}>
                                {displayFilename}
                             </p>
                             <p className="text-xs font-medium text-[#5C807F] dark:text-[#9FC8C7] mt-0.5 truncate">{parseDate(p.createdAt) ? parseDate(p.createdAt)!.toLocaleDateString() : 'Just now'}</p>
                           </div>
                        </div>

                        {/* AI Quick Button */}
                        <button
                          onClick={() => handleOpenAiModal(p)}
                          className="w-full mt-2 mb-3 bg-[#D7F1EA]/70 dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#0E7673] dark:text-[#38B794] font-bold py-2.5 rounded-full text-xs flex justify-center items-center gap-2 transition hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47]"
                        >
                           <ShieldCheck size={15} className="text-[#0E7673] dark:text-[#38B794]" />
                           {hasAiScan ? "Consulter l'Audit DPML (IA)" : "Analyser avec l'IA"}
                        </button>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3">
                           <button 
                             disabled={!isPending || processingId === p.id}
                             onClick={() => handleUpdateStatus(p.id, 'approved')}
                             className="bg-white dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] hover:border-[#38B794] hover:bg-[#D7F1EA]/40 hover:text-[#0E7673] text-[#0A3D3B] dark:text-[#D7F1EA] disabled:opacity-50 disabled:bg-[#F5FAFA] dark:disabled:bg-[#062625] disabled:border-transparent disabled:text-[#5C807F] font-bold py-2.5 rounded-full text-xs flex justify-center items-center gap-1.5 transition-all"
                           >
                              {processingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Approve
                           </button>
                           <button 
                             disabled={!isPending || processingId === p.id}
                             onClick={() => handleUpdateStatus(p.id, 'rejected')}
                             className="bg-white dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 text-[#0A3D3B] dark:text-[#D7F1EA] disabled:opacity-50 disabled:bg-[#F5FAFA] dark:disabled:bg-[#062625] disabled:border-transparent disabled:text-[#5C807F] font-bold py-2.5 rounded-full text-xs flex justify-center items-center gap-1.5 transition-all"
                           >
                              <XCircle size={16} /> Reject
                           </button>
                        </div>
                        
                        <button className="w-full mt-3 bg-[#0E7673] hover:bg-[#0A5A58] text-white font-bold py-3 rounded-full text-xs flex justify-center items-center gap-2 transition-all shadow-sm">
                           <MessageSquare size={16} /> Contact Patient
                        </button>
                     </div>
                  </div>
               );
            })}
          </div>
        )}
      </div>

      {/* AI DPML Audit Modal */}
      <PrescriptionAiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        scanData={selectedScan}
        prescriptionUrl={selectedPrescription?.fileUrl}
        isProcessing={processingId === selectedPrescription?.id}
        onApprove={selectedPrescription?.status === 'pending_review' ? () => handleUpdateStatus(selectedPrescription.id, 'approved') : undefined}
        onReject={selectedPrescription?.status === 'pending_review' ? () => handleUpdateStatus(selectedPrescription.id, 'rejected') : undefined}
      />
    </div>
  );
}
