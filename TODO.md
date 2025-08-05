# TODO: Apartment Address Autocomplete

## Overview
Add autocomplete functionality to the apartment address field in the Add Apartment modal to improve user experience and data accuracy.

## Required Implementation Steps

### 1. Geocoding Service Selection
- **Selected Service:** OpenStreetMap Nominatim API
  - Free to use with proper attribution
  - Rate limit: 1 request per second for heavy use
  - No API key required
  - Good coverage and accuracy for most addresses
- **API Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Usage Policy:** Must include proper attribution and respect rate limits

### 2. API Integration Setup
- Create geocoding utility functions in `client/src/lib/geocoding.ts`
- Implement Nominatim search function with proper parameters:
  - `format=json` for JSON response
  - `addressdetails=1` to get structured address components
  - `limit=5` to restrict number of results
  - `countrycodes=us,ca` to focus on North America (optional)
- Add debouncing (1 second minimum) to respect rate limits
- Add error handling for API failures and rate limits

### 3. Frontend Components
- Create or enhance autocomplete input component
- Add dropdown list for address suggestions
- Implement keyboard navigation (arrow keys, enter, escape)
- Add loading states during API calls
- Handle selection of suggested addresses

### 4. User Experience Enhancements
- Add debounced search (300-500ms delay)
- Show "No results found" message when appropriate
- Display formatted addresses in suggestions
- Auto-fill coordinates when address is selected
- Clear suggestions when input is cleared

### 5. Data Integration
- Modify apartment creation form to use autocomplete
- Extract and store coordinates from selected address
- **Auto-populate Custom Label field:**
  - Parse building number + street name from selected address
  - Format as "1045 Herkimer Street" style
  - Allow user to edit the auto-populated label if needed
- Extract structured address components from Nominatim response:
  - `house_number` + `road` for the custom label
  - `lat` and `lon` for coordinates
  - Full `display_name` for the address field
- Update map marker position when address is selected

### 6. Performance Optimizations
- Cache recent address searches locally
- Implement request cancellation for outdated searches
- Limit number of suggestions displayed (5 max due to Nominatim limit)
- Add minimum character threshold before searching (3+ chars)
- **Respect Nominatim rate limits:**
  - Maximum 1 request per second
  - Add 1-second debounce minimum
  - Consider adding loading indicator during delay

### 7. Error Handling
- Handle network failures gracefully
- Show fallback message when service is unavailable
- Allow manual address entry as backup
- Display clear error messages to users

### 8. Testing Considerations
- Test with various address formats
- Verify international address support
- Test keyboard navigation accessibility
- Validate mobile device compatibility
- Test with slow network connections

## Technical Files to Modify
- `client/src/components/AddApartmentModal.tsx` - Add autocomplete to address input and auto-populate custom label
- `client/src/lib/geocoding.ts` - New utility for Nominatim API calls
- `client/src/components/ui/autocomplete.tsx` - New reusable component
- Form validation - Update to handle auto-populated custom label field

## Address Parsing Logic
```javascript
// Example Nominatim response structure:
{
  "display_name": "1045 Herkimer Street, Brooklyn, NY 11233, USA",
  "address": {
    "house_number": "1045",
    "road": "Herkimer Street",
    "neighbourhood": "Bedford-Stuyvesant",
    "city": "Brooklyn",
    "state": "New York"
  },
  "lat": "40.6892",
  "lon": "-73.9442"
}

// Custom label generation:
const customLabel = `${address.house_number} ${address.road}`;
// Result: "1045 Herkimer Street"
```

## Dependencies to Consider
- Debouncing utility (already available in project)
- HTTP client for geocoding API calls (fetch API sufficient)
- Address parsing utilities for consistent formatting

## Rate Limiting & Attribution
- **Rate Limits:** Respect 1 request/second limit for Nominatim
- **Attribution:** Add "Powered by OpenStreetMap" attribution in UI
- **Input sanitization:** Validate and sanitize address queries
- **Error handling:** Graceful fallback when rate limited

## User Experience Flow
1. User types in address field (minimum 3 characters)
2. After 1-second debounce, query Nominatim API
3. Display dropdown with formatted address suggestions
4. User selects an address from dropdown
5. Address field populated with full address
6. Custom Label field auto-populated with "Number Street" format
7. Coordinates stored for map positioning
8. User can still edit the custom label if desired