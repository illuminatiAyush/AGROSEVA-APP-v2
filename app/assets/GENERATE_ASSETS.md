# Generating App Assets

For development, the app will work without these assets. However, for production builds, you'll need to create them.

## Required Assets

1. **icon.png** - 1024x1024px
   - App icon for iOS and Android
   - Should be a square image with no transparency

2. **splash.png** - 1242x2436px (or any size, will be scaled)
   - Splash screen image
   - Should match your app's branding

3. **adaptive-icon.png** - 1024x1024px (Android)
   - Android adaptive icon foreground
   - Should work on both light and dark backgrounds

4. **favicon.png** - 48x48px (Web)
   - Web favicon (optional for mobile app)

## Quick Solution: Use Online Generators

1. **App Icon Generator**: https://www.appicon.co/
   - Upload a 1024x1024 image
   - Generates all required sizes

2. **Expo Asset Generator**: 
   ```bash
   npx expo-asset-generator
   ```

3. **Manual Creation**:
   - Use any image editor (Photoshop, GIMP, Canva)
   - Create square images with the dimensions above
   - Save as PNG format

## Temporary Placeholder

For now, the app.json has been configured to work without these assets. The app will use default Expo icons during development.

## For Production Build

Before building APK/IPA, make sure to:
1. Create all required assets
2. Place them in the `assets/` folder
3. Update `app.json` to reference them (already configured)

