import { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

const hasPackage = (packageName: string): boolean => {
    try {
        require.resolve(packageName);
        return true;
    } catch {
        return false;
    }
};

const readWebClientIdFromGoogleServices = (filePath: string): string | undefined => {
    try {
        const resolvedPath = path.resolve(process.cwd(), filePath);
        const raw = fs.readFileSync(resolvedPath, 'utf-8');
        const parsed = JSON.parse(raw) as {
            client?: Array<{
                oauth_client?: Array<{
                    client_id?: string;
                    client_type?: number;
                }>;
            }>;
        };

        for (const client of parsed.client ?? []) {
            for (const oauthClient of client.oauth_client ?? []) {
                if (oauthClient.client_type === 3 && oauthClient.client_id?.trim()) {
                    return oauthClient.client_id.trim();
                }
            }
        }
    } catch {
        return undefined;
    }

    return undefined;
};

const readPackageVersion = (): string | undefined => {
    try {
        const resolvedPath = path.resolve(process.cwd(), 'package.json');
        const raw = fs.readFileSync(resolvedPath, 'utf-8');
        const parsed = JSON.parse(raw) as { version?: string };
        const version = parsed.version?.trim();
        return version || undefined;
    } catch {
        return undefined;
    }
};

export default ({ config }: ConfigContext): ExpoConfig => {
    const hasFirebaseApp = hasPackage('@react-native-firebase/app');
    const hasGoogleSignin = hasPackage('@react-native-google-signin/google-signin');
    const androidGoogleServicesFile =
        process.env.GOOGLE_SERVICES_JSON?.trim() || './google-services.json';
    const iosGoogleServicesFile =
        process.env.GOOGLE_SERVICE_INFO_PLIST?.trim() || './GoogleService-Info.plist';
    const googleWebClientId =
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
        readWebClientIdFromGoogleServices(androidGoogleServicesFile);
    const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
    const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
    const appVersion =
        process.env.EXPO_APP_VERSION?.trim() ||
        process.env.npm_package_version?.trim() ||
        readPackageVersion() ||
        config.version ||
        '1.0.0';

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

    if (hasGoogleSignin) {
        if (googleIosUrlScheme) {
            plugins.push([
                '@react-native-google-signin/google-signin',
                {
                    iosUrlScheme: googleIosUrlScheme,
                },
            ]);
        } else {
            plugins.push('@react-native-google-signin/google-signin');
        }
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
        version: appVersion,
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
            versionCode: 35,
            softwareKeyboardLayoutMode: 'resize',
            permissions: ['com.google.android.gms.permission.AD_ID'],
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
            EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleWebClientId,
            EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleIosClientId,
            EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: googleIosUrlScheme,
        },
    };
};
