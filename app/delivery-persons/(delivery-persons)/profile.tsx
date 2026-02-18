import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DRIVER_ROLE_KEYS = ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'];

const hasDriverRole = (roles: string[] | undefined) =>
    Boolean(roles?.some((role) => DRIVER_ROLE_KEYS.includes((role || '').toLowerCase())));

export default function DeliveryPersonsProfileTab() {
    const router = useRouter();
    const { isLoading, isAuthenticated, user, requireAuth } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour gerer votre profil livreur.');
        }
    }, [isAuthenticated, requireAuth]);

    const roleActive = hasDriverRole(user?.roles);
    const { data: profile, isFetching, refetch } = useGetMyDeliveryPersonProfileQuery(undefined, {
        skip: !isAuthenticated,
    });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="bicycle-outline" size={26} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Profil livreur</Text>
                    <Text style={styles.subtitle}>
                        {roleActive
                            ? 'Votre espace livreur est actif. Continuez a gerer vos courses.'
                            : 'Devenez livreur pour acceder aux courses disponibles.'}
                    </Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Disponibilite</Text>
                        <Text style={styles.infoValue}>
                            {profile?.isAvailable ? 'Disponible' : 'Indisponible'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Vehicule</Text>
                        <Text style={styles.infoValue}>
                            {profile?.vehicle?.model || 'Non renseigne'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Plaque</Text>
                        <Text style={styles.infoValue}>
                            {profile?.vehicle?.licensePlate || 'Non renseigne'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Note</Text>
                        <Text style={styles.infoValue}>
                            {typeof profile?.rating === 'number' ? profile.rating.toFixed(2) : '--'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/become-delivery')}
                    >
                        <Text style={styles.primaryButtonText}>
                            {roleActive ? 'Mettre a jour le profil livreur' : 'Activer mon profil livreur'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, isFetching && styles.disabled]}
                        onPress={() => refetch()}
                        disabled={isFetching}
                    >
                        <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                        <Text style={styles.secondaryButtonText}>
                            {isFetching ? 'Actualisation...' : 'Actualiser'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    content: {
        padding: Spacing.xl,
    },
    card: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.xl,
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    subtitle: {
        marginTop: Spacing.xs,
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    infoRow: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
        paddingBottom: Spacing.xs,
    },
    infoLabel: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
    },
    infoValue: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    primaryButton: {
        marginTop: Spacing.lg,
        minHeight: 46,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    secondaryButton: {
        marginTop: Spacing.sm,
        minHeight: 44,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    secondaryButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    disabled: {
        opacity: 0.65,
    },
});
