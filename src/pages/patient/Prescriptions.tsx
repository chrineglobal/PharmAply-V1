import { 
  FileText, Plus, ArrowLeft, Image as ImageIcon, MoreVertical, 
  Trash2, ShoppingCart, Eye, Calendar, Sparkles, Pill, Clock,
  Search, CheckCircle2, ShieldCheck, Filter, Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, deleteDoc } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { useCart } from "../../components/CartProvider";
import { useTranslation } from "react-i18next";
import { parseDate, sortByDateDesc, formatCurrency } from "../../lib/utils";
import toast from "react-hot-toast";

export function PatientPrescriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { t } = useTranslation();

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "today">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'prescriptions'), where('patientId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrescriptions(sortByDateDesc(raw));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette ordonnance ?")) {
      try {
        await deleteDoc(doc(db, 'prescriptions', id));
        toast.success("Ordonnance supprimée de l'historique.");
      } catch (e) {
        console.error('Error deleting prescription:', e);
        toast.error("Erreur lors de la suppression.");
      }
    }
    setActiveMenuId(null);
  };

  const handleOrderMedications = (p: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const items = p.items || [];
    if (items.length === 0) {
      toast("Aucun médicament structuré dans cette ordonnance.", { icon: "ℹ️" });
      return;
    }

    items.forEach((m: any) => {
      addToCart({
        id: m.product_id || `rx_${p.id}_${m.nom_medicament}`,
        name: m.product_name || m.nom_medicament,
        price: m.price || 1500,
        pharmacyId: "pharm_default",
        pharmacyName: m.pharmacy_name || "Pharmacie Partenaire",
        dosage: m.dosage,
        requiresPrescription: true,
        quantity: m.quantite || 1,
        prescriptionImage: p.fileUrl || undefined
      });
    });

    toast.success(`${items.length} médicament(s) ajouté(s) au panier !`);
    navigate("/patient/cart");
  };

  // Filtrage selon l'onglet et la recherche
  const filteredPrescriptions = prescriptions.filter((p) => {
    const nameMatch = (p.fileName || "Ordonnance")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    const medMatch = (p.items || []).some((m: any) =>
      (m.nom_medicament || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!nameMatch && !medMatch) return false;

    if (activeTab === "today") {
      const date = parseDate(p.createdAt);
      if (!date) return true;
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }
    return true;
  });

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full relative font-sans overflow-hidden">
      
      {/* ========================================================================= */}
      {/* HEADER */}
      {/* ========================================================================= */}
      <header className="bg-white dark:bg-[#0A3D3B] px-6 pt-12 pb-4 shadow-sm z-20 flex flex-col gap-4 border-b border-[#CFE4E3] dark:border-[#145250]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-center text-[#0A3D3B] dark:text-white hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#0A3D3B] dark:text-white">
                Historique des Scans
              </h1>
              <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                Prescriptions & Ordonnances médicales
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/patient/smart-scanner")}
            className="px-4 py-2 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
          >
            <Sparkles size={14} className="text-[#38B794]" />
            Nouveau Scan
          </button>
        </div>

        {/* Barre de Recherche */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C807F] dark:text-[#9FC8C7]" />
          <input
            type="text"
            placeholder="Rechercher par médicament ou nom d'ordonnance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F5FAFA] dark:bg-[#062625] rounded-full text-xs text-[#0A3D3B] dark:text-white placeholder-[#5C807F] dark:placeholder-[#9FC8C7] outline-none border border-[#CFE4E3] dark:border-[#145250] focus:border-[#0E7673] transition"
          />
        </div>

        {/* Onglets Filtres (Aujourd'hui / Tous) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-[#0E7673] text-white shadow-sm"
                : "bg-[#E7F1F1] dark:bg-[#062625] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#D7F1EA]"
            }`}
          >
            Tous les scans ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab("today")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              activeTab === "today"
                ? "bg-[#0E7673] text-white shadow-sm"
                : "bg-[#E7F1F1] dark:bg-[#062625] text-[#5C807F] dark:text-[#9FC8C7] border border-[#CFE4E3] dark:border-[#145250] hover:bg-[#D7F1EA]"
            }`}
          >
            Aujourd'hui
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* LISTE DES ORDONNANCES */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 space-y-4">
        {filteredPrescriptions.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#0A3D3B] rounded-3xl border border-dashed border-[#CFE4E3] dark:border-[#145250] p-8 shadow-sm">
            <FileText size={48} className="mx-auto text-[#CFE4E3] dark:text-[#145250] mb-3" />
            <h3 className="font-bold text-base text-[#0A3D3B] dark:text-white">
              Aucune ordonnance trouvée
            </h3>
            <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1 max-w-sm mx-auto">
              Scannez une ordonnance avec la caméra pour que l'IA extrait instantanément vos médicaments.
            </p>
            <button
              onClick={() => navigate("/patient/smart-scanner")}
              className="mt-5 px-6 py-3 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold shadow-md transition"
            >
              Lancer le Scanner IA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((p) => {
              const dateObj = parseDate(p.createdAt);
              const meds = p.items || [];

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPrescription(p)}
                  className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-5 border border-[#CFE4E3] dark:border-[#145250] shadow-sm hover:shadow-md transition cursor-pointer flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Vignette Preview */}
                      <div className="w-14 h-14 rounded-2xl bg-[#D7F1EA] dark:bg-[#062625] overflow-hidden shrink-0 border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-center relative">
                        {p.fileUrl ? (
                          <img
                            src={p.fileUrl}
                            alt="Ordonnance"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={24} className="text-[#0E7673] dark:text-[#38B794]" />
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm">
                          {p.fileName || "Ordonnance Médicale"}
                        </h3>
                        <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] flex items-center gap-1 mt-0.5">
                          <Clock size={12} />
                          {dateObj ? dateObj.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "Récemment"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'approved' 
                          ? 'bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794]' 
                          : 'bg-[#E7F1F1] text-[#0E7673] dark:bg-[#062625] dark:text-[#D7F1EA]'
                      }`}>
                        {p.status === 'approved' ? 'Validée DPML' : 'Analysée IA'}
                      </span>

                      {/* Menu More */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === p.id ? null : p.id);
                          }}
                          className="p-1.5 text-[#5C807F] hover:text-[#0A3D3B] dark:text-[#9FC8C7] dark:hover:text-white rounded-full hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === p.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#0A3D3B] rounded-2xl shadow-xl border border-[#CFE4E3] dark:border-[#145250] overflow-hidden z-30">
                            {p.fileUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(p.fileUrl, "_blank");
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] flex items-center gap-2 font-medium"
                              >
                                <Eye size={14} /> Voir l'original
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(p.id, e)}
                              className="w-full text-left px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 font-medium border-t border-[#CFE4E3] dark:border-[#145250]"
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Médicaments extraits par l'IA */}
                  {meds.length > 0 && (
                    <div className="bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl p-3 border border-[#CFE4E3] dark:border-[#145250]">
                      <p className="text-[11px] font-bold text-[#5C807F] dark:text-[#9FC8C7] mb-2">
                        {meds.length} Médicament(s) identifié(s) :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {meds.map((m: any, idx: number) => (
                          <span
                            key={idx}
                            className="bg-white dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-[#D7F1EA] text-xs px-2.5 py-1 rounded-full border border-[#CFE4E3] dark:border-[#145250] flex items-center gap-1 shadow-2xs font-medium"
                          >
                            <Pill size={11} className="text-[#0E7673] dark:text-[#38B794]" />
                            {m.nom_medicament} {m.dosage ? `(${m.dosage})` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Rapides */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#CFE4E3] dark:border-[#145250]">
                    {p.fileUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(p.fileUrl, "_blank");
                        }}
                        className="text-xs text-[#0E7673] dark:text-[#38B794] font-bold hover:underline flex items-center gap-1"
                      >
                        <Eye size={13} />
                        Afficher ordonnance
                      </button>
                    )}

                    {meds.length > 0 && (
                      <button
                        onClick={(e) => handleOrderMedications(p, e)}
                        className="ml-auto px-4 py-2 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
                      >
                        <ShoppingCart size={13} />
                        Commander les médicaments
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bouton Flottant Nouveau Scan */}
      <button
        onClick={() => navigate("/patient/smart-scanner")}
        className="fixed bottom-20 right-6 w-14 h-14 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition active:scale-90 z-30 border-2 border-white dark:border-[#0A3D3B]"
      >
        <Sparkles size={24} className="text-[#38B794]" />
      </button>

    </div>
  );
}
