import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'uty',
    slug: 'uty',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'uty',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
        supportsTablet: true,
        config: {
            googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
    },
    android: {
        adaptiveIcon: {
            backgroundColor: '#E6F4FE',
            foregroundImage: './assets/images/android-icon-foreground.png',
            backgroundImage: './assets/images/android-icon-background.png',
            monochromeImage: './assets/images/android-icon-monochrome.png',
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        config: {
            googleMaps: {
                apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
            },
        },
    },
    web: {
        output: 'static',
        favicon: './assets/images/favicon.png',
    },
    plugins: [
        'expo-router',
        'expo-secure-store',
        [
            'expo-splash-screen',
            {
                image: './assets/images/splash-icon.png',
                imageWidth: 200,
                resizeMode: 'contain',
                backgroundColor: '#ffffff',
                dark: {
                    backgroundColor: '#000000',
                },
            },
        ],
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
    extra: {
        router: {},
        eas: {
            projectId: '9c287329-3020-4426-9a3d-9814061049f5',
        },
    },
    owner: 'biso-tech',
});
