import { ConfigContext, ExpoConfig } from 'expo/config';
import { ConfigPlugin, withPodfile, withXcodeProject } from 'expo/config-plugins';
import fs from 'node:fs';
import path from 'node:path';

const IOS_DEPLOYMENT_TARGET = '15.5';

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

const readValueFromPlist = (filePath: string, key: string): string | undefined => {
    try {
        const resolvedPath = path.resolve(process.cwd(), filePath);
        const raw = fs.readFileSync(resolvedPath, 'utf-8');
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = raw.match(
            new RegExp(`<key>${escapedKey}</key>\\s*<string>([^<]+)</string>`)
        );
        return match?.[1]?.trim() || undefined;
    } catch {
        return undefined;
    }
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

const withIosDeploymentTarget: ConfigPlugin = (expoConfig) =>
    withXcodeProject(expoConfig, (modConfig) => {
        const buildConfigurations = modConfig.modResults.pbxXCBuildConfigurationSection() as Record<
            string,
            {
                buildSettings?: {
                    IPHONEOS_DEPLOYMENT_TARGET?: string;
                    EXCLUDED_ARCHS?: string;
                    'EXCLUDED_ARCHS[sdk=iphonesimulator*]'?: string;
                };
            }
        >;

        for (const buildConfiguration of Object.values(buildConfigurations)) {
            const buildSettings = buildConfiguration?.buildSettings;

            if (buildSettings?.IPHONEOS_DEPLOYMENT_TARGET) {
                buildSettings.IPHONEOS_DEPLOYMENT_TARGET = IOS_DEPLOYMENT_TARGET;
            }

            if (buildSettings) {
                delete buildSettings.EXCLUDED_ARCHS;
                delete buildSettings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'];
            }
        }

        return modConfig;
    });

const withIosSimulatorArchitectures: ConfigPlugin = (expoConfig) =>
    withPodfile(expoConfig, (modConfig) => {
        const patchName = 'uty_ios_simulator_architectures';
        const googleUtilitiesPod = "  pod 'GoogleUtilities', :modular_headers => true";
        const helper = `
def ${patchName}(installer)
  Dir.glob(File.join(Pod::Config.instance.installation_root.to_s, 'Pods', 'Target Support Files', '**', '*.xcconfig')).each do |xcconfig_path|
    xcconfig = Xcodeproj::Config.new(xcconfig_path)
    xcconfig.attributes.delete('EXCLUDED_ARCHS[sdk=iphonesimulator*]')
    xcconfig.save_as(Pathname.new(xcconfig_path))
  end

  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.xcconfigs.each do |config_name, xcconfig|
      xcconfig.attributes.delete('EXCLUDED_ARCHS[sdk=iphonesimulator*]')
      xcconfig.save_as(aggregate_target.xcconfig_path(config_name))
    end
  end

  installer.pods_project.build_configurations.each do |config|
    config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = ''
  end

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = ''
    end
  end
end
`;

        if (!modConfig.modResults.contents.includes(`def ${patchName}`)) {
            modConfig.modResults.contents = modConfig.modResults.contents.replace(
                '\nENV[\'RCT_NEW_ARCH_ENABLED\']',
                `${helper}\nENV['RCT_NEW_ARCH_ENABLED']`
            );
        }

        if (!modConfig.modResults.contents.includes(`${patchName}(installer)`)) {
            modConfig.modResults.contents = modConfig.modResults.contents.replace(
                /(\s+react_native_post_install\([\s\S]*?\n\s+?\),?)/,
                `$1\n    ${patchName}(installer)`
            );
        }

        if (!modConfig.modResults.contents.includes("pod 'GoogleUtilities'")) {
            modConfig.modResults.contents = modConfig.modResults.contents.replace(
                '  use_expo_modules!',
                `  use_expo_modules!\n\n${googleUtilitiesPod}`
            );
        }

        return modConfig;
    });

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
    const googleIosClientId =
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
        readValueFromPlist(iosGoogleServicesFile, 'CLIENT_ID');
    const googleIosUrlScheme =
        process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim() ||
        readValueFromPlist(iosGoogleServicesFile, 'REVERSED_CLIENT_ID');
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
                ios: {
                    deploymentTarget: IOS_DEPLOYMENT_TARGET,
                    extraPods: [
                        {
                            name: 'GoogleUtilities',
                            modular_headers: true,
                        },
                    ],
                },
                android: {
                    minSdkVersion: 26,
                },
            },
        ],
        withIosDeploymentTarget,
        withIosSimulatorArchitectures,
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
            bundleIdentifier: 'com.gbh.uty',
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
