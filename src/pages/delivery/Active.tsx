import React, { useState, useEffect, useRef } from "react";
import { 
  Package, MapPin, Phone, Camera, CheckCircle, Navigation, Clock, 
  Store, User, MessageCircle, ArrowLeft, Loader2, X, ChevronUp, ChevronDown,
  LocateFixed, Compass, Volume2, VolumeX, Maximize2, ShieldAlert, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Polyline } from '../../components/Polyline';
import { 
  collection, query, where, updateDoc, doc, onSnapshot, getDoc, 
  serverTimestamp, ref, uploadBytesResumable, getDownloadURL 
} from '../../lib/firebase';
import { db, storage, handleFirestoreError, OperationType } from '../../lib/firebase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import { useTranslation } from "react-i18next";
import { getRoadRoute } from '../../lib/routing';
import { getGoogleMapsApiKey } from '../../lib/maps';
import { QuickNavButton } from '../../components/delivery/QuickNavButton';
import { NavigationModal } from '../../components/delivery/NavigationModal';
import { launchNavigation, NavigationTarget } from '../../lib/navigation';
import toast from "react-hot-toast";

type DeliveryStage = 'to_pharmacy' | 'at_pharmacy' | 'to_customer' | 'at_customer' | 'completed';

// Distance calculation using Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Leaflet Map Auto-Recenter Controller
// Google Maps Custom Marker Components
const DriverMarkerUI = () => (
  <div style={{
    position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <div style={{
      position: 'absolute', inset: -6, background: 'rgba(25, 75, 75, 0.25)', borderRadius: '50%', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
    }}></div>
    <div style={{
      width: 42, height: 42, background: '#194B4B', border: '3.5px solid #ffffff', borderRadius: '50%',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>
  </div>
);

const PharmacyMarkerUI = () => (
  <div style={{
    width: 46, height: 46, background: '#0d9488', border: '3.5px solid #ffffff', borderRadius: '50%',
    boxShadow: '0 8px 20px rgba(13,148,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>
);

const PatientMarkerUI = () => (
  <div style={{
    width: 46, height: 46, background: '#ea580c', border: '3.5px solid #ffffff', borderRadius: '50%',
    boxShadow: '0 8px 20px rgba(234,88,12,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  </div>
);

function MapAutoRecenter({ center, lockOnDriver }: { center: [number, number]; lockOnDriver: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (lockOnDriver && center && center[0] && center[1] && map) {
      map.panTo({ lat: center[0], lng: center[1] });
    }
  }, [center, lockOnDriver, map]);
  return null;
}

export function DeliveryActive() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<[number, number]>([4.0511, 9.7679]);
  const [stage, setStage] = useState<DeliveryStage>('to_pharmacy');
  
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [patientUser, setPatientUser] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeDistanceText, setRouteDistanceText] = useState<string>("--");
  const [routeEtaMins, setRouteEtaMins] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  
  const [lockOnDriver, setLockOnDriver] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [voiceGuidance, setVoiceGuidance] = useState(false);
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNavMenu, setShowNavMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // 1. GPS Tracking
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDriverPos([lat, lng]);
          
          if (user && order?.id) {
            updateDoc(doc(db, 'drivers', user.uid), {
              lat, lng,
              updatedAt: serverTimestamp()
            }).catch(() => {});
          }
        },
        (err) => console.warn("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user, order?.id]);

  // 2. Active order subscription
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const activeQ = query(
      collection(db, 'orders'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['driver_assigned', 'out_for_delivery', 'preparing', 'ready', 'ready_for_pickup', 'delivering', 'en_route_to_pharmacy'])
    );

    const unsubscribe = onSnapshot(
      activeQ,
      async (snap) => {
        if (!snap.empty) {
          const activeDoc = snap.docs[0];
          const orderData = { id: activeDoc.id, ...activeDoc.data() };
          setOrder(orderData);

          // Infer stage
          let currentStage: DeliveryStage = (orderData as any).deliveryStage || 'to_pharmacy';
          if (!(orderData as any).deliveryStage) {
            if (orderData.status === 'out_for_delivery' || orderData.status === 'delivering') {
              currentStage = 'to_customer';
            } else {
              currentStage = 'to_pharmacy';
            }
          }
          setStage(currentStage);

          // Fetch pharmacy details if needed
          if (orderData.pharmacyId && (!orderData.pharmacyLat || !orderData.pharmacyLng)) {
            try {
              const pSnap = await getDoc(doc(db, 'pharmacies', orderData.pharmacyId));
              if (pSnap.exists()) {
                setPharmacy({ id: pSnap.id, ...pSnap.data() });
              }
            } catch (e) {
              console.warn("Pharmacy fetch error:", e);
            }
          }

          // Fetch patient user details for photo and coordinates if needed
          if (orderData.patientId) {
            try {
              const uSnap = await getDoc(doc(db, 'users', orderData.patientId));
              if (uSnap.exists()) {
                setPatientUser({ id: uSnap.id, ...uSnap.data() });
              }
            } catch (e) {
              console.warn("Patient fetch error:", e);
            }
          }
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Active order query error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Coordinates resolution
  const isPharmacyStep = stage === 'to_pharmacy' || stage === 'at_pharmacy';

  const rawPharmacyLat = Number(order?.pharmacyLat || pharmacy?.lat || pharmacy?.latitude);
  const rawPharmacyLng = Number(order?.pharmacyLng || pharmacy?.lng || pharmacy?.longitude);

  const pharmacyPos: [number, number] = (!isNaN(rawPharmacyLat) && !isNaN(rawPharmacyLng) && rawPharmacyLat !== 0)
    ? [rawPharmacyLat, rawPharmacyLng]
    : [driverPos[0] + 0.005, driverPos[1] + 0.004];

  const rawPatientLat = Number(order?.destLat || order?.deliveryLocation?.lat || patientUser?.lat || patientUser?.latitude);
  const rawPatientLng = Number(order?.destLng || order?.deliveryLocation?.lng || patientUser?.lng || patientUser?.longitude);

  const patientPos: [number, number] = (!isNaN(rawPatientLat) && !isNaN(rawPatientLng) && rawPatientLat !== 0)
    ? [rawPatientLat, rawPatientLng]
    : [driverPos[0] + 0.012, driverPos[1] + 0.008];

  const activeTargetPos: [number, number] = isPharmacyStep ? pharmacyPos : patientPos;

  // Real-time Road Network Routing (OSRM Road Polyline)
  useEffect(() => {
    let isMounted = true;

    const fetchRoute = async () => {
      if (!driverPos[0] || !driverPos[1] || !activeTargetPos[0] || !activeTargetPos[1]) return;

      const result = await getRoadRoute(driverPos, activeTargetPos);
      if (isMounted) {
        setRouteCoordinates(result.coordinates);
        
        const distKm = result.distanceMeters / 1000;
        const formattedDist = result.distanceMeters < 1000 
          ? `${result.distanceMeters} m` 
          : `${distKm.toFixed(1)} km`;
        setRouteDistanceText(formattedDist);

        const eta = Math.max(1, Math.ceil(result.durationSeconds / 60));
        setRouteEtaMins(eta);
      }
    };

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [driverPos[0], driverPos[1], activeTargetPos[0], activeTargetPos[1], isPharmacyStep]);

  // Stage advance handler
  const handleAdvanceStage = async () => {
    if (!order) return;
    setProcessing(true);
    setActionLoading(stage);

    let nextStage: DeliveryStage = stage;
    let newStatus = order.status;

    try {
      if (stage === 'to_pharmacy') {
        nextStage = 'at_pharmacy';
        await updateDoc(doc(db, 'orders', order.id), {
          deliveryStage: nextStage,
          updatedAt: serverTimestamp()
        });
        toast.success("Arrivé à la pharmacie enregistré !");
      } else if (stage === 'at_pharmacy') {
        nextStage = 'to_customer';
        newStatus = 'out_for_delivery';
        await updateDoc(doc(db, 'orders', order.id), {
          status: newStatus,
          deliveryStage: nextStage,
          outForDeliveryAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Colis récupéré ! En route vers le client.");
      } else if (stage === 'to_customer') {
        nextStage = 'at_customer';
        await updateDoc(doc(db, 'orders', order.id), {
          deliveryStage: nextStage,
          updatedAt: serverTimestamp()
        });
        toast.success("Arrivé chez le client enregistré !");
      } else if (stage === 'at_customer') {
        if (!proofPreview) {
          toast.error("Veuillez prendre une photo comme preuve de livraison.");
          setProcessing(false);
          setActionLoading(null);
          return;
        }

        setUploadingProof(true);
        let photoUrl = proofPreview;

        if (proofFile && user) {
          try {
            const fileRef = ref(storage, `deliveries/proofs/${order.id}_${Date.now()}.jpg`);
            const uploadTask = uploadBytesResumable(fileRef, proofFile);
            photoUrl = await new Promise((resolve, reject) => {
              uploadTask.on('state_changed', null, reject, async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadUrl);
              });
            });
          } catch (e) {
            console.warn("Storage upload failed, fallback to data preview:", e);
          }
        }

        nextStage = 'completed';
        newStatus = 'delivered';
        await updateDoc(doc(db, 'orders', order.id), {
          status: newStatus,
          deliveryStage: nextStage,
          proofOfDeliveryUrl: photoUrl,
          proof_of_delivery_url: photoUrl,
          deliveryProofPhoto: photoUrl,
          deliveryProofUrl: photoUrl,
          proofUrl: photoUrl,
          deliveredAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Supabase orders update
        try {
          await supabase.from('orders').update({
            status: 'delivered',
            proof_of_delivery_url: photoUrl,
            updated_at: new Date().toISOString()
          }).eq('id', order.id);
        } catch (e) {
          // ignore if table doesn't have id
        }

        toast.success("Livraison effectuée avec succès ! 🎉");
        setTimeout(() => navigate('/delivery'), 1200);
      }

      setStage(nextStage);
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de la livraison.");
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    } finally {
      setProcessing(false);
      setUploadingProof(false);
      setActionLoading(null);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setProofPreview(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 text-gray-900 dark:text-white p-8 text-center">
        <Loader2 size={36} className="animate-spin text-teal-400 mb-3" />
        <span className="font-medium text-sm text-gray-500 dark:text-gray-600 dark:text-slate-300">Initialisation de la navigation GPS...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-black p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
          <Package size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aucune livraison active</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
          Vous n'avez aucune course en cours d'exécution pour le moment.
        </p>
        <button
          onClick={() => navigate('/delivery')}
          className="px-6 py-3 bg-[var(--app-primary-color)] text-gray-900 dark:text-white rounded-xl font-bold hover:opacity-90 transition"
        >
          Retour aux courses
        </button>
      </div>
    );
  }

  const targetName = isPharmacyStep 
    ? (order.pharmacyName || pharmacy?.name || 'Pharmacie Partenaire') 
    : (order.patientName || patientUser?.name || 'Client');

  let rawTargetAddress = isPharmacyStep 
    ? (order.pharmacyAddress || pharmacy?.address || 'Pharmacie Partenaire') 
    : (order.deliveryAddress || patientUser?.address || order.address || 'Adresse de livraison');

  if (rawTargetAddress.toLowerCase().includes('update your profile') || rawTargetAddress.toLowerCase().includes('please update') || !rawTargetAddress.trim()) {
    rawTargetAddress = patientUser?.address || 'Yaoundé, Cameroun';
  }

  const targetAddress = rawTargetAddress;

  const targetPhone = isPharmacyStep 
    ? (order.pharmacyPhone || pharmacy?.phone) 
    : (order.patientPhone || patientUser?.phone);

  const targetPhoto = isPharmacyStep 
    ? (order.pharmacyPhoto || pharmacy?.photoURL || pharmacy?.photoUrl || pharmacy?.logoUrl) 
    : (order.patientPhoto || patientUser?.photoURL || patientUser?.photoUrl || patientUser?.avatar_url);

  const currentNavTarget: NavigationTarget = {
    lat: activeTargetPos[0],
    lng: activeTargetPos[1],
    address: targetAddress,
    label: targetName
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 flex flex-col">
      
      {/* 1. FULLSCREEN LEAFLET MAP CANVAS */}
      <div className="absolute inset-0 z-0">
        <APIProvider apiKey={getGoogleMapsApiKey()}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: driverPos[0], lng: driverPos[1] }}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI={true}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
        >
          <MapAutoRecenter center={driverPos} lockOnDriver={lockOnDriver} />

          {/* Driver Vehicle Marker */}
          <AdvancedMarker position={{ lat: driverPos[0], lng: driverPos[1] }} title="Livreur (Vous)">
            <DriverMarkerUI />
          </AdvancedMarker>

          {/* Destination Marker */}
          <AdvancedMarker position={{ lat: activeTargetPos[0], lng: activeTargetPos[1] }} title={targetName + '\n' + targetAddress}>
             {isPharmacyStep ? <PharmacyMarkerUI /> : <PatientMarkerUI />}
          </AdvancedMarker>

          {/* Real-time Road Network Navigation Polyline */}
          {routeCoordinates.length > 0 && (
            <>
              {/* Outer stroke casing */}
              <Polyline
                path={routeCoordinates.map((c: any) => ({lat: c[0], lng: c[1]}))}
                strokeColor="#0f172a"
                strokeWeight={8}
                strokeOpacity={0.4}
              />
              {/* Main colored navigation polyline */}
              <Polyline
                path={routeCoordinates.map((c: any) => ({lat: c[0], lng: c[1]}))}
                strokeColor={isPharmacyStep ? "#0d9488" : "#194B4B"}
                strokeWeight={5}
                strokeOpacity={0.95}
              />
            </>
          )}

          {routeCoordinates.length === 0 && (
            <Polyline
              path={[{lat: driverPos[0], lng: driverPos[1]}, {lat: activeTargetPos[0], lng: activeTargetPos[1]}]}
              strokeColor={isPharmacyStep ? "#0d9488" : "#194B4B"}
              strokeWeight={5}
              strokeOpacity={0.85}
            />
          )}
        </Map>
        </APIProvider>
      </div>

      {/* 2. TOP FLOATING NAVIGATION BANNER & CONTROLS */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-3 pointer-events-none">
        
        {/* Navigation HUD Banner */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-900 dark:text-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 pointer-events-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button 
              onClick={() => navigate('/delivery')} 
              className="w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-slate-700 transition"
              title="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPharmacyStep ? 'bg-teal-400' : 'bg-amber-400'} animate-ping shrink-0`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 truncate">
                  {isPharmacyStep ? 'Étape 1 : Pharmacie' : 'Étape 2 : Client'}
                </span>
              </div>
              <p className="font-black text-gray-900 dark:text-white text-sm sm:text-base truncate mt-0.5" title={targetAddress}>
                {targetAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden xs:block">
              <div className="text-base sm:text-lg font-black text-emerald-500 dark:text-emerald-400 leading-tight">
                {routeEtaMins} <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">min</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400">
                {routeDistanceText}
              </div>
            </div>

            {/* Quick action button for launching Google Maps / Waze */}
            <QuickNavButton
              target={currentNavTarget}
              variant="hud"
            />
          </div>
        </div>

        {/* Quick Map Controls Overlay */}
        <div className="flex items-center justify-between pointer-events-auto px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLockOnDriver(!lockOnDriver)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold shadow-lg transition backdrop-blur-md ${
                lockOnDriver 
                  ? 'bg-[var(--app-primary-color)] text-white' 
                  : 'bg-white/90 dark:bg-slate-900/90 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:bg-slate-800'
              }`}
            >
              <LocateFixed size={15} />
              <span>{lockOnDriver ? 'GPS Verrouillé' : 'Centrer carte'}</span>
            </button>

            <button
              onClick={() => setVoiceGuidance(!voiceGuidance)}
              className="p-2 rounded-full bg-white/90 dark:bg-slate-900/90 text-gray-600 dark:text-slate-300 shadow-lg hover:bg-gray-100 dark:bg-slate-800 transition backdrop-blur-md"
              title="Guide vocal"
            >
              {voiceGuidance ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={() => setNavModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold shadow-lg transition backdrop-blur-md bg-white/90 dark:bg-slate-900/90 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800"
              title="Ouvrir Google Maps ou Waze"
            >
              <Navigation size={13} />
              <span>Ouvrir GPS</span>
            </button>
          </div>

          <span className="bg-white/90 dark:bg-slate-900/90 text-gray-900 dark:text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5">
            <Compass size={14} className="text-teal-400 animate-spin" />
            Vitesse ~ 28 km/h
          </span>
        </div>
      </div>

      {/* 3. SLIDING BOTTOM SHEET */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-zinc-900 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-gray-100 dark:border-zinc-800 transition-all duration-300 ${sheetExpanded ? 'p-6 pb-8' : 'p-4 pb-6'}`}>
        
        {/* Sheet Drag Handle */}
        <button 
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="w-full flex flex-col items-center justify-center py-1 mb-2 group"
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full group-hover:bg-[var(--app-primary-color)] transition-colors" />
        </button>

        {/* Header Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-gray-900 dark:text-white shadow-md ${isPharmacyStep ? 'bg-teal-600' : 'bg-amber-600'}`}>
              {targetPhoto ? (
                <img 
                  src={targetPhoto} 
                  alt={targetName} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : isPharmacyStep ? (
                <Store size={22} />
              ) : (
                <User size={22} />
              )}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-lg leading-snug">
                {targetName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-[280px]">
                {targetAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action Navigation button */}
            <QuickNavButton
              target={currentNavTarget}
              variant="icon"
            />

            {targetPhone && (
              <a 
                href={`tel:${targetPhone}`}
                className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center hover:bg-teal-100 transition shadow-sm"
                title="Appeler"
              >
                <Phone size={18} />
              </a>
            )}
            <button
              onClick={() => navigate(`/delivery/messages/${order.id}`)}
              className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 transition shadow-sm"
              title="Message"
            >
              <MessageCircle size={18} />
            </button>
          </div>
        </div>

        {/* Expanded Sheet Content */}
        {sheetExpanded && (
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-zinc-800">
            
            {/* Stage Guidance Note & Direct Launch Buttons */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-3">
              <div className="flex items-start gap-3">
                <Navigation size={18} className="text-[var(--app-primary-color)] dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-800 dark:text-slate-200 flex-1">
                  <span className="font-bold block mb-0.5">Guidage GPS virage par virage</span>
                  Lancez votre application favorite (Google Maps ou Waze) avec les coordonnées exactes ({currentNavTarget.lat.toFixed(4)}, {currentNavTarget.lng.toFixed(4)}).
                </div>
              </div>

              {/* Direct Quick Launch Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                <button
                  type="button"
                  onClick={() => launchNavigation('google_maps', currentNavTarget)}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 transition shadow-xs"
                >
                  <span>Google Maps</span>
                  <ExternalLink size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => launchNavigation('waze', currentNavTarget)}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 border border-cyan-200 dark:border-cyan-800 transition shadow-xs"
                >
                  <span>Waze</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>

            {/* Proof of delivery photo picker (Step 2 - At customer) */}
            {stage === 'at_customer' && (
              <div className="bg-gray-50 dark:bg-black p-4 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-800">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Preuve de livraison (Photo obligatoire) :
                </label>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handlePhotoSelect} 
                  className="hidden" 
                />

                {proofPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 max-h-40 flex items-center justify-center bg-black">
                    <img src={proofPreview} alt="Preuve" className="max-h-40 object-contain" />
                    <button 
                      onClick={() => { setProofPreview(null); setProofFile(null); }}
                      className="absolute top-2 right-2 bg-red-600 text-gray-900 dark:text-white p-1 rounded-full shadow"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-center gap-2 text-[var(--app-primary-color)] dark:text-teal-400 font-bold text-xs"
                  >
                    <Camera size={18} />
                    <span>Prendre la photo de livraison</span>
                  </button>
                )}
              </div>
            )}

            {/* Primary Full-Width Action Button */}
            <div>
              {stage === 'to_pharmacy' && (
                <button
                  disabled={processing}
                  onClick={handleAdvanceStage}
                  className="w-full py-4 bg-[var(--app-primary-color)] hover:opacity-90 text-gray-900 dark:text-white rounded-2xl font-black transition flex items-center justify-center gap-2 shadow-xl text-base disabled:opacity-75"
                >
                  {processing && actionLoading === 'to_pharmacy' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>J'suis arrivé à la pharmacie</span>
                    </>
                  )}
                </button>
              )}

              {stage === 'at_pharmacy' && (
                <button
                  disabled={processing}
                  onClick={handleAdvanceStage}
                  className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-gray-900 dark:text-white rounded-2xl font-black transition flex items-center justify-center gap-2 shadow-xl text-base disabled:opacity-75"
                >
                  {processing && actionLoading === 'at_pharmacy' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Confirmation...</span>
                    </>
                  ) : (
                    <>
                      <Package size={20} />
                      <span>Confirmer la récupération du colis</span>
                    </>
                  )}
                </button>
              )}

              {stage === 'to_customer' && (
                <button
                  disabled={processing}
                  onClick={handleAdvanceStage}
                  className="w-full py-4 bg-[var(--app-primary-color)] hover:opacity-90 text-gray-900 dark:text-white rounded-2xl font-black transition flex items-center justify-center gap-2 shadow-xl text-base disabled:opacity-75"
                >
                  {processing && actionLoading === 'to_customer' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <MapPin size={20} />
                      <span>Arrivé chez le client</span>
                    </>
                  )}
                </button>
              )}

              {stage === 'at_customer' && (
                <button
                  disabled={processing || !proofPreview || uploadingProof}
                  onClick={handleAdvanceStage}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-gray-900 dark:text-white rounded-2xl font-black transition flex items-center justify-center gap-2 shadow-xl text-base disabled:opacity-50"
                >
                  {processing && actionLoading === 'at_customer' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Validation de la livraison...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>Valider la livraison</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Navigation App Selector Modal */}
      <NavigationModal
        isOpen={navModalOpen}
        onClose={() => setNavModalOpen(false)}
        target={currentNavTarget}
      />
    </div>
  );
}
