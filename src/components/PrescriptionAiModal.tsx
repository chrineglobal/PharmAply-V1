import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileText, Pill, Stethoscope, Clock, ShieldCheck, X } from 'lucide-react';

export interface MedicationExtracted {
  name: string;
  dosage?: string;
  form?: string;
  quantity?: number;
  frequency?: string;
  duration?: string;
  dpml_classification?: 'Liste_1' | 'Liste_2' | 'Stupefiant' | 'OTC';
  requires_prescription?: boolean;
  warnings?: string;
}

export interface DpmlSafetyChecks {
  has_controlled_substances?: boolean;
  requires_original_counterfoil?: boolean;
  validity_period_days?: number;
  compliance_notes?: string;
}

export interface PrescriptionScanResult {
  doctor_name?: string | null;
  patient_name?: string | null;
  date?: string | null;
  medications?: MedicationExtracted[];
  dpml_safety_checks?: DpmlSafetyChecks;
  overall_summary?: string;
}

interface PrescriptionAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanData: PrescriptionScanResult | null;
  prescriptionUrl?: string;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}

export const PrescriptionAiModal: React.FC<PrescriptionAiModalProps> = ({
  isOpen,
  onClose,
  scanData,
  prescriptionUrl,
  onApprove,
  onReject,
  isProcessing
}) => {
  if (!isOpen) return null;

  const hasStupefiant = scanData?.medications?.some(m => m.dpml_classification === 'Stupefiant') || scanData?.dpml_safety_checks?.has_controlled_substances;
  const hasListe1 = scanData?.medications?.some(m => m.dpml_classification === 'Liste_1');
  const hasListe2 = scanData?.medications?.some(m => m.dpml_classification === 'Liste_2');

  const getBadgeClass = (classification?: string) => {
    switch (classification) {
      case 'Stupefiant':
        return 'bg-red-500 text-white border-red-600';
      case 'Liste_1':
        return 'bg-amber-500 text-white border-amber-600';
      case 'Liste_2':
        return 'bg-[#0E7673] text-white border-[#0A5A58]';
      default:
        return 'bg-[#D7F1EA] text-[#0A3D3B] border-[#38B794]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0E7673] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <ShieldCheck className="text-[#38B794]" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Audit IA & Conformité DPML (Gemini 1.5 Pro)</h2>
              <p className="text-xs text-[#D7F1EA]">Validation pharmaceutique & contrôle des substances réglementées</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Alerte DPML Principale si Stupéfiant ou Liste 1 */}
          {hasStupefiant && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={22} />
              <div>
                <h4 className="font-bold text-red-900 dark:text-red-300 text-sm">Avertissement DPML : Substance Classée Stupéfiant / Contrôlée</h4>
                <p className="text-xs text-red-800/90 dark:text-red-300/80 mt-1 leading-relaxed">
                  L'ordonnance comporte un ou plusieurs médicaments soumis à la réglementation stricte des stupéfiants (carnet à souches requis, délivrance fractionnée obligatoire, vérification physique d'identité).
                </p>
              </div>
            </div>
          )}

          {/* Grid Layout: Visual + Extractions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Colonne Ordonnance Visuelle */}
            <div className="lg:col-span-4 bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl p-4 border border-[#CFE4E3] dark:border-[#145250] flex flex-col items-center">
              <span className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider mb-3">Document Source</span>
              {prescriptionUrl ? (
                <div className="w-full rounded-xl overflow-hidden border border-[#CFE4E3] dark:border-[#145250] max-h-72 flex items-center justify-center bg-black/5">
                  <img src={prescriptionUrl} alt="Ordonnance" className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => window.open(prescriptionUrl, '_blank')} />
                </div>
              ) : (
                <div className="w-full h-48 rounded-xl bg-[#E7F1F1] dark:bg-[#0E4A47] flex flex-col items-center justify-center text-[#5C807F] dark:text-[#9FC8C7] text-xs">
                  <FileText size={32} className="mb-2" />
                  <span>Aucun visuel direct</span>
                </div>
              )}

              {/* Métadonnées Médecin / Patient */}
              <div className="w-full mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#CFE4E3] dark:border-[#145250]">
                  <span className="text-[#5C807F] dark:text-[#9FC8C7]">Médecin prescripteur:</span>
                  <span className="font-bold text-[#0A3D3B] dark:text-white">{scanData?.doctor_name || 'Non détecté'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#CFE4E3] dark:border-[#145250]">
                  <span className="text-[#5C807F] dark:text-[#9FC8C7]">Patient:</span>
                  <span className="font-bold text-[#0A3D3B] dark:text-white">{scanData?.patient_name || 'Non détecté'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#CFE4E3] dark:border-[#145250]">
                  <span className="text-[#5C807F] dark:text-[#9FC8C7]">Date ordonnance:</span>
                  <span className="font-bold text-[#0A3D3B] dark:text-white">{scanData?.date || 'Récente'}</span>
                </div>
              </div>
            </div>

            {/* Colonne Médicaments Détectés */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm flex items-center gap-2">
                  <Pill size={16} className="text-[#0E7673] dark:text-[#38B794]" />
                  Médicaments Détectés & Classifications DPML
                </h3>
                <span className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                  {scanData?.medications?.length || 0} molécule(s) identifiée(s)
                </span>
              </div>

              {scanData?.medications && scanData.medications.length > 0 ? (
                <div className="space-y-3">
                  {scanData.medications.map((med, idx) => (
                    <div key={idx} className="bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm">{med.name}</h4>
                          <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-0.5">{med.dosage || 'Dosage usuel'} • {med.form || 'Comprimé'} • Qté: {med.quantity || 1}</p>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-sm ${getBadgeClass(med.dpml_classification)}`}>
                          {med.dpml_classification || 'Liste_1'}
                        </span>
                      </div>

                      {med.frequency && (
                        <div className="text-xs text-[#0A3D3B] dark:text-[#D7F1EA] bg-[#E7F1F1] dark:bg-[#0E4A47] p-2.5 rounded-xl border border-[#CFE4E3] dark:border-[#145250]">
                          <strong>Posologie :</strong> {med.frequency} {med.duration ? `(${med.duration})` : ''}
                        </div>
                      )}

                      {med.warnings && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5 mt-1 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-xl">
                          <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                          <span>{med.warnings}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#F5FAFA] dark:bg-[#062625] rounded-2xl border border-[#CFE4E3] dark:border-[#145250] text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                  Aucun médicament extrait automatiquement. Veuillez vérifier le document manuellement.
                </div>
              )}

              {/* Résumé de conformité DPML */}
              {scanData?.dpml_safety_checks && (
                <div className="p-4 bg-[#D7F1EA]/70 dark:bg-[#0E4A47] border border-[#38B794]/50 rounded-2xl text-xs text-[#0A3D3B] dark:text-[#D7F1EA] space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-[#0E7673] dark:text-[#38B794]" />
                    Contrôle de validité DPML
                  </span>
                  <p>{scanData.dpml_safety_checks.compliance_notes || "Ordonnance conforme aux exigences réglementaires de délivrance."}</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F5FAFA] dark:bg-[#062625] border-t border-[#CFE4E3] dark:border-[#145250] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-white text-xs font-bold hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition"
          >
            Fermer
          </button>

          <div className="flex items-center gap-3">
            {onReject && (
              <button
                disabled={isProcessing}
                onClick={onReject}
                className="px-5 py-2.5 rounded-full border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition disabled:opacity-50"
              >
                Refuser l'ordonnance
              </button>
            )}
            {onApprove && (
              <button
                disabled={isProcessing}
                onClick={onApprove}
                className="px-6 py-2.5 rounded-full bg-[#0E7673] hover:bg-[#0A5A58] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Valider & Approuver la délivrance
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
