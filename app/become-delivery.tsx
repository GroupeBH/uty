import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useBecomeDeliveryPersonMutation } from '@/store/api/deliveryPersonsApi';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type VehicleType = 'motorcycle' | 'bicycle' | 'car';
type AlertType = 'success' | 'error' | 'info' | 'warning';

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'motorcycle', label: 'Moto', icon: 'bicycle-outline' },
    { value: 'bicycle', label: 'Velo', icon: 'walk-outline' },
    { value: 'car', label: 'Voiture', icon: 'car-outline' },
];

const DELIVERY_ROLE_KEYS = ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'];

export default function BecomeDeliveryScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, requireAuth } = useAuth();
    const [becomeDeliveryPerson, { isLoading }] = useBecomeDeliveryPersonMutation();

    const [model, setModel] = React.useState('');
    const [licensePlate, setLicensePlate] = React.useState('');
    const [vehicleType, setVehicleType] = React.useState<VehicleType>('motorcycle');
    const [isAvailable, setIsAvailable] = React.useState(true);
    const [deliveryLookupId, setDeliveryLookupId] = React.useState('');
    const [alertState, setAlertState] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        type: AlertType;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
    });

    React.useEffect(() => {
        requireAuth('Vous devez etre connecte pour devenir livreur.');
    }, [requireAuth]);

    const hasDeliveryRole = React.useMemo(
        () =>
            Boolean(
                user?.roles?.some((role) =>
                    DELIVERY_ROLE_KEYS.includes((role || '').toLowerCase()),
                ),
            ),
        [user?.roles],
    );

    const showAlert = (title: string, message: string, type: AlertType = 'info') => {
        setAlertState({
            visible: true,
            title,
            message,
            type,
        });
    };

    const parseApiErrorMessage = (error: any, fallback: string) => {
        if (!error) return fallback;
        if (typeof error === 'string') return error;
        const data = error?.data;
        if (typeof data === 'string') return data;
        if (Array.isArray(data?.message) && data.message.length > 0) return String(data.message[0]);
        if (typeof data?.message === 'string') return data.message;
        if (typeof data?.error === 'string') return data.error;
        if (typeof error?.message === 'string') return error.message;
        return fallback;
    };

    const handleSubmit = async () => {
        if (!requireAuth('Vous devez etre connecte pour devenir livreur.')) {
            return;
        }

        if (!model.trim()) {
            showAlert('Modele requis', 'Veuillez saisir le modele de votre vehicule.', 'warning');
            return;
        }

        if (!licensePlate.trim()) {
            showAlert('Plaque requise', 'Veuillez saisir le numero de plaque.', 'warning');
            return;
        }

        try {
            await becomeDeliveryPerson({
                vehicle: {
                    model: model.trim(),
                    licensePlate: licensePlate.trim().toUpperCase(),
                    type: vehicleType,
                },
                isAvailable,
            }).unwrap();

            if (user) {
                const mergedRoles = Array.from(
                    new Set([...(user.roles || []), 'driver', 'delivery_person']),
                );
                dispatch(
                    setUser({
                        ...user,
                        roles: mergedRoles,
                    }),
                );
            }

            showAlert(
                'Inscription validee',
                'Votre profil livreur est active. Vous pouvez recevoir des livraisons.',
                'success',
            );
        } catch (error: any) {
            const message = parseApiErrorMessage(
                error,
                "Impossible d'activer le profil livreur pour le moment.",
            );
            showAlert(
                error?.status === 409 ? 'Deja livreur' : 'Inscription impossible',
                message,
                error?.status === 409 ? 'info' : 'error',
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Devenir livreur</Text>
                    <View style={styles.headerButtonPlaceholder} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                        <View style={styles.heroIconWrap}>
                            <Ionicons name="rocket-outline" size={26} color={Colors.white} />
                        </View>
                        <Text style={styles.heroTitle}>Activez votre profil livreur</Text>
                        <Text style={styles.heroText}>
                            Renseignez votre vehicule et commencez a recevoir des missions de livraison.
                        </Text>
                    </LinearGradient>

                    {hasDeliveryRole ? (
                        <View style={styles.alreadyCard}>
                            <View style={styles.alreadyBadge}>
                                <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                                <Text style={styles.alreadyBadgeText}>Profil livreur actif</Text>
                            </View>
                            <Text style={styles.alreadyText}>
                                Votre compte est deja configure comme livreur.
                            </Text>
                            <Text style={styles.label}>ID livraison (notification)</Text>
                            <TextInput
                                value={deliveryLookupId}
                                onChangeText={setDeliveryLookupId}
                                style={styles.input}
                                placeholder="Collez l ID de livraison"
                                placeholderTextColor={Colors.gray400}
                                autoCapitalize="none"
                            />
                            <View style={styles.alreadyButtonsRow}>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => router.push('/orders')}
                                >
                                    <Text style={styles.secondaryButtonText}>Voir les commandes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.secondaryButton, !deliveryLookupId.trim() && { opacity: 0.6 }]}
                                    onPress={() => router.push(`/delivery/${deliveryLookupId.trim()}` as any)}
                                    disabled={!deliveryLookupId.trim()}
                                >
                                    <Text style={styles.secondaryButtonText}>Ouvrir livraison</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => router.back()}
                                >
                                    <LinearGradient colors={Gradients.primary} style={styles.primaryButtonGradient}>
                                        <Text style={styles.primaryButtonText}>Retour profil</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.formCard}>
                            <Text style={styles.sectionTitle}>Informations vehicule</Text>
                            <Text style={styles.sectionHint}>
                                Ces informations servent a valider votre capacite de livraison.
                            </Text>

                            <Text style={styles.label}>Type de vehicule *</Text>
                            <View style={styles.vehicleTypesRow}>
                                {VEHICLE_OPTIONS.map((option) => {
                                    const selected = vehicleType === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.vehicleChip,
                                                selected && styles.vehicleChipSelected,
                                            ]}
                                            onPress={() => setVehicleType(option.value)}
                                        >
                                            <Ionicons
                                                name={option.icon}
                                                size={16}
                                                color={selected ? Colors.white : Colors.gray500}
                                            />
                                            <Text
                                                style={[
                                                    styles.vehicleChipText,
                                                    selected && styles.vehicleChipTextSelected,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.label}>Modele *</Text>
                            <TextInput
                                value={model}
                                onChangeText={setModel}
                                style={styles.input}
                                placeholder="Ex: Yamaha NMAX 155"
                                placeholderTextColor={Colors.gray400}
                            />

                            <Text style={styles.label}>Plaque d immatriculation *</Text>
                            <TextInput
                                value={licensePlate}
                                onChangeText={setLicensePlate}
                                style={styles.input}
                                placeholder="Ex: AB-123-CD"
                                autoCapitalize="characters"
                                placeholderTextColor={Colors.gray400}
                            />

                            <View style={styles.switchRow}>
                                <View style={styles.switchCopy}>
                                    <Text style={styles.switchTitle}>Disponible immediatement</Text>
                                    <Text style={styles.switchHint}>
                                        Activez pour recevoir des missions des maintenant.
                                    </Text>
                                </View>
                                <Switch
                                    value={isAvailable}
                                    onValueChange={setIsAvailable}
                                    trackColor={{ false: Colors.gray300, true: Colors.primary + '70' }}
                                    thumbColor={isAvailable ? Colors.primary : Colors.gray500}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                            >
                                <LinearGradient colors={Gradients.accent} style={styles.submitButtonGradient}>
                                    {isLoading ? (
                                        <ActivityIndicator color={Colors.primary} />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
                                            <Text style={styles.submitButtonText}>Activer mon profil livreur</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                confirmText="OK"
                onConfirm={() => {
                    const wasSuccess = alertState.type === 'success';
                    setAlertState((prev) => ({ ...prev, visible: false }));
                    if (wasSuccess) {
                        router.back();
                    }
                }}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButtonPlaceholder: {
        width: 40,
        height: 40,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: Spacing.xl,
        paddingBottom: 120,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    heroIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.white + '26',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    heroTitle: {
        fontSize: Typography.fontSize.xl,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroText: {
        marginTop: Spacing.sm,
        color: Colors.white + 'DD',
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    alreadyCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    alreadyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    alreadyBadgeText: {
        color: Colors.success,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    alreadyText: {
        marginTop: Spacing.sm,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    alreadyButtonsRow: {
        marginTop: Spacing.lg,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    formCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    sectionTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        marginBottom: Spacing.xs,
    },
    sectionHint: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        marginBottom: Spacing.md,
    },
    label: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
        fontSize: Typography.fontSize.sm,
    },
    vehicleTypesRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    vehicleChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        paddingVertical: Spacing.sm,
    },
    vehicleChipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    vehicleChipText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    vehicleChipTextSelected: {
        color: Colors.white,
    },
    input: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
    },
    switchRow: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    switchCopy: {
        flex: 1,
    },
    switchTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    switchHint: {
        marginTop: 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
    },
    submitButton: {
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.md,
    },
    submitButtonDisabled: {
        opacity: 0.85,
    },
    submitButtonGradient: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    submitButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    secondaryButton: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
    },
    secondaryButtonText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    primaryButton: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    primaryButtonGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
