import { Colors } from '@/constants/theme';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyShopQuery } from '@/store/api/shopsApi';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellerTabsLayout() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { data: myShop, isLoading: isShopLoading, isFetching: isShopFetching } = useGetMyShopQuery(undefined, {
        skip: !isAuthenticated,
    });
    const insets = useSafeAreaInsets();
    const tabBarBottomPadding = Math.max(insets.bottom, 10);
    const tabBarHeight = 58 + tabBarBottomPadding;
    const hasShop = Boolean(myShop?._id);

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
    const openCreateShop = React.useCallback(() => {
        router.replace('/create-shop' as any);
    }, [router]);
    const goToDefaultSpace = React.useCallback(() => {
        router.replace('/(tabs)' as any);
    }, [router]);
    const requireSellerSpaceReady = React.useCallback(
        (event: { preventDefault: () => void }) => {
            if (!isAuthenticated) {
                event.preventDefault();
                openAuthModal();
                return;
            }

            if (!hasShop) {
                event.preventDefault();
                openCreateShop();
            }
        },
        [hasShop, isAuthenticated, openAuthModal, openCreateShop],
    );

    React.useEffect(() => {
        if (!isAuthenticated) return;
        if (isShopLoading || isShopFetching) return;
        if (!hasShop) {
            openCreateShop();
        }
    }, [hasShop, isAuthenticated, isShopFetching, isShopLoading, openCreateShop]);

    if (isAuthenticated && (isShopLoading || isShopFetching || !hasShop)) {
        return <LoadingSpinner fullScreen />;
    }

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
                    tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} />,
                }}
                listeners={{ tabPress: requireSellerSpaceReady }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Commandes',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="receipt-outline" size={20} color={color} />
                    ),
                }}
                listeners={{ tabPress: requireSellerSpaceReady }}
            />
            <Tabs.Screen
                name="shop"
                options={{
                    title: 'Boutique',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="storefront-outline" size={20} color={color} />
                    ),
                }}
                listeners={{ tabPress: requireSellerSpaceReady }}
            />
            <Tabs.Screen
                name="announcements"
                options={{
                    title: 'Annonces',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="megaphone-outline" size={20} color={color} />
                    ),
                }}
                listeners={{ tabPress: requireSellerSpaceReady }}
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
