import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Search, Download, Phone, Mail, MessageCircle, 
  ShoppingBag, Calendar, ArrowUpRight, UserCheck, ShieldCheck 
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, getDocs, db, doc, getDoc 
} from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { formatCurrency, parseDate } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUserProfiles } from '../../lib/userSync';
import { UserAvatar } from '../../components/common/UserAvatar';

interface CustomerSummary {
  id: string; // patientId or synthetic key
  name: string;
  phone: string;
  email: string;
  photoUrl: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
  lastOrderId: string;
  status: 'active' | 'regular' | 'vip';
}

export function PharmacistCustomers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const patientIds = useMemo(() => {
    return customers.map(c => c.id).filter(id => id && id !== 'anonymous');
  }, [customers]);

  const userProfiles = useUserProfiles(patientIds);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    let unsubscribe: () => void;

    const fetchCustomersData = async () => {
      try {
        let pharmacyId = user.uid;
        try {
          const pQuery = query(collection(db, 'pharmacies'), where("ownerId", "==", user.uid));
          const pSnap = await getDocs(pQuery);
          if (!pSnap.empty) {
            pharmacyId = pSnap.docs[0].id;
          }
        } catch (e) {}

        const q = query(
          collection(db, 'orders'),
          where('pharmacyId', '==', pharmacyId)
        );

        unsubscribe = onSnapshot(q, async (snapshot) => {
          const orderDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setOrders(orderDocs);

          // Aggregate customers by patientId or patientName
          const custMap = new Map<string, CustomerSummary>();

          for (const ord of orderDocs as any[]) {
            const patientKey = ord.patientId || ord.patientPhone || ord.patientName || 'anonymous';
            const spent = Number(ord.totalAmount || ord.totalPrice || 0);
            const ordDate = parseDate(ord.createdAt);

            if (!custMap.has(patientKey)) {
              custMap.set(patientKey, {
                id: ord.patientId || ord.id,
                name: ord.patientName || 'Client PharmAply',
                phone: ord.patientPhone || '',
                email: ord.patientEmail || '',
                photoUrl: ord.patientPhoto || ord.patientPhotoUrl || '',
                totalOrders: 1,
                totalSpent: isNaN(spent) ? 0 : spent,
                lastOrderDate: ordDate,
                lastOrderId: ord.id,
                status: 'regular'
              });
            } else {
              const existing = custMap.get(patientKey)!;
              existing.totalOrders += 1;
              existing.totalSpent += (isNaN(spent) ? 0 : spent);
              if (ordDate && (!existing.lastOrderDate || ordDate > existing.lastOrderDate)) {
                existing.lastOrderDate = ordDate;
                existing.lastOrderId = ord.id;
              }
              if (!existing.phone && ord.patientPhone) existing.phone = ord.patientPhone;
              if (!existing.photoUrl && (ord.patientPhoto || ord.patientPhotoUrl)) {
                existing.photoUrl = ord.patientPhoto || ord.patientPhotoUrl;
              }
            }
          }

          // Fetch extra details for customers from 'users' collection
          const custList = Array.from(custMap.values());
          for (const c of custList) {
            if (c.totalOrders >= 5 || c.totalSpent > 50000) {
              c.status = 'vip';
            } else if (c.totalOrders >= 2) {
              c.status = 'regular';
            } else {
              c.status = 'active';
            }

            if (c.id && c.id !== 'anonymous' && (!c.phone || !c.photoUrl)) {
              try {
                const uSnap = await getDoc(doc(db, 'users', c.id));
                if (uSnap.exists()) {
                  const uData = uSnap.data();
                  c.name = c.name || uData.name || uData.fullName;
                  c.phone = c.phone || uData.phone;
                  c.email = c.email || uData.email;
                  c.photoUrl = c.photoUrl || uData.photoURL || uData.photoUrl;
                }
              } catch (e) {}
            }
          }

          // Sort by last order date desc
          custList.sort((a, b) => {
            const timeA = a.lastOrderDate?.getTime() || 0;
            const timeB = b.lastOrderDate?.getTime() || 0;
            return timeB - timeA;
          });

          setCustomers(custList);
          setLoading(false);
        }, (error) => {
          console.error("Customers fetch error:", error);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error setting up customers:", err);
        setLoading(false);
      }
    };

    fetchCustomersData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => {
      const liveName = (userProfiles[c.id]?.name || c.name).toLowerCase();
      const livePhone = (userProfiles[c.id]?.phone || c.phone).toLowerCase();
      const liveEmail = (userProfiles[c.id]?.email || c.email).toLowerCase();
      return liveName.includes(q) || livePhone.includes(q) || liveEmail.includes(q);
    });
  }, [customers, searchQuery, userProfiles]);

  const handleExportCSV = () => {
    if (customers.length === 0) {
      toast.error("Aucune donnée client à exporter");
      return;
    }

    const headers = ["Nom", "Téléphone", "Email", "Total Commandes", "Total Dépensé (XAF)", "Dernière Commande"];
    const rows = customers.map(c => {
      const liveName = userProfiles[c.id]?.name || c.name;
      const livePhone = userProfiles[c.id]?.phone || c.phone;
      const liveEmail = userProfiles[c.id]?.email || c.email;
      return [
        `"${liveName}"`,
        `"${livePhone}"`,
        `"${liveEmail}"`,
        c.totalOrders,
        c.totalSpent,
        `"${c.lastOrderDate ? c.lastOrderDate.toLocaleDateString() : 'N/A'}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clients_pharmacie_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fichier CSV téléchargé avec succès");
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A3D3B] dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-[#D7F1EA] dark:bg-[#0E4A47] rounded-2xl text-[#0E7673] dark:text-[#38B794] border border-[#CFE4E3] dark:border-[#145250]">
              <Users size={22} />
            </div>
            {t('customers', 'Fichier Clients & Patients')}
          </h1>
          <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm mt-1">
            {t('manage_customers_desc', 'Consultez la base de vos patients, leur historique d\'achats et contactez-les en un clic.')}
          </p>
        </div>

        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] rounded-full text-xs font-bold text-[#0A3D3B] dark:text-white hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition shadow-xs"
        >
          <Download size={15} className="text-[#0E7673] dark:text-[#38B794]" />
          {t('export_csv', 'Exporter CSV')}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-5 shadow-xs border border-[#CFE4E3] dark:border-[#145250] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-semibold">Total Clients Uniques</p>
            <h3 className="text-xl font-extrabold text-[#0A3D3B] dark:text-white tabular-nums">{customers.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-5 shadow-xs border border-[#CFE4E3] dark:border-[#145250] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-semibold">Clients Réguliers & VIP</p>
            <h3 className="text-xl font-extrabold text-[#0A3D3B] dark:text-white tabular-nums">
              {customers.filter(c => c.totalOrders > 1).length}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-5 shadow-xs border border-[#CFE4E3] dark:border-[#145250] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center shrink-0">
            <ShoppingBag size={22} />
          </div>
          <div>
            <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-semibold">Commandes Totales</p>
            <h3 className="text-xl font-extrabold text-[#0A3D3B] dark:text-white tabular-nums">{orders.length}</h3>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-[#0A3D3B] rounded-full px-4 py-2.5 shadow-xs border border-[#CFE4E3] dark:border-[#145250] flex items-center gap-3 focus-within:border-[#0E7673] dark:focus-within:border-[#38B794] transition-colors">
        <Search className="text-[#5C807F] dark:text-[#9FC8C7] ml-1 shrink-0" size={18} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('search_customers', 'Rechercher un client par nom, numéro de téléphone ou e-mail...')}
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-[#0A3D3B] dark:text-white placeholder:text-[#5C807F] dark:placeholder:text-[#9FC8C7]"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl shadow-xs border border-[#CFE4E3] dark:border-[#145250] overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#CFE4E3] dark:border-[#145250] bg-[#F5FAFA] dark:bg-[#062625]/70 text-[11px] font-bold text-[#5C807F] dark:text-[#9FC8C7] uppercase tracking-wider">
                <th className="p-4 pl-6">{t('customer', 'Client / Patient')}</th>
                <th className="p-4">{t('contact', 'Contact')}</th>
                <th className="p-4">{t('total_orders', 'Commandes')}</th>
                <th className="p-4">{t('total_spent', 'Montant Dépensé')}</th>
                <th className="p-4">{t('last_order', 'Dernière Commande')}</th>
                <th className="p-4 text-right pr-6">{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7F1F1] dark:divide-[#145250] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-xs animate-pulse">
                    Chargement des clients en cours...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#5C807F] dark:text-[#9FC8C7] text-sm">
                    {t('no_customers_found', 'Aucun client trouvé.')}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const liveName = userProfiles[cust.id]?.name || cust.name;
                  const livePhoto = userProfiles[cust.id]?.photoUrl || cust.photoUrl;
                  const livePhone = userProfiles[cust.id]?.phone || cust.phone;
                  const liveEmail = userProfiles[cust.id]?.email || cust.email;

                  return (
                    <tr key={cust.id} className="hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]/60 transition">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            userId={cust.id}
                            name={liveName}
                            photoUrl={livePhoto}
                            sizeClassName="w-10 h-10"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#0A3D3B] dark:text-white">
                                {liveName}
                              </span>
                              {cust.status === 'vip' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#D7F1EA] text-[#0E7673] dark:bg-[#0E4A47] dark:text-[#38B794] border border-[#CFE4E3] dark:border-[#145250]">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                              ID: {cust.id.slice(0, 6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          {livePhone ? (
                            <a href={`tel:${livePhone}`} className="flex items-center gap-1 text-xs font-semibold text-[#0E7673] dark:text-[#38B794] hover:underline">
                              <Phone size={12} /> {livePhone}
                            </a>
                          ) : (
                            <span className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">Non renseigné</span>
                          )}
                          {liveEmail && (
                            <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7] flex items-center gap-1">
                              <Mail size={11} /> {liveEmail}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-bold text-[#0A3D3B] dark:text-white tabular-nums">
                        {cust.totalOrders}
                      </td>

                      <td className="p-4 font-bold text-[#0E7673] dark:text-[#38B794] tabular-nums">
                        {formatCurrency(cust.totalSpent)}
                      </td>

                      <td className="p-4 text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                        {cust.lastOrderDate ? cust.lastOrderDate.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (cust.lastOrderId) {
                              navigate(`/pharmacist/messages/${cust.lastOrderId}`);
                            } else {
                              navigate(`/pharmacist/messages`);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold transition shadow-xs"
                          title="Ouvrir la discussion avec ce client"
                        >
                          <MessageCircle size={14} />
                          Message
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
