/**
 * Écran de profil utilisateur amélioré
 * Accès aux commandes, annonces, paramètres et modification du profil
 */

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyAnnouncementsQuery } from '@/store/api/announcementsApi';
import { useGetOrdersQuery } from '@/store/api/ordersApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, isLoading, isAuthenticated } = useAuth();
    const { data: announcements } = useGetMyAnnouncementsQuery(undefined, {
        skip: !isAuthenticated,
    });
    const { data: orders } = useGetOrdersQuery(undefined, {
        skip: !isAuthenticated,
    });
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);
    const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = React.useState(false);
    const [logoutErrorMessage, setLogoutErrorMessage] = React.useState('');

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, router]);

    const hasDeliveryRole = Boolean(
        user?.roles?.some((role) =>
            ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'].includes(
                (role || '').toLowerCase(),
            ),
        ),
    );

    const handleLogout = () => {
        setIsLogoutConfirmVisible(true);
    };

    const confirmLogout = async () => {
        try {
            setIsLoggingOut(true);
            setIsLogoutConfirmVisible(false);
            await logout();
            router.replace('/(tabs)');
        } catch (error: any) {
            setLogoutErrorMessage(error?.message || 'Erreur lors de la deconnexion.');
        } finally {
            setIsLoggingOut(false);
        }
    };


    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const stats = [
        {
            label: 'Annonces',
            value: announcements?.length || 0,
            icon: 'megaphone-outline',
            color: Colors.primary,
            gradient: Gradients.primary,
            onPress: () => router.push('/my-announcements'),
        },
        {
            label: 'Commandes',
            value: orders?.length || 0,
            icon: 'receipt-outline',
            color: Colors.success,
            gradient: Gradients.success,
            onPress: () => router.push('/orders'),
        },
        {
            label: 'Favoris',
            value: 0, // TODO: Récupérer depuis l'API
            icon: 'heart-outline',
            color: Colors.error,
            gradient: Gradients.warm,
            onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
        },
    ];

    const menuSections = [
        {
            title: 'Mon compte',
            items: [
                {
                    icon: 'person-outline',
                    label: 'Modifier mon profil',
                    subtitle: 'Nom, téléphone, email',
                    gradient: Gradients.primary,
                    onPress: () => router.push('/edit-profile'),
                },
                {
                    icon: 'storefront-outline',
                    label: 'Ma boutique',
                    subtitle: 'Gerer boutique et KYC',
                    gradient: Gradients.accent,
                    onPress: () => router.push('/my-shop'),
                },
                {
                    icon: 'bicycle-outline',
                    label: hasDeliveryRole ? 'Profil livreur' : 'Devenir livreur',
                    subtitle: hasDeliveryRole
                        ? 'Statut actif et disponibilite'
                        : 'Activez votre compte de livraison',
                    gradient: Gradients.success,
                    onPress: () => router.push('/become-delivery'),
                },
                ...(hasDeliveryRole
                    ? [
                          {
                              icon: 'navigate-outline',
                              label: 'Livraisons disponibles',
                              subtitle: 'Voir et accepter les courses',
                              gradient: Gradients.cool,
                              onPress: () => router.push('/delivery/deliver-persons'),
                          },
                      ]
                    : []),
                {
                    icon: 'location-outline',
                    label: 'Adresses',
                    subtitle: 'Gérer mes adresses',
                    gradient: Gradients.cool,
                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                },
                {
                    icon: 'card-outline',
                    label: 'Moyens de paiement',
                    subtitle: 'Cartes et portefeuilles',
                    gradient: Gradients.accent,
                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                },
            ],
        },
        {
            title: 'Application',
            items: [
                {
                    icon: 'notifications-outline',
                    label: 'Notifications',
                    subtitle: 'Gérer les notifications',
                    gradient: Gradients.warm,
                    onPress: () => router.push('/notifications'),
                },
                {
                    icon: 'settings-outline',
                    label: 'Paramètres',
                    subtitle: 'Préférences et confidentialité',
                    gradient: Gradients.cool,
                    onPress: () => router.push('/settings'),
                },
                {
                    icon: 'help-circle-outline',
                    label: 'Aide & Support',
                    subtitle: 'FAQ et contact',
                    gradient: Gradients.success,
                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                },
            ],
        },
    ];

    const getInitials = () => {
        if (!user) return 'U';
        const first = user.firstName?.[0] || '';
        const last = user.lastName?.[0] || '';
        return (first + last).toUpperCase() || 'U';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header avec gradient */}
            <LinearGradient colors={Gradients.primary} style={styles.header}>
                <View style={styles.headerOrnamentOne} />
                <View style={styles.headerOrnamentTwo} />
                <View style={styles.headerContent}>
                    <View style={styles.avatarContainer}>
                        {user?.image ? (
                            <Image source={{ uri: user.image }} style={styles.avatarImage} />
                        ) : (
                            <LinearGradient colors={Gradients.accent} style={styles.avatar}>
                                <Text style={styles.avatarText}>{getInitials()}</Text>
                            </LinearGradient>
                        )}
                        <TouchableOpacity
                            style={styles.editAvatarButton}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Ionicons name="camera" size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>
                        {user?.firstName} {user?.lastName}
                    </Text>
                    <Text style={styles.userPhone}>{user?.phone || user?.verified_phone}</Text>
                    {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
                    <View style={styles.userChipsRow}>
                        <View style={styles.userChip}>
                            <Ionicons name="shield-checkmark-outline" size={13} color={Colors.white} />
                            <Text style={styles.userChipText}>Compte actif</Text>
                        </View>
                        <View style={styles.userChip}>
                            <Ionicons
                                name={hasDeliveryRole ? 'bicycle-outline' : 'person-outline'}
                                size={13}
                                color={Colors.white}
                            />
                            <Text style={styles.userChipText}>
                                {hasDeliveryRole ? 'Mode livreur' : 'Mode client'}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Statistiques */}
                <View style={styles.statsContainer}>
                    {stats.map((stat, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.statCard}
                            onPress={stat.onPress}
                            activeOpacity={0.8}
                        >
                            <LinearGradient colors={stat.gradient} style={styles.statGradient}>
                                <Ionicons name={stat.icon as any} size={28} color={Colors.white} />
                            </LinearGradient>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sections de menu */}
                {menuSections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.menuSection}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.menuItemsContainer}>
                            {section.items.map((item, itemIndex) => (
                                <TouchableOpacity
                                    key={itemIndex}
                                    style={styles.menuItem}
                                    onPress={item.onPress}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.menuItemLeft}>
                                        <LinearGradient
                                            colors={item.gradient}
                                            style={styles.menuIconGradient}
                                        >
                                            <Ionicons
                                                name={item.icon as any}
                                                size={22}
                                                color={Colors.white}
                                            />
                                        </LinearGradient>
                                        <View style={styles.menuItemText}>
                                            <Text style={styles.menuLabel}>{item.label}</Text>
                                            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color={Colors.gray400}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Bouton de déconnexion */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={22} color={Colors.error} />
                    <Text style={styles.logoutText}>
                        {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
                    </Text>
                </TouchableOpacity>

                {/* Version */}
                <Text style={styles.version}>Version 1.0.0</Text>
            </ScrollView>

            <CustomAlert
                visible={isLogoutConfirmVisible}
                title="Confirmer la deconnexion"
                message="Voulez-vous vraiment vous deconnecter de votre compte ?"
                type="warning"
                showCancel
                cancelText="Annuler"
                confirmText={isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
                onCancel={() => {
                    if (!isLoggingOut) setIsLogoutConfirmVisible(false);
                }}
                onConfirm={() => {
                    if (!isLoggingOut) {
                        void confirmLogout();
                    }
                }}
            />
            <CustomAlert
                visible={Boolean(logoutErrorMessage)}
                title="Erreur"
                message={logoutErrorMessage}
                type="error"
                confirmText="Fermer"
                onConfirm={() => setLogoutErrorMessage('')}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    header: {
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xxxl,
        paddingHorizontal: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xxxl,
        borderBottomRightRadius: BorderRadius.xxxl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    headerOrnamentOne: {
        position: 'absolute',
        top: -36,
        right: -26,
        width: 132,
        height: 132,
        borderRadius: 66,
        backgroundColor: Colors.white + '1A',
    },
    headerOrnamentTwo: {
        position: 'absolute',
        bottom: -34,
        left: -22,
        width: 118,
        height: 118,
        borderRadius: 59,
        backgroundColor: Colors.accent + '24',
    },
    headerContent: {
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.xl,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        ...Shadows.xl,
    },
    avatarText: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: Colors.white,
        ...Shadows.md,
    },
    userName: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
        marginBottom: Spacing.xs,
    },
    userPhone: {
        fontSize: Typography.fontSize.base,
        color: Colors.white + 'DD',
        fontWeight: Typography.fontWeight.medium,
        marginBottom: Spacing.xs / 2,
    },
    userEmail: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'BB',
    },
    userChipsRow: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        gap: Spacing.xs,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    userChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.white + '33',
        backgroundColor: Colors.white + '1A',
    },
    userChipText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
        marginTop: -Spacing.md,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        ...Shadows.md,
    },
    statGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    statValue: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs / 2,
    },
    statLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        fontWeight: Typography.fontWeight.medium,
    },
    menuSection: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    menuItemsContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIconGradient: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    menuItemText: {
        flex: 1,
    },
    menuLabel: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs / 2,
    },
    menuSubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.error + '30',
        ...Shadows.sm,
    },
    logoutText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.error,
    },
    version: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
});

