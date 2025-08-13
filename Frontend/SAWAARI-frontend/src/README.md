# SAWAARI Frontend Project Structure

## 📁 Directory Structure

```
src/
├── components/           # Reusable UI components organized by feature
│   ├── common/          # Common components used across multiple features
│   │   ├── DatabaseLocationSelect.jsx
│   │   ├── LocationSelect.jsx
│   │   ├── EnhancedMap.jsx
│   │   ├── FloatingRickshaws.jsx
│   │   ├── PerformanceMonitor.jsx
│   │   ├── SearchStatus.jsx
│   │   ├── NotFound.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── LiveChat.jsx
│   │   └── index.js     # Barrel exports
│   ├── routes/          # Route-specific components
│   │   ├── RouteOptions.jsx
│   │   ├── MultipleRoutePolylines.jsx
│   │   └── index.js
│   ├── home/            # Home page components
│   │   ├── Carousel.jsx
│   │   ├── testimonials.jsx
│   │   ├── WhySawaari.jsx
│   │   ├── about.jsx
│   │   └── index.js
│   ├── auth/            # Authentication components
│   │   ├── AuthModalContainer.jsx
│   │   └── index.js
│   ├── layout/          # Layout components
│   │   ├── navbar.jsx
│   │   ├── footer.jsx
│   │   └── index.js
│   └── map/             # Map-related components
│       ├── LocationTracker.jsx
│       ├── MapInteractionHandler.jsx
│       ├── HotspotCircle.jsx
│       └── index.js
├── features/            # Feature-based organization
│   ├── routes/          # Route planning feature
│   │   ├── RouteInfo.jsx
│   │   └── RouteForm.jsx
│   ├── hotspots/        # Hotspots/Rickshaw points feature
│   │   ├── hotspots.jsx
│   │   ├── HotspotMarkers.jsx
│   │   └── useHotspotData.jsx
│   ├── ridebuddy/       # Ride sharing feature
│   │   └── RideBuddy.jsx
│   ├── auth/            # Authentication feature
│   │   ├── SignUpForm.jsx
│   │   ├── SigninForm.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── UserProfile.jsx
│   │   └── Logout.jsx
│   └── contact/         # Contact feature
│       └── Contact.jsx
├── data/                # Static data and constants
│   ├── testimonials.js  # User testimonials data
│   └── index.js         # Barrel exports
├── services/            # API services and external integrations
│   ├── authService.js
│   ├── routeService.js
│   ├── rideBuddyService.js
│   ├── socketService.js
│   ├── locationService.js
│   └── geoHotspotService.js
├── hooks/               # Custom React hooks
│   ├── useAuthGuard.jsx
│   └── useMapHotspots.js
├── contexts/            # React contexts
│   └── AuthModalContext.jsx
├── utils/               # Utility functions (pure JavaScript)
│   └── graphUtils.js    # Graph and distance calculation utilities
├── App.jsx              # Main app component
├── Root.jsx             # Home page root
├── AuthContext.jsx      # Authentication context
├── main.jsx             # Application entry point
└── index.css            # Global styles
```

## 🏗️ Architecture Principles

### 1. **Feature-Based Organization**

- Each major feature has its own folder under `features/`
- Feature folders contain the main page components and feature-specific logic
- Related components are co-located with their features

### 2. **Component Organization**

- `components/common/` - Reusable components used across multiple features
- `components/[feature]/` - Components specific to a particular feature
- Each component folder has an `index.js` for clean imports

### 3. **Data Management**

- `data/` folder contains static data like testimonials, constants
- All data files use `.js` extension for better tree-shaking
- Barrel exports in `index.js` files for clean imports

### 4. **Services Layer**

- All API calls and external integrations in `services/`
- Each service handles a specific domain (auth, routes, etc.)

### 5. **Utilities**

- Pure JavaScript utility functions in `utils/`
- All utility files use `.js` extension (not `.jsx`)

## 📦 Import Examples

### Clean Imports with Barrel Exports

```javascript
// Instead of multiple imports
import DatabaseLocationSelect from "./components/common/DatabaseLocationSelect";
import FloatingRickshaws from "./components/common/FloatingRickshaws";

// Use barrel exports
import { DatabaseLocationSelect, FloatingRickshaws } from "./components/common";
```

### Data Imports

```javascript
import { testimonials } from "./data";
```

### Feature Imports

```javascript
import RouteInfo from "./features/routes/RouteInfo";
import Contact from "./features/contact/Contact";
```

## 🧹 Cleanup Done

### Removed Unused Components

- `LazyLocationSelect.jsx`
- `StableLocationSelect.jsx`
- `WorkingInfiniteSelect.jsx`
- `InfiniteLocationSelect.jsx`
- `SimpleLazySelect.jsx`
- `RideBuddy.jsx.backup`
- `useLazyOptions.js`
- `FareEstimator.jsx`
- `RouteMatching.jsx`
- `SignIn.jsx` (standalone page, replaced by modal)
- `Signup.jsx` (standalone page, replaced by modal)
- `SignupParent.jsx`
- `userTestimonials.js` (duplicate data)

### File Extensions

- All utility files use `.js` extension
- Component files use `.jsx` extension
- Data files use `.js` extension for better performance

## 🚀 Benefits

1. **Better Organization** - Easy to find related files
2. **Scalability** - Easy to add new features
3. **Maintainability** - Clear separation of concerns
4. **Performance** - Better tree-shaking with proper exports
5. **Developer Experience** - Clean imports and logical structure
