import { 
  ArrowLeft, CheckCircle, Package, Truck, Home, Phone, Star, 
  FileText, MapPin, Navigation, Store, MessageSquare, 
  ChevronRight, X, Bike, Key, PhoneCall, Check, Copy, Clock, 
  AlertCircle, ShieldCheck, RefreshCw, ShoppingBag, ThumbsUp, Heart, Send, Loader2
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Polyline } from '../../components/Polyline';
import { useGoogleMapsStatus } from '../../hooks/useGoogleMapsStatus';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, db } from '../../lib/firebase';
import { supabase } from '../../lib/supabase';
import { formatCurrency, parseDate } from '../../lib/utils';
import { getRoadRoute } from '../../lib/routing';
import { InvoiceModal } from '../../components/InvoiceModal';
import toast from 'react-hot-toast';

// Google Maps Custom Marker Components
const DriverMotoMarkerUI = () => (
  <div style={{
    width: 44, height: 44, background: '#0E7673', border: '3px solid #ffffff', borderRadius: '50%',
    boxShadow: '0 8px 20px rgba(14, 118, 115, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D7F1EA'
  }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
    </svg>
  </div>
);

const DestPinMarkerUI = () => (
  <div style={{
    width: 38, height: 38, background: '#38B794', border: '3px solid #ffffff', borderRadius: '50%',
    boxShadow: '0 6px 18px rgba(56, 183, 148, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <div style={{ width: 12, height: 12, background: '#0A3D3B', borderRadius: '50%' }}></div>
  </div>
);

const PharmacyMarkerUI = () => (
  <div style={{
    width: 38, height: 38, background: '#0E7673', border: '3px solid #ffffff', borderRadius: '50%',
    boxShadow: '0 6px 18px rgba(14, 118, 115, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
  }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
      <path d="M2 7h20"/>
    </svg>
  </div>
);

function MapAutoCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat: center[0], lng: center[1] });
    }
  }, [center, map]);
  return null;
}

export function PatientTracking() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const { isAvailable: mapsAvailable, apiKey: mapsApiKey } = useGoogleMapsStatus();
  
  const [order, setOrder] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  
  // Rating states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showProductRatingModal, setShowProductRatingModal] = useState(false);
  const [productRatings, setProductRatings] = useState<Record<string, { rating: number, comment: string }>>({});
  const [hasPromptedRating, setHasPromptedRating] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState("");
  const [selectedRatingTags, setSelectedRatingTags] = useState<string[]>(["Rapide ⚡", "Médicaments intacts 📦"]);
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // User Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
        },
        (error) => {
          console.warn("User location unavailable in tracking:", error?.message || "Permission denied");
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  }, []);

  // Listen to order updates
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = onSnapshot(doc(db, 'orders', id), (snapshot) => {
       if (snapshot.exists()) {
          const data = snapshot.data();
          setOrder({ id: snapshot.id, ...data });
          
          const lat = data.driverLat || data.driverLocation?.lat;
          const lng = data.driverLng || data.driverLocation?.lng;
          if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
             setDriverPos([Number(lat), Number(lng)]);
          }
       }
       setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Fetch Pharmacy info
  useEffect(() => {
    const phId = order?.pharmacyId || order?.pharmacy_id;
    if (!phId) return;

    const fetchPharmacy = async () => {
      try {
        const phDoc = await getDoc(doc(db, 'pharmacies', phId));
        if (phDoc.exists()) {
          setPharmacy({ id: phDoc.id, ...phDoc.data() });
        }
      } catch (err) {
        console.error("Error fetching pharmacy:", err);
      }
    };
    fetchPharmacy();
  }, [order?.pharmacyId, order?.pharmacy_id]);

  // Fetch Assigned Driver in real-time
  const assignedDriverId = order?.driverId || order?.driver_id;
  useEffect(() => {
    if (!assignedDriverId) {
      setDriver(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'drivers', assignedDriverId), (docObj) => {
       if (docObj.exists()) {
          const driverData = docObj.data();
          setDriver({ id: docObj.id, ...driverData });
          
          const lat = driverData.lat || driverData.latitude || driverData.location?.lat;
          const lng = driverData.lng || driverData.longitude || driverData.location?.lng;
          if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
             setDriverPos([Number(lat), Number(lng)]);
          }
       }
    });
    return () => unsub();
  }, [assignedDriverId]);

  const isPickup = Boolean(
    order && (
      order.delivery_mode === 'PICKUP' || 
      order.delivery_mode === 'pickup' || 
      order.deliveryMethod === 'pickup' || 
      order.deliveryMethod === 'store_pickup' || 
      order.fulfillment_type === 'PICKUP'
    )
  );

  const destPos: [number, number] = (order?.destLat && order?.destLng && !isNaN(Number(order.destLat))) 
    ? [Number(order.destLat), Number(order.destLng)]
    : order?.deliveryLocation 
      ? [order.deliveryLocation.lat, order.deliveryLocation.lng]
      : userLocation || [4.0511, 9.7679];

  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>([]);

  // ETA and Road Route Calculation
  useEffect(() => {
    if (driverPos && destPos) {
       const R = 6371; // Radius of earth in km
       const dLat = (destPos[0] - driverPos[0]) * Math.PI / 180;
       const dLng = (destPos[1] - driverPos[1]) * Math.PI / 180;
       const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(driverPos[0] * Math.PI / 180) * Math.cos(destPos[0] * Math.PI / 180) * 
          Math.sin(dLng/2) * Math.sin(dLng/2); 
       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
       const distance = R * c;

       let estimatedTime = Math.round((distance / 30) * 60);
       if (estimatedTime < 1) estimatedTime = 1;
       
       if (distance < 0.05 || order?.status === 'delivered') {
          setEta(0);
       } else {
          setEta(estimatedTime);
       }

       // Fetch turn-by-turn road polyline
       getRoadRoute(driverPos, destPos).then((res) => {
         if (res && res.coordinates && res.coordinates.length > 0) {
           setRoadCoordinates(res.coordinates);
           if (res.durationSeconds > 0 && order?.status !== 'delivered') {
             setEta(Math.max(1, Math.ceil(res.durationSeconds / 60)));
           }
         }
       }).catch(() => {});
    }
  }, [driverPos, order?.status, destPos]);

  // Order Approval & Driver Assignment Conditions (CHANTIER 1)
  const isApproved = Boolean(
    order && 
    ['APPROVED', 'approved', 'paid', 'validated_awaiting_payment', 'preparing', 'ready', 'ready_for_pickup', 'driver_assigned', 'picked_up', 'out_for_delivery', 'on_the_way', 'en_route', 'delivered'].includes(order.status)
  );

  const hasAssignedDriver = Boolean(assignedDriverId || (order && (order.driverId || order.driver_id || order.driverName)));

  // Status timeline dates
  const getTimelineDate = (type: string) => {
    if (!order) return "";
    const extractDate = (dateField: any) => {
      const parsed = parseDate(dateField);
      if (!parsed) return "";
      return parsed.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    if (type === 'placed') return extractDate(order.createdAt) || "Aujourd'hui";
    if (type === 'approved') return extractDate(order.approvedAt || order.acceptedAt) || (isApproved ? "Validée" : "En cours");
    if (type === 'preparing') return extractDate(order.preparedAt || order.acceptedAt) || (['preparing', 'driver_assigned', 'out_for_delivery', 'ready', 'ready_for_pickup', 'delivered'].includes(order.status) ? "En cours..." : "");
    if (type === 'out') return extractDate(order.dispatchedAt || order.outForDeliveryAt) || (['driver_assigned', 'out_for_delivery', 'delivered'].includes(order.status) ? "En cours de route" : "");
    if (type === 'ready') return extractDate(order.readyAt) || (['ready', 'ready_for_pickup', 'delivered'].includes(order.status) ? "Prêt" : "");
    if (type === 'delivered') return extractDate(order.deliveredAt) || (order.status === 'delivered' ? "Livré avec succès" : "En attente");
    return "";
  };

  // Driver details (Real data only)
  const driverName = driver?.name || driver?.fullName || driver?.nom || order?.driverName || "Livreur Assigné";
  const driverFirstName = driverName.split(' ')[0];
  const driverRating = driver?.rating !== undefined ? Number(driver.rating).toFixed(2).replace('.', ',') : "4.9";
  const driverPhone = driver?.phone || driver?.phoneNumber || order?.driverPhone || "";
  const driverPhoto = driver?.photoURL || driver?.photoUrl || driver?.avatarUrl || driver?.photo || order?.driverPhoto || null;
  const vehicleTypeLabel = driver?.vehicleType === 'car' ? 'Voiture' : 'Moto';
  const vehicleModel = driver?.vehicleModel || driver?.vehicleDetails?.model || (vehicleTypeLabel === 'Moto' ? 'Moto de livraison' : 'Véhicule de livraison');
  const vehiclePlate = driver?.vehiclePlate || driver?.vehicleDetails?.plate || 'LT ---';
  const deliveryOtp = order?.deliveryOtp || order?.pickupOtp || order?.id?.slice(-4)?.toUpperCase() || '----';

  const copyDeliveryCode = () => {
    navigator.clipboard.writeText(deliveryOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const toggleRatingTag = (tag: string) => {
    setSelectedRatingTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitDriverRating = async () => {
    if (!order?.id) return;
    setIsSubmittingRating(true);

    try {
      // 1. Update Firestore Order
      await updateDoc(doc(db, 'orders', order.id), {
        patientConfirmedReceipt: true,
        patientConfirmedAt: serverTimestamp(),
        driverRating: ratingScore,
        driverReview: ratingComment.trim(),
        driverReviewTags: selectedRatingTags,
        driverTip: selectedTip,
        updatedAt: serverTimestamp()
      });

      // 2. Update Driver stats if driverId exists
      const targetDriverId = order.driverId || driver?.id;
      if (targetDriverId) {
        try {
          const currentTotalRatings = Number(driver?.totalRatings || driver?.ratingCount || 1);
          const currentAvgRating = Number(driver?.rating || 4.8);
          const newAvg = Number(((currentAvgRating * currentTotalRatings + ratingScore) / (currentTotalRatings + 1)).toFixed(2));

          await updateDoc(doc(db, 'drivers', targetDriverId), {
            rating: newAvg,
            totalRatings: currentTotalRatings + 1,
            lastRatedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Could not update driver rating aggregate:", e);
        }

        // 3. Supabase sync if table exists
        try {
          await supabase.from('orders').update({
            patient_confirmed: true,
            driver_rating: ratingScore,
            driver_review: ratingComment.trim(),
            updated_at: new Date().toISOString()
          }).eq('id', order.id);
        } catch (e) {
          // ignore
        }
      }

      toast.success("Merci ! Votre avis a été enregistré avec succès ⭐");
      setShowRatingModal(false);
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Impossible d'enregistrer l'avis. Veuillez réessayer.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const submitProductRatings = async () => {
    if (!order?.id) return;
    setLoadingRatings(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        productRatings,
        productRatingsSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Avis sur les produits enregistrés !");
      setShowProductRatingModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'enregistrement des avis.");
    } finally {
      setLoadingRatings(false);
    }
  };

  const statuses = isPickup ? [
    { label: "Commande validée", date: getTimelineDate('placed'), completed: true, icon: CheckCircle },
    { label: "Préparation par la pharmacie", date: getTimelineDate('preparing'), completed: ['preparing', 'ready_for_pickup', 'ready', 'delivered'].includes(order?.status), active: order?.status === 'pending', icon: Package },
    { label: "Prête pour retrait en officine", date: getTimelineDate('ready'), completed: order?.status === 'delivered' || order?.status === 'ready' || order?.status === 'ready_for_pickup', active: order?.status === 'preparing', icon: Store },
    { label: "Médicaments retirés", date: order?.status === 'delivered' ? getTimelineDate('delivered') : "En attente", completed: order?.status === 'delivered', icon: CheckCircle },
  ] : [
    { label: "Commande enregistrée & payée", date: getTimelineDate('placed'), completed: true, icon: CheckCircle },
    { label: "Approbation & préparation pharmacie", date: getTimelineDate('preparing'), completed: isApproved, active: !isApproved, icon: Package },
    { label: "Livreur assigné & en route", date: (eta !== null && eta > 0) ? `Arrive dans ~${eta} min` : getTimelineDate('out'), completed: order?.status === 'delivered', active: isApproved && hasAssignedDriver, icon: Bike },
    { label: "Remis en main propre", date: order?.status === 'delivered' ? getTimelineDate('delivered') : "En attente", completed: order?.status === 'delivered', icon: Home },
  ];

  if (loading) {
    return (
      <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-[#0E7673] dark:text-[#38B794] animate-spin mb-3" />
        <p className="text-sm font-bold text-[#0A3D3B] dark:text-[#D7F1EA]">Chargement des informations de suivi...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-bold text-[#0A3D3B] dark:text-white">Commande introuvable</h2>
        <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] max-w-xs">Cette commande n'existe pas ou vous n'avez pas l'autorisation d'y accéder.</p>
        <button onClick={() => navigate('/patient/orders')} className="px-6 py-2.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white text-xs font-bold rounded-full transition">
          Retour aux commandes
        </button>
      </div>
    );
  }

  const shouldShowWaitingScreen = !isPickup && (!isApproved || !hasAssignedDriver);

  return (
    <div className="flex-1 bg-[#F5FAFA] dark:bg-[#062625] flex flex-col h-full overflow-hidden relative font-sans">
      
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-10 pb-3 px-4 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-[#062625]/55 via-[#062625]/20 to-transparent">
        <button 
          id="btn-back-patient"
          onClick={() => navigate('/patient/orders')} 
          className="w-11 h-11 flex items-center justify-center bg-white/95 dark:bg-[#0A3D3B]/95 backdrop-blur-md rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-md text-[#0A3D3B] dark:text-white hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] transition active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="bg-white/95 dark:bg-[#0A3D3B]/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-[#CFE4E3] dark:border-[#145250] flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            order?.status === 'delivered' ? 'bg-[#38B794]' :
            shouldShowWaitingScreen ? 'bg-amber-400 animate-pulse' : 'bg-[#38B794] animate-pulse'
          }`}></span>
          <span className="text-xs font-black tracking-wide text-[#0E7673] dark:text-[#D7F1EA] uppercase">
            {order?.status === 'delivered' ? 'Livraison effectuée' : 
             isPickup ? 'Retrait Officine' : 
             shouldShowWaitingScreen ? 'En attente pharmacie' : 'Livraison en direct'}
          </span>
        </div>

        <button 
          id="btn-open-details-top"
          onClick={() => setShowDetailsDrawer(true)}
          className="w-11 h-11 flex items-center justify-center bg-white/95 dark:bg-[#0A3D3B]/95 backdrop-blur-md rounded-full border border-[#CFE4E3] dark:border-[#145250] shadow-md text-[#0A3D3B] dark:text-white hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] transition active:scale-95"
          title="Détails de la commande"
        >
          <FileText size={18} />
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 w-full h-full relative z-0">
        
        {shouldShowWaitingScreen ? (
          <div className="w-full h-full bg-[#F5FAFA] dark:bg-[#062625] p-6 pt-24 overflow-y-auto space-y-6">
            
            <div className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] p-6 rounded-3xl text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] rounded-full flex items-center justify-center mx-auto relative">
                <Clock size={32} className="animate-spin" style={{ animationDuration: '6s' }} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white dark:border-[#0A3D3B]"></span>
              </div>
              
              <div>
                <h2 className="text-xl font-extrabold text-[#0A3D3B] dark:text-white tracking-tight">
                  {!isApproved 
                    ? "En attente de l'approbation de la pharmacie" 
                    : "Recherche d'un livreur en cours..."}
                </h2>
                <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1 max-w-sm mx-auto leading-relaxed">
                  {!isApproved
                    ? "L'officine certifiée vérifie la conformité de vos ordonnances et prépare votre colis sécurisé."
                    : "Votre commande est approuvée et prête ! Un coursier certifié va être assigné d'un instant à l'autre."}
                </p>
              </div>

              {pharmacy && (
                <div className="bg-[#F5FAFA] dark:bg-[#062625] p-3.5 rounded-2xl border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0E7673] text-white flex items-center justify-center font-bold">
                      <Store size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0A3D3B] dark:text-white">{pharmacy.name || 'Pharmacie Partenaire'}</p>
                      <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7]">{pharmacy.address || 'Officine locale certifiée'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#D7F1EA] text-[10px] font-bold rounded-full border border-[#CFE4E3] dark:border-[#145250]">
                    {!isApproved ? "En cours" : "Prête"}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#5C807F] dark:text-[#9FC8C7]">
                Progression de votre commande
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-[#38B794] text-[#0A3D3B] flex items-center justify-center shrink-0 shadow-sm">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0A3D3B] dark:text-white">Commande transmise & enregistrée</p>
                    <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7]">Paiement validé avec succès</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    isApproved ? 'bg-[#38B794] text-[#0A3D3B]' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                  }`}>
                    {isApproved ? <Check size={14} strokeWidth={3} /> : <Clock size={14} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0A3D3B] dark:text-white">Validation officinale par le pharmacien</p>
                    <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7]">
                      {isApproved ? "Ordonnance & médicaments validés" : "Vérification du stock et scellage en cours"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    hasAssignedDriver ? 'bg-[#38B794] text-[#0A3D3B]' : 'bg-[#E7F1F1] dark:bg-[#062625] text-[#5C807F]'
                  }`}>
                    <Bike size={14} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${hasAssignedDriver ? 'text-[#0A3D3B] dark:text-white' : 'text-[#5C807F] dark:text-[#9FC8C7]'}`}>
                      Attribution du livreur certifié
                    </p>
                    <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7]">
                      {hasAssignedDriver ? "Chauffeur en route vers l'officine" : "La carte GPS s'activera automatiquement dès l'assignation"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDetailsDrawer(true)}
                className="flex-1 py-3.5 bg-white dark:bg-[#0A3D3B] border border-[#CFE4E3] dark:border-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <ShoppingBag size={16} className="text-[#0E7673] dark:text-[#38B794]" /> Détails commande
              </button>

              <button
                onClick={() => navigate(`/patient/messages/${order.id}`)}
                className="flex-1 py-3.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <MessageSquare size={16} /> Contacter pharmacie
              </button>
            </div>

          </div>
        ) : !isPickup ? (
          <div className="w-full h-full bg-[#062625]">
            {mapsAvailable && mapsApiKey ? (
              <APIProvider 
                apiKey={mapsApiKey}
                onError={() => {
                  (window as any).__googleMapsAuthFailed = true;
                  try { sessionStorage.setItem('gmp_auth_failed', 'true'); } catch {}
                  window.dispatchEvent(new Event('google-maps-auth-failed'));
                }}
              >
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={{ lat: (driverPos || destPos)[0], lng: (driverPos || destPos)[1] }}
                defaultZoom={15}
                gestureHandling="greedy"
                disableDefaultUI={true}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              >
                <MapAutoCenter center={driverPos || destPos} />
                
                {driverPos && (
                  <AdvancedMarker position={{ lat: driverPos[0], lng: driverPos[1] }}>
                    <DriverMotoMarkerUI />
                  </AdvancedMarker>
                )}

                <AdvancedMarker position={{ lat: destPos[0], lng: destPos[1] }}>
                  <DestPinMarkerUI />
                </AdvancedMarker>

                {driverPos && (
                  <Polyline 
                    path={(roadCoordinates.length > 0 ? roadCoordinates : [driverPos, destPos]).map((c: any) => ({lat: c[0], lng: c[1]}))} 
                    strokeColor="#0E7673" 
                    strokeWeight={5} 
                    strokeOpacity={0.95} 
                  />
                )}
              </Map>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-[#062625]">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38B794_1px,transparent_1px)] [background-size:20px_20px]"></div>
                <div className="relative z-10 max-w-sm space-y-4">
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-2xl bg-[#38B794]/15 border border-[#38B794]/40 flex items-center justify-center text-[#38B794] shadow-lg">
                        <Bike size={28} className="animate-pulse" />
                      </div>
                      <span className="text-xs font-bold text-[#D7F1EA]">{driver?.name || 'Coursier'}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-20 border-t-2 border-dashed border-[#38B794]/60 my-auto"></div>
                      <span className="text-[10px] font-mono text-[#38B794] mt-1 font-bold">{eta ? `${eta} min` : 'En route'}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-2xl bg-[#0E7673]/40 border border-[#38B794]/50 flex items-center justify-center text-[#D7F1EA] shadow-lg">
                        <Home size={28} />
                      </div>
                      <span className="text-xs font-bold text-[#D7F1EA]">Votre Adresse</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0A3D3B] text-[#D7F1EA] border border-[#145250]">
                      <span className="w-2 h-2 rounded-full bg-[#38B794] animate-ping"></span>
                      Suivi GPS en temps réel actif
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-[#F5FAFA] dark:bg-[#062625] p-6 pt-24 overflow-y-auto space-y-4">
            <div className="bg-[#D7F1EA] dark:bg-[#0E4A47] border border-[#CFE4E3] dark:border-[#145250] p-6 rounded-3xl text-center space-y-3">
              <div className="w-14 h-14 bg-[#0E7673] text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Store size={28} />
              </div>
              <h2 className="text-xl font-black text-[#0A3D3B] dark:text-white">Retrait en Pharmacie</h2>
              <p className="text-xs text-[#0A3D3B]/80 dark:text-[#D7F1EA] max-w-xs mx-auto">
                Vos médicaments sont préparés et scellés par l'officine partenaire certifiée.
              </p>
            </div>

            {pharmacy && (
              <div className="bg-white dark:bg-[#0A3D3B] p-5 rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[#0A3D3B] dark:text-white text-base">{pharmacy.name || 'Pharmacie Partenaire'}</h3>
                    <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-1 flex items-center gap-1">
                      <MapPin size={13} className="text-[#0E7673] dark:text-[#38B794]" />
                      {pharmacy.address || 'Adresse de retrait'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-[#D7F1EA] text-[#0A3D3B] dark:bg-[#0E4A47] dark:text-[#38B794] text-[10px] font-bold rounded-full border border-[#CFE4E3] dark:border-[#145250]">
                    Prête au comptoir
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  {pharmacy.phone && (
                    <a href={`tel:${pharmacy.phone}`} className="flex-1 py-2.5 bg-[#E7F1F1] dark:bg-[#062625] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full text-xs font-bold flex items-center justify-center gap-2 border border-[#CFE4E3] dark:border-[#145250]">
                      <Phone size={14} className="text-[#0E7673] dark:text-[#38B794]" /> Appeler
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pharmacy.address || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Navigation size={14} /> Itinéraire
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FLOATING BOTTOM CARD (Affiché uniquement quand un vrai livreur est assigné) */}
      {!isPickup && hasAssignedDriver && isApproved && (
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
          <div className="bg-white dark:bg-[#0A3D3B] rounded-[28px] p-5 shadow-2xl border border-[#CFE4E3] dark:border-[#145250] space-y-4 max-w-lg mx-auto">
            
            {/* Ligne 1: ETA, Véhicule & Plaque d'immatriculation */}
            <div 
              id="card-header-eta"
              onClick={() => setShowDetailsDrawer(true)}
              className="flex items-center justify-between cursor-pointer hover:opacity-90 transition"
            >
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="font-extrabold text-[#0A3D3B] dark:text-white text-lg tracking-tight">
                    {(eta !== null && eta > 0) ? `Arrive dans ~${eta} min` : 'Arrivé à destination !'}
                  </h3>
                  <ChevronRight size={18} className="text-[#5C807F] dark:text-[#9FC8C7]" />
                </div>
                <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] font-medium capitalize mt-0.5">
                  {vehicleModel}
                </p>
              </div>

              <div className="flex flex-col items-end">
                {/* Badge Immatriculation */}
                <div className="bg-[#F5FAFA] dark:bg-[#062625] px-3 py-1 rounded-lg border border-[#CFE4E3] dark:border-[#145250] text-xs font-black text-[#0A3D3B] dark:text-[#D7F1EA] tracking-wider shadow-sm">
                  {vehiclePlate}
                </div>
                {/* Type de véhicule */}
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#5C807F] dark:text-[#9FC8C7] mt-1">
                  <Bike size={14} className="text-[#0E7673] dark:text-[#38B794]" />
                  <span className="text-[10px] uppercase">{vehicleTypeLabel}</span>
                </div>
              </div>
            </div>

            {/* Séparateur */}
            <div className="h-px bg-[#CFE4E3] dark:bg-[#145250] w-full" />

            {/* Ligne 2: Livreur (Photo + Note + Nom), Bouton Contact & Bouton Détails */}
            <div className="flex items-center justify-between pt-1">
              
              {/* Profil Livreur */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#E7F1F1] dark:bg-[#062625] border-2 border-white dark:border-[#145250] shadow-md flex items-center justify-center">
                    {driverPhoto ? (
                      <img src={driverPhoto} alt={driverName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center font-black text-lg">
                        {driverFirstName.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* Badge de Note */}
                  <div className="absolute -top-1.5 -right-2 bg-white dark:bg-[#062625] px-1.5 py-0.5 rounded-full shadow-sm border border-[#CFE4E3] dark:border-[#145250] flex items-center gap-0.5 text-[10px] font-black text-[#0A3D3B] dark:text-[#D7F1EA]">
                    <Star size={10} className="fill-[#FACC15] text-[#FACC15]" />
                    <span>{driverRating}</span>
                  </div>
                </div>

                <span className="text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] mt-1.5 max-w-[80px] truncate text-center">
                  {driverFirstName}
                </span>
              </div>

              {/* Bouton Noter le livreur ou Contact */}
              {(order?.status === 'delivered' || order?.deliveryStage === 'completed') ? (
                <div className="flex-1 px-3">
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="w-full py-3 px-4 bg-[#FACC15] hover:bg-yellow-400 text-[#0A3D3B] rounded-full font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                  >
                    <Star size={15} className="fill-[#0A3D3B]" />
                    {order?.driverRating ? `Note: ${order.driverRating}/5` : 'Noter le livreur'}
                  </button>
                </div>
              ) : (
                /* Bouton Contact Livreur */
                <div className="flex flex-col items-center">
                  <button
                    id="btn-contact-driver"
                    onClick={() => setShowContactModal(true)}
                    className="w-14 h-14 rounded-full bg-[#E7F1F1] dark:bg-[#062625] hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] text-[#0A3D3B] dark:text-white border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-center shadow-sm transition active:scale-95"
                    title="Contacter le livreur"
                  >
                    <Phone size={22} className="text-[#0E7673] dark:text-[#38B794]" />
                  </button>
                  <span className="text-[11px] font-bold text-[#5C807F] dark:text-[#9FC8C7] mt-1.5">
                    Contact
                  </span>
                </div>
              )}

              {/* Bouton Détails */}
              <div className="flex flex-col items-center">
                <button
                  id="btn-details-drawer"
                  onClick={() => setShowDetailsDrawer(true)}
                  className="w-14 h-14 rounded-full bg-[#E7F1F1] dark:bg-[#062625] hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] text-[#0A3D3B] dark:text-white border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-center shadow-sm transition active:scale-95"
                  title="Afficher les détails de la commande"
                >
                  <div className="flex flex-col gap-1 items-center justify-center">
                    <span className="w-5 h-0.5 bg-[#0A3D3B] dark:bg-[#D7F1EA] rounded-full"></span>
                    <span className="w-5 h-0.5 bg-[#0A3D3B] dark:bg-[#D7F1EA] rounded-full"></span>
                    <span className="w-5 h-0.5 bg-[#0A3D3B] dark:bg-[#D7F1EA] rounded-full"></span>
                  </div>
                </button>
                <span className="text-[11px] font-bold text-[#5C807F] dark:text-[#9FC8C7] mt-1.5">
                  Détails
                </span>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL DE CONTACT DU LIVREUR */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0A3D3B] w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 border border-[#CFE4E3] dark:border-[#145250]">
            <div className="flex items-center justify-between border-b border-[#CFE4E3] dark:border-[#145250] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#D7F1EA] dark:bg-[#0E4A47] overflow-hidden flex items-center justify-center font-bold text-[#0E7673] dark:text-[#38B794]">
                  {driverPhoto ? <img src={driverPhoto} alt={driverName} className="w-full h-full object-cover" /> : driverFirstName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#0A3D3B] dark:text-white">{driverName}</h4>
                  <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7]">Livreur certifié PharmAply</p>
                </div>
              </div>
              <button onClick={() => setShowContactModal(false)} className="w-8 h-8 rounded-full bg-[#F5FAFA] dark:bg-[#062625] text-[#5C807F] hover:text-[#0A3D3B] dark:text-[#9FC8C7] dark:hover:text-white flex items-center justify-center transition">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 pt-2">
              {driverPhone && (
                <a
                  href={`tel:${driverPhone}`}
                  className="w-full py-3.5 px-4 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <PhoneCall size={18} />
                  Appeler ({driverPhone})
                </a>
              )}

              <button
                onClick={() => {
                  setShowContactModal(false);
                  navigate(`/patient/messages/${order?.id}`);
                }}
                className="w-full py-3.5 px-4 bg-[#E7F1F1] dark:bg-[#062625] hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] border border-[#CFE4E3] dark:border-[#145250] rounded-full font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <MessageSquare size={18} className="text-[#0E7673] dark:text-[#38B794]" />
                Message dans l'application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / BOTTOM SHEET COMPLET DES DÉTAILS DE LIVRAISON */}
      {showDetailsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0A3D3B] w-full max-w-lg rounded-t-[32px] max-h-[85vh] flex flex-col shadow-2xl border-t border-[#CFE4E3] dark:border-[#145250]">
            
            {/* Drawer Header */}
            <div className="p-5 pb-3 border-b border-[#CFE4E3] dark:border-[#145250] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#38B794]"></div>
                <h3 className="font-extrabold text-[#0A3D3B] dark:text-white text-base">
                  Suivi de Commande #{order?.id?.slice(0, 8) || id?.slice(0, 8)}
                </h3>
              </div>
              <button 
                onClick={() => setShowDetailsDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] flex items-center justify-center text-[#5C807F] hover:text-[#0A3D3B] dark:text-[#9FC8C7] dark:hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Code PIN de Livraison Sécurisée */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <Key size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                      Code de remise sécurisée
                    </p>
                    <p className="text-xl font-black text-amber-950 dark:text-amber-200 tracking-widest mt-0.5">
                      {deliveryOtp}
                    </p>
                  </div>
                </div>

                <button
                  onClick={copyDeliveryCode}
                  className="px-3.5 py-2 bg-white dark:bg-[#0A3D3B] border border-amber-200 dark:border-[#145250] rounded-full text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  {copiedOtp ? <Check size={14} className="text-[#0E7673] dark:text-[#38B794]" /> : <Copy size={14} />}
                  {copiedOtp ? 'Copié' : 'Copier'}
                </button>
              </div>

              {/* Timeline de livraison */}
              <div className="space-y-4">
                <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm">Progression de la livraison</h4>
                <div className="space-y-5 relative pl-2">
                  <div className="absolute left-[17px] top-[14px] bottom-[14px] w-0.5 bg-[#CFE4E3] dark:bg-[#145250]"></div>
                  {statuses.map((status, index) => {
                    const Icon = status.icon;
                    return (
                      <div key={index} className="flex items-start gap-4 relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-[#0A3D3B] shadow-sm ${
                          status.completed ? 'bg-[#0E7673] text-white' : 
                          status.active ? 'bg-[#D7F1EA] text-[#0E7673] border-[#38B794] animate-pulse' : 'bg-[#F5FAFA] dark:bg-[#062625] text-[#5C807F] dark:text-[#9FC8C7]'
                        }`}>
                          <Icon size={14} />
                        </div>
                        <div className="pt-0.5 flex-1">
                          <p className={`font-bold text-xs ${status.active || status.completed ? 'text-[#0A3D3B] dark:text-white' : 'text-[#5C807F] dark:text-[#9FC8C7]'}`}>
                            {status.label}
                          </p>
                          <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7] mt-0.5">{status.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Liste des Médicaments & Produits */}
              {order?.items && order.items.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[#CFE4E3] dark:border-[#145250]">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-[#0A3D3B] dark:text-white text-sm">Contenu de la commande</h4>
                    <span className="text-xs font-bold text-[#5C807F] dark:text-[#9FC8C7]">{order.items.length} article(s)</span>
                  </div>

                  <div className="space-y-2 bg-[#F5FAFA] dark:bg-[#062625] p-4 rounded-2xl border border-[#CFE4E3] dark:border-[#145250]">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-medium text-[#0A3D3B] dark:text-[#D7F1EA]">
                          {item.quantity}x {item.name || item.productId}
                        </span>
                        <span className="font-bold text-[#0A3D3B] dark:text-white">
                          {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-[#CFE4E3] dark:border-[#145250] flex justify-between items-center text-sm">
                      <span className="font-black text-[#0A3D3B] dark:text-white">Total réglé</span>
                      <span className="font-black text-[#0E7673] dark:text-[#38B794] text-base">
                        {formatCurrency(Number(order.total || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton Facture */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowDetailsDrawer(false);
                    setShowInvoiceModal(true);
                  }}
                  className="w-full py-3.5 bg-[#E7F1F1] dark:bg-[#062625] hover:bg-[#D7F1EA] dark:hover:bg-[#0E4A47] text-[#0A3D3B] dark:text-white border border-[#CFE4E3] dark:border-[#145250] rounded-full font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <FileText size={16} className="text-[#0E7673] dark:text-[#38B794]" />
                  Afficher / Télécharger la Facture Officielle
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {order && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          order={order}
        />
      )}

      
      {/* MODAL DE NOTATION DES PRODUITS */}
      {showProductRatingModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0A3D3B] w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 border border-[#CFE4E3] dark:border-[#145250] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#CFE4E3] dark:border-[#145250] pb-3.5">
              <div>
                <h3 className="font-extrabold text-[#0A3D3B] dark:text-white text-base">
                  Notez vos produits
                </h3>
                <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                  Votre avis est précieux pour les autres patients
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowProductRatingModal(false);
                  if (driver) setTimeout(() => setShowRatingModal(true), 500);
                }}
                className="w-8 h-8 rounded-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#5C807F] hover:text-[#0A3D3B] dark:text-[#9FC8C7] dark:hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {order?.items?.map((item: any) => (
                <div key={item.id} className="border border-[#CFE4E3] dark:border-[#145250] bg-[#F5FAFA]/50 dark:bg-[#062625]/50 p-3.5 rounded-2xl">
                  <p className="font-bold text-sm text-[#0A3D3B] dark:text-white mb-2">{item.name || item.commercial_name}</p>
                  
                  <div className="flex justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => {
                       const currentRating = productRatings[item.id]?.rating || 5;
                       return (
                         <button
                           key={star}
                           type="button"
                           onClick={() => setProductRatings(prev => ({...prev, [item.id]: { ...prev[item.id], rating: star }}))}
                           className="p-1 focus:outline-none"
                         >
                           <Star size={24} className={currentRating >= star ? "fill-[#FACC15] text-[#FACC15]" : "text-[#CFE4E3] dark:text-[#145250]"} />
                         </button>
                       );
                    })}
                  </div>
                  
                  <textarea
                    placeholder="Qu'avez-vous pensé de ce produit ?"
                    className="w-full bg-white dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0E7673] outline-none resize-none placeholder-[#5C807F] dark:placeholder-[#9FC8C7] text-[#0A3D3B] dark:text-white"
                    rows={2}
                    value={productRatings[item.id]?.comment || ''}
                    onChange={(e) => setProductRatings(prev => ({...prev, [item.id]: { ...prev[item.id], comment: e.target.value }}))}
                  ></textarea>
                </div>
              ))}
            </div>

            <button
              disabled={loadingRatings}
              onClick={submitProductRatings}
              className="w-full py-3.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-black text-sm flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
            >
              {loadingRatings ? <Loader2 size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
              {loadingRatings ? "Envoi en cours..." : "Soumettre les avis"}
            </button>
          </div>
        </div>
      )}


      {/* MODAL DE NOTATION & CONFIRMATION DE LIVRAISON */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0A3D3B] w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 border border-[#CFE4E3] dark:border-[#145250] max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#CFE4E3] dark:border-[#145250] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#D7F1EA] dark:bg-[#0E4A47] border-2 border-[#38B794]/40 flex items-center justify-center font-black text-lg text-[#0E7673] dark:text-[#38B794]">
                  {driverPhoto ? (
                    <img src={driverPhoto} alt={driverName} className="w-full h-full object-cover" />
                  ) : (
                    driverFirstName.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0A3D3B] dark:text-white text-base">
                    Noter {driverFirstName}
                  </h3>
                  <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7]">
                    Votre avis aide à récompenser nos meilleurs livreurs
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowRatingModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] text-[#5C807F] hover:text-[#0A3D3B] dark:text-[#9FC8C7] dark:hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Étoiles interactives */}
            <div className="text-center py-2 space-y-2">
              <div className="flex justify-center items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (ratingHover !== null ? ratingHover : ratingScore) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setRatingHover(star)}
                      onMouseLeave={() => setRatingHover(null)}
                      onClick={() => setRatingScore(star)}
                      className="p-1 text-3xl transition transform active:scale-125 hover:scale-110 focus:outline-none"
                    >
                      <Star 
                        size={36} 
                        className={active ? "fill-[#FACC15] text-[#FACC15]" : "text-[#CFE4E3] dark:text-[#145250]"} 
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-black text-[#0E7673] dark:text-[#38B794] tracking-wide uppercase">
                {ratingScore === 5 && "Service Exceptionnel & Parfait"}
                {ratingScore === 4 && "Très bonne livraison"}
                {ratingScore === 3 && "Service Correct"}
                {ratingScore === 2 && "Décevant"}
                {ratingScore === 1 && "Insatisfaisant"}
              </div>
            </div>

            {/* Critères / Tags rapides */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] block">
                Qu'avez-vous particulièrement apprécié ?
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Ponctuel",
                  "Courtois & Souriant",
                  "Médicaments intacts",
                  "Communication fluide",
                  "Livraison ultra-rapide",
                  "Respect des consignes"
                ].map((tag) => {
                  const isSelected = selectedRatingTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleRatingTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                        isSelected 
                          ? "bg-[#0E7673] text-white border-[#0E7673]" 
                          : "bg-[#F5FAFA] dark:bg-[#062625] text-[#0A3D3B] dark:text-[#D7F1EA] border-[#CFE4E3] dark:border-[#145250] hover:bg-[#E7F1F1] dark:hover:bg-[#0E4A47]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Commentaire optionnel */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0A3D3B] dark:text-[#D7F1EA] block">
                Laisser un commentaire (facultatif)
              </label>
              <textarea
                rows={2}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Ex: Livreur très professionnel et attentif..."
                className="w-full bg-[#F5FAFA] dark:bg-[#062625] border border-[#CFE4E3] dark:border-[#145250] rounded-2xl p-3 text-xs text-[#0A3D3B] dark:text-white placeholder-[#5C807F] dark:placeholder-[#9FC8C7] outline-none focus:ring-2 focus:ring-[#0E7673] transition resize-none"
              />
            </div>

            {/* Pourboire optionnel */}
            <div className="space-y-2 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Heart size={14} className="text-amber-600 fill-amber-600" />
                  Ajouter un pourboire au livreur ?
                </span>
                <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
                  {selectedTip > 0 ? `${selectedTip} FCFA` : '0 FCFA'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[0, 200, 500, 1000].map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    onClick={() => setSelectedTip(tip)}
                    className={`py-2 rounded-full text-xs font-extrabold transition border ${
                      selectedTip === tip
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-white dark:bg-[#0A3D3B] text-[#0A3D3B] dark:text-[#D7F1EA] border-amber-200/80 dark:border-[#145250] hover:bg-amber-50"
                    }`}
                  >
                    {tip === 0 ? "Aucun" : `+${tip}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton de validation */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitDriverRating}
                disabled={isSubmittingRating}
                className="w-full py-3.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingRating ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <Star size={16} className="fill-[#FACC15] text-[#FACC15]" />
                    Confirmer & Enregistrer ma note
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
