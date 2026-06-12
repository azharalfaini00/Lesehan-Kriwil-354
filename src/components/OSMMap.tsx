import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, MapPin, Navigation, Info, Loader2 } from 'lucide-react';

interface OSMMapProps {
  branchCoords: [number, number];
  branchName: string;
  deliveryCoords: [number, number] | null;
  onSelectCoords: (coords: [number, number], addressName: string) => void;
}

export default function OSMMap({
  branchCoords,
  branchName,
  deliveryCoords,
  onSelectCoords,
}: OSMMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const branchMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Custom Markers using elegant SVG HTML DivIcons
  const branchIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 border-2 border-amber-500 shadow-xl text-amber-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
        <span class="absolute -top-1 -right-1 flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
      </div>
    `,
    className: 'custom-leaflet-branch-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const deliveryIcon = L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 border-2 border-white shadow-lg text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    `,
    className: 'custom-leaflet-delivery-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  // Reverse Geocode helper
  const reverseGeocode = async (lat: number, lon: number) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'id,id-ID;q=0.9,en;q=0.8',
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const IndonesianAddress = data.display_name || `Koordinat: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        onSelectCoords([lat, lon], IndonesianAddress);
      } else {
        onSelectCoords([lat, lon], `Sektor Jalan (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
      }
    } catch (e) {
      onSelectCoords([lat, lon], `Sektor Jalan (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Handle Search Input Submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'id,id-ID;q=0.9,en;q=0.8',
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle suggestion selection
  const selectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 16);
    }
    
    onSelectCoords([lat, lon], item.display_name);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Get Current GPS Location of User
  const locateUserCurrentPos = () => {
    if (!navigator.geolocation) {
      alert('Maaf, penunjuk lokasi tidak didukung oleh browser Anda.');
      return;
    }

    setIsReverseGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
        }
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error('Error getting location', error);
        alert('Gagal mendapatkan lokasi Anda. Izinkan akses GPS atau ketuk peta secara manual.');
        setIsReverseGeocoding(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Effect to initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map
    const initialCenter = deliveryCoords || branchCoords;
    const initialZoom = deliveryCoords ? 14 : L.Browser.mobile ? 12 : 13;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false, // will add customized styled ones later
    });

    // Add standard styled OpenStreetMap TileLayer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap kontributor',
      maxZoom: 19,
    }).addTo(map);

    // Zoom buttons repositioned for styling
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    // Add Branch Marker
    const bMarker = L.marker(branchCoords, { icon: branchIcon })
      .addTo(map)
      .bindPopup(`<strong class="text-neutral-900">${branchName}</strong><br/><span class="text-xs text-neutral-500">Tempat pengiriman pesanan Anda</span>`);
    branchMarkerRef.current = bMarker;

    // Click handler to select delivery location
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      reverseGeocode(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Branch Marker and map view when the selected branch changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Update branch marker position
    if (branchMarkerRef.current) {
      branchMarkerRef.current.setLatLng(branchCoords);
      branchMarkerRef.current.setPopupContent(
        `<strong class="text-neutral-900">${branchName}</strong><br/><span class="text-xs text-neutral-500 text-center">Tempat pengiriman pesanan Anda</span>`
      );
    }

    // Adjust map bounds if both deliveryCoords and branchCoords exist, otherwise fly to branch
    if (deliveryCoords) {
      const bounds = L.latLngBounds([branchCoords, deliveryCoords]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      mapRef.current.setView(branchCoords, 14);
    }
  }, [branchCoords, branchName]);

  // Effect to manage Delivery Marker and Polyline Connection line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Manage Delivery Pin Marker
    if (deliveryCoords) {
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setLatLng(deliveryCoords);
      } else {
        deliveryMarkerRef.current = L.marker(deliveryCoords, { icon: deliveryIcon })
          .addTo(map)
          .bindPopup('<strong class="text-orange-600">Lokasi Pengantaran Anda</strong>');
      }

      // 2. Manage Route Line
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs([branchCoords, deliveryCoords]);
      } else {
        routeLineRef.current = L.polyline([branchCoords, deliveryCoords], {
          color: '#f97316',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.8,
        }).addTo(map);
      }
    } else {
      // Remove delivery marker if null
      if (deliveryMarkerRef.current) {
        map.removeLayer(deliveryMarkerRef.current);
        deliveryMarkerRef.current = null;
      }
      // Remove line
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
    }
  }, [deliveryCoords, branchCoords]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      {/* Search Header Container */}
      <div className="p-3 border-b border-neutral-100 bg-neutral-50/50">
        <form onSubmit={handleSearch} className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              id="search-address-input"
              type="text"
              placeholder="Cari jalan, gedung, atau area pengantaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-orange-500" />
            )}
          </div>
          <button
            id="search-submit-btn"
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition shadow-sm"
          >
            Cari
          </button>
          
          <button
            id="gps-locate-btn"
            type="button"
            onClick={locateUserCurrentPos}
            className="p-2 bg-white border border-neutral-200 text-neutral-700 hover:text-orange-600 rounded-xl hover:bg-neutral-50 transition shadow-sm"
            title="Gunakan Lokasi GPS Saya"
          >
            <Navigation className="h-5 w-5" />
          </button>
        </form>

        {/* Suggestion Dropdown */}
        {searchResults.length > 0 && (
          <div id="search-results-dropdown" className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg divide-y divide-neutral-100">
            {searchResults.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectSearchResult(item)}
                className="w-full px-4 py-2.5 text-left text-xs text-neutral-700 hover:bg-orange-50/50 transition flex gap-2 items-start"
              >
                <MapPin className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Embed Container */}
      <div className="relative flex-1 min-h-[280px]">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Floating loading overlay for GPS locating or Geocoding */}
        {(isReverseGeocoding) && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[500] flex items-center justify-center">
            <div className="bg-neutral-900 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 text-xs font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
              Menentukan Lokasi...
            </div>
          </div>
        )}

        {/* Dynamic click guidance helper tip */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-neutral-100 text-[11px] text-neutral-600 px-3 py-1.5 rounded-lg shadow-sm font-medium select-none pointer-events-none z-[450] flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-orange-500" />
          Ketuk peta untuk menentukan titik antar
        </div>
      </div>
    </div>
  );
}
