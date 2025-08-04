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
      
      // Create a custom conspicuous marker icon
      const customIcon = L.divIcon({
        className: 'custom-apartment-marker',
        html: `
          <div style="
            background: linear-gradient(45deg, #FF6B6B, #FF8E8E);
            border: 4px solid #FFFFFF;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 4px rgba(255,107,107,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transform: scale(1);
            transition: all 0.3s ease;
            position: relative;
            z-index: 1000;
          ">
            <div style="
              color: white;
              font-weight: bold;
              font-size: 20px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
            ">🏠</div>
          </div>
          <div style="
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #FF6B6B, #FF4757);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            margin-top: 6px;
            border: 2px solid white;
          ">${apartment.label}</div>
        `,
        iconSize: [50, 80],
        iconAnchor: [25, 40]
      });

      const marker = L.marker([apartment.latitude, apartment.longitude], { 
        icon: customIcon,
        zIndexOffset: 1000
      }).addTo(map);
      
      const popupContent = `
        <div class="p-3 min-w-[220px]">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-lg text-gray-800">${apartment.label}</h3>
            ${apartment.isFavorited ? '<span class="text-red-500 text-xl">❤️</span>' : ''}
          </div>
          <p class="text-sm text-gray-600 mb-3">${apartment.address}</p>
          <div class="flex justify-between items-center text-sm mb-2">
            <span class="text-green-600 font-medium text-base">
              ${apartment.rent ? `$${apartment.rent}/mo` : 'Rent TBD'}
            </span>
            <span class="text-blue-600 font-medium">
              ${apartment.bedrooms || 'Bedrooms TBD'}
            </span>
          </div>
          <div class="mt-3 pt-2 border-t border-gray-200">
            <span class="text-sm text-purple-600 font-medium">
              💬 ${apartment.commentCount || 0} comments
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      // Enhanced marker interactions
      marker.on('click', () => {
        onSelectApartment(apartment.id);
        // Add a bounce effect when clicked
        const element = marker.getElement();
        if (element) {
          const markerDiv = element.querySelector('div');
          if (markerDiv) {
            markerDiv.style.animation = 'bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => {
              if (markerDiv) markerDiv.style.animation = '';
            }, 600);
          }
        }
      });

      // Hover effects for better interactivity
      marker.on('mouseover', () => {
        const element = marker.getElement();
        if (element) {
          const markerDiv = element.querySelector('div');
          if (markerDiv) {
            markerDiv.style.transform = 'scale(1.15)';
            markerDiv.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5), 0 0 0 6px rgba(255,107,107,0.5)';
          }
        }
      });

      marker.on('mouseout', () => {
        const element = marker.getElement();
        if (element) {
          const markerDiv = element.querySelector('div');
          if (markerDiv) {
            markerDiv.style.transform = 'scale(1)';
            markerDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 0 0 4px rgba(255,107,107,0.3)';
          }
        }
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