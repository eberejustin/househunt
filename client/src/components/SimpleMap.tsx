import { useEffect, useRef, useCallback } from "react";
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
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface SimpleMapProps {
  selectedApartmentId: string | null;
  onSelectApartment: (id: string | null) => void;
  onAddApartment: () => void;
}

export default function SimpleMap({
  selectedApartmentId,
  onSelectApartment,
  onAddApartment,
}: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const { toast } = useToast();

  const {
    data: apartments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/apartments"],
    retry: false,
  });

  // Debug apartments loading
  useEffect(() => {
    console.log('Apartments query state changed:', { 
      isLoading, 
      hasApartments: !!apartments, 
      apartmentsLength: apartments ? apartments.length : 0,
      apartmentsData: apartments 
    });
  }, [apartments, isLoading]);

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

  // Function to add apartment markers
  const addApartmentMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    console.log('addApartmentMarkers called with:', { 
      mapAvailable: !!map, 
      apartmentsAvailable: !!apartments, 
      apartmentsLength: apartments ? apartments.length : 0,
      apartmentsType: typeof apartments
    });
    
    if (!map || !apartments) {
      console.log("Cannot add markers - map or apartments not available:", {
        map: !!map,
        apartments: !!apartments,
      });
      return;
    }

    console.log("Adding apartment markers...");

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    const apartmentsArray = apartments as ApartmentWithDetails[];
    console.log("Processing apartments array:", apartmentsArray);

    apartmentsArray.forEach((apartment) => {
      console.log("Adding marker for apartment:", apartment);
      console.log(
        "Apartment coordinates:",
        apartment.latitude,
        apartment.longitude,
      );

      try {
        // Create a custom conspicuous marker icon
        console.log("Creating custom icon...");
        const customIcon = L.divIcon({
          className: "conspicuous-apartment-marker",
          html: `
            <div class="marker-circle">
              <div class="marker-icon">🏠</div>
            </div>
            <div class="marker-label">${apartment.label}</div>
          `,
          iconSize: [60, 80],
          iconAnchor: [30, 40],
        });
        console.log("Custom icon created:", customIcon);

        console.log("Creating marker...");
        const marker = L.marker([apartment.latitude, apartment.longitude], {
          icon: customIcon,
          zIndexOffset: 1000,
        });

        console.log("Adding marker to map...");
        marker.addTo(map);
        console.log("Marker added successfully");

        // Verify marker was added
        setTimeout(() => {
          const divIcons = document.getElementsByClassName("leaflet-div-icon");
          console.log("Number of div icons on page:", divIcons.length);
          const conspicuousMarkers = document.getElementsByClassName(
            "conspicuous-apartment-marker",
          );
          console.log(
            "Number of conspicuous markers:",
            conspicuousMarkers.length,
          );
        }, 100);

        const popupContent = `
          <div class="p-3 min-w-[220px]">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-semibold text-lg text-gray-800">${apartment.label}</h3>
              ${apartment.isFavorited ? '<span class="text-red-500 text-xl">❤️</span>' : ""}
            </div>
            <p class="text-sm text-gray-600 mb-3">${apartment.address}</p>
            <div class="flex justify-between items-center text-sm mb-2">
              <span class="text-green-600 font-medium text-base">
                ${apartment.rent ? `$${apartment.rent}/mo` : "Rent TBD"}
              </span>
              <span class="text-blue-600 font-medium">
                ${apartment.bedrooms || "Bedrooms TBD"}
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
        marker.on("click", () => {
          onSelectApartment(apartment.id);
          // Add a bounce effect when clicked
          const element = marker.getElement();
          if (element) {
            const markerCircle = element.querySelector(".marker-circle");
            if (markerCircle) {
              markerCircle.style.animation =
                "bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)";
              setTimeout(() => {
                if (markerCircle) markerCircle.style.animation = "";
              }, 600);
            }
          }
        });

        markersRef.current[apartment.id] = marker;
      } catch (error) {
        console.error(
          "Error creating custom marker, falling back to default:",
          error,
        );
        // Fallback to a simple bright marker if custom fails
        const marker = L.marker([apartment.latitude, apartment.longitude]);
        marker.addTo(map);
        markersRef.current[apartment.id] = marker;
      }
    });

    // Auto-center map on the first apartment if available
    if (apartmentsArray.length > 0) {
      const firstApartment = apartmentsArray[0];
      map.setView([firstApartment.latitude, firstApartment.longitude], 14);
    }
  }, [apartments, onSelectApartment]);

  // Initialize map once
  useEffect(() => {
    const initializeMap = () => {
      console.log("Map useEffect triggered", {
        mapRefCurrent: !!mapRef.current,
        mapInstanceRefCurrent: !!mapInstanceRef.current,
      });

      if (!mapRef.current) {
        console.log("No mapRef.current available, retrying...");
        // Retry after a short delay
        setTimeout(initializeMap, 100);
        return;
      }

      if (mapInstanceRef.current) {
        console.log("Map already initialized");
        return;
      }

      console.log("Initializing map...");
      console.log("Map container dimensions:", {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        display: window.getComputedStyle(mapRef.current).display,
      });

      try {
        const map = L.map(mapRef.current, {
          center: [40.7128, -74.006],
          zoom: 13,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        console.log("Map created, adding tile layer...");

        const tileLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
          },
        );

        tileLayer.addTo(map);

        tileLayer.on("loading", () => console.log("Tiles loading..."));
        tileLayer.on("load", () => console.log("Tiles loaded"));

        console.log("Tile layer added");

        mapInstanceRef.current = map;

        // Force map resize after a short delay
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log("Map size invalidated");

            // Map is ready, markers will be added when apartments data loads
            console.log("Map is ready, markers will be added when apartments data loads...");
          }
        }, 200);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    // Start initialization with a small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        console.log("Cleaning up map");
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when apartments data changes (only if map is ready)
  useEffect(() => {
    console.log("Marker update effect triggered");
    // Only call addApartmentMarkers if both map and apartments are available
    if (mapInstanceRef.current && apartments) {
      console.log("Both map and apartments ready, adding markers...");
      addApartmentMarkers();
    } else {
      console.log("Waiting for map or apartments:", {
        map: !!mapInstanceRef.current,
        apartments: !!apartments,
      });
    }
  }, [apartments, addApartmentMarkers]);

  // Focus on selected apartment
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedApartmentId || !apartments) return;

    const apartmentsArray = apartments as ApartmentWithDetails[];
    const apartment = apartmentsArray.find((a) => a.id === selectedApartmentId);
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
    <div
      className="flex-1 relative"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div
        ref={mapRef}
        className="w-full h-[calc(100vh-64px)]"
        data-testid="map-container"
        style={{
          minHeight: "400px",
          height: "calc(100vh - 64px)",
          width: "100%",
          background: "#f0f0f0",
          position: "relative",
          zIndex: 0,
          flex: 1,
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
