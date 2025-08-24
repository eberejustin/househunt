import { useEffect, useRef, useCallback, useState } from "react";
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
  isVisible?: boolean; // Add prop to track visibility for mobile
}

export default function SimpleMap({
  selectedApartmentId,
  onSelectApartment,
  onAddApartment,
  isVisible = true,
}: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [isMapReady, setIsMapReady] = useState(false);
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
    console.log("Apartments query state changed:", {
      isLoading,
      hasApartments: !!apartments,
      apartmentsLength:
        apartments && Array.isArray(apartments) ? apartments.length : 0,
      apartmentsData: apartments,
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

  // Function to add apartment markers with simple default style
  const addApartmentMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    console.log("addApartmentMarkers called with:", {
      mapAvailable: !!map,
      apartmentsAvailable: !!apartments,
      apartmentsLength:
        apartments && Array.isArray(apartments) ? apartments.length : 0,
      apartmentsType: typeof apartments,
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
        // Create marker with custom icon for deleted apartments
        console.log("Creating marker...");
        let marker;

        if (apartment.isDeleted) {
          // Grey circular marker for deleted apartments
          const greyIcon = L.divIcon({
            className: "custom-marker-grey",
            html: '<div style="background-color: #9CA3AF; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; background-color: #6B7280; border-radius: 50%;"></div></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
          });
          marker = L.marker([apartment.latitude, apartment.longitude], {
            icon: greyIcon,
          });
        } else if (apartment.isFavorited) {
          // Red heart icon for favorited apartments
          const heartIcon = L.divIcon({
            className: "custom-marker-heart",
            html: '<div style="font-size: 24px; color: #ef4444; text-shadow: 0 0 3px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; width: 25px; height: 25px;">❤️</div>',
            iconSize: [25, 25],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
          });
          marker = L.marker([apartment.latitude, apartment.longitude], {
            icon: heartIcon,
          });
        } else {
          // Default blue marker for active apartments
          marker = L.marker([apartment.latitude, apartment.longitude]);
        }

        console.log("Adding marker to map...");
        marker.addTo(map);
        console.log("Marker added successfully");

        const popupContent = `
          <div style="padding: 12px; min-width: 200px; ${apartment.isDeleted ? "opacity: 0.7; background-color: #f9fafb;" : ""}">
            <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 8px;">
              <h3 style="font-weight: 600; font-size: 16px; color: ${apartment.isDeleted ? "#9CA3AF" : "#374151"}; margin: 0; ${apartment.isDeleted ? "text-decoration: line-through;" : ""}">${apartment.label}</h3>
              ${apartment.isFavorited ? '<span style="color: #ef4444; font-size: 18px;">❤️</span>' : ""}
              ${apartment.isDeleted ? '<span style="color: #9CA3AF; font-size: 14px; margin-left: 8px;">DELETED</span>' : ""}
            </div>
            <p style="font-size: 14px; color: ${apartment.isDeleted ? "#9CA3AF" : "#6b7280"}; margin: 0 0 12px 0; ${apartment.isDeleted ? "text-decoration: line-through;" : ""}">${apartment.address}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-bottom: 8px;">
              <span style="color: ${apartment.isDeleted ? "#9CA3AF" : "#059669"}; font-weight: 500;">
                ${apartment.rent ? `$${apartment.rent}/mo` : "Rent TBD"}
              </span>
              <span style="color: ${apartment.isDeleted ? "#9CA3AF" : "#2563eb"}; font-weight: 500;">
                ${
                  apartment.bedrooms
                    ? `${apartment.bedrooms}${apartment.bathrooms ? `/${apartment.bathrooms} BA` : ""}`
                    : "Bedrooms TBD"
                }
              </span>
            </div>
            <div style="text-align: center; margin-bottom: 8px;">
              <span style="background-color: ${apartment.isDeleted ? "#9CA3AF" : "#dbeafe"}; color: ${apartment.isDeleted ? "#6b7280" : "#1e40af"}; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">${apartment.status || "Not started"}</span>
            </div>
            ${
              apartment.labels && apartment.labels.length > 0
                ? `
              <div style="margin: 8px 0;">
                ${apartment.labels
                  .slice(0, 3)
                  .map(
                    (label) =>
                      `<span style="display: inline-block; background-color: ${apartment.isDeleted ? "#9CA3AF" : label.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px; margin-bottom: 2px; ${apartment.isDeleted ? "text-decoration: line-through;" : ""}">${label.name}</span>`,
                  )
                  .join("")}
                ${apartment.labels.length > 3 ? `<span style="font-size: 11px; color: #6b7280;">+${apartment.labels.length - 3} more</span>` : ""}
              </div>
            `
                : ""
            }
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <span style="font-size: 14px; color: ${apartment.isDeleted ? "#9CA3AF" : "#7c3aed"}; font-weight: 500;">
                💬 ${apartment.commentCount || 0} comments
              </span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Marker click event to select apartment
        marker.on("click", () => {
          onSelectApartment(apartment.id);
        });

        markersRef.current[apartment.id] = marker;
      } catch (error) {
        console.error("Error creating marker:", error);
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

            // Mark map as ready
            setIsMapReady(true);
            console.log("Map is ready, state updated");
          }
        }, 200);

        // Additional resize handling for mobile
        const handleResize = () => {
          if (mapInstanceRef.current) {
            setTimeout(() => {
              mapInstanceRef.current?.invalidateSize();
            }, 100);
          }
        };

        window.addEventListener("resize", handleResize);

        // Clean up resize listener
        return () => {
          window.removeEventListener("resize", handleResize);
        };
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

  // Update markers when either map becomes ready OR apartments data changes
  useEffect(() => {
    console.log("Marker update effect triggered", {
      isMapReady,
      hasApartments: !!apartments,
    });

    if (isMapReady && apartments) {
      console.log("Both map and apartments ready, adding markers...");
      addApartmentMarkers();
    } else {
      console.log("Waiting for map or apartments:", {
        mapReady: isMapReady,
        apartments: !!apartments,
      });
    }
  }, [isMapReady, apartments, addApartmentMarkers]);

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

  // Handle visibility changes (for mobile view switching)
  useEffect(() => {
    if (isVisible && mapInstanceRef.current) {
      // Force map resize when becoming visible
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          console.log("Map invalidated due to visibility change");
        }
      }, 100);
    }
  }, [isVisible]);

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
    <div className="relative flex-1 h-full bg-neutral-100">
      <div
        ref={mapRef}
        className="w-full h-full"
        data-testid="map-container"
        style={{
          minHeight: "400px",
          height: "100%",
          width: "100%",
          background: "#f0f0f0",
          position: "relative",
          zIndex: 0,
          flex: 1,
          display: "block",
        }}
      />

      {/* Add Apartment Button */}
      <Button
        onClick={onAddApartment}
        className="hidden absolute bottom-6 right-6 z-[1000] shadow-lg"
        size="lg"
        data-testid="button-add-apartment"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Apartment
      </Button>
    </div>
  );
}
