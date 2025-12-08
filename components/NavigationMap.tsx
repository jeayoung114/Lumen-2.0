import React, { useEffect, useRef, useState } from 'react';
import { LUMEN_MAP_STYLE } from '../types';
import { Navigation, MapPin, AlertTriangle, Eye, ShieldAlert } from 'lucide-react';

interface NavigationMapProps {
  active: boolean;
  mapError: boolean;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({ active, mapError }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (mapError) return;

    // Poll for the API to be ready
    const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
            setIsMapReady(true);
            clearInterval(checkGoogleMaps);
        }
    }, 500);

    const timeout = setTimeout(() => {
        clearInterval(checkGoogleMaps);
    }, 10000); // 10s timeout just to stop polling

    return () => {
        clearInterval(checkGoogleMaps);
        clearTimeout(timeout);
    };
  }, [mapError]);

  useEffect(() => {
    if (!active) return;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(pos);
          
          if (isMapReady && !mapError && mapRef.current) {
            initMap(pos);
          }
        },
        (err) => {
          console.error("Location error", err);
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [active, isMapReady, mapError]);

  const initMap = (pos: {lat: number, lng: number}) => {
    if (!window.google || !mapRef.current) return;
    
    // Check if map is already initialized
    if (mapRef.current.children.length > 0) return;
    
    try {
        const map = new window.google.maps.Map(mapRef.current, {
            center: pos,
            zoom: 18,
            styles: LUMEN_MAP_STYLE,
            disableDefaultUI: true,
            backgroundColor: 'transparent',
            gestureHandling: 'none', // Keep map static for HUD feel
        });

        new window.google.maps.Marker({
            position: pos,
            map: map,
            title: "You are here",
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#f97316", // Orange-500
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white",
            }
        });
    } catch (e) {
        console.error("Error initializing map:", e);
    }
  };

  if (!active) return null;

  const showFallback = mapError;

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end pointer-events-none">
      
      {/* 1. HUD Overlay (Always Visible in Navigation Mode) */}
      <div className="absolute top-24 left-4 right-4 pointer-events-auto">
          <div className="bg-orange-600/20 border border-orange-500/50 backdrop-blur-sm rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                  <Navigation className="text-orange-500 animate-pulse" size={24} />
                  <h3 className="text-orange-400 font-bold uppercase text-sm tracking-wider">Micro Guidance Active</h3>
              </div>
              <p className="text-white text-lg font-medium leading-snug">
                  "Scanning path... I can see the walkway ahead. Proceed with caution."
              </p>
          </div>
      </div>

      {/* 2. Map Container (Bottom Sheet Style) */}
      <div className="h-1/3 w-full bg-gray-900/90 border-t border-orange-500/30 relative pointer-events-auto transition-all duration-500">
        
        {/* State: Ready (Show Map) */}
        {!showFallback && isMapReady && (
            <div ref={mapRef} className="w-full h-full opacity-90" />
        )}

        {/* State: Loading */}
        {!showFallback && !isMapReady && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-2">
                    <MapPin className="text-orange-500 animate-bounce" size={32} />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-orange-500/50 blur-sm rounded-full"></div>
                </div>
                <p className="text-white font-bold text-lg">Loading Map...</p>
                <p className="text-gray-400 text-sm mt-1">Acquiring satellite data...</p>
            </div>
        )}

        {/* State: Error (Fallback UI) */}
        {showFallback && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gray-900">
                <div className="flex items-center gap-4 mb-4">
                    <ShieldAlert className="text-yellow-500" size={32} />
                    <Eye className="text-orange-500" size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Visual Navigation Only</h3>
                <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                   Maps Unavailable (Check API Key).<br/>
                   Using <strong>Camera Vision</strong> and <strong>GPS Coordinates</strong> to guide you.
                </p>
                
                {location && (
                    <div className="mt-4 px-3 py-1 bg-white/5 rounded text-[10px] font-mono text-orange-400/70 border border-white/10">
                        LAT: {location.lat.toFixed(5)} | LNG: {location.lng.toFixed(5)}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};