# TODO: Apartment Address Autocomplete

## Overview
Add autocomplete functionality to the apartment address field in the Add Apartment modal to improve user experience and data accuracy.

## Required Implementation Steps

### 1. Choose Geocoding Service
- **Options to evaluate:**
  - Google Places API (most comprehensive, paid after quota)
  - Mapbox Geocoding API (good alternative, free tier available)
  - OpenStreetMap Nominatim (free but rate limited)
  - HERE Geocoding API (enterprise option)
- **Decision factors:** Cost, accuracy, rate limits, terms of service

### 2. API Integration Setup
- Add geocoding service API key to environment variables
- Create geocoding utility functions in `client/src/lib/geocoding.ts`
- Implement address search function with debouncing
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
- Validate address format before submission
- Update map marker position when address is selected

### 6. Performance Optimizations
- Cache recent address searches locally
- Implement request cancellation for outdated searches
- Limit number of suggestions displayed (5-10)
- Add minimum character threshold before searching (2-3 chars)

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
- `client/src/components/AddApartmentModal.tsx` - Add autocomplete to address input
- `client/src/lib/geocoding.ts` - New utility for API calls
- `client/src/components/ui/autocomplete.tsx` - New reusable component
- `server/routes.ts` - Possibly add geocoding proxy endpoint
- Environment variables - Add API keys

## Dependencies to Consider
- Address validation library
- Debouncing utility (already have lodash available)
- HTTP client for geocoding API calls

## Security Considerations
- Secure API key storage and usage
- Rate limiting on client side
- Input sanitization for address queries
- CORS configuration if using direct API calls