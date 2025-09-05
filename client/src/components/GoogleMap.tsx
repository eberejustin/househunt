import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Train, Crosshair } from "lucide-react";
import type { ApartmentWithDetails } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader } from "@googlemaps/js-api-loader";

interface GoogleMapProps {
  selectedApartmentId: string | null;
  onSelectApartment: (id: string | null) => void;
  onAddApartment: () => void;
  isVisible?: boolean;
}

export default function GoogleMap({
  selectedApartmentId,
  onSelectApartment,
  onAddApartment,
  isVisible = true,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{
    [key: string]: google.maps.marker.AdvancedMarkerElement;
  }>({});
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [isLoadingTransit, setIsLoadingTransit] = useState(false);
  const { toast } = useToast();

  const {
    data: apartments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/apartments"],
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

  // Initialize Google Maps
  useEffect(() => {
    console.log("Google maps use effect triggered", {
      mapRefCurrent: !!mapRef.current,
      mapInstanceRefCurrent: !!mapInstanceRef.current,
    });

    const initializeMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        // Fetch API key from backend
        const response = await fetch("/api/config/google-maps-key");
        if (!response.ok) {
          throw new Error("Failed to fetch Google Maps API key");
        }
        const { apiKey } = await response.json();

        console.log(
          "Google Maps API Key available:",
          !!apiKey,
          "Length:",
          apiKey.length
        );

        if (!apiKey) {
          throw new Error("Google Maps API key is not available.");
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: "weekly",
          libraries: ["places", "geometry", "marker"],
        });

        const { Map } = await loader.importLibrary("maps");
        const { AdvancedMarkerElement } = await loader.importLibrary("marker");

        const map = new Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 13,
          mapId: "DEMO_MAP_ID", // Required for advanced markers
        });

        // Initialize transit and traffic layers
        transitLayerRef.current = new google.maps.TransitLayer();
        trafficLayerRef.current = new google.maps.TrafficLayer();

        mapInstanceRef.current = map;
        setIsMapReady(true);

        console.log("Google Maps initialized successfully");
      } catch (error) {
        console.error("Error initializing Google Maps:", error);
        toast({
          title: "Error loading Google Maps",
          description: "Please check your API key and try again",
          variant: "destructive",
        });
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Function to add apartment markers
  const addApartmentMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !apartments) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = {};

    const apartmentsArray = apartments as ApartmentWithDetails[];

    apartmentsArray.forEach((apartment) => {
      try {
        let markerContent: HTMLElement | null = null;

        // Custom styling based on apartment status
        if (apartment.isDeleted) {
          markerContent = document.createElement("div");
          markerContent.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000" width="20" height="20">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM17 12.5c0 .28-.22.5-.5.5h-9c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5h9c.28 0 .5.22.5.5v1zM8.5 8C7.67 8 7 7.33 7 6.5S7.67 5 8.5 5 10 5.67 10 6.5 9.33 8 8.5 8zm7 0C14.67 8 14 7.33 14 6.5S14.67 5 15.5 5 17 5.67 17 6.5 16.33 8 15.5 8z"/>
              <circle cx="8.5" cy="6.5" r="1.5" fill="white"/>
              <circle cx="15.5" cy="6.5" r="1.5" fill="white"/>
            </svg>
          `;
          markerContent.style.cssText = `
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          `;
        } else if (apartment.isFavorited) {
          markerContent = document.createElement("div");
          markerContent.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="20" height="20">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          `;
          markerContent.style.cssText = `
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          `;
        }

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: apartment.latitude, lng: apartment.longitude },
          map: map,
          title: apartment.label,
          content: markerContent,
        });

        // Create info window with apartment details
        const popupContent = `
          <div style="padding: 12px; min-width: 200px; ${
            apartment.isDeleted
              ? "opacity: 0.7; background-color: #f9fafb;"
              : ""
          }">
            <h4 style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: ${
              apartment.isDeleted ? "#6b7280" : "#1f2937"
            };">
              ${apartment.label}
            </h4>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
              ${apartment.address}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 8px;">
              <span style="font-weight: 600; color: #2563eb;">
                ${apartment.rent || "N/A"}
              </span>
              <span style="color: #6b7280;">
                ${apartment.bedrooms ? `${apartment.bedrooms} BR` : "N/A"}${
          apartment.bathrooms ? `/${apartment.bathrooms} BA` : ""
        }
              </span>
            </div>
            ${
              apartment.status && apartment.status !== "Not started"
                ? `<div style="margin-bottom: 8px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; background-color: #dbeafe; color: #1e40af;">
                  ${apartment.status}
                </span>
              </div>`
                : ""
            }
            ${
              apartment.labels && apartment.labels.length > 0
                ? `<div style="margin-bottom: 8px;">
                ${apartment.labels
                  .map(
                    (label) =>
                      `<span style="display: inline-block; margin-right: 4px; margin-bottom: 4px; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: 500; background-color: ${label.color}20; color: ${label.color}; border: 1px solid ${label.color}40;">
                    ${label.name}
                  </span>`
                  )
                  .join("")}
              </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <span style="font-size: 12px; color: #059669;">
                💬 ${apartment.commentCount} comments
              </span>
              ${
                apartment.isFavorited
                  ? '<span style="font-size: 12px; color: #ef4444;">❤️ Favorited</span>'
                  : ""
              }
            </div>
            ${
              apartment.isDeleted
                ? '<p style="font-size: 11px; color: #ef4444; margin-top: 8px; font-style: italic;">This listing has been deleted</p>'
                : ""
            }
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: popupContent,
        });

        marker.addListener("click", () => {
          // Close all other info windows
          Object.values(markersRef.current).forEach((m) => {
            if (m !== marker && (m as any).infoWindow) {
              (m as any).infoWindow.close();
            }
          });

          infoWindow.open({
            anchor: marker,
            map: map,
          });
          onSelectApartment(apartment.id);
        });

        // Store info window reference
        (marker as any).infoWindow = infoWindow;
        markersRef.current[apartment.id] = marker;
      } catch (error) {
        console.error("Error creating Google Maps marker:", error);
      }
    });

    // Auto-center map on the first apartment if available
    if (apartmentsArray.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      apartmentsArray.forEach((apartment) => {
        bounds.extend({ lat: apartment.latitude, lng: apartment.longitude });
      });
      map.fitBounds(bounds);
    }
  }, [apartments, onSelectApartment]);

  // Update markers when map is ready or apartments change
  useEffect(() => {
    if (isMapReady && apartments) {
      addApartmentMarkers();
    }
  }, [isMapReady, apartments, addApartmentMarkers]);

  // Focus on selected apartment
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedApartmentId || !apartments) return;

    const apartmentsArray = apartments as ApartmentWithDetails[];
    const apartment = apartmentsArray.find((a) => a.id === selectedApartmentId);
    if (apartment) {
      map.setCenter({ lat: apartment.latitude, lng: apartment.longitude });
      map.setZoom(16);

      // Open info window for selected apartment
      const marker = markersRef.current[apartment.id];
      if (marker && (marker as any).infoWindow) {
        (marker as any).infoWindow.open(map, marker);
      }
    }
  }, [selectedApartmentId, apartments]);

  // Handle visibility changes (for mobile view switching)
  useEffect(() => {
    if (isVisible && mapInstanceRef.current) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, "resize");
        }
      }, 100);
    }
  }, [isVisible]);

  // Toggle transit layer
  const toggleTransit = () => {
    const map = mapInstanceRef.current;
    const transitLayer = transitLayerRef.current;

    if (!map || !transitLayer) return;

    setIsLoadingTransit(true);

    if (showTransit) {
      transitLayer.setMap(null);
      setShowTransit(false);
    } else {
      transitLayer.setMap(map);
      setShowTransit(true);
    }

    setIsLoadingTransit(false);

    toast({
      title: showTransit ? "Transit layer hidden" : "Transit layer shown",
      description: showTransit
        ? "Public transit information is now hidden"
        : "Public transit routes and stops are now visible",
    });
  };

  // Toggle traffic layer
  const toggleTraffic = () => {
    const map = mapInstanceRef.current;
    const trafficLayer = trafficLayerRef.current;

    if (!map || !trafficLayer) return;

    if (showTraffic) {
      trafficLayer.setMap(null);
      setShowTraffic(false);
    } else {
      trafficLayer.setMap(map);
      setShowTraffic(true);
    }

    toast({
      title: showTraffic ? "Traffic layer hidden" : "Traffic layer shown",
      description: showTraffic
        ? "Traffic information is now hidden"
        : "Live traffic conditions are now visible",
    });
  };

  // Center map on apartment markers
  const centerMap = () => {
    const map = mapInstanceRef.current;
    if (map && apartments) {
      const apartmentsArray = apartments as ApartmentWithDetails[];
      if (apartmentsArray.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        apartmentsArray.forEach((apartment) => {
          bounds.extend({ lat: apartment.latitude, lng: apartment.longitude });
        });
        map.fitBounds(bounds);
      }
    }
  };

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
        data-testid="google-map-container"
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

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-[1000]">
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
          className={`bg-white shadow-lg hover:bg-neutral-50 ${
            showTransit ? "bg-blue-50 text-blue-600 border-blue-200" : ""
          }`}
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

        <Button
          variant="outline"
          size="icon"
          onClick={toggleTraffic}
          className={`bg-white shadow-lg hover:bg-neutral-50 ${
            showTraffic ? "bg-red-50 text-red-600 border-red-200" : ""
          }`}
          title="Toggle traffic overlay"
          data-testid="button-toggle-traffic"
        >
          🚗
        </Button>
      </div>

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
