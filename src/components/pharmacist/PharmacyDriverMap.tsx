import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Polyline } from '../../components/Polyline';
import { doc, onSnapshot, getDoc, db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';
import { Bike, MapPin, Store, Navigation, Phone, MessageSquare, Clock, ShieldCheck, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleMapsStatus } from '../../hooks/useGoogleMapsStatus';

// Google Maps Custom Marker Components
const PharmacyMarkerUI = () => (
  <div style={{
    width: 44, height: 44, background: '#0E7673', border: '3px solid #ffffff', borderRadius: '50%',
    boxShadow: '0 8px 20px rgba(14, 118, 115, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
  }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
      <path d="M2 7h20"/>
      <path d="M12 11v6"/>
      <path d="M9 14h6"/>
    </svg>
  </div>
);

const DriverMotoMarkerUI = () => (
  <div style={{
    width: 44, height: 44, background: '#38B794', border: '3px solid #ffffff', borderRadius: '50%',
    boxShadow: '0 8px 20px rgba(56, 183, 148, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A3D3B'
  }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
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

interface PharmacyDriverMapProps {
  orders: any[];
  pharmacy: any;
}

export function PharmacyDriverMap({ orders, pharmacy }: PharmacyDriverMapProps) {
  const navigate = useNavigate();
  const { isAvailable, apiKey } = useGoogleMapsStatus();
  // Filter active orders that have an assigned driver approaching or picking up
  const activeDeliveryOrders = orders.filter(o => 
    (o.driverId || o.driver_id) && 
    ['driver_assigned', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'to_pharmacy', 'at_pharmacy'].includes(o.status)
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  // Pharmacy position
  const pharmaPos: [number, number] = (pharmacy?.lat && pharmacy?.lng && !isNaN(Number(pharmacy.lat)))
    ? [Number(pharmacy.lat), Number(pharmacy.lng)]
    : [4.0511, 9.7679]; // Douala fallback

  const currentOrder = activeDeliveryOrders.find(o => o.id === selectedOrderId) || activeDeliveryOrders[0] || null;

  useEffect(() => {
    if (activeDeliveryOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(activeDeliveryOrders[0].id);
    }
  }, [activeDeliveryOrders, selectedOrderId]);

  useEffect(() => {
    if (!currentOrder) {
      setDriverData(null);
      setDriverPos(null);
      return;
    }

    const driverId = currentOrder.driverId || currentOrder.driver_id;
    if (!driverId) return;

    // Listen in real-time to driver data & coordinates
    const unsub = onSnapshot(doc(db, 'drivers', driverId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setDriverData({ id: snap.id, ...d });
        const lat = d.lat || d.latitude || d.location?.lat;
        const lng = d.lng || d.longitude || d.location?.lng;
        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
          setDriverPos([Number(lat), Number(lng)]);
        }
      }
    });

    return () => unsub();
  }, [currentOrder?.id, currentOrder?.driverId, currentOrder?.driver_id]);

  // Compute distance and ETA to pharmacy
  useEffect(() => {
    if (!driverPos || !pharmaPos) {
      setDistanceKm(null);
      setEtaMinutes(null);
      return;
    }

    const R = 6371; // Earth radius in km
    const dLat = (pharmaPos[0] - driverPos[0]) * Math.PI / 180;
    const dLng = (pharmaPos[1] - driverPos[1]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(driverPos[0] * Math.PI / 180) * Math.cos(pharmaPos[0] * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const dist = R * c;
    setDistanceKm(dist);

    // Moto speed ~30 km/h in urban traffic
    const minutes = Math.max(1, Math.round((dist / 30) * 60));
    setEtaMinutes(minutes);
  }, [driverPos, pharmaPos]);

  if (activeDeliveryOrders.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl p-6 border border-[#CFE4E3] dark:border-[#145250] shadow-sm flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="w-14 h-14 rounded-full bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] flex items-center justify-center mb-4">
          <Bike size={28} />
        </div>
        <h3 className="text-base font-bold text-[#0A3D3B] dark:text-white mb-1">
          Suivi des Chauffeurs en Direct
        </h3>
        <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] max-w-md mx-auto mb-4">
          Aucun livreur n'est actuellement en route vers votre pharmacie. Dès qu'un coursier est assigné à une commande prête, sa position et son heure d'arrivée estimée s'afficheront ici en temps réel.
        </p>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          En attente de ramassage
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = driverPos || pharmaPos;

  return (
    <div className="bg-white dark:bg-[#0A3D3B] rounded-3xl border border-[#CFE4E3] dark:border-[#145250] shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[#CFE4E3] dark:border-[#145250] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38B794] animate-pulse"></span>
            <h3 className="text-lg font-bold text-[#0A3D3B] dark:text-white">
              Livreur en approche de l'officine
            </h3>
          </div>
          <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] mt-0.5">
            Suivi GPS en temps réel du coursier assigné pour le ramassage des médicaments
          </p>
        </div>

        {/* Order Selector if multiple */}
        {activeDeliveryOrders.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            {activeDeliveryOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                  (currentOrder?.id === o.id) 
                    ? 'bg-[#0E7673] text-white shadow-sm' 
                    : 'bg-[#E7F1F1] dark:bg-[#0E4A47] text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#D7F1EA] dark:hover:bg-[#145250]'
                }`}
              >
                #{o.id.slice(0, 6).toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="w-full h-[320px] relative z-0 rounded-2xl overflow-hidden bg-[#062625]">
        {isAvailable && apiKey ? (
          <APIProvider 
            apiKey={apiKey}
            onError={() => {
              (window as any).__googleMapsAuthFailed = true;
              try { sessionStorage.setItem('gmp_auth_failed', 'true'); } catch {}
              window.dispatchEvent(new Event('google-maps-auth-failed'));
            }}
          >
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: mapCenter[0], lng: mapCenter[1] }}
              defaultZoom={14}
              gestureHandling="greedy"
              disableDefaultUI={true}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            >
              <MapAutoCenter center={mapCenter} />
              
              {/* Pharmacy Marker */}
              <AdvancedMarker position={{ lat: pharmaPos[0], lng: pharmaPos[1] }}>
                <PharmacyMarkerUI />
              </AdvancedMarker>

              {/* Driver Marker */}
              {driverPos && (
                <>
                  <AdvancedMarker position={{ lat: driverPos[0], lng: driverPos[1] }}>
                    <DriverMotoMarkerUI />
                  </AdvancedMarker>
                  <Polyline 
                    path={[{lat: driverPos[0], lng: driverPos[1]}, {lat: pharmaPos[0], lng: pharmaPos[1]}]} 
                    strokeColor="#0E7673" 
                    strokeWeight={4} 
                    strokeOpacity={0.85} 
                  />
                </>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-[#062625] border border-[#145250]">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38B794_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="relative z-10 flex items-center justify-center gap-6 mb-4">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Bike size={24} className="animate-pulse" />
                </div>
                <span className="text-[11px] font-bold text-[#D7F1EA]">Livreur en approche</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 border-t-2 border-dashed border-[#38B794]/60 my-auto"></div>
                <span className="text-[10px] font-mono text-[#38B794] mt-1">{distanceKm !== null ? `${distanceKm.toFixed(1)} km` : '--'}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl bg-[#0E7673]/30 border border-[#38B794]/50 flex items-center justify-center text-[#38B794]">
                  <Store size={24} />
                </div>
                <span className="text-[11px] font-bold text-[#D7F1EA]">Votre Officine</span>
              </div>
            </div>
            <p className="text-xs text-[#9FC8C7] relative z-10 font-medium">
              Suivi GPS actif • {driverData?.name || currentOrder?.driverName || 'Livreur assigné'}
            </p>
          </div>
        )}

        {/* Floating live driver card overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-auto">
          <div className="bg-white/95 dark:bg-[#0A3D3B]/95 backdrop-blur-md p-4 rounded-2xl border border-[#CFE4E3] dark:border-[#145250] shadow-xl flex flex-wrap items-center justify-between gap-3">
            
            {/* Driver Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0E7673] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {driverData?.name?.charAt(0) || currentOrder?.driverName?.charAt(0) || 'L'}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0A3D3B] dark:text-white">
                  {driverData?.name || currentOrder?.driverName || 'Chauffeur Assigné'}
                </h4>
                <p className="text-[11px] text-[#5C807F] dark:text-[#9FC8C7]">
                  {driverData?.vehicleModel || 'Moto de livraison'} • {driverData?.vehiclePlate || 'LT 482 AB'}
                </p>
              </div>
            </div>

            {/* Distance & ETA */}
            <div className="flex items-center gap-4 bg-[#F5FAFA] dark:bg-[#062625] px-4 py-2 rounded-xl border border-[#CFE4E3] dark:border-[#145250]">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-[#5C807F] dark:text-[#9FC8C7]">Distance</p>
                <p className="text-xs font-black text-[#0A3D3B] dark:text-white tabular-nums">
                  {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : '--'}
                </p>
              </div>
              <div className="h-6 w-px bg-[#CFE4E3] dark:bg-[#145250]"></div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-[#5C807F] dark:text-[#9FC8C7]">Arrivée estimée</p>
                <p className="text-xs font-black text-[#0E7673] dark:text-[#38B794] tabular-nums">
                  {etaMinutes !== null ? `~${etaMinutes} min` : '--'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {(driverData?.phone || currentOrder?.driverPhone) && (
                <a
                  href={`tel:${driverData?.phone || currentOrder?.driverPhone}`}
                  className="p-2.5 bg-[#E7F1F1] dark:bg-[#0E4A47] hover:bg-[#D7F1EA] dark:hover:bg-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] rounded-full transition shadow-sm"
                  title="Appeler le chauffeur"
                >
                  <Phone size={16} />
                </a>
              )}
              <button
                onClick={() => navigate(`/pharmacist/orders/${currentOrder?.id}`)}
                className="px-4 py-2.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm transition"
              >
                Voir commande
                <ChevronRight size={14} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
