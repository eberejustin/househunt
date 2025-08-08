interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

interface NominatimResult {
  display_name: string;
  address: NominatimAddress;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
}

export interface AddressSuggestion {
  id: string;
  displayName: string;
  customLabel: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: NominatimAddress;
}

let searchController: AbortController | null = null;

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  // Cancel previous request if it exists
  if (searchController) {
    searchController.abort();
  }

  // Create new controller for this request
  searchController = new AbortController();

  // Validate input - keep lower threshold here for manual geocode button
  if (!query || query.trim().length < 3) {
    return [];
  }

  const trimmedQuery = query.trim();

  try {
    const params = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      limit: '5',
      q: trimmedQuery,
      countrycodes: 'us,ca', // Focus on North America
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        signal: searchController.signal,
        headers: {
          'User-Agent': 'HouseHunt-App/1.0', // Required by Nominatim usage policy
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const results: NominatimResult[] = await response.json();

    return results.map((result) => {
      const customLabel = generateCustomLabel(result.address);
      
      return {
        id: result.place_id,
        displayName: result.display_name,
        customLabel,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        },
        address: result.address,
      };
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Request was cancelled, don't throw error
      return [];
    }
    
    console.error('Geocoding search error:', error);
    throw new Error('Failed to search addresses. Please try again.');
  }
}

function generateCustomLabel(address: NominatimAddress): string {
  const houseNumber = address.house_number || '';
  const road = address.road || '';
  
  if (houseNumber && road) {
    return `${houseNumber} ${road}`;
  } else if (road) {
    return road;
  } else if (address.neighbourhood) {
    return address.neighbourhood;
  } else {
    return 'Unknown Address';
  }
}

// Debounced search function to respect rate limits
export function createDebouncedSearch() {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debouncedSearch(
    query: string,
    callback: (results: AddressSuggestion[]) => void,
    errorCallback: (error: Error) => void
  ) {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Don't search if query is too short (minimum 8 characters)
    if (!query || query.trim().length < 8) {
      callback([]);
      return;
    }

    // Set new timeout for 500ms (reduced delay with higher character threshold)
    timeoutId = setTimeout(async () => {
      try {
        const results = await searchAddresses(query);
        callback(results);
      } catch (error) {
        errorCallback(error instanceof Error ? error : new Error('Unknown error'));
      }
    }, 500);
  };
}