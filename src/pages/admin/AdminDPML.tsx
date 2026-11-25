import React from 'react';
import { DPMLDashboard } from '../../components/DPMLAlerts';

export function AdminDPML() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#F5FAFA] dark:bg-[#062625] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A3D3B] dark:text-white">Conformité DPML</h1>
        <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm">Réglementation et alertes de santé publique</p>
      </div>

      <DPMLDashboard />
    </div>
  );
}
