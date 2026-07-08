import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Entrego Courier',
  slug: 'entrego-courier',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#f97316',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.entrego.courier',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Entrego uses your location to navigate to pickup and dropoff points.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Entrego uses your background location to track active deliveries and calculate pay time.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#f97316',
    },
    package: 'com.entrego.courier',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Entrego Courier needs background location to track your active deliveries and calculate accurate pay time.',
      },
    ],
    ['@sentry/react-native/expo', { organization: 'entrego', project: 'courier-mobile' }],
  ],
  extra: {
    apiUrl: process.env['API_URL'] ?? 'http://localhost:3001',
    eas: {
      // projectId: 'REPLACE_AFTER_EAS_INIT',
    },
  },
};

export default config;
