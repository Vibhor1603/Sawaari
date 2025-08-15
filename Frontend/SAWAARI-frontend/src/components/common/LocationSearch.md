# Location Search Components

This document describes the location search components implemented for the SAWAARI project.

## Components Overview

### 1. LocationSearch

Full-featured location search component with detailed results and comprehensive error handling.

### 2. CompactLocationSearch

Lightweight version with multiple size variants for different use cases.

### 3. EnhancedMapWithSearch

Map component with integrated location search functionality.

## Quick Start

```jsx
import { LocationSearch, CompactLocationSearch, EnhancedMapWithSearch } from '../components/common';

// Basic usage
<LocationSearch
  onLocationSelect={(locationData) => {
    console.log('Selected:', locationData);
    // locationData contains: { name, coordinates: { latitude, longitude }, feature }
  }}
  placeholder="Search for a location..."
/>

// Compact version
<CompactLocationSearch
  onLocationSelect={handleLocationSelect}
  placeholder="Search..."
  size="sm" // "sm" | "md" | "lg"
/>

// Map with integrated search
<EnhancedMapWithSearch
  center={[28.6139, 77.209]}
  zoom={14}
  showSearch={true}
  onLocationSelect={handleLocationSelect}
  searchBbox={[76.8, 28.4, 77.6, 28.9]} // Delhi NCR bounds
/>
```

## API Reference

### LocationSearch Props

| Prop               | Type                               | Default                      | Description                                   |
| ------------------ | ---------------------------------- | ---------------------------- | --------------------------------------------- |
| `onLocationSelect` | `(locationData) => void`           | -                            | Callback when location is selected            |
| `placeholder`      | `string`                           | `"Search for a location..."` | Input placeholder text                        |
| `className`        | `string`                           | `""`                         | Additional CSS classes                        |
| `bbox`             | `[number, number, number, number]` | `null`                       | Bounding box [minLon, minLat, maxLon, maxLat] |
| `disabled`         | `boolean`                          | `false`                      | Disable the search input                      |
| `autoFocus`        | `boolean`                          | `false`                      | Auto-focus the input on mount                 |

### CompactLocationSearch Props

| Prop               | Type                     | Default                | Description                        |
| ------------------ | ------------------------ | ---------------------- | ---------------------------------- |
| `onLocationSelect` | `(locationData) => void` | -                      | Callback when location is selected |
| `placeholder`      | `string`                 | `"Search location..."` | Input placeholder text             |
| `className`        | `string`                 | `""`                   | Additional CSS classes             |
| `disabled`         | `boolean`                | `false`                | Disable the search input           |
| `size`             | `"sm" \| "md" \| "lg"`   | `"md"`                 | Component size variant             |

### EnhancedMapWithSearch Props

Extends all props from `EnhancedMap` plus:

| Prop                | Type                               | Default                      | Description                        |
| ------------------- | ---------------------------------- | ---------------------------- | ---------------------------------- |
| `showSearch`        | `boolean`                          | `true`                       | Show/hide the search component     |
| `searchPlaceholder` | `string`                           | `"Search for a location..."` | Search input placeholder           |
| `onLocationSelect`  | `(locationData) => void`           | -                            | Callback when location is selected |
| `searchBbox`        | `[number, number, number, number]` | `null`                       | Search bounding box                |

## Location Data Structure

When a location is selected, the callback receives an object with this structure:

```typescript
interface LocationData {
  name: string; // Display name of the location
  coordinates: {
    latitude: number;
    longitude: number;
  };
  feature: {
    // Full GeoJSON feature from Photon API
    properties: {
      name: string;
      displayName: string;
      city?: string;
      state?: string;
      country?: string;
      // ... other Photon API properties
    };
    geometry: {
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
}
```

## Features

### 🚀 Performance

- **200ms debounced search** - Prevents excessive API calls
- **Rate limiting** - Minimum 200ms between requests
- **5-minute caching** - Reduces API load and improves response time
- **Efficient re-renders** - Optimized with React hooks

### 🎯 User Experience

- **Real-time suggestions** - Shows results as you type (after 3+ characters)
- **Keyboard navigation** - Arrow keys, Enter, Escape support
- **Loading states** - Visual feedback during search
- **Error handling** - Graceful handling of network issues
- **Click outside to close** - Intuitive interaction

### 📱 Responsive Design

- **Mobile optimized** - Touch-friendly interface
- **Multiple sizes** - sm, md, lg variants
- **Dark theme compatible** - Matches SAWAARI design system
- **Proper z-index** - Dropdown appears above map elements

### ♿ Accessibility

- **Keyboard navigation** - Full keyboard support
- **Screen reader friendly** - Proper ARIA labels
- **Focus management** - Logical tab order
- **High contrast** - Readable in all conditions

## Technical Implementation

### API Integration

- **Photon API** - Free geocoding service by Komoot
- **No API key required** - Ready to use out of the box
- **GeoJSON format** - Standard geographic data format
- **OSM data** - Based on OpenStreetMap

### Search Parameters

```javascript
const searchParams = {
  q: searchQuery, // Search query
  limit: 5, // Max results
  osm_tag: ["place", "amenity", "highway"], // Location types
  bbox: [minLon, minLat, maxLon, maxLat], // Bounding box (optional)
  lang: "en", // Language
};
```

### Error Handling

- Network errors
- API rate limiting
- Empty results
- Invalid responses
- Malformed coordinates

### Caching Strategy

- **Search cache** - Stores search results by query
- **5-minute TTL** - Automatic cache expiration
- **Memory efficient** - Uses Map for O(1) lookups
- **Cache stats** - Available for debugging

## Integration Examples

### Basic Integration

```jsx
import { LocationSearch } from "../components/common";

function MyComponent() {
  const handleLocationSelect = (locationData) => {
    // Center map on selected location
    map.flyTo(
      [locationData.coordinates.latitude, locationData.coordinates.longitude],
      16
    );
  };

  return (
    <LocationSearch
      onLocationSelect={handleLocationSelect}
      placeholder="Search destinations..."
    />
  );
}
```

### With Map Control

```jsx
import { useRef } from "react";
import { MapContainer } from "react-leaflet";
import { LocationSearch, MapController } from "../components/common";

function MapWithSearch() {
  const mapRef = useRef(null);

  const handleLocationSelect = (locationData) => {
    if (mapRef.current) {
      mapRef.current.flyTo(
        [locationData.coordinates.latitude, locationData.coordinates.longitude],
        16,
        {
          duration: 1.5,
          easeLinearity: 0.1,
        }
      );
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-3 left-3 z-[1001]">
        <LocationSearch onLocationSelect={handleLocationSelect} />
      </div>

      <MapContainer center={[28.6139, 77.209]} zoom={14}>
        <MapController mapControlRef={mapRef} />
        {/* Other map components */}
      </MapContainer>
    </div>
  );
}
```

### Form Integration

```jsx
import { useState } from "react";
import { CompactLocationSearch } from "../components/common";

function RouteForm() {
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);

  return (
    <form>
      <div className="space-y-4">
        <div>
          <label>Source</label>
          <CompactLocationSearch
            onLocationSelect={setSource}
            placeholder="Select source..."
            size="md"
          />
        </div>

        <div>
          <label>Destination</label>
          <CompactLocationSearch
            onLocationSelect={setDestination}
            placeholder="Select destination..."
            size="md"
          />
        </div>
      </div>
    </form>
  );
}
```

## Styling

The components use Tailwind CSS classes and are designed to match the SAWAARI design system:

- **Background**: `bg-black/40` with backdrop blur
- **Border**: `border-white/20` with focus states
- **Text**: White text with gray placeholders
- **Accent**: `sawaari-yellow` for highlights
- **Hover effects**: Smooth transitions
- **Dark theme**: Optimized for dark backgrounds

## Browser Support

- **Modern browsers** - Chrome, Firefox, Safari, Edge
- **Mobile browsers** - iOS Safari, Chrome Mobile
- **ES6+ features** - Uses modern JavaScript
- **CSS Grid/Flexbox** - Modern layout techniques

## Performance Considerations

1. **Debouncing** - Prevents excessive API calls
2. **Caching** - Reduces redundant requests
3. **Rate limiting** - Respects API limits
4. **Lazy loading** - Components load on demand
5. **Memory management** - Proper cleanup on unmount

## Troubleshooting

### Common Issues

1. **No results showing**

   - Check network connectivity
   - Verify search query length (3+ characters)
   - Check browser console for errors

2. **Slow search responses**

   - Network latency to Photon API
   - Consider implementing local caching
   - Check rate limiting implementation

3. **Map not centering**
   - Verify map ref is properly set
   - Check coordinate format (latitude, longitude)
   - Ensure map is fully loaded

### Debug Information

```javascript
// Get cache statistics
import photonService from "../services/photonService";
console.log(photonService.getCacheStats());

// Clear cache if needed
photonService.clearCache();
```

## Future Enhancements

- [ ] Offline search capability
- [ ] Custom result templates
- [ ] Search history persistence
- [ ] Multi-language support
- [ ] Custom bounding box UI
- [ ] Search analytics
- [ ] Voice search integration
- [ ] Fuzzy search improvements
