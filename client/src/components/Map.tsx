import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Crosshair, Layers, Car, Train } from "lucide-react";
import type { ApartmentWithDetails } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { fetchTransitData, getMapBounds, type TransitStation, type TransitLine } from "@/lib/transitService";

// Leaflet imports
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapProps {
  selectedApartmentId: string | null;
  onSelectApartment: (id: string | null) => void;
  onAddApartment: () => void;
}

export default function Map(props: MapProps) {
  const { 
    selectedApartmentId = null, 
    onSelectApartment = () => {}, 
    onAddApartment = () => {} 
  } = props || {};
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const transitLayerRef = useRef<L.LayerGroup | null>(null);
  const [showTransit, setShowTransit] = useState(false);
  const [isLoadingTransit, setIsLoadingTransit] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apartments, isLoading, error } = useQuery({
    queryKey: ['/api/apartments'],
    retry: false,
  });

  const apartmentsArray = apartments as ApartmentWithDetails[] || [];

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [error, toast]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([40.7128, -74.0060], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize transit layer
    transitLayerRef.current = L.layerGroup();
    
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (transitLayerRef.current) {
        transitLayerRef.current = null;
      }
    };
  }, []);

  // Update markers when apartments change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !apartmentsArray) return;

    // Clear existing markers
    markersRef.current.forEach((marker: L.Marker) => map.removeLayer(marker));
    markersRef.current.clear();

    // Add new markers
    apartmentsArray.forEach((apartment: ApartmentWithDetails) => {
      const isSelected = apartment.id === selectedApartmentId;
      const hasComments = apartment.commentCount > 0;
      
      // Create custom marker icon
      const markerIcon = L.divIcon({
        className: `apartment-marker ${hasComments ? 'has-discussion' : ''} ${isSelected ? 'selected' : ''}`,
        html: hasComments ? `<div class="marker-pulse"></div>` : '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([apartment.latitude, apartment.longitude], { 
        icon: markerIcon 
      }).addTo(map);

      const popupContent = `
        <div class="p-2 min-w-48">
          <h4 class="font-semibold text-sm mb-1">${apartment.label}</h4>
          <p class="text-xs text-neutral-600 mb-2">${apartment.address}</p>
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-primary">${apartment.rent || 'N/A'}</span>
            <span class="text-neutral-500">${apartment.bedrooms || 'N/A'}</span>
          </div>
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200">
            <span class="text-xs text-accent">
              💬 ${apartment.commentCount} comments
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      marker.on('click', () => {
        onSelectApartment(apartment.id);
      });

      markersRef.current.set(apartment.id, marker);
    });
  }, [apartmentsArray, selectedApartmentId, onSelectApartment]);

  // Focus on selected apartment
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedApartmentId || !apartmentsArray) return;

    const apartment = apartmentsArray.find((a: ApartmentWithDetails) => a.id === selectedApartmentId);
    if (apartment) {
      map.setView([apartment.latitude, apartment.longitude], 16);
    }
  }, [selectedApartmentId, apartmentsArray]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws: WebSocket;
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'apartment_created':
          case 'apartment_updated':
          case 'apartment_deleted':
          case 'comment_created':
          case 'comment_deleted':
          case 'favorite_toggled':
            // Invalidate and refetch apartments
            queryClient.invalidateQueries({ queryKey: ['/api/apartments'] });
            break;
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [queryClient]);

  const centerMap = () => {
    const map = mapInstanceRef.current;
    if (map && apartmentsArray && apartmentsArray.length > 0) {
      const group = new L.FeatureGroup(Array.from(markersRef.current.values()));
      map.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // Load transit data for current map view
  const loadTransitData = async () => {
    const map = mapInstanceRef.current;
    const transitLayer = transitLayerRef.current;
    
    if (!map || !transitLayer) return;

    setIsLoadingTransit(true);
    
    try {
      const bounds = getMapBounds(map);
      const { stations, lines } = await fetchTransitData(bounds);

      // Clear existing transit data
      transitLayer.clearLayers();

      // Add train lines
      lines.forEach((line: TransitLine) => {
        const polyline = L.polyline(line.coordinates, {
          color: line.color,
          weight: 3,
          opacity: 0.8
        });

        polyline.bindPopup(`
          <div class="p-2">
            <h4 class="font-semibold text-sm">${line.name}</h4>
            <p class="text-xs text-neutral-600 capitalize">${line.type} line</p>
          </div>
        `);

        transitLayer.addLayer(polyline);
      });

      // Add train stations
      stations.forEach((station: TransitStation) => {
        const stationIcon = L.divIcon({
          className: `transit-station ${station.type}`,
          html: getStationIcon(station.type),
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([station.lat, station.lng], {
          icon: stationIcon
        });

        marker.bindPopup(`
          <div class="p-2">
            <h4 class="font-semibold text-sm">${station.name}</h4>
            <p class="text-xs text-neutral-600 capitalize">${station.type} station</p>
            ${station.line ? `<p class="text-xs text-neutral-500">Line: ${station.line}</p>` : ''}
          </div>
        `);

        transitLayer.addLayer(marker);
      });

      toast({
        title: "Transit data loaded",
        description: `Found ${stations.length} stations and ${lines.length} lines`,
      });

    } catch (error) {
      console.error('Error loading transit data:', error);
      toast({
        title: "Error loading transit data",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransit(false);
    }
  };

  // Get station icon based on type
  const getStationIcon = (type: string) => {
    switch (type) {
      case 'subway':
        return '🚇';
      case 'train':
        return '🚂';
      case 'bus':
        return '🚌';
      default:
        return '🚉';
    }
  };

  // Toggle transit overlay
  const toggleTransit = async () => {
    const map = mapInstanceRef.current;
    const transitLayer = transitLayerRef.current;
    
    if (!map || !transitLayer) return;

    if (showTransit) {
      // Hide transit layer
      map.removeLayer(transitLayer);
      setShowTransit(false);
    } else {
      // Show transit layer and load data if not already loaded
      map.addLayer(transitLayer);
      setShowTransit(true);
      
      // Load data if layer is empty
      if (!transitLayer.getLayers().length) {
        await loadTransitData();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 relative bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-neutral-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div 
        ref={mapRef} 
        className="w-full h-[calc(100vh-64px)]"
        data-testid="map-container"
      />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <Button 
          variant="outline" 
          size="icon"
          onClick={centerMap}
          className="bg-white shadow-lg hover:bg-neutral-50"
          title="Center map"
          data-testid="button-center-map"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={toggleTransit}
          className={`bg-white shadow-lg hover:bg-neutral-50 ${showTransit ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
          title="Toggle transit overlay"
          data-testid="button-toggle-transit"
          disabled={isLoadingTransit}
        >
          {isLoadingTransit ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          ) : (
            <Train className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Add Apartment FAB */}
      <Button
        onClick={onAddApartment}
        className="fixed bottom-6 right-6 bg-primary hover:bg-blue-600 shadow-lg rounded-full w-14 h-14 p-0"
        title="Add apartment"
        data-testid="button-add-apartment-fab"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <style>{`
        .apartment-marker {
          background: hsl(207, 90%, 54%);
          border: 3px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
        }
        
        .apartment-marker.has-discussion {
          background: hsl(142, 71%, 45%);
        }
        
        .apartment-marker.selected {
          background: hsl(25, 95%, 53%);
          transform: scale(1.2);
        }
        
        .apartment-marker.has-discussion .marker-pulse {
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border: 2px solid hsl(142, 71%, 45%);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .transit-station {
          background: white;
          border: 2px solid #666;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        }
        
        .transit-station.train {
          border-color: #FF6B35;
          background: #FFF2ED;
        }
        
        .transit-station.subway {
          border-color: #1E3A8A;
          background: #EFF6FF;
        }
        
        .transit-station.bus {
          border-color: #059669;
          background: #ECFDF5;
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
