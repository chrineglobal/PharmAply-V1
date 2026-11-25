import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, CreditCard, Package, Truck, UserPlus, 
  ShieldCheck, MessageSquare, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { db, collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs, limit } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { parseDate } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export function NotificationBell({ className = '' }: { className?: string }) {
  const { user, role, userData } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // User-specific notifications
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const notifs: any[] = [];
      snapshot.forEach((d: any) => {
         notifs.push({ id: d.id, ...d.data() });
      });

      // If admin, also fetch broadcast admin notifications
      if (role === 'admin') {
        const adminQ = query(
          collection(db, 'notifications'),
          where('targetRole', '==', 'admin')
        );
        getDocs(adminQ).then((adminSnap) => {
          adminSnap.forEach((ad: any) => {
            if (!notifs.some(n => n.id === ad.id)) {
              notifs.push({ id: ad.id, ...ad.data() });
            }
          });
          notifs.sort((a, b) => {
            const timeA = parseDate(a.createdAt)?.getTime() || 0;
            const timeB = parseDate(b.createdAt)?.getTime() || 0;
            return timeB - timeA;
          });
          setNotifications(notifs);
        }).catch(() => {
          notifs.sort((a, b) => {
            const timeA = parseDate(a.createdAt)?.getTime() || 0;
            const timeB = parseDate(b.createdAt)?.getTime() || 0;
            return timeB - timeA;
          });
          setNotifications(notifs);
        });
      } else {
        notifs.sort((a, b) => {
          const timeA = parseDate(a.createdAt)?.getTime() || 0;
          const timeB = parseDate(b.createdAt)?.getTime() || 0;
          return timeB - timeA;
        });
        setNotifications(notifs);
      }
    });

    return () => unsubscribe();
  }, [user, role]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction':
      case 'payment':
        return <CreditCard size={16} className="text-[#0E7673] dark:text-[#38B794]" />;
      case 'delivery':
      case 'driver':
        return <Truck size={16} className="text-[#0E7673] dark:text-[#38B794]" />;
      case 'kyc':
      case 'verification':
        return <ShieldCheck size={16} className="text-amber-500" />;
      case 'registration':
      case 'user_signup':
        return <UserPlus size={16} className="text-[#38B794]" />;
      case 'message':
        return <MessageSquare size={16} className="text-[#0E7673] dark:text-[#38B794]" />;
      case 'order':
      case 'order_status':
      default:
        return <Package size={16} className="text-[#0E7673] dark:text-[#38B794]" />;
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead && notification.id) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), {
          isRead: true
        });
      } catch (e) {
        // Fallback for memory/mock
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      }
    }
    
    setShowDropdown(false);

    // Direct URL target priority if explicitly specified
    if (notification.targetUrl || notification.url) {
      navigate(notification.targetUrl || notification.url);
      return;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const rawRole = (role || userData?.role || '').toLowerCase();
    
    // Robust multi-criteria portal detection
    const isPharmacist = 
      currentPath.startsWith('/pharmacist') || 
      ['pharmacist', 'pharmacy', 'vendor', 'team_member', 'team', 'staff', 'cashier'].some(r => rawRole.includes(r)) ||
      notification.targetRole === 'pharmacist' ||
      notification.targetRole === 'vendor' ||
      notification.target === 'pharmacy';

    const isAdmin = 
      currentPath.startsWith('/admin') || 
      ['admin', 'superadmin', 'manager'].some(r => rawRole.includes(r)) ||
      notification.targetRole === 'admin';

    const isDelivery = 
      currentPath.startsWith('/delivery') || 
      ['delivery', 'driver', 'courier', 'livreur'].some(r => rawRole.includes(r)) ||
      notification.targetRole === 'driver' ||
      notification.targetRole === 'delivery' ||
      notification.target === 'driver';

    const relatedId = notification.relatedId || notification.orderId;

    if (isPharmacist) {
      if (notification.type === 'message') {
        navigate(relatedId ? `/pharmacist/messages/${relatedId}` : '/pharmacist/messages');
      } else if (notification.type === 'inventory' || notification.type === 'stock') {
        navigate(relatedId ? `/pharmacist/inventory/${relatedId}` : '/pharmacist/inventory');
      } else if (notification.type === 'prescription') {
        navigate('/pharmacist/prescriptions');
      } else if (relatedId) {
        navigate(`/pharmacist/order/${relatedId}`);
      } else {
        navigate('/pharmacist/orders');
      }
    } else if (isAdmin) {
      if (notification.type === 'transaction' || notification.type === 'payment' || notification.type === 'financial') {
        navigate('/admin/finances');
      } else if (notification.type === 'delivery' || notification.type === 'driver_tracking') {
        navigate('/admin/live-map');
      } else if (notification.type === 'kyc' || notification.type === 'verification') {
        if (notification.target === 'driver') {
          navigate('/admin/drivers');
        } else {
          navigate('/admin/vendors');
        }
      } else if (notification.type === 'registration' || notification.type === 'user_signup') {
        if (notification.target === 'driver') navigate('/admin/drivers');
        else if (notification.target === 'pharmacist' || notification.target === 'pharmacy' || notification.target === 'vendor') navigate('/admin/vendors');
        else navigate('/admin/clients');
      } else if (notification.type === 'message' || notification.type === 'support') {
        navigate('/admin/support');
      } else if (notification.type === 'dpml') {
        navigate('/admin/dpml');
      } else if (relatedId) {
        navigate(`/admin/orders`);
      } else {
        navigate('/admin/orders');
      }
    } else if (isDelivery) {
      if (notification.type === 'message') {
        navigate(relatedId ? `/delivery/messages/${relatedId}` : '/delivery/messages');
      } else if (relatedId) {
        navigate(`/delivery/order/${relatedId}`);
      } else {
        navigate('/delivery/deliveries');
      }
    } else {
      // Patient Portal
      if (notification.type === 'payment_required') {
        navigate('/patient/orders');
      } else if (notification.type === 'reminder') {
        navigate('/patient/calendar');
      } else if (notification.type === 'message') {
        navigate(relatedId ? `/patient/messages/${relatedId}` : '/patient/messages');
      } else if (relatedId) {
        navigate(`/patient/tracking/${relatedId}`);
      } else {
        navigate('/patient/orders');
      }
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const notif of unread) {
      if (notif.id) {
        try {
          await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
        } catch (e) {}
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-10 h-10 bg-white dark:bg-[#0A3D3B] rounded-full flex items-center justify-center border border-[#CFE4E3] dark:border-[#145250] shadow-sm relative text-[#0E7673] dark:text-[#E7F1F1] hover:bg-[#E7F1F1] dark:hover:bg-[#062625] transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-[#38B794] rounded-full border-2 border-white dark:border-[#0A3D3B]"></span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#0A3D3B] rounded-3xl shadow-2xl border border-[#CFE4E3] dark:border-[#145250] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-4 border-b border-[#E7F1F1] dark:border-[#145250] flex items-center justify-between bg-[#F5FAFA] dark:bg-[#062625]">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#0A3D3B] dark:text-white text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-[#D7F1EA] text-[#0A3D3B] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} {t('new', 'nouvelles')}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="text-xs text-[#0E7673] dark:text-[#38B794] font-bold hover:underline"
              >
                {t('mark_all_read', 'Tout marquer lu')}
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E7F1F1] dark:divide-[#145250]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#6EADAB] text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                <p className="font-medium">Aucune notification pour le moment</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-[#F5FAFA] dark:hover:bg-[#062625] transition-colors ${!notif.isRead ? 'bg-[#E7F1F1]/60 dark:bg-[#0E7673]/20' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#E7F1F1] dark:bg-[#062625] flex items-center justify-center shrink-0 mt-0.5 border border-[#CFE4E3] dark:border-[#145250]">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-bold truncate ${!notif.isRead ? 'text-[#0E7673] dark:text-[#38B794]' : 'text-[#0A3D3B] dark:text-white'}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#38B794] shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#0A3D3B]/80 dark:text-[#CFE4E3] line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.createdAt && (
                      <span className="text-[9px] text-[#6EADAB] mt-1 block">
                        {parseDate(notif.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Récent'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
