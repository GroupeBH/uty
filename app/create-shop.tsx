import { CustomAlert } from '@/components/ui/CustomAlert';
import { KycFlowModal } from '@/components/kyc/KycFlowModal';
import { KycInfoModal } from '@/components/kyc/KycInfoModal';
import { KINSHASA_CONTACT_EXAMPLE, KINSHASA_KYC_ID_EXAMPLE, KINSHASA_SHOP_NAME_EXAMPLE, KINSHASA_TAX_ID_EXAMPLE } from '@/constants/kinshasa';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyKycEligibilityQuery } from '@/store/api/usersApi';
import { useCreateShopMutation, useLazyGetMyShopQuery } from '@/store/api/shopsApi';
import { Shop } from '@/types/shop';
import { getImageMimeType } from '@/utils/imageUtils';
import { normalizeTextInputValue } from '@/utils/textInput';
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

type PickedImage = {
    uri: string;
    name: string;
    type: string;
};

type AlertType = 'success' | 'error' | 'info' | 'warning';

const STEPS = [
    { id: 1, title: 'Legales', icon: 'document-text-outline' as const },
    { id: 2, title: 'Boutique', icon: 'storefront-outline' as const },
    { id: 3, title: 'Contact', icon: 'call-outline' as const },
];

const resolveKycFullName = (account: any) => {
    const firstName = typeof account?.firstName === 'string' ? account.firstName.trim() : '';
    const lastName = typeof account?.lastName === 'string' ? account.lastName.trim() : '';
    const username = typeof account?.username === 'string' ? account.username.trim() : '';
    const emailName =
        typeof account?.email === 'string'
            ? account.email.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
            : '';

    return normalizeTextInputValue(`${firstName} ${lastName}`.trim() || username || emailName || 'Utilisateur UTY');
};

export default function CreateShopScreen() {
    const router = useRouter();
    const { user, requireAuth } = useAuth();
    const [createShop, { isLoading: isCreating }] = useCreateShopMutation();
    const [loadMyShop, { data: myShop, isFetching: isLoadingMyShop }] = useLazyGetMyShopQuery();

    const [step, setStep] = React.useState(1);
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [nif, setNif] = React.useState('');
    const [rccm, setRccm] = React.useState('');
    const [idnat, setIdnat] = React.useState('');
    const [subscription, setSubscription] = React.useState('');
    const [isCorporate, setIsCorporate] = React.useState(false);
    const [logo, setLogo] = React.useState<PickedImage | null>(null);
    const [kycInfoModalVisible, setKycInfoModalVisible] = React.useState(false);
    const [kycModalVisible, setKycModalVisible] = React.useState(false);
    const kycFullName = React.useMemo(() => resolveKycFullName(user), [user]);

    const [alertState, setAlertState] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        type: AlertType;
        confirmText?: string;
        onConfirm?: (() => void | Promise<void>) | undefined;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        confirmText: 'OK',
        onConfirm: undefined,
    });

    const { data: kycEligibility, refetch: refetchKycEligibility } =
        useGetMyKycEligibilityQuery(undefined, { skip: !user?._id });

    const isKycApproved = kycEligibility?.isKycApproved === true;

    React.useEffect(() => {
        if (!requireAuth('Vous devez etre connecte pour creer une boutique.')) {
            return;
        }

        loadMyShop().unwrap().catch(() => {
            // No existing shop yet or request failed.
        });
    }, [loadMyShop, requireAuth]);

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

    const openKycModal = () => {
        setKycModalVisible(true);
    };

    const startKycFromInfo = () => {
        setKycInfoModalVisible(false);
        openKycModal();
    };

    const hideAlert = () => {
        setAlertState((prev) => ({ ...prev, visible: false, onConfirm: undefined }));
    };

    const showAlert = (params: Omit<typeof alertState, 'visible'>) => {
        setAlertState({
            ...params,
            visible: true,
            confirmText: params.confirmText || 'OK',
        });
    };

    const pickLogoFromLibrary = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            showAlert({
                title: 'Permission requise',
                message: 'Autorisez l acces aux photos pour joindre le logo de la boutique.',
                type: 'warning',
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.9,
            selectionLimit: 1,
        });

        if (result.canceled || !result.assets?.length) {
            return;
        }

        const asset = result.assets[0];
        const type = getImageMimeType(asset.uri);
        const extension = type.split('/')[1] || 'jpg';
        const picked: PickedImage = {
            uri: asset.uri,
            name: asset.fileName || `logo-${Date.now()}.${extension}`,
            type,
        };
        setLogo(picked);
    };

    const validateCurrentStep = () => {
        if (step === 1 && !isKycApproved) {
            setKycInfoModalVisible(true);
            return false;
        }

        if (step === 2 && !name.trim()) {
            showAlert({
                title: 'Nom requis',
                message: 'Veuillez saisir le nom de la boutique.',
                type: 'warning',
            });
            return false;
        }

        return true;
    };

    const goNext = () => {
        if (!validateCurrentStep()) return;
        setStep((prev) => Math.min(prev + 1, STEPS.length));
    };

    const goPrevious = () => {
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const handleCreateShop = async () => {
        if (!requireAuth('Vous devez etre connecte pour creer une boutique.')) {
            return;
        }

        if (myShop?._id) {
            showAlert({
                title: 'Boutique existante',
                message: 'Vous avez deja une boutique. La creation multiple nest pas autorisee.',
                type: 'info',
            });
            return;
        }

        if (!name.trim()) {
            showAlert({
                title: 'Informations incompletes',
                message: 'Le nom de la boutique est obligatoire avant soumission.',
                type: 'warning',
            });
            return;
        }

        if (!isKycApproved) {
            setStep(1);
            setKycInfoModalVisible(true);
            return;
        }

        if (!user?._id) {
            showAlert({
                title: 'Session invalide',
                message: 'Utilisateur introuvable. Reconnectez-vous puis reessayez.',
                type: 'error',
            });
            return;
        }

        const formData = new FormData();
        formData.append('user', user._id);
        formData.append('name', name.trim());

        if (description.trim()) formData.append('description', description.trim());
        if (phone.trim()) formData.append('phone', phone.trim());
        if (email.trim()) formData.append('email', email.trim());
        if (nif.trim()) formData.append('nif', nif.trim());
        if (rccm.trim()) formData.append('rccm', rccm.trim());
        if (idnat.trim()) formData.append('idnat', idnat.trim());
        if (subscription.trim()) formData.append('subscription', subscription.trim());
        formData.append('isCorporate', String(isCorporate));

        if (logo) {
            formData.append('logo', {
                uri: logo.uri,
                name: logo.name,
                type: logo.type,
            } as any);
        }

        try {
            await createShop(formData).unwrap();
            showAlert({
                title: 'Boutique creee',
                message: 'Votre boutique a ete creee avec succes.',
                type: 'success',
                confirmText: 'Voir ma boutique',
                onConfirm: () => router.replace('/my-shop'),
            });
        } catch (error) {
            showAlert({
                title: 'Creation impossible',
                message: parseApiErrorMessage(error, 'Impossible de creer la boutique pour le moment.'),
                type: 'error',
            });
        }
    };

    const renderExistingShopCard = (shop: Shop) => (
        <View style={styles.existsCard}>
            <View style={styles.existsHeader}>
                <Ionicons name="storefront" size={22} color={Colors.primary} />
                <Text style={styles.existsTitle}>Votre boutique existe deja</Text>
            </View>
            <Text style={styles.existsName}>{shop.name}</Text>
            <Text style={styles.existsMeta}>KYC vendeur deja verifie pour ce compte.</Text>
            <TouchableOpacity
                style={styles.existsButton}
                onPress={() => router.replace('/my-shop')}
            >
                <Text style={styles.existsButtonText}>Ouvrir ma boutique</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStepIndicators = () => (
        <View style={styles.stepsRow}>
            {STEPS.map((item) => {
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
        if (step === 2) {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Etape 2: Informations boutique</Text>
                    <Text style={styles.sectionHint}>Nom, description, type de structure et logo optionnel.</Text>

                    <Text style={styles.label}>Nom *</Text>
                        <TextInput
                            value={name}
                            onChangeText={(text) => setName(normalizeTextInputValue(text))}
                        style={styles.input}
                        placeholder={KINSHASA_SHOP_NAME_EXAMPLE}
                        placeholderTextColor={Colors.gray400}
                    />

                    <Text style={styles.label}>Description</Text>
                        <TextInput
                            value={description}
                            onChangeText={(text) => setDescription(normalizeTextInputValue(text))}
                        style={[styles.input, styles.textarea]}
                        placeholder="Decrivez votre activite..."
                        placeholderTextColor={Colors.gray400}
                        multiline
                    />

                    <Text style={styles.label}>Logo boutique (optionnel)</Text>
                    <TouchableOpacity style={styles.filePicker} onPress={pickLogoFromLibrary} activeOpacity={0.85}>
                        {logo ? (
                            <Image source={{ uri: logo.uri }} style={styles.filePreview} />
                        ) : (
                            <View style={styles.filePlaceholder}>
                                <Ionicons name="images-outline" size={24} color={Colors.primary} />
                                <Text style={styles.filePlaceholderText}>Joindre le logo depuis la galerie</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.captureActionButton} onPress={pickLogoFromLibrary} activeOpacity={0.85}>
                        <Ionicons name={logo ? 'refresh-outline' : 'images-outline'} size={16} color={Colors.primary} />
                        <Text style={styles.captureActionText}>{logo ? 'Changer le logo' : 'Choisir dans la galerie'}</Text>
                    </TouchableOpacity>

                    <View style={styles.switchRow}>
                        <View style={styles.switchText}>
                            <Text style={styles.switchLabel}>Entreprise / personne morale</Text>
                            <Text style={styles.switchHint}>Activez si vous representez une societe.</Text>
                        </View>
                        <Switch
                            value={isCorporate}
                            onValueChange={setIsCorporate}
                            trackColor={{ false: Colors.gray300, true: Colors.primary + '70' }}
                            thumbColor={isCorporate ? Colors.primary : Colors.gray500}
                        />
                    </View>
                </View>
            );
        }

        if (step === 1) {
            return (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Etape 1: Infos legales boutique</Text>
                    <Text style={styles.sectionHint}>Ajoutez les references legales disponibles pour votre activite.</Text>

                    <Text style={styles.label}>ID National</Text>
                    <TextInput
                        value={idnat}
                        onChangeText={setIdnat}
                        style={styles.input}
                        placeholder={KINSHASA_KYC_ID_EXAMPLE}
                        placeholderTextColor={Colors.gray400}
                    />

                    <Text style={styles.label}>RCCM</Text>
                    <TextInput
                        value={rccm}
                        onChangeText={setRccm}
                        style={styles.input}
                        placeholder={KINSHASA_TAX_ID_EXAMPLE}
                        placeholderTextColor={Colors.gray400}
                    />

                    <Text style={styles.label}>NIF</Text>
                    <TextInput
                        value={nif}
                        onChangeText={setNif}
                        style={styles.input}
                        placeholder="Numero fiscal"
                        placeholderTextColor={Colors.gray400}
                    />
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Etape 3: Contact et validation</Text>
                <Text style={styles.sectionHint}>Completer les informations de contact puis soumettre.</Text>

                <Text style={styles.label}>Telephone</Text>
                <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    style={styles.input}
                    placeholder={KINSHASA_CONTACT_EXAMPLE}
                    placeholderTextColor={Colors.gray400}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    placeholder="contact@boutique.com"
                    placeholderTextColor={Colors.gray400}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Abonnement (optionnel)</Text>
                <TextInput
                    value={subscription}
                    onChangeText={setSubscription}
                    style={styles.input}
                    placeholder="Ex: starter, premium..."
                    placeholderTextColor={Colors.gray400}
                />

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Resume</Text>
                    <Text style={styles.summaryLine}>Nom: {name.trim() || '-'}</Text>
                    <Text style={styles.summaryLine}>Entreprise: {isCorporate ? 'Oui' : 'Non'}</Text>
                    <Text style={styles.summaryLine}>Logo: {logo ? 'Ajoute' : 'Non ajoute'}</Text>
                    <Text style={styles.summaryLine}>KYC: {isKycApproved ? 'Approuve' : 'Non valide'}</Text>
                </View>
            </View>
        );
    };

    const progress = `${step}/${STEPS.length}`;
    const needsKycBeforeNext = step === 1 && !isKycApproved;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Creer ma boutique</Text>
                    <Text style={styles.headerProgress}>{progress}</Text>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                        <Text style={styles.heroTitle}>Activation vendeur</Text>
                        <Text style={styles.heroText}>
                            Creation guidee en plusieurs etapes pour un dossier plus clair.
                        </Text>
                    </LinearGradient>

                    {isLoadingMyShop ? (
                        <View style={styles.loadingCard}>
                            <ActivityIndicator color={Colors.primary} />
                            <Text style={styles.loadingText}>Verification de votre boutique...</Text>
                        </View>
                    ) : myShop ? (
                        renderExistingShopCard(myShop)
                    ) : (
                        <>
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

                                {step < STEPS.length ? (
                                    <TouchableOpacity style={styles.navButton} onPress={goNext}>
                                        <LinearGradient
                                            colors={needsKycBeforeNext ? Gradients.accent : Gradients.primary}
                                            style={styles.navButtonGradient}
                                        >
                                            <Text style={needsKycBeforeNext ? styles.navButtonTextAccent : styles.navButtonText}>
                                                {needsKycBeforeNext ? 'Passer le KYC' : 'Suivant'}
                                            </Text>
                                            <Ionicons
                                                name={needsKycBeforeNext ? 'shield-checkmark-outline' : 'arrow-forward'}
                                                size={16}
                                                color={needsKycBeforeNext ? Colors.primary : Colors.white}
                                            />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.navButton, isCreating && styles.navButtonDisabled]}
                                        onPress={handleCreateShop}
                                        disabled={isCreating}
                                    >
                                        <LinearGradient colors={Gradients.accent} style={styles.navButtonGradient}>
                                            {isCreating ? (
                                                <ActivityIndicator color={Colors.primary} />
                                            ) : (
                                                <>
                                                    <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
                                                    <Text style={styles.navButtonTextAccent}>Soumettre</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>

                <CustomAlert
                    visible={alertState.visible}
                    title={alertState.title}
                    message={alertState.message}
                    type={alertState.type}
                    confirmText={alertState.confirmText}
                    onConfirm={async () => {
                        const callback = alertState.onConfirm;
                        hideAlert();
                        if (callback) {
                            await callback();
                        }
                    }}
                />

                <KycInfoModal
                    visible={kycInfoModalVisible}
                    title="KYC requis pour ouvrir la boutique"
                    description="La verification protege les acheteurs et confirme l identite du vendeur avant publication."
                    primaryLabel="Lancer le KYC"
                    onClose={() => setKycInfoModalVisible(false)}
                    onStart={startKycFromInfo}
                />

                <KycFlowModal
                    visible={kycModalVisible}
                    identity={{
                        fullName: kycFullName.trim(),
                    }}
                    onClose={() => setKycModalVisible(false)}
                    onSuccess={async () => {
                        await refetchKycEligibility();
                    }}
                />
            </KeyboardAvoidingView>
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
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
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
        ...Shadows.lg,
    },
    heroTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    heroText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'D9',
        lineHeight: 20,
    },
    loadingCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    loadingText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    existsCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.md,
    },
    existsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    existsTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    existsName: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    existsMeta: {
        marginTop: Spacing.xs,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
    },
    existsButton: {
        marginTop: Spacing.lg,
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    existsButtonText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
        fontSize: Typography.fontSize.sm,
    },
    stepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.md,
    },
    stepItem: {
        flex: 1,
        alignItems: 'center',
    },
    stepIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    stepIconWrapActive: {
        backgroundColor: Colors.primary,
    },
    stepIconWrapDone: {
        backgroundColor: Colors.success,
    },
    stepLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    stepLabelActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    stepLabelDone: {
        color: Colors.success,
        fontWeight: Typography.fontWeight.bold,
    },
    section: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    sectionHint: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        lineHeight: 19,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
        marginBottom: Spacing.xs,
        marginTop: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
    },
    textarea: {
        minHeight: 96,
        textAlignVertical: 'top',
    },
    switchRow: {
        marginTop: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.lg,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.md,
    },
    switchText: {
        flex: 1,
    },
    switchLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    switchHint: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: Spacing.xs / 2,
    },
    filePicker: {
        height: 130,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    filePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    filePlaceholderText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        fontWeight: Typography.fontWeight.medium,
    },
    filePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    captureActionButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '60',
        paddingVertical: Spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    captureActionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    summaryCard: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    summaryTitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        marginBottom: Spacing.xs / 2,
    },
    summaryLine: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    navigationRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    navButtonGhost: {
        flex: 1,
        height: 50,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    navButtonGhostDisabled: {
        opacity: 0.45,
    },
    navButtonGhostText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
    navButton: {
        flex: 1.25,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.md,
    },
    navButtonDisabled: {
        opacity: 0.8,
    },
    navButtonGradient: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    navButtonText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    navButtonTextAccent: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
});
