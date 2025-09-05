import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Map, Globe } from "lucide-react";

interface MapToggleProps {
  onMapTypeChange: (mapType: 'openstreet' | 'google') => void;
  currentMapType: 'openstreet' | 'google';
}

export default function MapToggle({ onMapTypeChange, currentMapType }: MapToggleProps) {
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <ToggleGroup
        type="single"
        value={currentMapType}
        onValueChange={(value) => {
          if (value) {
            onMapTypeChange(value as 'openstreet' | 'google');
          }
        }}
        className="bg-white shadow-lg rounded-md"
      >
        <ToggleGroupItem 
          value="openstreet" 
          aria-label="OpenStreetMap"
          className="data-[state=on]:bg-blue-50 data-[state=on]:text-blue-600"
          title="OpenStreetMap"
        >
          <Map className="h-4 w-4 mr-2" />
          OSM
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="google" 
          aria-label="Google Maps"
          className="data-[state=on]:bg-blue-50 data-[state=on]:text-blue-600"
          title="Google Maps"
        >
          <Globe className="h-4 w-4 mr-2" />
          Google
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}