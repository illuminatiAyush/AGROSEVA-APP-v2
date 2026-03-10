# AgroSeva Market - Feature Documentation

## Overview

AgroSeva Market is a static UI prototype for a farmer-to-buyer marketplace within the AgroSeva app. This feature demonstrates how farmers can view nearby bulk buyers and their crop bids in a future version of the application.

**Important:** This is a UI-only prototype using mock data. It does not interact with any backend APIs or modify existing app logic.

## Features

### 1. Market Screen (Main Marketplace View)
- **File:** `MarketScreen.tsx`
- **Purpose:** Lists all available buyer bids
- **Capabilities:**
  - Search functionality (by buyer name, crop, or location)
  - Crop filter chips for quick filtering
  - Real-time filtered results display
  - Responsive buyer listings

### 2. Buyer Card Component
- **File:** `BuyerCard.tsx`
- **Purpose:** Displays individual buyer information in a card format
- **Shows:**
  - Buyer name with avatar
  - Crop requirements
  - Quantity needed
  - Price offered (highlighted)
  - Distance from farmer
  - Rating/reputation score
  - "View Bid" call-to-action button

### 3. Bid Detail Screen
- **File:** `BidDetailScreen.tsx`
- **Purpose:** Shows detailed information about a specific bid
- **Sections:**
  - Buyer information and rating
  - Bid details (crop, quantity, price)
  - Pickup logistics (location, date)
  - Buyer's message
  - Negotiation chat interface (mock/static)

### 4. Mock Data
- **File:** `MockMarketData.ts`
- **Contains:**
  - 6 sample buyers with complete information
  - Mock chat messages for negotiation demonstration
  - TypeScript interfaces for type safety

## File Structure

```
app/src/screens/market/
├── MarketScreen.tsx        # Main marketplace screen
├── BuyerCard.tsx           # Individual buyer card component
├── BidDetailScreen.tsx     # Detailed bid view with chat
├── MockMarketData.ts       # Static mock data
└── index.ts                # Module exports
```

## Navigation Integration

The Market screen is registered in the app's navigation:
- **Location:** `app/src/navigation/AppNavigator.tsx`
- **Route Name:** `"Market"`
- **Navigation Method:** Can be accessed via Stack.Screen

### Accessing the Market Screen

```tsx
import { MarketScreen } from '@/screens/market';

// Navigate to market from anywhere in the app
navigation.navigate('Market');
```

## Design System

### Color Palette
- **Primary:** `#2E7D32` (Agricultural Green)
- **Accent:** `#66BB6A` (Light Green)
- **Background:** `#F5F5F5` (Light Gray)

### UI Components
- Card-based layouts with subtle shadows
- Rounded corners (8-12px border radius)
- Large, readable fonts (14px+ for body text)
- Green agricultural color theme
- Friendly, farmer-centric design

## Mock Data Structure

### Buyer Interface
```typescript
interface Buyer {
  id: string;
  buyerName: string;
  crop: string;
  quantity: string;
  price: string;
  location: string;
  rating: number;
  pickupLocation?: string;
  expectedPickupDate?: string;
  message?: string;
}
```

## Current Limitations

This is a static prototype and does NOT:
- Connect to any backend APIs
- Store or persist data
- Enable actual messaging or negotiation
- Process transactions or payments
- Integrate with IoT sensors or other AgroSeva modules
- Modify existing app features

## Future Enhancements

When this feature is developed for production, the following can be added:
1. Real API integration with backend buyer listings
2. Live chat messaging system
3. Real-time location tracking
4. Transaction management
5. Rating/review system
6. Payment integration
7. Deal history and analytics

## Usage Instructions

### For Testing
1. Navigate to the Market screen
2. Try the search functionality - search for crops or buyer names
3. Use crop filter chips to narrow results
4. Click "View Bid" on any card to see detailed information
5. In the detail screen, click "Start Negotiation Chat" to see mock chat

### For Development
1. To add more buyer data, update `MockMarketData.ts`
2. Mock data is automatically used throughout the UI
3. No API configuration needed
4. Components are fully customizable via StyleSheet

## Styling Notes

All components use React Native StyleSheet for styling. The design follows:
- Flexbox-based responsive layouts
- Native platform optimizations (iOS/Android)
- Accessible font sizes and touch targets
- Shadow effects for depth perception

## Integration Notes

The Market feature is completely isolated and does NOT:
- Modify DashboardScreen or any other existing screens
- Change API configurations or backend calls
- Affect irrigation, sensor, or AI modules
- Alter app navigation logic

It can be safely removed or updated without affecting other features.

## Support & Maintenance

For updates or enhancements:
1. Update MockMarketData.ts for new buyer data
2. Modify component styles in respective files
3. All TypeScript types are properly defined for type safety
4. Components are self-contained with no external dependencies beyond React Native

---

**Version:** 1.0 (Prototype)
**Status:** Demonstration UI for hackathon
**Last Updated:** February 2026
