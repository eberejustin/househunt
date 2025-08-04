import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ApartmentWithDetails } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

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

interface SimpleMapProps {
  selectedApartmentId: string | null;
  onSelectApartment: (id: string | null) => void;
  onAddApartment: () => void;
}

export default function SimpleMap({ selectedApartmentId, onSelectApartment, onAddApartment }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const { toast } = useToast();

  const { data: apartments, isLoading, error } = useQuery({
    queryKey: ['/api/apartments'],
    retry: false,
  });

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
    }
  }, [error, toast]);

  // Initialize map once
  useEffect(() => {
    const initializeMap = () => {
      console.log('Map useEffect triggered', { 
        mapRefCurrent: !!mapRef.current, 
        mapInstanceRefCurrent: !!mapInstanceRef.current 
      });

      if (!mapRef.current) {
        console.log('No mapRef.current available, retrying...');
        // Retry after a short delay
        setTimeout(initializeMap, 100);
        return;
      }

      if (mapInstanceRef.current) {
        console.log('Map already initialized');
        return;
      }

      console.log('Initializing map...');
      console.log('Map container dimensions:', {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        display: window.getComputedStyle(mapRef.current).display
      });
      
      try {
        const map = L.map(mapRef.current, {
          center: [40.7128, -74.0060],
          zoom: 13,
          zoomControl: true,
          scrollWheelZoom: true
        });
        
        console.log('Map created, adding tile layer...');
        
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        });
        
        tileLayer.addTo(map);
        
        tileLayer.on('loading', () => console.log('Tiles loading...'));
        tileLayer.on('load', () => console.log('Tiles loaded'));

        console.log('Tile layer added');

        mapInstanceRef.current = map;

        // Force map resize after a short delay
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('Map size invalidated');
          }
        }, 200);

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Start initialization with a small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        console.log('Cleaning up map');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when apartments data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !apartments) {
      console.log('Map or apartments not available:', { map: !!map, apartments: !!apartments, apartmentsData: apartments });
      return;
    }

    console.log('Updating map markers with apartments:', apartments);

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    // Add new markers
    const apartmentsArray = apartments as ApartmentWithDetails[];
    console.log('Processing apartments array:', apartmentsArray);
    
    apartmentsArray.forEach((apartment) => {
      console.log('Adding marker for apartment:', apartment);
      const marker = L.marker([apartment.latitude, apartment.longitude]).addTo(map);
      
      const popupContent = `
        <div class="p-2 min-w-48">
          <h4 class="font-semibold text-sm mb-1">${apartment.label}</h4>
          <p class="text-xs text-neutral-600 mb-2">${apartment.address}</p>
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-primary">${apartment.rent || 'N/A'}</span>
            <span class="text-neutral-500">${apartment.bedrooms || 'N/A'} beds</span>
          </div>
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200">
            <span class="text-xs text-accent">
              💬 ${apartment.commentCount || 0} comments
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      marker.on('click', () => {
        onSelectApartment(apartment.id);
      });

      markersRef.current[apartment.id] = marker;
    });
    
    // Auto-center map on the first apartment if available
    if (apartmentsArray.length > 0) {
      const firstApartment = apartmentsArray[0];
      map.setView([firstApartment.latitude, firstApartment.longitude], 14);
    }
  }, [apartments, onSelectApartment]);

  // Focus on selected apartment
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedApartmentId || !apartments) return;

    const apartmentsArray = apartments as ApartmentWithDetails[];
    const apartment = apartmentsArray.find(a => a.id === selectedApartmentId);
    if (apartment) {
      map.setView([apartment.latitude, apartment.longitude], 16);
    }
  }, [selectedApartmentId, apartments]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-neutral-600">Loading apartments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative" style={{ display: 'flex', flexDirection: 'column' }}>
      <div 
        ref={mapRef} 
        className="w-full h-[calc(100vh-64px)]" 
        data-testid="map-container"
        style={{ 
          minHeight: '400px', 
          height: 'calc(100vh - 64px)',
          width: '100%',
          background: '#f0f0f0',
          position: 'relative',
          zIndex: 0,
          flex: 1
        }}
      />
      
      {/* Add Apartment Button */}
      <Button
        onClick={onAddApartment}
        className="absolute bottom-6 right-6 z-[1000] shadow-lg"
        size="lg"
        data-testid="button-add-apartment"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Apartment
      </Button>
    </div>
  );
}