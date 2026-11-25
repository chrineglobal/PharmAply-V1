import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import { formatCurrency, parseDate } from '../lib/utils';
import { printInvoice, InvoiceData } from '../lib/invoice';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: InvoiceData;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const dateStr = order.createdAt 
    ? (parseDate(order.createdAt)?.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) || new Date().toLocaleDateString('fr-FR'))
    : new Date().toLocaleDateString('fr-FR');
  
  const invoiceNum = '#' + (order.id ? order.id.slice(0, 8).toUpperCase() : '000000');
  const deliveryFee = order.deliveryMethod === 'delivery' || order.deliveryMethod === 'livraison' ? 1000 : 0;
  const itemsTotal = order.items ? order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) : order.total;
  const grandTotal = order.total || (itemsTotal + deliveryFee);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#0A3D3B] rounded-2xl shadow-2xl border border-[#CFE4E3] dark:border-[#145250] overflow-hidden my-8">
        
        {/* Action Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#E7F1F1] dark:bg-[#062625] border-b border-[#CFE4E3] dark:border-[#145250]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#0E7673] dark:text-[#38B794]" />
            <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base">Aperçu de la Facture - PharmAply</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printInvoice(order)}
              className="flex items-center gap-2 px-5 py-2 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold transition shadow-sm touch-manipulation"
            >
              <Printer size={15} /> Imprimer / Télécharger (PDF)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-[#9FC8C7] hover:text-[#0A3D3B] dark:hover:text-white rounded-full hover:bg-white/70 dark:hover:bg-[#0E4A47] transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Printable View Container */}
        <div className="p-6 md:p-10 max-h-[80vh] overflow-y-auto bg-[#F5FAFA] dark:bg-[#062625]">
          <div className="relative bg-white dark:bg-[#0A3D3B] rounded-2xl border border-[#CFE4E3] dark:border-[#145250] p-8 shadow-sm overflow-hidden">
            
            {/* Top Right Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-[#0E7673]/15 via-[#38B794]/10 to-transparent rounded-bl-[100px] pointer-events-none" />

            {/* Logo & Brand Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-[#0E7673] rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-sm">
                +
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0E7673] dark:text-[#38B794] tracking-tight">PharmAply</h2>
                <p className="text-[10px] font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-widest">Trouvez • Commandez • Recevez</p>
              </div>
            </div>

            {/* Title & Metadata Grid */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4 pb-6 border-b border-[#CFE4E3] dark:border-[#145250]">
              <div>
                <h1 className="text-3xl font-black text-[#0A3D3B] dark:text-white tracking-tight mb-3">FACTURE</h1>
                <div className="text-xs text-[#5C807F] dark:text-[#9FC8C7] space-y-1">
                  <p className="text-[10px] uppercase font-bold text-[#5C807F] dark:text-[#9FC8C7]">Facturé à :</p>
                  <p className="text-sm font-bold text-[#0A3D3B] dark:text-white">{order.patientName || 'Client PharmAply'}</p>
                  <p>{order.deliveryAddress || 'Douala, Cameroun'}</p>
                  <p>{order.patientEmail || 'client@chrinedigitalagency.com'}</p>
                  <p>{order.patientPhone || '+237 600 000 000'}</p>
                </div>
              </div>

              <div className="text-left md:text-right text-xs text-[#5C807F] dark:text-[#9FC8C7] space-y-1 md:self-center">
                <p><span className="opacity-80">N° Facture :</span> <strong className="text-[#0A3D3B] dark:text-white">{invoiceNum}</strong></p>
                <p><span className="opacity-80">Date :</span> <strong className="text-[#0A3D3B] dark:text-white">{dateStr}</strong></p>
                <p><span className="opacity-80">Réf. Commande :</span> <strong className="text-[#0A3D3B] dark:text-white">{order.id.slice(0, 12)}</strong></p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#0E7673] text-white font-bold rounded-lg overflow-hidden">
                    <th className="py-3 px-4 rounded-l-lg">Description du produit</th>
                    <th className="py-3 px-4 text-right">Prix unitaire</th>
                    <th className="py-3 px-4 text-center">Qté</th>
                    <th className="py-3 px-4 text-right rounded-r-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFE4E3] dark:divide-[#145250]">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="text-[#5C807F] dark:text-[#9FC8C7]">
                      <td className="py-3 px-4 font-semibold text-[#0A3D3B] dark:text-white">{item.name}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(item.price)}</td>
                      <td className="py-3 px-4 text-center font-bold tabular-nums">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs pt-4 border-t border-[#CFE4E3] dark:border-[#145250]">
              <div className="space-y-4 text-[#5C807F] dark:text-[#9FC8C7]">
                <div>
                  <h4 className="font-bold text-[#0A3D3B] dark:text-white mb-1">Conditions Générales :</h4>
                  <p className="text-[11px] leading-relaxed">Médicaments certifiés conformes et délivrés sous la supervision de notre pharmacien partenaire. Merci de conserver cette facture pour toute réclamation.</p>
                </div>
                <div>
                  <h4 className="font-bold text-[#0A3D3B] dark:text-white mb-1">Mode de Règlement :</h4>
                  <p className="text-[11px] font-semibold text-[#0E7673] dark:text-[#38B794]">{order.paymentMethod || 'Fapshi (Mobile Money & Carte)'}</p>
                </div>
                <div>
                  <h4 className="font-bold text-[#0A3D3B] dark:text-white mb-1">Une question ?</h4>
                  <p className="text-[11px]">Email : support@chrinedigitalagency.com</p>
                  <p className="text-[11px]">Tél : +237 600 000 000</p>
                  <p className="text-[11px]">Adresse : Douala, Cameroun</p>
                </div>
              </div>

              <div className="space-y-2 text-[#5C807F] dark:text-[#9FC8C7]">
                <div className="flex justify-between py-1 border-b border-[#CFE4E3] dark:border-[#145250]">
                  <span>Sous-total :</span>
                  <span className="font-bold text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(itemsTotal)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#CFE4E3] dark:border-[#145250]">
                  <span>TVA / Taxes :</span>
                  <span className="font-bold text-[#0A3D3B] dark:text-white tabular-nums">0 XAF</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#CFE4E3] dark:border-[#145250]">
                  <span>Frais de livraison :</span>
                  <span className="font-bold text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex justify-between p-3 bg-[#0E7673] text-white rounded-xl font-bold text-sm mt-3 shadow-sm">
                  <span>Total TTC :</span>
                  <span className="text-base font-black tabular-nums">{formatCurrency(grandTotal)}</span>
                </div>

                <div className="pt-8 text-right">
                  <div className="inline-block w-36 border-t border-[#CFE4E3] dark:border-[#145250] mb-1" />
                  <p className="text-[10px] font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase">Signature Autorisée</p>
                </div>
              </div>
            </div>

            {/* Footer Pills */}
            <div className="mt-8 pt-4 border-t border-[#CFE4E3] dark:border-[#145250] flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full text-[10px] font-semibold flex items-center gap-1">
                🌐 ref.chrinedigitalagency.com
              </span>
              <span className="px-3 py-1 bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full text-[10px] font-semibold flex items-center gap-1">
                ✉️ support@chrinedigitalagency.com
              </span>
              <span className="px-3 py-1 bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full text-[10px] font-semibold flex items-center gap-1">
                🏥 PharmAply Network
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
