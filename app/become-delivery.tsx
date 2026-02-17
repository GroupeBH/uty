import { CustomAlert } from '@/components/ui/CustomAlert';
import { KycFlowModal } from '@/components/kyc/KycFlowModal';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useBecomeDeliveryPersonMutation } from '@/store/api/deliveryPersonsApi';
import { useGetMyKycEligibilityQuery, useGetMyKycQuery } from '@/store/api/usersApi';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Image,
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
const DELIVERY_STEPS = [
    { id: 1, title: 'KYC', icon: 'shield-checkmark-outline' as const },
    { id: 2, title: 'Photo', icon: 'camera-outline' as const },
    { id: 3, title: 'Vehicule', icon: 'bicycle-outline' as const },
];

export default function BecomeDeliveryScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, requireAuth } = useAuth();
    const [becomeDeliveryPerson, { isLoading }] = useBecomeDeliveryPersonMutation();

    const [model, setModel] = React.useState('');
    const [licensePlate, setLicensePlate] = React.useState('');
    const [vehicleType, setVehicleType] = React.useState<VehicleType>('motorcycle');
    const [isAvailable, setIsAvailable] = React.useState(true);
    const [step, setStep] = React.useState(1);
    const [profileImageUrl, setProfileImageUrl] = React.useState<string>((user?.image || '').trim());
    const [profileImagePreview, setProfileImagePreview] = React.useState<string>((user?.image || '').trim());
    const [isCapturingProfileImage, setIsCapturingProfileImage] = React.useState(false);
    const [kycModalVisible, setKycModalVisible] = React.useState(false);
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

    const { data: kycEligibility, refetch: refetchKycEligibility, isFetching: isCheckingKyc } =
        useGetMyKycEligibilityQuery(undefined, { skip: !user?._id });
    const { data: myKyc, refetch: refetchMyKyc } = useGetMyKycQuery(undefined, { skip: !user?._id });
    const isKycApproved = kycEligibility?.isKycApproved === true;
    const kycStatus = (kycEligibility?.kycStatus || 'not_submitted').toLowerCase();

    React.useEffect(() => {
        requireAuth('Vous devez etre connecte pour devenir livreur.');
    }, [requireAuth]);

    React.useEffect(() => {
        const incomingImage = (user?.image || '').trim();
        if (!incomingImage) {
            return;
        }
        setProfileImageUrl((prev) => prev || incomingImage);
        setProfileImagePreview((prev) => prev || incomingImage);
    }, [user?.image]);

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

    const getResolvedProfileImage = () => {
        const fallbackSelfieFromKyc =
            typeof myKyc?.kyc?.selfieUrl === 'string' ? myKyc.kyc.selfieUrl.trim() : '';
        const fallbackImageFromProfile = (user?.image || '').trim();
        return profileImageUrl.trim() || fallbackSelfieFromKyc || fallbackImageFromProfile;
    };

    const validateCurrentStep = () => {
        if (step === 1 && !isKycApproved) {
            showAlert(
                'KYC requis',
                'Vous devez d abord valider votre KYC pour continuer.',
                'warning',
            );
            setKycModalVisible(true);
            return false;
        }

        if (step === 2 && !getResolvedProfileImage()) {
            showAlert(
                'Photo requise',
                'Capturez votre photo de profil avant de continuer.',
                'warning',
            );
            return false;
        }

        if (step === 3 && !model.trim()) {
            showAlert('Modele requis', 'Veuillez saisir le modele de votre vehicule.', 'warning');
            return false;
        }

        if (step === 3 && !licensePlate.trim()) {
            showAlert('Plaque requise', 'Veuillez saisir le numero de plaque.', 'warning');
            return false;
        }

        return true;
    };

    const goNext = () => {
        if (!validateCurrentStep()) {
            return;
        }
        setStep((prev) => Math.min(prev + 1, DELIVERY_STEPS.length));
    };

    const goPrevious = () => {
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const captureProfileImage = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
            showAlert('Permission requise', 'Autorisez la camera pour capturer votre photo de profil.', 'warning');
            return;
        }

        setIsCapturingProfileImage(true);
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
                cameraType: ImagePicker.CameraType.front,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const asset = result.assets[0];
            if (!asset.base64) {
                showAlert('Capture invalide', 'Impossible de lire la photo capturee.', 'error');
                return;
            }

            const mimeType =
                asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${asset.base64}`;
            setProfileImageUrl(dataUrl);
            setProfileImagePreview(asset.uri);
        } finally {
            setIsCapturingProfileImage(false);
        }
    };

    const handleSubmit = async () => {
        if (!requireAuth('Vous devez etre connecte pour devenir livreur.')) {
            return;
        }

        if (!validateCurrentStep()) {
            return;
        }

        if (!isKycApproved) {
            showAlert(
                'KYC requis',
                'Votre KYC doit etre approuve avant l activation du profil livreur.',
                'warning',
            );
            setStep(1);
            setKycModalVisible(true);
            return;
        }

        const resolvedProfileImage = getResolvedProfileImage();

        if (!resolvedProfileImage) {
            showAlert(
                'Photo de profil requise',
                'Capturez une photo de profil pour finaliser votre inscription livreur.',
                'warning',
            );
            setStep(2);
            return;
        }

        try {
            await becomeDeliveryPerson({
                profileImageUrl: resolvedProfileImage,
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
                        image: resolvedProfileImage,
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

    const renderStepIndicators = () => (
        <View style={styles.stepsRow}>
            {DELIVERY_STEPS.map((item) => {
                const isActive = item.id === step;
                const isDone = item.id < step;
                return (
                    <View key={item.id} style={styles.stepItem}>
                        <View
                            style={[
                                styles.stepIconWrap,
                                isActive && styles.stepIconWrapActive,
                                isDone && styles.stepIconWrapDone,
                            ]}
                        >
                            <Ionicons
                                name={isDone ? 'checkmark' : item.icon}
                                size={16}
                                color={isActive || isDone ? Colors.white : Colors.gray500}
                            />
                        </View>
                        <Text
                            style={[
                                styles.stepLabel,
                                isActive && styles.stepLabelActive,
                                isDone && styles.stepLabelDone,
                            ]}
                        >
                            {item.title}
                        </Text>
                    </View>
                );
            })}
        </View>
    );

    const renderStepContent = () => {
        if (step === 1) {
            return (
                <>
                    <Text style={styles.sectionTitle}>Etape 1: Verification KYC</Text>
                    <Text style={styles.sectionHint}>
                        Le KYC approuve est obligatoire avant l activation du profil livreur.
                    </Text>

                    <View style={styles.kycCard}>
                        <View style={styles.kycHeader}>
                            <Text style={styles.kycTitle}>Statut KYC</Text>
                            <View style={[styles.kycBadge, isKycApproved && styles.kycBadgeApproved]}>
                                <Text style={[styles.kycBadgeText, isKycApproved && styles.kycBadgeTextApproved]}>
                                    {isKycApproved
                                        ? 'Approuve'
                                        : kycStatus === 'pending'
                                        ? 'En attente'
                                        : kycStatus === 'rejected'
                                        ? 'Rejete'
                                        : 'Non soumis'}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.kycDescription}>
                            Si le statut n est pas approuve, ouvrez le modal KYC pour capturer vos documents.
                        </Text>
                        <TouchableOpacity
                            style={styles.kycActionButton}
                            onPress={() => setKycModalVisible(true)}
                        >
                            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                            <Text style={styles.kycActionText}>
                                {isKycApproved ? 'Mettre a jour mon KYC' : 'Faire mon KYC maintenant'}
                            </Text>
                        </TouchableOpacity>
                        {isCheckingKyc ? <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xs }} /> : null}
                    </View>
                </>
            );
        }

        if (step === 2) {
            return (
                <>
                    <Text style={styles.sectionTitle}>Etape 2: Photo de profil</Text>
                    <Text style={styles.sectionHint}>
                        Cette photo est envoyee comme `profileImageUrl` pour verifier votre identite livreur.
                    </Text>

                    <Text style={styles.label}>Photo de profil livreur *</Text>
                    <TouchableOpacity style={styles.profilePhotoCard} onPress={captureProfileImage} activeOpacity={0.85}>
                        {profileImagePreview ? (
                            <Image source={{ uri: profileImagePreview }} style={styles.profilePhotoImage} />
                        ) : (
                            <View style={styles.profilePhotoPlaceholder}>
                                <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                                <Text style={styles.profilePhotoPlaceholderText}>Capturer votre photo de profil</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profilePhotoActionButton} onPress={captureProfileImage} activeOpacity={0.85}>
                        {isCapturingProfileImage ? (
                            <ActivityIndicator color={Colors.primary} />
                        ) : (
                            <>
                                <Ionicons name={profileImagePreview ? 'refresh-outline' : 'camera'} size={16} color={Colors.primary} />
                                <Text style={styles.profilePhotoActionText}>
                                    {profileImagePreview ? 'Reprendre la photo' : 'Demarrer la capture'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </>
            );
        }

        return (
            <>
                <Text style={styles.sectionTitle}>Etape 3: Informations vehicule</Text>
                <Text style={styles.sectionHint}>
                    Renseignez votre vehicule pour recevoir vos missions de livraison.
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
            </>
        );
    };

    const progress = `${step}/${DELIVERY_STEPS.length}`;

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
                    {hasDeliveryRole ? (
                        <View style={styles.headerButtonPlaceholder} />
                    ) : (
                        <Text style={styles.headerProgress}>{progress}</Text>
                    )}
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
                            <Text style={styles.sectionTitle}>Inscription livreur en 3 etapes</Text>
                            <Text style={styles.sectionHint}>
                                Validez d abord le KYC, ajoutez votre photo puis configurez le vehicule.
                            </Text>

                            {renderStepIndicators()}
                            {renderStepContent()}

                            <View style={styles.navigationRow}>
                                <TouchableOpacity
                                    style={[styles.navButtonGhost, step === 1 && styles.navButtonGhostDisabled]}
                                    onPress={goPrevious}
                                    disabled={step === 1}
                                >
                                    <Text style={styles.navButtonGhostText}>Precedent</Text>
                                </TouchableOpacity>

                                {step < DELIVERY_STEPS.length ? (
                                    <TouchableOpacity style={styles.navButton} onPress={goNext}>
                                        <LinearGradient colors={Gradients.primary} style={styles.navButtonGradient}>
                                            <Text style={styles.navButtonText}>Suivant</Text>
                                            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.navButton, isLoading && styles.navButtonDisabled]}
                                        onPress={handleSubmit}
                                        disabled={isLoading}
                                    >
                                        <LinearGradient colors={Gradients.accent} style={styles.navButtonGradient}>
                                            {isLoading ? (
                                                <ActivityIndicator color={Colors.primary} />
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
                                                    <Text style={styles.navButtonTextAccent}>Activer mon profil livreur</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            </View>
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

            <KycFlowModal
                visible={kycModalVisible}
                initialFullName={`${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim()}
                onClose={() => setKycModalVisible(false)}
                onSuccess={async (result) => {
                    if (result?.selfieUrl) {
                        setProfileImageUrl(result.selfieUrl);
                        setProfileImagePreview(result.selfieUrl);
                    }
                    await Promise.allSettled([refetchKycEligibility(), refetchMyKyc()]);
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
    headerProgress: {
        minWidth: 40,
        textAlign: 'right',
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
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
    stepsRow: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
    },
    stepItem: {
        flex: 1,
        alignItems: 'center',
    },
    stepIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepIconWrapActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    stepIconWrapDone: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    stepLabel: {
        marginTop: Spacing.xs,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    stepLabelActive: {
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.bold,
    },
    stepLabelDone: {
        color: Colors.success,
        fontWeight: Typography.fontWeight.bold,
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
    kycCard: {
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary + '33',
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '08',
        padding: Spacing.md,
    },
    kycHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    kycTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    kycBadge: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.warning + '88',
        backgroundColor: Colors.warning + '1A',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
    },
    kycBadgeApproved: {
        borderColor: Colors.success + '88',
        backgroundColor: Colors.success + '1A',
    },
    kycBadgeText: {
        color: Colors.warning,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    kycBadgeTextApproved: {
        color: Colors.success,
    },
    kycDescription: {
        marginTop: Spacing.xs,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        lineHeight: 18,
    },
    kycActionButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '44',
        backgroundColor: Colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
    },
    kycActionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    profilePhotoCard: {
        height: 170,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.gray300,
        backgroundColor: Colors.gray50,
        overflow: 'hidden',
    },
    profilePhotoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    profilePhotoPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
    },
    profilePhotoPlaceholderText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        textAlign: 'center',
    },
    profilePhotoActionButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '44',
        backgroundColor: Colors.primary + '10',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
    },
    profilePhotoActionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
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
    navigationRow: {
        marginTop: Spacing.lg,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    navButtonGhost: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        paddingVertical: Spacing.md,
    },
    navButtonGhostDisabled: {
        opacity: 0.45,
    },
    navButtonGhostText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    navButton: {
        flex: 1.3,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    navButtonDisabled: {
        opacity: 0.85,
    },
    navButtonGradient: {
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    navButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    navButtonTextAccent: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
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
