import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, MapPin, Clock, DollarSign, CheckCircle, Navigation, Menu, Power, X, Moon, Sun, Layers, Star, AlertTriangle, Loader2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, setDoc, addDoc, serverTimestamp, getDoc } from '../../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useDarkMode } from "../../components/DarkModeProvider";
import { DarkModeToggle } from "../../components/DarkModeToggle";
import { formatCurrency, sortByDateDesc } from '../../lib/utils';
import { useTranslation } from "react-i18next";
import { useTheme } from "../../components/ThemeProvider";
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { RouteDisplay } from './RouteDisplay';
import { NotificationBell } from "../../components/NotificationBell";
import { useGoogleMapsStatus } from "../../hooks/useGoogleMapsStatus";
import { getGoogleMapsApiKey } from "../../lib/maps";

const API_KEY = getGoogleMapsApiKey();

export function DeliveryHome() {
  const [mapType, setMapType] = useState('roadmap');
  const { t } = useTranslation();
  const { primaryColor } = useTheme();
  const brandPrimary = primaryColor || '#0E7673';
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('driver_is_online');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [currentRequest, setCurrentRequest] = useState<any>(null);
  const rejectedOrderIds = useRef<Set<string>>(new Set());
  const userOnlineIntent = useRef<boolean | null>(null);
  const lastUserToggleTime = useRef<number>(0);
  const [processing, setProcessing] = useState(false);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [driverRating, setDriverRating] = useState<number | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [driverPos, setDriverPos] = useState({ lat: 48.8566, lng: 2.3522 }); // Fallback location
  
  const { isAvailable, apiKey } = useGoogleMapsStatus();
  
  useEffect(() => {
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (position) => {
           setDriverPos({ lat: position.coords.latitude, lng: position.coords.longitude });
         },
         (error) => console.warn('Initial delivery location unavailable:', error?.message || 'Permission denied'),
         { timeout: 5000, enableHighAccuracy: false }
       );
    }
  }, []);

  useEffect(() => {
     let unsub: () => void;
     if (user) {
        // Fallback or local onSnapshot using fake-firestore wrapper
        unsub = onSnapshot(doc(db, 'drivers', user.uid), async (snap) => {
           if (snap.exists()) {
              const data = snap.data();
              const remoteOnline = typeof data.isOnline === 'boolean' 
                ? data.isOnline 
                : (typeof data.is_online === 'boolean' ? data.is_online : null);
              
              if (remoteOnline !== null) {
                 // Avoid race condition if user manually toggled within the last 8 seconds
                 const recentlyToggled = Date.now() - lastUserToggleTime.current < 8000;
                 if (!recentlyToggled || userOnlineIntent.current === null || userOnlineIntent.current === remoteOnline) {
                   setIsOnline(remoteOnline);
                   try {
                     localStorage.setItem('driver_is_online', remoteOnline ? 'true' : 'false');
                     localStorage.setItem(`driver_is_online_${user.uid}`, remoteOnline ? 'true' : 'false');
                   } catch {}
                 }
              }
              
              // Self-healing: if drivers says pending, check users table
              if (data.status === 'pending_verification' || !data.status) {
                  try {
                      const uSnap = await getDoc(doc(db, 'users', user.uid));
                      if (uSnap.exists()) {
                         const uData = uSnap.data();
                         if (uData.status === 'approved' || uData.kyc_status === 'approved') {
                             data.status = 'approved';
                             data.kyc_status = 'approved';
                             // fix it in backend for next time
                             await updateDoc(doc(db, 'drivers', user.uid), { status: 'approved', kyc_status: 'approved' });
                         }
                      }
                  } catch(e) { console.error("Self-heal check failed", e); }
              }
              
              setDriverProfile((prev: any) => ({ ...prev, ...data }));
           }
        });
        
        // Phase 3: Explicit Supabase Realtime subscription for KYC updates 
        // to bypass any mock-firestore layer latency and ensure driver profile data is exact
        const kycSub = supabase.channel('driver-kyc-changes')
           .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'drivers',
              filter: `id=eq.${user.uid}`
           }, (payload) => {
              if (payload.new && payload.new.data) {
                 if (payload.new.data.kyc_status === 'approved' || payload.new.data.status === 'approved') {
                    setDriverProfile((prev: any) => ({ ...prev, status: 'approved', kyc_status: 'approved' }));
                 }
              }
           })
           .subscribe();

        return () => {
           if (unsub) unsub();
           supabase.removeChannel(kycSub);
        }
     }
  }, [user]);

  useEffect(() => {
    if (!isOnline || !user) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setDriverPos({ lat: latitude, lng: longitude });
        try {
          await updateDoc(doc(db, 'drivers', user.uid), {
             lat: latitude,
             lng: longitude,
             isOnline: true,
             is_online: true,
             updatedAt: serverTimestamp()
          });
        } catch(e) {}
      },
      (error) => {
        console.warn('Location watch status:', error?.message || 'Unavailable');
      },
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, user]);

  useEffect(() => {
    let unsubscribe: () => void;
    if (user && isOnline) {
      try {
        const q = query(collection(db, 'orders'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const allOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const readyOrders = sortByDateDesc(
            allOrders.filter((o: any) => {
              const status = (o.status || '').toLowerCase();
              const isReady = status === 'ready' || 
                              status === 'ready_for_pickup' || 
                              status === 'ready_for_delivery';
              const method = (o.deliveryMethod || o.delivery_method || o.delivery_mode || 'delivery').toLowerCase();
              const isDelivery = method !== 'pickup' && method !== 'retrait';
              const driverId = o.driverId || o.driver_id;
              const unassigned = !driverId || driverId === user.uid;
              const notRejected = !rejectedOrderIds.current.has(o.id);
              return isReady && isDelivery && unassigned && notRejected;
            })
          );

          setOrders(readyOrders);

          // PERSIST MISSION DISPLAY:
          // Keep the current request displayed if it's still available in readyOrders.
          // Never flicker or disappear unless accepted, rejected, or assigned to another driver.
          setCurrentRequest((prev: any) => {
            if (prev) {
              const stillValid = readyOrders.find(o => o.id === prev.id);
              if (stillValid) {
                return { ...prev, ...stillValid };
              }
              // If manually rejected by driver
              if (rejectedOrderIds.current.has(prev.id)) {
                return readyOrders.length > 0 ? readyOrders[0] : null;
              }
              // If driver accepted it (assigned to this driver)
              const assignedToMe = allOrders.find(o => o.id === prev.id && (o.driverId === user.uid || o.driver_id === user.uid));
              if (assignedToMe) {
                return null;
              }
              // If taken by another driver
              const assignedToOther = allOrders.find(o => o.id === prev.id && (o.driverId || o.driver_id) && o.driverId !== user.uid && o.driver_id !== user.uid);
              if (assignedToOther) {
                return readyOrders.length > 0 ? readyOrders[0] : null;
              }
              // Retain prev to prevent brief query flicker
              return prev;
            }
            return readyOrders.length > 0 ? readyOrders[0] : null;
          });
        }, (err) => {
          console.error("Orders onSnapshot error:", err);
        });
      } catch (error) {
        console.error("Orders query error:", error);
      }
    } else {
       setCurrentRequest(null);
       setOrders([]);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOnline, user]);

  useEffect(() => {
    const fetchEarnings = async () => {
       if (!user) return;
       try {
          const startOfDay = new Date();
          startOfDay.setHours(0,0,0,0);
          
          // Using JS filtering if timestamp query requires complex indices
          const q = query(collection(db, 'orders'), where('driverId', '==', user.uid), where('status', '==', 'delivered'));
          const snapshot = await getDocs(q);
          const earned = snapshot.docs.reduce((acc, doc) => {
             const data = doc.data();
             const dateStr = data.deliveredAt || data.createdAt;
             if (dateStr) {
                const date = new Date(dateStr);
                if (date >= startOfDay) {
                   return acc + ((data.deliveryFee || data.delivery_fee || (data.total ? data.total * 0.1 : 0)) || 0); 
                }
             }
             return acc;
          }, 0);
          setTodaysEarnings(earned);

          // Calculate real satisfaction rating
          const ratingDocs = snapshot.docs.map(d => d.data()).filter((d: any) => typeof d.driverRating === 'number' || typeof d.rating === 'number');
          if (ratingDocs.length > 0) {
             const sum = ratingDocs.reduce((acc: number, d: any) => acc + (d.driverRating ?? d.rating ?? 0), 0);
             setDriverRating(parseFloat((sum / ratingDocs.length).toFixed(1)));
          }
       } catch(e) { console.error(e); }
    };
    fetchEarnings();
  }, [user]);

  const toggleOnlineStatus = async (status: boolean) => {
     userOnlineIntent.current = status;
     lastUserToggleTime.current = Date.now();
     setIsOnline(status);
     try {
        localStorage.setItem('driver_is_online', status ? 'true' : 'false');
        if (user) localStorage.setItem(`driver_is_online_${user.uid}`, status ? 'true' : 'false');
     } catch {}
     if (!user) return;
     try {
        await setDoc(doc(db, 'drivers', user.uid), { 
           isOnline: status, 
           is_online: status, 
           updatedAt: serverTimestamp() 
        }, { merge: true });
     } catch (err) { console.error("Error updating online status", err); }
  };

  const handleAcceptOrder = async () => {
    if (!currentRequest || !user) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'orders', currentRequest.id), { 
         status: 'driver_assigned', 
         driverId: user.uid, 
         driverName: userData?.name || user.displayName || 'Driver',
         acceptedAt: new Date().toISOString() 
      });
      
      try {
         await addDoc(collection(db, 'notifications'), {
           userId: currentRequest.patientId,
           type: 'driver_assigned',
           title: 'Driver Assigned',
           message: `${userData?.name || user.displayName || 'A driver'} is heading to the pharmacy.`,
           isRead: false,
           relatedId: currentRequest.id,
           createdAt: serverTimestamp()
         });
      } catch (e) {
         console.warn("Could not notify patient", e);
      }
      
      toast.success("Livraison acceptée avec succès !");
      setProcessing(false);
      navigate(`/delivery/order/${currentRequest.id}`);
    } catch (error) {
      toast.error("Erreur lors de l'acceptation de la livraison.");
      handleFirestoreError(error, OperationType.UPDATE, `orders/${currentRequest.id}`);
      setProcessing(false);
    }
  };

  const handleRejectOrder = () => {
     if (!currentRequest) return;
     rejectedOrderIds.current.add(currentRequest.id);
     const nextOrders = orders.filter(o => o.id !== currentRequest.id);
     setOrders(nextOrders);
     if (nextOrders.length > 0) {
        setCurrentRequest(nextOrders[0]);
     } else {
        setCurrentRequest(null);
     }
  };

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col relative pb-16 h-full overflow-hidden">
      
      {/* Map Background */}
      <div className="absolute inset-0 z-0 bg-[#E7F1F1] dark:bg-[#062625] overflow-hidden">
         {isAvailable && apiKey ? (
            <APIProvider 
              apiKey={apiKey} 
              version="weekly"
              onError={() => {
                (window as any).__googleMapsAuthFailed = true;
                try { sessionStorage.setItem('gmp_auth_failed', 'true'); } catch {}
                window.dispatchEvent(new Event('google-maps-auth-failed'));
              }}
            >
               <Map
                 defaultCenter={driverPos}
                 center={driverPos}
                 defaultZoom={15}
                 mapId="DEMO_MAP_ID"
                 disableDefaultUI={true}
                 mapTypeId={mapType}
                 internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                 style={{ width: '100%', height: '100%' }}
               >
                  {isOnline && (
                    <AdvancedMarker position={driverPos}>
                      <div className="flex flex-col items-center justify-center">
                         <div className="w-16 h-16 bg-[#38B794]/25 rounded-full absolute animate-ping"></div>
                         <div className="w-8 h-8 bg-[#0E7673] rounded-full border-4 border-white shadow-lg z-10 flex items-center justify-center">
                            <Navigation size={12} className="text-white fill-current transform rotate-45" />
                         </div>
                      </div>
                    </AdvancedMarker>
                  )}
                  {isOnline && currentRequest && (
                     <RouteDisplay 
                         origin={driverPos} 
                         destination={currentRequest.pharmacyAddress || currentRequest.pharmacyName || 'Pharmacy'}
                     />
                  )}
               </Map>
            </APIProvider>
         ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] p-6 text-center">
               <Navigation className="w-10 h-10 text-[#0E7673] dark:text-[#38B794] mb-2 opacity-80 animate-pulse" />
               <p className="text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] uppercase tracking-wider mb-1">Géo-localisation livreur active</p>
               <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7] max-w-xs">{isOnline ? "En ligne — Prêt à recevoir des courses" : "Hors ligne — Basculez en ligne pour débuter"}</p>
            </div>
         )}
      </div>

      {/* Map Toggle FAB */}
      <div className="absolute top-32 right-6 z-10">
         <button 
           onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
           className="w-10 h-10 bg-white dark:bg-[#0A3D3B] rounded-full shadow-lg flex items-center justify-center border border-[#CFE4E3] dark:border-[#145250]"
         >
           <Layers size={20} className="text-[#0A3D3B] dark:text-[#D7F1EA]" />
         </button>
      </div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 pt-12 z-10 flex items-start justify-between">
         <div className="bg-white/95 dark:bg-[#0A3D3B]/95 backdrop-blur shadow-sm border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-2 flex items-center gap-3 pr-4 pointer-events-auto cursor-pointer" onClick={() => navigate('/delivery/profile')}>
            <div 
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 relative bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794]"
            >
               {(driverProfile?.photoURL || driverProfile?.photoUrl || user?.photoURL) ? (
                 <img src={driverProfile?.photoURL || driverProfile?.photoUrl || user?.photoURL} alt={driverProfile?.name || user?.displayName || 'Driver'} className="w-full h-full object-cover" />
               ) : (
                 (driverProfile?.name || user?.displayName) ? <span className="font-bold text-sm">{(driverProfile?.name || user?.displayName)[0].toUpperCase()}</span> : <User size={18} />
               )}
            </div>
            <div>
               <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="font-bold text-[#0A3D3B] dark:text-white text-sm leading-tight">{driverProfile?.name || userData?.name || user?.displayName || t('driver', 'Livreur')}</p>
                  {driverRating !== null ? (
                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      <Star size={10} className="fill-current text-[#FACC15]"/> {driverRating}
                    </span>
                  ) : (
                    <span className="bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-[#D7F1EA] text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {t('new_driver', 'Nouveau')}
                    </span>
                  )}
               </div>
               <div className="flex items-center gap-2">
                 <span 
                   className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white"
                   style={{ backgroundColor: brandPrimary }}
                 >
                   {driverProfile?.vehicleType === 'car' ? t('car', 'Voiture') : (driverProfile?.vehicleType === 'motorcycle' ? t('moto', 'Moto') : (driverProfile?.vehicleType === 'bicycle' ? t('bicycle', 'Vélo') : t('vehicle', 'Véhicule')))}
                 </span>
                 <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7] font-bold tracking-wider uppercase font-mono"> 
                   {driverProfile?.vehiclePlate || t('no_plate', 'NON RENSEIGNÉ')} 
                 </p>
               </div>
            </div>
         </div>
         
         <div className="flex flex-row items-center gap-2 pointer-events-auto">
            <div className="hidden sm:flex bg-white/95 dark:bg-[#0A3D3B]/95 backdrop-blur border border-[#CFE4E3] dark:border-[#145250] rounded-2xl shadow-sm px-3 py-1 flex-col items-center justify-center text-[#0A3D3B] dark:text-white relative font-bold text-sm">
               <span className="text-[9px] text-[#5C807F] dark:text-[#9FC8C7] font-medium tracking-wide uppercase">Aujourd'hui</span>
               <span className="text-xs">{formatCurrency(todaysEarnings)}</span>
            </div>
            
            <DarkModeToggle className="w-10 h-10 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] shadow-sm" />
            
            <button 
              onClick={() => navigate('/delivery/messages')}
              className="w-10 h-10 bg-white dark:bg-[#0A3D3B] rounded-full flex items-center justify-center border border-[#CFE4E3] dark:border-[#145250] shadow-sm text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47] transition-colors"
              title="Messages"
              aria-label="Messages"
            >
              <MessageSquare size={18} />
            </button>

            <NotificationBell />
         </div>
      </div>

      {/* KYC Warning Banner */}
      {(driverProfile?.status === 'pending_verification' && driverProfile?.kyc_status !== 'approved') && (
         <div className="absolute top-32 left-6 right-20 z-10 bg-orange-500 text-white p-3 rounded-2xl shadow-lg flex items-start gap-3 pointer-events-auto animate-in slide-in-from-top-4">
             <AlertTriangle size={20} className="shrink-0 mt-0.5" />
             <div className="text-xs">
                <span className="font-bold block text-sm mb-0.5">Action Required</span>
                Your KYC profile is pending verification. Going online is restricted.
             </div>
         </div>
      )}

      {/* Status Overlay */}
      {isOnline && !currentRequest && (
         <div className="absolute top-36 left-1/2 -translate-x-1/2 bg-[#0A3D3B]/90 backdrop-blur border border-[#145250] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg animate-fade-in whitespace-nowrap">
             {t('searching_for_orders', 'Searching for orders...')} </div>
      )}

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto px-6 pb-20 pt-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#062625] dark:via-[#062625]/95">
         {!isOnline ? (
            <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xl border border-[#CFE4E3] dark:border-[#145250] transform transition-all duration-300 translate-y-0">
               <h2 className="font-bold text-[#0A3D3B] dark:text-white text-xl text-center mb-2"> {t('you_re_offline', 'You\'re Offline')} </h2>
               <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm text-center mb-6"> {t('go_online_to_start_receiving_d', 'Go online to start receiving delivery requests')} </p>
               <button 
                  onClick={() => toggleOnlineStatus(true)}
                  disabled={driverProfile?.status === 'pending_verification' && driverProfile?.kyc_status !== 'approved'}
                  className="w-full bg-[#0E7673] hover:bg-[#0A5A58] disabled:bg-[#CFE4E3] disabled:text-[#5C807F] disabled:cursor-not-allowed shadow-lg text-white font-bold py-4 rounded-full transition flex justify-center items-center gap-2 text-lg uppercase tracking-wide"
               >
                  <Power size={22} className="mr-1" />  {t('go_online', 'Go Online')} </button>
            </div>
         ) : !currentRequest ? (
            <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 shadow-xl border border-[#CFE4E3] dark:border-[#145250] transform transition-all duration-300 translate-y-0 flex flex-col items-center text-center">
               <div className="w-16 h-1 bg-[#CFE4E3] dark:bg-[#145250] rounded-full mb-6"></div>
               <h2 className="font-bold text-[#0E7673] dark:text-[#38B794] text-xl mb-1"> {t('you_re_online', 'You\'re Online')} </h2>
               <p className="text-[#5C807F] dark:text-[#9FC8C7] text-sm mb-6"> {t('waiting_for_the_next_delivery_', 'Waiting for the next delivery request...')} </p>
               
               <button 
                  onClick={() => toggleOnlineStatus(false)}
                  className="w-full bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-[#D7F1EA] border border-[#CFE4E3] dark:border-[#145250] font-bold py-4 rounded-full hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] transition text-sm uppercase tracking-wide"
               >
                   {t('go_offline', 'Go Offline')} </button>
            </div>
         ) : (
            <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl overflow-hidden shadow-2xl border border-[#CFE4E3] dark:border-[#145250] transform transition-all duration-300 translate-y-0 relative animate-slide-up">
               {/* Progress bar timer */}
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E7F1F1] dark:bg-[#062625]">
                  <div className="h-full bg-[#0E7673] dark:bg-[#38B794] animate-shrink-x" style={{ animationDuration: '30s', transformOrigin: 'left' }}></div>
               </div>
               
               <div className="p-6">
                  <div className="flex justify-between items-start mb-6 pt-2">
                     <div>
                        <span className="bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#D7F1EA] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block"> {t('new_delivery', 'New Delivery')} </span>
                        <h2 className="font-bold text-[#0A3D3B] dark:text-white text-3xl tracking-tight">{formatCurrency(currentRequest.total)} <span className="text-sm text-[#5C807F] dark:text-[#9FC8C7] font-medium tracking-normal"> {t('tips', '+ tips')} </span></h2>
                     </div>
                     <div className="flex bg-[#E7F1F1] dark:bg-[#062625] rounded-xl p-2 items-center gap-2 border border-[#CFE4E3] dark:border-[#145250]">
                        <Clock size={16} className="text-[#0E7673] dark:text-[#38B794]" />
                        <div className="font-bold text-[#0A3D3B] dark:text-white text-sm"> {t('calculating', 'Calculating...')} </div>
                     </div>
                  </div>

                  <div className="relative pl-6 space-y-5 mb-8">
                     <div className="absolute left-[9px] top-[4px] bottom-[4px] w-0.5 bg-[#CFE4E3] dark:bg-[#145250]"></div>
                     <div className="relative">
                        <div className="w-5 h-5 bg-[#0E7673] rounded-full absolute -left-6 top-0 border-4 border-white flex items-center justify-center shadow-sm">
                           <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                        <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium">Pickup</p>
                        <p className="font-bold text-[#0A3D3B] dark:text-white mt-0.5">{currentRequest.pharmacyName || t('pharmacy', 'Pharmacy')} </p>
                     </div>
                     <div className="relative">
                        <div className="w-5 h-5 bg-[#38B794] rounded-full absolute -left-6 top-0 border-4 border-white flex items-center justify-center shadow-sm">
                           <div className="w-1 h-1 bg-[#0A3D3B] rounded-full"></div>
                        </div>
                        <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium">Drop-off</p>
                        <p className="font-bold text-[#0A3D3B] dark:text-white mt-0.5">{currentRequest.deliveryAddress || 'Customer Address'}</p>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button 
                        disabled={processing}
                        onClick={handleRejectOrder}
                        className="w-14 h-14 shrink-0 bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-white border border-[#CFE4E3] dark:border-[#145250] font-bold rounded-full hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] transition flex justify-center items-center"
                        aria-label="Reject Request"
                     >
                        <X size={24} />
                     </button>
                     <button 
                        disabled={processing}
                        onClick={handleAcceptOrder}
                        className="flex-1 bg-[#0E7673] hover:bg-[#0A5A58] disabled:bg-[#CFE4E3] disabled:text-[#5C807F] shadow-lg text-white font-bold py-4 rounded-full transition flex justify-center items-center gap-2 text-lg"
                     >
                        {processing ? (
                          <>
                            <Loader2 size={24} className="animate-spin" />
                            <span>Acceptation...</span>
                          </>
                        ) : (
                          'Accept'
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
      
      

    </div>
  );
}
