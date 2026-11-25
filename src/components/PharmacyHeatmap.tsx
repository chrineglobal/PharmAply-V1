import React, { useEffect, useState } from 'react';
import { useMap, APIProvider, Map } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { useTranslation } from "react-i18next";
import { useGoogleMapsStatus } from "../hooks/useGoogleMapsStatus";
import { getGoogleMapsApiKey } from "../lib/maps";

function DeckGlOverlay({ layers }: { layers: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const overlay = new GoogleMapsOverlay({ layers });
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, layers]);
  return null;
}

export function PharmacyHeatmap({ pharmacies }: { pharmacies: any[] }) {
  const { t } = useTranslation();
  const { isAvailable, apiKey } = useGoogleMapsStatus();
  
  if (!isAvailable || !apiKey) {
    return (
      <div className="w-full h-[300px] bg-[#E7F1F1] dark:bg-[#062625] rounded-2xl flex items-center justify-center p-6 text-center border border-[#CFE4E3] dark:border-[#145250]">
        <div>
          <h2 className="font-bold text-[#0A3D3B] dark:text-white mb-1.5 text-sm uppercase tracking-wide">Carte de chaleur de la demande</h2>
          <p className="text-xs text-[#5C807F] dark:text-[#9FC8C7] max-w-sm">
            {pharmacies.length} officines enregistrées dans la zone de couverture. Analyse de densité en temps réel.
          </p>
        </div>
      </div>
    );
  }

  // Generate heatmap data points based on pharmacies
  // In a real scenario, this would come from delivery/demand data
  // For visualization purposes, we use pharmacy locations (mocked or real)
  // Assuming pharmacy has lat, lng or coordinates
  
  const heatmapData = pharmacies.map(p => {
     // Generate some mock coordinates if none exist
     const lat = p.lat || p.coordinates?.lat || 37.7749 + (Math.random() - 0.5) * 0.1;
     const lng = p.lng || p.coordinates?.lng || -122.4194 + (Math.random() - 0.5) * 0.1;
     // Random weight for demand
     const weight = Math.floor(Math.random() * 10) + 1;
     return {
        position: [lng, lat], // deck.gl expects [lng, lat]
        weight
     };
  });

  const layers = [
    new HeatmapLayer({
      id: 'pharmacy-demand-heatmap',
      data: heatmapData,
      getPosition: (d: any) => d.position,
      getWeight: (d: any) => d.weight,
      radiusPixels: 40,
      intensity: 1,
      threshold: 0.05
    })
  ];

  return (
    <div className="w-full h-[300px] rounded-2xl overflow-hidden shadow-sm border border-[#CFE4E3] dark:border-[#145250]">
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
          defaultCenter={{lat: 37.7749, lng: -122.4194}}
          defaultZoom={12}
          mapId="PHARMACY_HEATMAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{width: '100%', height: '100%'}}
          gestureHandling="cooperative"
          disableDefaultUI={true}
        >
          <DeckGlOverlay layers={layers} />
        </Map>
      </APIProvider>
    </div>
  );
}
