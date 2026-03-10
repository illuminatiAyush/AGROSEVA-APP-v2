# Farm Setup & AI Decision System - Implementation Guide

## Overview

This implementation adds a complete end-to-end smart farming decision system that:
1. Allows users to configure farm zones with crop details
2. Fetches crop standards from Gemini AI (one-time per crop)
3. Compares real-time sensor data with crop standards every 3 seconds
4. Makes priority-based decisions (IRRIGATE/FERTILIZE/SOIL_CORRECTION/WAIT)
5. Calculates precise irrigation quantities
6. Provides explainable AI (XAI) bullet-point explanations

## New Files Created

### Models
- `src/models/FarmSetup.ts` - Data models for zone setup, crop standards, and decisions

### Services
- `src/services/GeminiService.ts` - Gemini AI integration for crop standards
- `src/services/IrrigationCalculator.ts` - Water quantity calculation
- `src/services/FarmDecisionService.ts` - Priority-based decision engine
- `src/services/FarmMonitoringService.ts` - Real-time monitoring (runs every 3 seconds)

### Stores
- `src/store/useFarmSetupStore.ts` - Zustand store for farm configuration and decisions

### Screens
- `src/screens/FarmSetupScreen.tsx` - UI for configuring zones and crops

### Enhanced Files
- `src/ai/XAIEngine.ts` - Added `explainFarmDecision()` method
- `src/screens/DashboardScreen.tsx` - Updated to show new decision format
- `src/navigation/AppNavigator.tsx` - Added Farm Setup screen route
- `App.tsx` - Starts farm monitoring service
- `src/utils/constants.ts` - Added storage keys

## How It Works

### 1. Farm Setup Flow

1. User navigates to **Farm Setup** screen (from Settings or Dashboard)
2. Enters:
   - Zone ID (e.g., `zone_1`)
   - Zone Name (e.g., `North Field`)
   - Crop Name (e.g., `Wheat`, `Rice`, `Cotton`)
   - Farm Area (acres)
   - Soil Type (sandy/loamy/clay)
3. On submit:
   - Zone is saved to Zustand store and AsyncStorage
   - Gemini AI is called **once** to fetch crop standards
   - Standards are cached by crop name (no repeated API calls)

### 2. Real-Time Monitoring

- `FarmMonitoringService` runs every 3 seconds (started in `App.tsx`)
- For each configured zone:
  - Gets current sensor data from `useStore`
  - Gets crop standards from `useFarmSetupStore`
  - Calls `FarmDecisionService.generateDecision()`
  - Generates XAI explanations via `XAIEngine.explainFarmDecision()`
  - Stores decision in Zustand and AsyncStorage

### 3. Decision Logic (Priority-Based)

**Priority Order:**
1. **Soil Moisture & Water Stress** (Highest)
   - Critical moisture → IRRIGATE (unless rain coming)
   - Low moisture + rain expected → WAIT
   - Low moisture + no rain → IRRIGATE

2. **Rain Forecast**
   - Can override irrigation if moisture is not critical

3. **Soil pH**
   - Out of ideal range → SOIL_CORRECTION

4. **NPK Nutrients**
   - Deficient → FERTILIZE (determines which nutrient)

5. **Temperature**
   - Affects irrigation quantity, not action

### 4. Irrigation Calculation

Water quantity considers:
- **Moisture deficit**: Difference from optimal
- **Root depth**: Deeper roots need more water
- **Soil type**: Sandy (1.3x), Loamy (1.0x), Clay (0.8x)
- **Temperature**: Higher temp = more evaporation
- **Rain forecast**: Reduces by 50% if rain expected

Formula: `mm = base × deficit_factor × root_factor × soil_factor × temp_factor × rain_factor`

Output: mm, liters/acre, total liters

### 5. XAI Explanations

Each decision includes bullet-point explanations:
- Selected crop and its optimal standards
- Current sensor readings
- Parameters out of range
- Why specific action was chosen
- How water quantity was calculated (if irrigation)
- Confidence level

## Usage

### Setting Up a Farm Zone

```typescript
// Navigate to Farm Setup screen
navigation.navigate('FarmSetup');

// Or from Settings screen
// Click "Farm Setup" option
```

### Accessing Decisions

```typescript
import { useFarmSetupStore } from '@/store/useFarmSetupStore';

const { getLatestDecision, zones } = useFarmSetupStore();
const zone = zones[0];
const decision = getLatestDecision(zone.zoneId);

if (decision) {
  console.log('Action:', decision.action);
  console.log('Confidence:', decision.confidence);
  console.log('Explanations:', decision.explanation);
  console.log('Water Quantity:', decision.irrigationQuantity);
}
```

## Configuration

### Gemini API Key

Set in environment variable or `.env` file:
```
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

If not set, the service falls back to mock data for common Indian crops (Wheat, Rice, Cotton, Sugarcane, Maize).

### Storage Keys

New storage keys added to `constants.ts`:
- `FARM_SETUP` - Zone configurations
- `CROP_STANDARDS` - Cached crop standards (by crop name)
- `FARM_DECISIONS` - Latest decisions per zone

## Decision Actions

### IRRIGATE
- Triggered when: Moisture below optimal (critical or low)
- Includes: Water quantity in mm, liters/acre, total liters
- Override: Rain forecast can cause WAIT instead

### FERTILIZE
- Triggered when: NPK levels below 80% of crop requirements
- Includes: Nutrient type (N/P/K/balanced) and amount (kg/acre)

### SOIL_CORRECTION
- Triggered when: pH outside ideal range for crop
- Action: Apply lime (raise pH) or sulfur (lower pH)

### WAIT
- Triggered when: All parameters optimal OR low moisture but rain coming
- No action needed

## Dashboard Display

The Dashboard screen now shows:
1. **Setup Prompt** (if no zones configured)
   - Button to navigate to Farm Setup

2. **Decision Card** (if zones configured)
   - Action (IRRIGATE/FERTILIZE/SOIL_CORRECTION/WAIT)
   - Confidence percentage
   - Water/Fertilizer quantities (if applicable)
   - "Why this action?" section with XAI bullet points

3. **Add Zone Button** (if zones exist)
   - Quick access to add more zones

## Offline Support

- All zone configurations cached in AsyncStorage
- Crop standards cached by crop name (no repeated Gemini calls)
- Decisions cached per zone
- Works offline after initial setup

## Extensibility

### Adding New Crops
- Gemini AI automatically handles new crops
- Mock data can be extended in `GeminiService.getMockCropStandards()`

### Adding New Sensors
- Update `SoilData` model
- Update `FarmDecisionService` decision logic
- Update `XAIEngine` explanations

### Custom Decision Rules
- Modify `FarmDecisionService.generateDecision()`
- Priority order can be adjusted
- Thresholds can be customized per crop

## Testing

### Mock Mode
- Gemini API key not required
- Uses mock crop standards for common crops
- All calculations work identically

### Real Hardware
- Sensor data comes from `useStore` (updated by SensorMock or hardware)
- No changes needed to decision logic

## Performance

- Monitoring runs every 3 seconds
- Decisions only generated for zones with crop standards
- Caching prevents repeated Gemini API calls
- AsyncStorage operations are non-blocking

## Future Enhancements

1. **Multi-zone Dashboard**: Show decisions for all zones
2. **Historical Data**: Track decision history over time
3. **ML Integration**: Replace rule-based logic with trained models
4. **Real Weather API**: Replace mock weather data
5. **Push Notifications**: Alert on critical decisions
6. **Export Reports**: PDF/CSV export of decisions

## Troubleshooting

### No Decisions Showing
- Check if zones are configured: `useFarmSetupStore.getState().zones`
- Verify crop standards loaded: `zone.cropStandards !== null`
- Check monitoring service is running: Should start automatically in `App.tsx`

### Gemini API Errors
- Falls back to mock data automatically
- Check API key in environment variable
- Verify network connectivity

### Storage Issues
- Clear AsyncStorage: `storageService.clear()`
- Check storage keys in `constants.ts`

## Code Structure

```
src/
├── models/
│   └── FarmSetup.ts          # Data models
├── services/
│   ├── GeminiService.ts       # AI crop standards
│   ├── IrrigationCalculator.ts # Water calculation
│   ├── FarmDecisionService.ts  # Decision engine
│   └── FarmMonitoringService.ts # Real-time monitoring
├── store/
│   └── useFarmSetupStore.ts   # State management
├── screens/
│   └── FarmSetupScreen.tsx    # Setup UI
└── ai/
    └── XAIEngine.ts          # Explanations (enhanced)
```

## Summary

This implementation provides a complete, hackathon-ready smart farming decision system that:
-  Uses Gemini AI for crop standards (one-time per crop)
-  Compares sensor data with standards every 3 seconds
-  Makes priority-based decisions considering all parameters
-  Calculates precise irrigation quantities
-  Provides explainable AI bullet-point explanations
-  Works offline after initial setup
-  Easy to extend to real ML and hardware

All code is modular, well-documented, and follows existing project patterns.

