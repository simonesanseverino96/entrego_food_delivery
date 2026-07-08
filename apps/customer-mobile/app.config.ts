import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Entrego',
  slug: 'entrego-customer',
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
    bundleIdentifier: 'com.entrego.customer',
    // EAS project ID — set after opening Apple Developer account (task H4)
    // buildNumber: '1',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#f97316',
    },
    package: 'com.entrego.customer',
    permissions: ['ACCESS_FINE_LOCATION'],
  },
  plugins: [
    'expo-router',
    ['@sentry/react-native/expo', { organization: 'entrego', project: 'customer-mobile' }],
  ],
  extra: {
    apiUrl: process.env['API_URL'] ?? 'http://localhost:3001',
    eas: {
      // projectId: 'REPLACE_AFTER_EAS_INIT',
    },
  },
};

export default config;
