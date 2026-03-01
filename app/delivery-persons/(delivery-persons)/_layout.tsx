import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeliveryPersonsTabsLayout() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const insets = useSafeAreaInsets();
    const tabBarBottomPadding = Math.max(insets.bottom, 10);
    const tabBarHeight = 58 + tabBarBottomPadding;
    const openAuthModal = React.useCallback(() => {
        router.push({
            pathname: '/modal',
            params: {
                mode: 'login',
                title: 'Connexion requise',
                reason: 'Connectez-vous pour acceder a l espace livreur.',
                source: 'delivery_space',
            },
        });
    }, [router]);
    const goToDefaultSpace = React.useCallback(() => {
        router.replace('/(tabs)' as any);
    }, [router]);

    const requireLogin = (event: { preventDefault: () => void }) => {
        if (isAuthenticated) return;
        event.preventDefault();
        openAuthModal();
    };

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.gray500,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    height: tabBarHeight,
                    paddingTop: 8,
                    paddingBottom: tabBarBottomPadding,
                    borderTopColor: Colors.gray200,
                    backgroundColor: Colors.white,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <Ionicons name="speedometer-outline" size={20} color={color} />,
                }}
                listeners={{ tabPress: requireLogin }}
            />
            <Tabs.Screen
                name="pool"
                options={{
                    title: 'Courses',
                    tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={20} color={color} />,
                }}
                listeners={{ tabPress: requireLogin }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Actives',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="navigate-outline" size={20} color={color} />
                    ),
                }}
                listeners={{ tabPress: requireLogin }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="bicycle-outline" size={20} color={color} />
                    ),
                }}
                listeners={{ tabPress: requireLogin }}
            />
            <Tabs.Screen
                name="client"
                options={{
                    title: 'Client',
                    tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={20} color={color} />,
                }}
                listeners={{
                    tabPress: (event) => {
                        event.preventDefault();
                        goToDefaultSpace();
                    },
                }}
            />
        </Tabs>
    );
}
