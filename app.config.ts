import { ConfigContext, ExpoConfig } from 'expo/config';

const hasPackage = (packageName: string): boolean => {
    try {
        require.resolve(packageName);
        return true;
    } catch {
        return false;
    }
};

export default ({ config }: ConfigContext): ExpoConfig => {
    const hasFirebaseApp = hasPackage('@react-native-firebase/app');
    const androidGoogleServicesFile =
        process.env.GOOGLE_SERVICES_JSON?.trim() || './google-services.json';
    const iosGoogleServicesFile =
        process.env.GOOGLE_SERVICE_INFO_PLIST?.trim() || './GoogleService-Info.plist';

    const plugins: NonNullable<ExpoConfig['plugins']> = [
        'expo-router',
        'expo-secure-store',
        [
            'expo-build-properties',
            {
                android: {
                    minSdkVersion: 26,
                },
            },
        ],
        [
            'expo-splash-screen',
            {
                image: './assets/images/uty.png',
                imageWidth: 200,
                resizeMode: 'contain',
                backgroundColor: '#ffffff',
                dark: {
                    backgroundColor: '#000000',
                },
            },
        ],
    ];

    if (hasFirebaseApp) {
        plugins.push('@react-native-firebase/app');
    }

    if (hasPackage('react-native-vision-camera')) {
        plugins.push([
            'react-native-vision-camera',
            {
                cameraPermissionText:
                    'Nous avons besoin de la camera pour verifier votre identite.',
                enableMicrophonePermission: false,
            },
        ]);
    }

    return {
        ...config,
        name: 'uty',
        slug: 'uty',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/images/uty-transparent.png',
        scheme: 'uty',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            ...(hasFirebaseApp ? { googleServicesFile: iosGoogleServicesFile } : {}),
            config: {
                googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
            },
        },
        android: {
            package: 'com.uty',
            versionCode: 26,
            ...(hasFirebaseApp ? { googleServicesFile: androidGoogleServicesFile } : {}),
            adaptiveIcon: {
                backgroundColor: '#E6F4FE',
                foregroundImage: './assets/images/uty-transparent.png',
                backgroundImage: './assets/images/uty.png',
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
            favicon: './assets/images/uty.png',
        },
        plugins,
        experiments: {
            typedRoutes: true,
            reactCompiler: true,
        },
        extra: {
            router: {},
            eas: {
                projectId: '39639191-336f-463d-855c-f836f78be137',
            },
        },
    };
};
