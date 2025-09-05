// Transit data service using OpenStreetMap Overpass API

export interface TransitStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'train' | 'subway' | 'bus';
  line?: string;
}

export interface TransitLine {
  id: string;
  name: string;
  type: 'train' | 'subway' | 'bus';
  coordinates: [number, number][];
  color: string;
}

// Colors for different transit types
const TRANSIT_COLORS = {
  train: '#FF6B35',    // Orange for trains
  subway: '#1E3A8A',   // Blue for subway
  bus: '#059669'       // Green for bus
};

/**
 * Fetch transit data from OpenStreetMap for a given bounding box
 */
export async function fetchTransitData(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<{ stations: TransitStation[]; lines: TransitLine[] }> {
  const { north, south, east, west } = bounds;
  
  // Overpass API query for train stations, subway stations, and rail lines
  const query = `
    [out:json][timeout:30];
    (
      // Train stations
      node["railway"="station"](${south},${west},${north},${east});
      // Subway stations  
      node["railway"="subway_entrance"](${south},${west},${north},${east});
      node["public_transport"="stop_position"]["subway"="yes"](${south},${west},${north},${east});
      // Train lines
      way["railway"="rail"](${south},${west},${north},${east});
      way["railway"="subway"](${south},${west},${north},${east});
      // Get relations for complete routes
      relation["type"="route"]["route"="train"](${south},${west},${north},${east});
      relation["type"="route"]["route"="subway"](${south},${west},${north},${east});
    );
    out geom;
  `;

  const url = 'https://overpass-api.de/api/interpreter';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    
    return parseTransitData(data);
  } catch (error) {
    console.error('Error fetching transit data:', error);
    return { stations: [], lines: [] };
  }
}

/**
 * Parse Overpass API response into structured transit data
 */
function parseTransitData(data: any): { stations: TransitStation[]; lines: TransitLine[] } {
  const stations: TransitStation[] = [];
  const lines: TransitLine[] = [];

  if (!data.elements) return { stations, lines };

  for (const element of data.elements) {
    if (element.type === 'node') {
      // Parse stations
      const station = parseStation(element);
      if (station) stations.push(station);
    } else if (element.type === 'way' && element.nodes) {
      // Parse rail lines
      const line = parseLine(element);
      if (line) lines.push(line);
    }
  }

  return { stations, lines };
}

/**
 * Parse a station node from Overpass data
 */
function parseStation(node: any): TransitStation | null {
  if (!node.lat || !node.lon || !node.tags) return null;

  const tags = node.tags;
  let type: 'train' | 'subway' | 'bus' = 'train';
  
  if (tags.railway === 'subway_entrance' || tags.subway === 'yes') {
    type = 'subway';
  } else if (tags.highway === 'bus_stop') {
    type = 'bus';
  }

  return {
    id: node.id.toString(),
    name: tags.name || tags['name:en'] || 'Unnamed Station',
    lat: node.lat,
    lng: node.lon,
    type,
    line: tags.line || tags['railway:ref']
  };
}

/**
 * Parse a rail line from Overpass data
 */
function parseLine(way: any): TransitLine | null {
  if (!way.geometry || !way.tags) return null;

  const tags = way.tags;
  let type: 'train' | 'subway' | 'bus' = 'train';
  
  if (tags.railway === 'subway') {
    type = 'subway';
  } else if (tags.highway === 'bus_guideway') {
    type = 'bus';
  }

  const coordinates: [number, number][] = way.geometry.map((point: any) => [
    point.lat,
    point.lon
  ]);

  return {
    id: way.id.toString(),
    name: tags.name || tags.ref || `${type} line`,
    type,
    coordinates,
    color: TRANSIT_COLORS[type]
  };
}

/**
 * Get current map bounds from a Leaflet map instance
 */
export function getMapBounds(map: L.Map) {
  const bounds = map.getBounds();
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  };
}