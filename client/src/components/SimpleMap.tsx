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
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([40.7128, -74.0060], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
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
          <p className="text-sm text-neutral-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div ref={mapRef} className="w-full h-[calc(100vh-64px)]" data-testid="map-container" />
      
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