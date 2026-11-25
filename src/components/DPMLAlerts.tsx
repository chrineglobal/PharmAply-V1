import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function DPMLAlertBanner() {
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('dpml_alertes')
        .select('*')
        .eq('statut', 'Actif')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setActiveAlerts(data);
      }
    };

    fetchAlerts();

    // Set up realtime subscription
    const subscription = supabase
      .channel('dpml_alertes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dpml_alertes' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl shadow-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
            Alerte(s) Critique(s) DPML (Quarantaine requise)
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-200">
            <ul className="list-disc pl-5 space-y-2">
              {activeAlerts.map(alert => (
                <li key={alert.id}>
                  <strong>{alert.titre}</strong> - Lot concerné: {alert.num_lot_concerne} 
                  {alert.dci_concerne ? ` (DCI: ${alert.dci_concerne})` : ''} 
                  <br />
                  <span className="text-xs opacity-90">{alert.description}</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 uppercase tracking-wide">
                      Action requise: {alert.action_requise}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DPMLDashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('dpml_alertes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAlerts(data);
      }
      setLoading(false);
    };

    fetchAlerts();
  }, []);

  return (
    <div className="bg-white dark:bg-[#0A3D3B] rounded-2xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#CFE4E3] dark:border-[#145250] flex justify-between items-center bg-[#F5FAFA] dark:bg-[#062625]">
        <div>
          <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
            Vigilance DPML
          </h2>
          <p className="text-sm text-[#5C807F] dark:text-[#9FC8C7] mt-1">
            Registre officiel des alertes et retraits de lots du Ministère de la Santé
          </p>
        </div>
      </div>
      
      <div className="p-0">
        {loading ? (
          <div className="p-8 text-center text-[#5C807F] dark:text-[#9FC8C7]">Chargement...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-[#0E7673] dark:text-[#38B794] mb-3" />
            <p className="text-[#5C807F] dark:text-[#9FC8C7]">Aucune alerte DPML enregistrée.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#CFE4E3] dark:divide-[#145250]">
            {alerts.map(alert => (
              <div key={alert.id} className="p-6 hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47] transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                         alert.statut === 'Actif' 
                           ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                           : 'bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794]'
                       }`}>
                         {alert.statut}
                       </span>
                       <span className="text-sm text-[#5C807F] dark:text-[#9FC8C7]">
                         {new Date(alert.date_alerte).toLocaleDateString()}
                       </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0A3D3B] dark:text-white">
                      {alert.titre}
                    </h3>
                    <p className="mt-1 text-sm text-[#5C807F] dark:text-[#9FC8C7]">
                      {alert.description}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-medium text-[#5C807F] dark:text-[#9FC8C7] uppercase">Numéro de Lot</span>
                        <span className="block text-sm text-[#0A3D3B] dark:text-white font-mono bg-[#E7F1F1] dark:bg-[#062625] px-2 py-1 rounded inline-block mt-1">
                          {alert.num_lot_concerne}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-[#5C807F] dark:text-[#9FC8C7] uppercase">Cible</span>
                        <span className="block text-sm text-[#0A3D3B] dark:text-white mt-1">
                          {alert.dci_concerne ? `DCI: ${alert.dci_concerne}` : `Médicament: ${alert.nom_commercial_concerne}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-6 flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                      {alert.action_requise}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
