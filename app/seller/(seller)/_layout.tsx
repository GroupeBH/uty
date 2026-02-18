import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';

export default function SellerTabsLayout() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const openAuthModal = React.useCallback(() => {
        router.push({
            pathname: '/modal',
            params: {
                mode: 'login',
                title: 'Connexion requise',
                reason: 'Connectez-vous pour acceder a l espace vendeur.',
                source: 'seller_space',
            },
        });
    }, [router]);
    const goToDefaultSpace = React.useCallback(() => {
        router.replace('/(tabs)' as any);
    }, [router]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.gray500,
                tabBarStyle: {
                    height: 70,
                    paddingTop: 8,
                    paddingBottom: 10,
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
                    tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} />,
                }}
                listeners={{
                    tabPress: (event) => {
                        if (!isAuthenticated) {
                            event.preventDefault();
                            openAuthModal();
                        }
                    },
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Commandes',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="receipt-outline" size={20} color={color} />
                    ),
                }}
                listeners={{
                    tabPress: (event) => {
                        if (!isAuthenticated) {
                            event.preventDefault();
                            openAuthModal();
                        }
                    },
                }}
            />
            <Tabs.Screen
                name="shop"
                options={{
                    title: 'Boutique',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="storefront-outline" size={20} color={color} />
                    ),
                }}
                listeners={{
                    tabPress: (event) => {
                        if (!isAuthenticated) {
                            event.preventDefault();
                            openAuthModal();
                        }
                    },
                }}
            />
            <Tabs.Screen
                name="announcements"
                options={{
                    title: 'Annonces',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="megaphone-outline" size={20} color={color} />
                    ),
                }}
                listeners={{
                    tabPress: (event) => {
                        if (!isAuthenticated) {
                            event.preventDefault();
                            openAuthModal();
                        }
                    },
                }}
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
