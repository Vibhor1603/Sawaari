# SAWAARI - Comprehensive Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Authentication System](#authentication-system)
4. [User Management](#user-management)
5. [Ride Buddy System](#ride-buddy-system)
6. [Hotspots Management](#hotspots-management)
7. [Route Calculation](#route-calculation)
8. [Real-time Communication](#real-time-communication)
9. [Security Features](#security-features)
10. [API Documentation](#api-documentation)
11. [Frontend Architecture](#frontend-architecture)
12. [Database Schema](#database-schema)
13. [Deployment & Configuration](#deployment-configuration)

## Project Overview

SAWAARI is a comprehensive smart transportation platform designed for auto rickshaw services in India. The platform enables users to find ride buddies, calculate routes, discover hotspots, and manage their transportation needs efficiently.

### Technology Stack

- **Frontend**: React.js with Vite, React Router, Context API
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with geospatial indexing
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Rate limiting, input validation, CORS
- **Deployment**: Render (mentioned in context)

### Key Features

- User authentication and profile management
- Ride buddy matching system
- Real-time chat and notifications
- Hotspot discovery with geolocation
- Route calculation and fare estimation
- Security features (blocking, reporting)
- Password reset functionality

## Architecture

### System Architecture

```
Frontend (React.js)
    ↓
API Gateway (Express.js)
    ↓
Business Logic Layer
    ↓
Database Layer (MongoDB)
    ↓
External Services (Socket.IO, Email)
```

### Project Structure

```
SAWAARI/
├── Frontend/SAWAARI-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── pages/
├── sawaari/
│   ├── Backend/
│   ├── router/
│   ├── controller/
│   └── auth/
```

## Authentication System

### Overview

The authentication system uses JWT tokens with refresh token mechanism for secure user sessions.

### Components

#### 1. JWT Service (`sawaari/Backend/jwtToken.js`)

**Purpose**: Handles JWT token generation, verification, and refresh logic

**Key Functions**:

- `generateTokenPair(user)`: Creates access and refresh tokens
- `verifyAccessToken(token)`: Validates access tokens
- `verifyRefreshToken(token)`: Validates refresh tokens
- `refreshAccessToken(refreshToken)`: Generates new access token

**Token Structure**:

```javascript
// Access Token (15 minutes)
{
  userId: user._id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  type: "access",
  iat: timestamp,
  exp: timestamp + 15min
}

// Refresh Token (7 days)
{
  userId: user._id,
  type: "refresh",
  iat: timestamp,
  exp: timestamp + 7days
}
```

#### 2. Auth Service Frontend (`Frontend/SAWAARI-frontend/src/services/authService.js`)

**Purpose**: Frontend authentication service handling API calls and token management

**Key Functions**:

- `login(credentials)`: User login with email/password
- `register(userData)`: User registration
- `logout()`: Clear tokens and logout
- `refreshAccessToken()`: Refresh expired tokens
- `isAuthenticated()`: Check authentication status
- `getCurrentUserEnhanced()`: Get current user data
- `apiRequest(endpoint, options)`: Authenticated API requests

**Token Storage**: Uses localStorage for persistence across sessions

#### 3. Auth Context (`Frontend/SAWAARI-frontend/src/AuthContext.jsx`)

**Purpose**: React context for global authentication state management

**State Management**:

```javascript
{
  user: null | UserObject,
  token: null | string,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: null | string,
  hotspot: array
}
```

**Key Functions**:

- `login(credentials)`: Context-level login handler
- `register(userData)`: Context-level registration handler
- `logout()`: Context-level logout handler
- `updateUser(data)`: Update user information
- `clearError()`: Clear authentication errors

### Authentication Flow

#### Login Process:

1. User submits credentials via `SigninForm.jsx`
2. Frontend calls `authService.login(credentials)`
3. API request to `POST /signin` endpoint
4. Backend validates credentials using `comparePassword()`
5. JWT tokens generated via `JWTService.generateTokenPair()`
6. Tokens stored in localStorage
7. User state updated in AuthContext
8. Redirect to protected route

#### Registration Process:

1. User submits registration data via signup form
2. Frontend calls `authService.register(userData)`
3. API request to `POST /signup` endpoint
4. Backend validates input and checks for existing users
5. Password hashed using `hashPassword()`
6. User created in database via `createUser()`
7. Success response sent to frontend
8. User redirected to login

#### Token Refresh Process:

1. Access token expires (15 minutes)
2. API request fails with 401 status
3. `authService.refreshAccessToken()` called automatically
4. Refresh token sent to `POST /refresh-token`
5. New access token generated if refresh token valid
6. New token stored and request retried
7. If refresh token expired, user logged out

### Password Reset System

#### Components:

- `sendPasswordResetOTP(identifier)`: Send OTP to email
- `verifyPasswordResetOTP(identifier, otp, token)`: Verify OTP
- `resetPassword(resetToken, newPassword)`: Reset password

#### Flow:

1. User enters email in `ForgotPassword.jsx`
2. API call to `POST /forgot-password/send-otp`
3. OTP generated and sent via email
4. User enters OTP for verification
5. API call to `POST /forgot-password/verify-otp`
6. Reset token generated upon successful verification
7. User enters new password
8. API call to `POST /forgot-password/reset`
9. Password updated in database

## User Management

### User Profile System

#### Backend Controller (`sawaari/controllers.js`)

**Functions**:

- `getUserProfile(req, res)`: Get user profile data
- `updateUserProfile(req, res)`: Update name and phone
- `changePassword(req, res)`: Change user password

#### Frontend Component (`Frontend/SAWAARI-frontend/src/UserProfile.jsx`)

**Features**:

- Display user information
- Edit profile form
- Change password form
- Form validation and error handling

#### API Endpoints:

- `GET /api/user/profile`: Retrieve user profile
- `PUT /api/user/profile`: Update user profile
- `POST /api/user/change-password`: Change password

### User Data Structure:

```javascript
{
  _id: ObjectId,
  name: string,
  email: string (unique),
  phone: string (unique),
  password: string (hashed),
  createdAt: Date,
  updatedAt: Date,
  isActive: boolean
}
```

## Ride Buddy System

### Overview

The Ride Buddy system is the core feature enabling users to find and connect with other users for shared rides.

### Architecture Components

#### 1. Route Matching Service (`sawaari/Backend/RouteMatchingService.js`)

**Purpose**: Handles route overlap calculation and user matching algorithms

**Key Functions**:

- `calculateRouteOverlap(route1, route2)`: Calculate overlap percentage between routes
- `findPotentialMatches(userRoute, options)`: Find matching users
- `calculateSharedFare(route1, route2, overlapPercentage)`: Calculate shared costs
- `findNearbyUsers(centerLocation, radiusKm, excludeUserId)`: Find users within radius

**Matching Algorithm**:

1. Extract waypoints from user routes
2. Find common waypoints using fuzzy matching
3. Calculate overlap percentage based on common waypoints
4. Filter matches with minimum overlap threshold (25%)
5. Calculate shared fare based on overlap
6. Sort by overlap percentage and proximity

#### 2. Ride Buddy Controller (`sawaari/Backend/rideBuddyController.js`)

**Purpose**: Handles all ride buddy API endpoints and business logic

**Key Functions**:

- `searchRideBuddies(req, res)`: Search for potential matches
- `sendRequest(req, res)`: Send connection request
- `handleRequest(req, res)`: Accept/decline requests
- `getRequests(req, res)`: Get user's requests
- `getMatches(req, res)`: Get user's active connections
- `cleanupExpiredRequestsAPI(req, res)`: Clean expired requests

#### 3. Frontend Component (`Frontend/SAWAARI-frontend/src/RideBuddy.jsx`)

**Purpose**: Main UI component for ride buddy functionality

**State Management**:

```javascript
{
  searchForm: { source, destination, searchRadius },
  searchResults: array,
  incomingRequests: array,
  outgoingRequests: array,
  activeConnections: array,
  activeChatId: string,
  chatPartner: object
}
```

**Key Functions**:

- `handleSearch()`: Search for ride buddies
- `sendRideRequest()`: Send connection request
- `handleAcceptRequest()`: Accept incoming request
- `handleDeclineRequest()`: Decline incoming request
- `loadRequests()`: Load user requests
- `loadConnections()`: Load active connections

### Ride Buddy Flow

#### 1. Search Process:

1. User enters source and destination in search form
2. `handleSearch()` called with form data
3. API request to `POST /api/ride-buddy/search`
4. Backend creates search record in database
5. `RouteMatchingService.findPotentialMatches()` called
6. Potential matches filtered by preferences and blocked users
7. Results returned with overlap percentage and shared fare
8. Frontend displays matches with "Send Request" buttons

#### 2. Request Process:

1. User clicks "Send Request" on a match
2. `sendRideRequest()` called with match data
3. API request to `POST /api/ride-buddy/request`
4. Backend validates request and checks for duplicates
5. Request saved to database with 10-minute expiration
6. Real-time notification sent via Socket.IO
7. Receiver sees request in connections tab

#### 3. Response Process:

1. Receiver clicks Accept/Decline on request
2. API request to `PUT /api/ride-buddy/request/:id`
3. Backend updates request status
4. If accepted: Match and chat created
5. Real-time notification sent to sender
6. Both users see connection in connections tab

#### 4. Connection Management:

- Connections expire after 15 minutes (10 min chat + 5 min contact)
- Users can chat during first 10 minutes
- Contact details available for full 15 minutes
- Automatic cleanup of expired connections

### Data Structures

#### Search Record:

```javascript
{
  userId: ObjectId,
  userEmail: string,
  userName: string,
  userPhone: string,
  source: { name: string, coordinates: array },
  destination: { name: string, coordinates: array },
  route: { distance: number, estimatedFare: number },
  searchRadius: number,
  preferences: object,
  status: "active",
  createdAt: Date,
  expiresAt: Date
}
```

#### Request Record:

```javascript
{
  senderId: ObjectId,
  senderName: string,
  senderEmail: string,
  senderPhone: string,
  receiverId: ObjectId,
  receiverName: string,
  receiverEmail: string,
  receiverPhone: string,
  routeDetails: object,
  message: string,
  status: "pending|accepted|declined|expired",
  createdAt: Date,
  expiresAt: Date
}
```

#### Match Record:

```javascript
{
  user1Id: ObjectId,
  user1Name: string,
  user1Phone: string,
  user2Id: ObjectId,
  user2Name: string,
  user2Phone: string,
  routeDetails: object,
  chatId: ObjectId,
  status: "active|expired",
  createdAt: Date
}
```

## Real-time Communication

### Socket.IO Implementation

#### 1. Backend Chat Service (`sawaari/Backend/chatService.js`)

**Purpose**: Manages real-time communication and notifications

**Key Features**:

- Socket authentication using JWT tokens
- Real-time ride buddy notifications
- Chat room management
- User connection tracking

**Socket Events**:

- `ride_buddy_new_request`: New ride request notification
- `ride_buddy_request_response`: Request acceptance/decline
- `ride_buddy_new_match`: New match created
- `new-message`: Chat messages
- `user-joined`: User joined chat
- `user-left`: User left chat

**Key Functions**:

- `notifyRideBuddyRequest(receiverId, requestData)`: Send request notification
- `notifyRequestResponse(senderId, responseData)`: Send response notification
- `notifyNewMatch(user1Id, user2Id, matchData)`: Send match notification

#### 2. Frontend Socket Service (`Frontend/SAWAARI-frontend/src/services/socketService.js`)

**Purpose**: Frontend socket connection management

**Key Features**:

- Automatic reconnection
- Message queuing during disconnection
- Event listener management
- Performance monitoring

**Key Functions**:

- `connect(token)`: Establish socket connection
- `on(event, callback)`: Register event listeners
- `emit(event, data)`: Send events to server
- `joinChatRoom(chatId, userId)`: Join chat room
- `sendMessage(chatId, message, senderId)`: Send chat message

### Real-time Notification Flow

#### Request Notification:

1. User A sends request to User B
2. Backend saves request to database
3. `chatService.notifyRideBuddyRequest()` called
4. Socket event `ride_buddy_new_request` emitted to User B
5. User B's frontend receives notification
6. Request appears in User B's connections tab
7. Toast notification shown to User B

#### Response Notification:

1. User B accepts/declines request
2. Backend updates request status
3. `chatService.notifyRequestResponse()` called
4. Socket event `ride_buddy_request_response` emitted to User A
5. User A's frontend receives notification
6. Request removed from User A's outgoing requests
7. If accepted: Match created and both users notified

## Hotspots Management

### Overview

Hotspots represent popular locations for auto rickshaw services with geospatial capabilities.

### Components

#### 1. Geospatial Hotspot Service (`sawaari/Backend/geoHotspotService.js`)

**Purpose**: Handles location-based hotspot queries

**Key Functions**:

- `getHotspotsInBounds(bounds, zoom)`: Get hotspots within map bounds
- `getHotspotsNearLocation(lat, lng, radius)`: Get nearby hotspots
- `initializeGeoIndexes()`: Create geospatial database indexes
- `migrateHotspotsToGeoFormat()`: Convert hotspots to GeoJSON format

#### 2. Frontend Hotspots Component (`Frontend/SAWAARI-frontend/src/hotspots.jsx`)

**Purpose**: Display hotspots on interactive map

**Features**:

- Interactive map with markers
- Search functionality
- Filter by categories
- Responsive design

#### 3. Enhanced Map Component (`Frontend/SAWAARI-frontend/src/components/EnhancedMap.jsx`)

**Purpose**: Reusable map component with advanced features

**Features**:

- Marker clustering
- Custom marker icons
- Popup information
- Zoom controls
- Geolocation support

### Hotspot Data Structure:

```javascript
{
  _id: ObjectId,
  name: string,
  description: string,
  category: string,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: string,
  rating: number,
  amenities: array,
  operatingHours: object,
  createdAt: Date,
  isActive: boolean
}
```

### API Endpoints:

- `GET /hotspots`: Get all hotspots
- `POST /api/hotspots/bounds`: Get hotspots within bounds
- `POST /api/hotspots/nearby`: Get nearby hotspots
- `GET /api/hotspots/stats`: Get hotspot statistics

## Route Calculation

### Overview

Route calculation system provides optimal paths and fare estimates between locations.

### Components

#### 1. Route Service (`Frontend/SAWAARI-frontend/src/services/routeService.js`)

**Purpose**: Handle route-related API calls and calculations

**Key Functions**:

- `calculateRoute(source, destination)`: Calculate route between points
- `calculateFareEstimates(routeData)`: Get fare estimates
- `getAvailableLocations()`: Get supported locations
- `haversineDistance(lat1, lon1, lat2, lon2)`: Calculate distance

#### 2. Route Info Component (`Frontend/SAWAARI-frontend/src/RouteInfo.jsx`)

**Purpose**: Route planning and fare calculation interface

**Features**:

- Source and destination selection
- Route visualization
- Fare estimation
- Multiple route options
- Time-based fare variations

### Route Calculation Flow:

1. User selects source and destination
2. API request to `POST /api/routes/calculate`
3. Backend calculates optimal route
4. Distance and estimated time calculated
5. Fare estimated based on distance and time
6. Route data returned with waypoints
7. Frontend displays route on map

### Fare Calculation Logic:

```javascript
baseFare = 25; // Base fare in INR
perKmRate = 12; // Rate per kilometer
timeMultiplier = 1.0; // Peak hour multiplier
totalFare = baseFare + distance * perKmRate * timeMultiplier;
```

## Security Features

### Overview

Comprehensive security system protecting users from abuse and ensuring safe interactions.

### Components

#### 1. Security Service (`sawaari/Backend/securityService.js`)

**Purpose**: Handle user blocking, reporting, and message validation

**Key Functions**:

- `blockUser(blockerId, blockedId, reason)`: Block a user
- `isUserBlocked(user1Id, user2Id)`: Check if users are blocked
- `reportUser(reporterId, reportedId, reason, description)`: Report a user
- `validateMessage(message)`: Validate and sanitize messages
- `filterBlockedUsers(userId, userList)`: Filter blocked users from lists

#### 2. Security Controller (`sawaari/Backend/securityController.js`)

**Purpose**: Handle security-related API endpoints

**API Endpoints**:

- `POST /api/security/block-user`: Block a user
- `DELETE /api/security/block-user/:userId`: Unblock a user
- `GET /api/security/blocked-users`: Get blocked users list
- `POST /api/security/report-user`: Report a user
- `GET /api/security/my-reports`: Get user's reports

#### 3. Middleware (`sawaari/Backend/middleware.js`)

**Purpose**: Security middleware for rate limiting and validation

**Features**:

- Rate limiting per endpoint
- Input validation and sanitization
- CORS configuration
- Authentication middleware
- Request logging

### Security Features

#### User Blocking:

1. User clicks "Block" on another user's profile
2. API request to `POST /api/security/block-user`
3. Block relationship saved to database
4. Blocked user filtered from future searches
5. Existing connections terminated
6. Chat access revoked

#### User Reporting:

1. User clicks "Report" with reason and description
2. API request to `POST /api/security/report-user`
3. Report saved to database for admin review
4. Automatic actions triggered for severe violations
5. User notified of report submission

#### Message Validation:

1. User sends message in chat
2. `securityService.validateMessage()` called
3. Message checked for inappropriate content
4. HTML tags and scripts removed
5. Length validation applied
6. Sanitized message saved and sent

### Rate Limiting Configuration:

```javascript
authLimiter: 5 requests per 15 minutes
apiLimiter: 100 requests per 15 minutes
hotspotsLimiter: 50 requests per 15 minutes
rideBuddyLimiter: 20 requests per 15 minutes
chatLimiter: 100 requests per 15 minutes
securityActionLimiter: 10 requests per 15 minutes
```

## API Documentation

### Authentication Endpoints

#### POST /signin

**Purpose**: User login
**Request Body**:

```javascript
{
  email: string,
  password: string
}
```

**Response**:

```javascript
{
  success: boolean,
  message: string,
  token: string,
  refreshToken: string,
  user: { id, name, email }
}
```

#### POST /signup

**Purpose**: User registration
**Request Body**:

```javascript
{
  name: string,
  email: string,
  phone: string,
  password: string
}
```

**Response**:

```javascript
{
  success: boolean,
  message: string,
  userId: string
}
```

#### POST /refresh-token

**Purpose**: Refresh access token
**Request Body**:

```javascript
{
  refreshToken: string;
}
```

**Response**:

```javascript
{
  success: boolean,
  token: string,
  refreshToken: string
}
```

### Ride Buddy Endpoints

#### POST /api/ride-buddy/search

**Purpose**: Search for ride buddies
**Headers**: `Authorization: Bearer <token>`
**Request Body**:

```javascript
{
  source: { name: string, coordinates: array },
  destination: { name: string, coordinates: array },
  preferences: { searchRadius: number }
}
```

**Response**:

```javascript
{
  success: boolean,
  data: {
    searchId: string,
    matches: array,
    matchCount: number,
    searchRadius: number
  }
}
```

#### POST /api/ride-buddy/request

**Purpose**: Send connection request
**Headers**: `Authorization: Bearer <token>`
**Request Body**:

```javascript
{
  receiverId: string,
  routeDetails: object,
  message: string
}
```

**Response**:

```javascript
{
  success: boolean,
  message: string,
  data: { requestId: string }
}
```

#### PUT /api/ride-buddy/request/:id

**Purpose**: Accept or decline request
**Headers**: `Authorization: Bearer <token>`
**Request Body**:

```javascript
{
  action: "accept" | "decline",
  message: string
}
```

**Response**:

```javascript
{
  success: boolean,
  message: string,
  data: { requestId: string, action: string }
}
```

#### GET /api/ride-buddy/requests

**Purpose**: Get user's requests
**Headers**: `Authorization: Bearer <token>`
**Response**:

```javascript
{
  success: boolean,
  data: {
    requests: array,      // Incoming requests
    sentRequests: array   // Outgoing requests
  }
}
```

#### GET /api/ride-buddy/matches

**Purpose**: Get user's active connections
**Headers**: `Authorization: Bearer <token>`
**Response**:

```javascript
{
  success: boolean,
  data: array // Active connections with chat info
}
```

### Hotspot Endpoints

#### GET /hotspots

**Purpose**: Get all hotspots
**Response**:

```javascript
{
  success: boolean,
  data: array,
  count: number
}
```

#### POST /api/hotspots/bounds

**Purpose**: Get hotspots within map bounds
**Request Body**:

```javascript
{
  bounds: {
    north: number,
    south: number,
    east: number,
    west: number
  },
  zoom: number
}
```

#### POST /api/hotspots/nearby

**Purpose**: Get hotspots near location
**Request Body**:

```javascript
{
  latitude: number,
  longitude: number,
  radius: number
}
```

### User Profile Endpoints

#### GET /api/user/profile

**Purpose**: Get user profile
**Headers**: `Authorization: Bearer <token>`
**Response**:

```javascript
{
  success: boolean,
  data: {
    id: string,
    name: string,
    email: string,
    phone: string,
    createdAt: Date
  }
}
```

#### PUT /api/user/profile

**Purpose**: Update user profile
**Headers**: `Authorization: Bearer <token>`
**Request Body**:

```javascript
{
  name: string,
  phone: string
}
```

#### POST /api/user/change-password

**Purpose**: Change user password
**Headers**: `Authorization: Bearer <token>`
**Request Body**:

```javascript
{
  currentPassword: string,
  newPassword: string
}
```

### Password Reset Endpoints

#### POST /forgot-password/send-otp

**Purpose**: Send password reset OTP
**Request Body**:

```javascript
{
  identifier: string; // email
}
```

#### POST /forgot-password/verify-otp

**Purpose**: Verify OTP and get reset token
**Request Body**:

```javascript
{
  identifier: string,
  otp: string,
  token: string
}
```

#### POST /forgot-password/reset

**Purpose**: Reset password with token
**Request Body**:

```javascript
{
  resetToken: string,
  newPassword: string
}
```

## Frontend Architecture

### Component Structure

#### 1. App Component (`Frontend/SAWAARI-frontend/src/App.jsx`)

**Purpose**: Main application component with routing

**Features**:

- React Router setup
- Global context providers
- Toast notifications
- Floating animations

#### 2. Authentication Components

**SigninForm.jsx**: Login form with validation
**AuthModal.jsx**: Modal-based authentication
**AuthModalContainer.jsx**: Modal management
**AuthModalContext.jsx**: Modal state management

#### 3. Feature Components

**RideBuddy.jsx**: Main ride buddy interface
**Hotspots.jsx**: Hotspot discovery page
**UserProfile.jsx**: User profile management
**RouteInfo.jsx**: Route planning interface
**ForgotPassword.jsx**: Password reset flow

#### 4. Shared Components

**Navbar.jsx**: Navigation bar with auth status
**Footer.jsx**: Application footer
**EnhancedMap.jsx**: Reusable map component
**LiveChat.jsx**: Real-time chat interface
**FloatingRickshaws.jsx**: Animated background

### State Management

#### 1. AuthContext

**Purpose**: Global authentication state
**State**:

```javascript
{
  user: object | null,
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null,
  hotspot: array
}
```

#### 2. AuthModalContext

**Purpose**: Modal state management
**State**:

```javascript
{
  isOpen: boolean,
  mode: "signin" | "signup",
  onSuccess: function
}
```

### Custom Hooks

#### 1. useAuthGuard (`Frontend/SAWAARI-frontend/src/hooks/useAuthGuard.jsx`)

**Purpose**: Protect routes requiring authentication
**Usage**:

```javascript
const { isAuthenticated, isLoading } = useAuthGuard("Please sign in");
```

#### 2. useMapHotspots (`Frontend/SAWAARI-frontend/src/hooks/useMapHotspots.js`)

**Purpose**: Manage hotspot data for maps
**Features**:

- Data fetching with caching
- Error handling
- Loading states

### Service Layer

#### 1. authService.js

**Purpose**: Authentication API calls
**Key Methods**:

- `login()`, `register()`, `logout()`
- `refreshAccessToken()`, `isAuthenticated()`
- `apiRequest()` with automatic token refresh

#### 2. rideBuddyService.js

**Purpose**: Ride buddy API calls
**Key Methods**:

- `searchRideBuddies()`, `sendConnectionRequest()`
- `handleConnectionRequest()`, `getRequests()`
- `getMatches()`, `cleanupExpiredRequests()`

#### 3. socketService.js

**Purpose**: Real-time communication
**Key Methods**:

- `connect()`, `disconnect()`
- `on()`, `off()`, `emit()`
- `joinChatRoom()`, `sendMessage()`

#### 4. geoHotspotService.js

**Purpose**: Hotspot data management
**Key Methods**:

- `getHotspots()`, `getHotspotsInBounds()`
- `getHotspotsNearLocation()`, `searchHotspots()`

## Database Schema

### Collections Overview

#### 1. users

**Purpose**: Store user account information

```javascript
{
  _id: ObjectId,
  name: string,
  email: string (unique),
  phone: string (unique),
  password: string (hashed),
  createdAt: Date,
  updatedAt: Date,
  isActive: boolean (default: true)
}
```

**Indexes**: email, phone, isActive

#### 2. hotspots

**Purpose**: Store location hotspot data

```javascript
{
  _id: ObjectId,
  name: string,
  description: string,
  category: string,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: string,
  rating: number,
  amenities: array,
  operatingHours: {
    open: string,
    close: string,
    days: array
  },
  createdAt: Date,
  isActive: boolean
}
```

**Indexes**: location (2dsphere), category, isActive

#### 3. rideBuddySearches

**Purpose**: Store active ride buddy searches

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  userEmail: string,
  userName: string,
  userPhone: string,
  source: {
    name: string,
    coordinates: [longitude, latitude]
  },
  destination: {
    name: string,
    coordinates: [longitude, latitude]
  },
  route: {
    distance: number,
    estimatedFare: number,
    waypoints: array
  },
  searchRadius: number,
  preferences: {
    maxPassengers: number,
    gender: string,
    smokingAllowed: boolean,
    maxWaitTime: number
  },
  status: string (default: "active"),
  createdAt: Date,
  expiresAt: Date
}
```

**Indexes**: userId, status, expiresAt, source.coordinates (2dsphere)

#### 4. rideBuddyRequests

**Purpose**: Store connection requests between users

```javascript
{
  _id: ObjectId,
  senderId: ObjectId,
  senderName: string,
  senderEmail: string,
  senderPhone: string,
  receiverId: ObjectId,
  receiverName: string,
  receiverEmail: string,
  receiverPhone: string,
  routeDetails: {
    senderRoute: object,
    receiverRoute: object,
    overlapPercentage: number,
    sharedDistance: number,
    estimatedSharedFare: number
  },
  message: string,
  status: string (pending|accepted|declined|expired),
  responseMessage: string,
  createdAt: Date,
  updatedAt: Date,
  expiresAt: Date
}
```

**Indexes**: senderId, receiverId, status, expiresAt

#### 5. rideBuddyMatches

**Purpose**: Store active connections between users

```javascript
{
  _id: ObjectId,
  user1Id: ObjectId,
  user1Name: string,
  user1Email: string,
  user1Phone: string,
  user2Id: ObjectId,
  user2Name: string,
  user2Email: string,
  user2Phone: string,
  routeDetails: object,
  chatId: ObjectId,
  status: string (active|expired),
  createdAt: Date,
  expiresAt: Date
}
```

**Indexes**: user1Id, user2Id, status, expiresAt

#### 6. rideBuddyChats

**Purpose**: Store chat rooms for matched users

```javascript
{
  _id: ObjectId,
  matchId: ObjectId,
  participants: [
    {
      userId: ObjectId,
      name: string,
      email: string,
      joinedAt: Date
    }
  ],
  messages: [
    {
      _id: ObjectId,
      senderId: ObjectId,
      senderName: string,
      message: string,
      messageType: string (default: "text"),
      timestamp: Date,
      readBy: [ObjectId]
    }
  ],
  status: string (active|expired),
  createdAt: Date,
  lastMessageAt: Date
}
```

**Indexes**: matchId, participants.userId, status

#### 7. blockedUsers

**Purpose**: Store user blocking relationships

```javascript
{
  _id: ObjectId,
  blockerId: ObjectId,
  blockedId: ObjectId,
  reason: string,
  createdAt: Date,
  isActive: boolean
}
```

**Indexes**: blockerId, blockedId, isActive

#### 8. userReports

**Purpose**: Store user reports for moderation

```javascript
{
  _id: ObjectId,
  reporterId: ObjectId,
  reportedId: ObjectId,
  reason: string,
  description: string,
  status: string (pending|reviewed|resolved),
  createdAt: Date,
  reviewedAt: Date,
  reviewedBy: ObjectId
}
```

**Indexes**: reporterId, reportedId, status

#### 9. feedbacks

**Purpose**: Store user feedback

```javascript
{
  _id: ObjectId,
  name: string,
  email: string,
  subject: string,
  message: string,
  rating: number,
  createdAt: Date,
  status: string (new|reviewed|resolved)
}
```

**Indexes**: email, status, createdAt

### Database Operations

#### Connection Management

```javascript
// Database service initialization
const { MongoClient } = require("mongodb");
const dbService = {
  client: null,
  db: null,

  async connect() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db(process.env.DB_NAME);
  },

  async getCollection(name) {
    return this.db.collection(name);
  },
};
```

#### Common Operations

```javascript
// Create user
async function createUser(userData) {
  const collection = await dbService.getCollection("users");
  return await collection.insertOne({
    ...userData,
    createdAt: new Date(),
    isActive: true,
  });
}

// Find user by email
async function findUserByEmail(email) {
  const collection = await dbService.getCollection("users");
  return await collection.findOne({
    email: email.toLowerCase(),
    isActive: true,
  });
}

// Create ride buddy search
async function createRideBuddySearch(searchData) {
  const collection = await dbService.getCollection("rideBuddySearches");
  return await collection.insertOne({
    ...searchData,
    status: "active",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });
}
```

## Deployment & Configuration

### Environment Variables

#### Backend (.env)

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/sawaari
DB_NAME=sawaari

# JWT Configuration
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server Configuration
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com

# Email Configuration (for password reset)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your_session_secret
```

#### Frontend (.env)

```bash
# API Configuration
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_API_TIMEOUT=10000

# Map Configuration
VITE_MAP_API_KEY=your_map_api_key
VITE_DEFAULT_LAT=28.6139
VITE_DEFAULT_LNG=77.2090

# App Configuration
VITE_APP_NAME=SAWAARI
VITE_APP_VERSION=3.0.0
```

### Deployment Architecture

#### Production Setup

```
Load Balancer (Nginx)
    ↓
Frontend (React - Static Files)
    ↓
Backend API (Node.js + Express)
    ↓
Database (MongoDB Atlas/Self-hosted)
    ↓
Socket.IO Server (Same as API)
```

#### Render Deployment Configuration

**Backend (render.yaml)**:

```yaml
services:
  - type: web
    name: sawaari-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: sawaari-db
          property: connectionString
```

**Frontend (render.yaml)**:

```yaml
services:
  - type: web
    name: sawaari-frontend
    env: static
    buildCommand: npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://sawaari-backend.onrender.com
```

### Performance Optimizations

#### Backend Optimizations

1. **Database Indexing**: Proper indexes on frequently queried fields
2. **Connection Pooling**: MongoDB connection pooling for better performance
3. **Caching**: Redis caching for frequently accessed data
4. **Rate Limiting**: Prevent API abuse and ensure fair usage
5. **Compression**: Gzip compression for API responses

#### Frontend Optimizations

1. **Code Splitting**: Lazy loading of components
2. **Bundle Optimization**: Vite build optimizations
3. **Image Optimization**: Compressed images and lazy loading
4. **Caching**: Service worker for offline functionality
5. **CDN**: Static asset delivery via CDN

### Monitoring & Logging

#### Backend Logging

```javascript
// Winston logger configuration
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

#### Error Tracking

- Frontend: Error boundaries and error reporting
- Backend: Centralized error handling middleware
- Database: Query performance monitoring
- Socket.IO: Connection and message tracking

### Security Considerations

#### Production Security Checklist

1. **HTTPS**: SSL/TLS certificates for all communications
2. **CORS**: Proper CORS configuration for frontend domains
3. **Rate Limiting**: Aggressive rate limiting in production
4. **Input Validation**: Comprehensive input validation and sanitization
5. **Authentication**: Secure JWT token handling
6. **Database**: MongoDB security best practices
7. **Environment Variables**: Secure storage of sensitive configuration
8. **Monitoring**: Real-time security monitoring and alerting

## Troubleshooting Common Issues

### 1. Continuous API Calls Issue

**Problem**: RideBuddy component making excessive API calls on Render deployment
**Root Cause**: useEffect dependency array including state variables that change frequently
**Solution**:

- Remove state variables from useEffect dependencies
- Use functional state updates to avoid stale closures
- Implement proper rate limiting and debouncing

### 2. Socket Connection Issues

**Problem**: Real-time notifications not working
**Root Cause**: Socket authentication or connection failures
**Solution**:

- Verify JWT token format and expiration
- Check CORS configuration for Socket.IO
- Implement proper error handling and reconnection logic

### 3. Database Performance Issues

**Problem**: Slow query performance
**Root Cause**: Missing database indexes or inefficient queries
**Solution**:

- Add proper indexes on frequently queried fields
- Optimize query patterns
- Implement database connection pooling

### 4. Memory Leaks

**Problem**: Increasing memory usage over time
**Root Cause**: Event listeners not properly cleaned up
**Solution**:

- Implement proper cleanup in useEffect return functions
- Remove event listeners on component unmount
- Clear intervals and timeouts

## Conclusion

SAWAARI is a comprehensive transportation platform built with modern web technologies. The system provides a robust foundation for ride-sharing services with real-time communication, geospatial features, and comprehensive security measures.

### Key Achievements

- Scalable microservices architecture
- Real-time communication with Socket.IO
- Comprehensive security features
- Geospatial hotspot discovery
- Advanced route matching algorithms
- Mobile-responsive design
- Production-ready deployment

### Future Enhancements

- Mobile application development
- Advanced analytics and reporting
- Machine learning for better matching
- Payment integration
- Multi-language support
- Advanced admin dashboard

This documentation provides a complete technical overview of the SAWAARI platform, enabling developers to understand, maintain, and extend the system effectively.
