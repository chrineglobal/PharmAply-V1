import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, DollarSign, Download, Filter } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function PharmacistPayments() {
  const { t } = useTranslation();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-[#0A3D3B] dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-[#D7F1EA] dark:bg-[#0E4A47] rounded-xl text-[#0E7673] dark:text-[#38B794]">
              <CreditCard size={24} />
            </div>
            {t('payments', 'Payments')}
          </h1>
          <p className="text-[#5C807F] dark:text-[#9FC8C7] mt-1">
            {t('manage_payments_desc', 'Track your payments and transactions.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-sm font-bold text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
            <Filter size={16} />
            {t('filter', 'Filter')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-sm font-bold text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition">
            <Download size={16} />
            {t('export', 'Export')}
          </button>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
           <p className="text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] mb-1">{t('available_balance', 'Available Balance')}</p>
           <h3 className="text-2xl font-black text-[#0E7673] dark:text-[#38B794] tabular-nums">{formatCurrency(0)}</h3>
           <button className="mt-4 w-full py-2.5 bg-[#0E7673] text-white font-bold text-sm rounded-full hover:bg-[#0A5A58] transition">
             {t('withdraw', 'Withdraw')}
           </button>
        </div>
        
         <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
           <p className="text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] mb-1">{t('pending_clearance', 'Pending Clearance')}</p>
           <h3 className="text-2xl font-bold text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(0)}</h3>
        </div>

        <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
           <p className="text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] mb-1">{t('total_withdrawn', 'Total Withdrawn')}</p>
           <h3 className="text-2xl font-bold text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(0)}</h3>
        </div>

        <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
           <p className="text-sm font-medium text-[#5C807F] dark:text-[#9FC8C7] mb-1">{t('platform_fees', 'Platform Fees')}</p>
           <h3 className="text-2xl font-bold text-[#0A3D3B] dark:text-white tabular-nums">{formatCurrency(0)}</h3>
        </div>
      </div>

       <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl shadow-sm border border-[#CFE4E3] dark:border-[#145250] overflow-hidden">
        <div className="p-5 border-b border-[#CFE4E3] dark:border-[#145250]">
           <h3 className="font-bold text-[#0A3D3B] dark:text-white">{t('recent_transactions', 'Recent Transactions')}</h3>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5FAFA] dark:bg-[#062625] border-b border-[#CFE4E3] dark:border-[#145250]">
                <th className="p-4 text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">{t('transaction_id', 'Transaction ID')}</th>
                <th className="p-4 text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">{t('date', 'Date')}</th>
                <th className="p-4 text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">{t('amount', 'Amount')}</th>
                <th className="p-4 text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">{t('status', 'Status')}</th>
                <th className="p-4 text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">{t('type', 'Type')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-sm">
                  {t('no_transactions_found', 'No transactions found.')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
