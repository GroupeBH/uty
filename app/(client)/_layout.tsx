/**
 * Layout pour l'interface client
 */

import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ClientLayout() {
    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? 'dark' : 'light';

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.accent,
                tabBarInactiveTintColor: Colors.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.primary,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    height: 70,
                    paddingBottom: 15,
                    marginHorizontal: 16,
                    marginBottom: 16,
                    borderRadius: 35,
                    position: 'absolute',
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                    marginBottom: 2,
                },
                headerStyle: {
                    backgroundColor: Colors.primary,
                },
                headerTintColor: Colors.white,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                tabBarShowLabel: true,
            }}
        >
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Recherche',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search" size={size + 2} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Panier',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cart" size={size + 2} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Accueil',
                    tabBarIcon: ({ color, size }) => (
                        <View style={{
                            backgroundColor: color === Colors.accent ? Colors.accent : 'transparent',
                            padding: 8,
                            borderRadius: 20,
                            marginTop: -10,
                        }}>
                            <Ionicons
                                name="home"
                                size={size + 4}
                                color={color === Colors.accent ? Colors.primary : color}
                            />
                        </View>
                    ),
                    tabBarLabel: ({ color }) => (
                        <Text style={{
                            color,
                            fontSize: 10,
                            fontWeight: '700',
                            marginTop: 5
                        }}>Accueil</Text>
                    )
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size + 2} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Commandes',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="receipt" size={size + 2} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
