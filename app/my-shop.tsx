import { CustomAlert } from '@/components/ui/CustomAlert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyAnnouncementsQuery } from '@/store/api/announcementsApi';
import { useGetMyShopQuery, useUpdateShopMutation } from '@/store/api/shopsApi';
import { Announcement } from '@/types/announcement';
import { getImageMimeType } from '@/utils/imageUtils';
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

type AlertType = 'success' | 'error' | 'info' | 'warning';
type ImageField = 'logo' | 'ownerIdCard';
type PickedImage = { uri: string; name: string; type: string };

const STEPS = [
    { id: 1, title: 'Infos' },
    { id: 2, title: 'KYC' },
    { id: 3, title: 'Validation' },
];

const KYC_REQUIREMENTS = [
    'Prenez les photos dans un endroit bien eclaire.',
    'Ne portez ni lunettes noires ni couvre-visage.',
    'La piece doit etre lisible, sans reflets ni coupe.',
    'Les donnees servent uniquement a la verification vendeur.',
];

const KYC_TOTAL_CHECKS = 4;

const isNotFoundError = (error: any) => {
    const status = error?.status;
    if (status === 404 || status === '404') return true;
    const message = error?.data?.message;
    return typeof message === 'string' && message.toLowerCase().includes('not found');
};

export default function MyShopScreen() {
    const router = useRouter();
    const { isAuthenticated, requireAuth } = useAuth();
    const { data: shop, error, isLoading, refetch } = useGetMyShopQuery(undefined, { skip: !isAuthenticated });
    const { data: myAnnouncements, isFetching: isAnnouncementsLoading } = useGetMyAnnouncementsQuery(undefined, {
        skip: !isAuthenticated,
    });
    const [updateShop, { isLoading: isSaving }] = useUpdateShopMutation();

    const [editMode, setEditMode] = React.useState(false);
    const [step, setStep] = React.useState(1);
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [nif, setNif] = React.useState('');
    const [rccm, setRccm] = React.useState('');
    const [idnat, setIdnat] = React.useState('');
    const [subscription, setSubscription] = React.useState('');
    const [isCorporate, setIsCorporate] = React.useState(false);
    const [isActive, setIsActive] = React.useState(true);
    const [logo, setLogo] = React.useState<PickedImage | null>(null);
    const [ownerIdCard, setOwnerIdCard] = React.useState<PickedImage | null>(null);
    const [kycConsent, setKycConsent] = React.useState(false);
    const [kycDataConfirmed, setKycDataConfirmed] = React.useState(false);

    const [alertState, setAlertState] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        type: AlertType;
        confirmText?: string;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        confirmText: 'OK',
    });

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Vous devez etre connecte pour gerer votre boutique.');
        }
    }, [isAuthenticated, requireAuth]);

    React.useEffect(() => {
        if (!shop) return;
        setName(shop.name || '');
        setDescription(shop.description || '');
        setNif(shop.nif || '');
        setRccm(shop.rccm || '');
        setIdnat(shop.idnat || '');
        setSubscription(shop.subscription || '');
        setIsCorporate(Boolean(shop.isCorporate));
        setIsActive(Boolean(shop.isActive));
    }, [shop]);

    const showAlert = (title: string, message: string, type: AlertType = 'info') => {
        setAlertState({ visible: true, title, message, type, confirmText: 'OK' });
    };

    const parseApiErrorMessage = (rawError: any, fallback: string) => {
        if (!rawError) return fallback;
        if (typeof rawError === 'string') return rawError;
        const data = rawError?.data;
        if (typeof data === 'string') return data;
        if (Array.isArray(data?.message) && data.message.length > 0) return String(data.message[0]);
        if (typeof data?.message === 'string') return data.message;
        if (typeof data?.error === 'string') return data.error;
        if (typeof rawError?.message === 'string') return rawError.message;
        return fallback;
    };

    const resetDraft = React.useCallback(() => {
        if (!shop) return;
        setName(shop.name || '');
        setDescription(shop.description || '');
        setNif(shop.nif || '');
        setRccm(shop.rccm || '');
        setIdnat(shop.idnat || '');
        setSubscription(shop.subscription || '');
        setIsCorporate(Boolean(shop.isCorporate));
        setIsActive(Boolean(shop.isActive));
        setLogo(null);
        setOwnerIdCard(null);
        setKycConsent(false);
        setKycDataConfirmed(false);
    }, [shop]);

    const captureImage = async (field: ImageField) => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
            showAlert('Permission requise', 'Autorisez l acces a la camera pour capturer vos documents.', 'warning');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            cameraType:
                field === 'logo'
                    ? ImagePicker.CameraType.front
                    : ImagePicker.CameraType.back,
        });
        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        const type = getImageMimeType(asset.uri);
        const extension = type.split('/')[1] || 'jpg';
        const picked: PickedImage = {
            uri: asset.uri,
            name: asset.fileName || `${field}-${Date.now()}.${extension}`,
            type,
        };

        if (field === 'logo') setLogo(picked);
        if (field === 'ownerIdCard') setOwnerIdCard(picked);
    };

    const pickLogoFromLibrary = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            showAlert('Permission requise', 'Autorisez l acces aux photos pour importer votre logo.', 'warning');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.9,
            selectionLimit: 1,
        });

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        const type = getImageMimeType(asset.uri);
        const extension = type.split('/')[1] || 'jpg';

        setLogo({
            uri: asset.uri,
            name: asset.fileName || `logo-${Date.now()}.${extension}`,
            type,
        });
    };

    const validateStep = () => {
        if (step === 1 && !name.trim()) {
            showAlert('Nom requis', 'Le nom de la boutique est obligatoire.', 'warning');
            return false;
        }

        if (step === 2) {
            const hasLogo = Boolean(logo || shop?.logo);
            const hasId = Boolean(ownerIdCard || shop?.ownerIdCard);
            if (!hasLogo || !hasId) {
                showAlert('Documents manquants', 'Photo proprietaire et piece identite doivent etre presentes.', 'warning');
                return false;
            }

            if (!kycConsent || !kycDataConfirmed) {
                showAlert('Validation KYC incomplete', 'Confirmez les engagements KYC pour continuer.', 'warning');
                return false;
            }
        }

        return true;
    };

    const save = async () => {
        if (!shop?._id) return;
        if (!name.trim()) {
            showAlert('Nom requis', 'Le nom de la boutique est obligatoire.', 'warning');
            return;
        }

        const hasLogo = Boolean(logo || shop?.logo);
        const hasId = Boolean(ownerIdCard || shop?.ownerIdCard);
        if (!hasLogo || !hasId || !kycConsent || !kycDataConfirmed) {
            showAlert('KYC incomplet', 'Terminez les etapes KYC avant la sauvegarde.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('description', description.trim());
        formData.append('nif', nif.trim());
        formData.append('rccm', rccm.trim());
        formData.append('idnat', idnat.trim());
        formData.append('subscription', subscription.trim());
        formData.append('isCorporate', String(isCorporate));
        formData.append('isActive', String(isActive));

        if (logo) {
            formData.append('logo', { uri: logo.uri, name: logo.name, type: logo.type } as any);
        }
        if (ownerIdCard) {
            formData.append('ownerIdCard', { uri: ownerIdCard.uri, name: ownerIdCard.name, type: ownerIdCard.type } as any);
        }

        try {
            await updateShop({ id: shop._id, data: formData }).unwrap();
            await refetch();
            setEditMode(false);
            setStep(1);
            setLogo(null);
            setOwnerIdCard(null);
            showAlert('Mise a jour reussie', 'Votre boutique a ete mise a jour.', 'success');
        } catch (rawError) {
            showAlert('Mise a jour impossible', parseApiErrorMessage(rawError, 'Impossible de mettre a jour la boutique.'), 'error');
        }
    };

    const startEdit = () => {
        resetDraft();
        setStep(1);
        setEditMode(true);
    };

    const startLogoEdit = () => {
        resetDraft();
        setStep(2);
        setEditMode(true);
    };

    const saveLogoOnly = async () => {
        if (!shop?._id) return;
        if (!logo) {
            showAlert('Logo requis', 'Ajoutez un logo avant de l enregistrer.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('logo', { uri: logo.uri, name: logo.name, type: logo.type } as any);

        try {
            await updateShop({ id: shop._id, data: formData }).unwrap();
            await refetch();
            setEditMode(false);
            setStep(1);
            setLogo(null);
            showAlert('Logo mis a jour', 'Le logo de votre boutique a ete enregistre.', 'success');
        } catch (rawError) {
            showAlert('Mise a jour impossible', parseApiErrorMessage(rawError, 'Impossible de mettre a jour le logo.'), 'error');
        }
    };

    const cancelEdit = () => {
        resetDraft();
        setStep(1);
        setEditMode(false);
    };
    const announcements = React.useMemo(() => myAnnouncements || [], [myAnnouncements]);
    const announcementStats = React.useMemo(
        () => ({
            total: announcements.length,
            views: announcements.reduce((sum, item) => sum + (Number(item.views) || 0), 0),
            likes: announcements.reduce((sum, item) => sum + (item.likes?.length || 0), 0),
        }),
        [announcements],
    );
    const recentAnnouncements = React.useMemo(
        () =>
            [...announcements]
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .slice(0, 4),
        [announcements],
    );

    if (isLoading) return <LoadingSpinner fullScreen />;

    const missingShop = !shop && (isNotFoundError(error) || !error);
    const hasKycSelfie = Boolean(logo || shop?.logo);
    const hasKycId = Boolean(ownerIdCard || shop?.ownerIdCard);
    const kycCompletedChecks = [hasKycSelfie, hasKycId, kycConsent, kycDataConfirmed].filter(Boolean).length;
    const kycProgressPercent = Math.round((kycCompletedChecks / KYC_TOTAL_CHECKS) * 100);
    const kycReady = kycCompletedChecks === KYC_TOTAL_CHECKS;

    const formatPrice = (value?: number) => {
        if (!Number.isFinite(value)) return 'Prix non defini';
        return `${Number(value).toFixed(2)} EUR`;
    };

    const formatDate = (value?: string) => {
        if (!value) return 'Date inconnue';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Date inconnue';
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ma boutique</Text>
                    <Text style={styles.headerMeta}>{editMode ? `${step}/${STEPS.length}` : ''}</Text>
                </View>

                {missingShop ? (
                    <View style={styles.centerWrap}>
                        <View style={styles.emptyCard}>
                            <Ionicons name="storefront-outline" size={56} color={Colors.primary} />
                            <Text style={styles.emptyTitle}>Aucune boutique</Text>
                            <Text style={styles.emptyText}>Creez votre boutique pour activer le mode vendeur.</Text>
                            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/create-shop')}>
                                <LinearGradient colors={Gradients.accent} style={styles.primaryBtnGradient}>
                                    <Text style={styles.primaryBtnTextAccent}>Creer ma boutique</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : !shop ? (
                    <View style={styles.centerWrap}>
                        <View style={styles.emptyCard}>
                            <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
                            <Text style={styles.emptyTitle}>Erreur de chargement</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                                <Text style={styles.retryBtnText}>Reessayer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                            <View style={styles.heroTopRow}>
                                <View style={styles.heroLogoWrap}>
                                    {shop.logo ? (
                                        <Image source={{ uri: shop.logo }} style={styles.heroLogo} />
                                    ) : (
                                        <Ionicons name="storefront-outline" size={26} color={Colors.white} />
                                    )}
                                </View>
                                <View style={styles.heroTitleWrap}>
                                    <Text style={styles.heroTitle}>{shop.name}</Text>
                                    <Text style={styles.heroText} numberOfLines={2}>
                                        {shop.description || 'Aucune description'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.heroBadgeRow}>
                                <View style={[styles.heroBadge, shop.isActive ? styles.heroBadgeSuccess : styles.heroBadgeMuted]}>
                                    <Text style={[styles.heroBadgeText, shop.isActive && styles.heroBadgeTextSuccess]}>
                                        {shop.isActive ? 'Boutique active' : 'Boutique inactive'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.heroLogoButton}
                                    onPress={startLogoEdit}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="camera-outline" size={15} color={Colors.white} />
                                    <Text style={styles.heroLogoButtonText}>
                                        {shop.logo ? 'Modifier logo' : 'Ajouter logo'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        {!editMode ? (
                            <>
                                <View style={styles.quickActionsCard}>
                                    <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/publish')} activeOpacity={0.85}>
                                        <LinearGradient colors={Gradients.accent} style={styles.quickActionIcon}>
                                            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                                        </LinearGradient>
                                        <Text style={styles.quickActionTitle}>Publier</Text>
                                        <Text style={styles.quickActionHint}>Nouvelle annonce</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/my-announcements')} activeOpacity={0.85}>
                                        <LinearGradient colors={Gradients.cool} style={styles.quickActionIcon}>
                                            <Ionicons name="list-outline" size={20} color={Colors.white} />
                                        </LinearGradient>
                                        <Text style={styles.quickActionTitle}>Gerer</Text>
                                        <Text style={styles.quickActionHint}>Mes annonces</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.quickActionItem}
                                        onPress={() => router.push('/orders?view=sales')}
                                        activeOpacity={0.85}
                                    >
                                        <LinearGradient colors={Gradients.success} style={styles.quickActionIcon}>
                                            <Ionicons name="receipt-outline" size={20} color={Colors.white} />
                                        </LinearGradient>
                                        <Text style={styles.quickActionTitle}>Commandes</Text>
                                        <Text style={styles.quickActionHint}>Boutique</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.quickActionItem} onPress={startEdit} activeOpacity={0.85}>
                                        <LinearGradient colors={Gradients.primary} style={styles.quickActionIcon}>
                                            <Ionicons name="create-outline" size={20} color={Colors.white} />
                                        </LinearGradient>
                                        <Text style={styles.quickActionTitle}>Boutique</Text>
                                        <Text style={styles.quickActionHint}>Mise a jour</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.statsRow}>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>Annonces</Text>
                                        <Text style={styles.statValue}>{announcementStats.total}</Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>Vues</Text>
                                        <Text style={styles.statValue}>{announcementStats.views}</Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statLabel}>Likes</Text>
                                        <Text style={styles.statValue}>{announcementStats.likes}</Text>
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Informations actuelles</Text>
                                    <Text style={styles.infoLine}>NIF: {shop.nif || '-'}</Text>
                                    <Text style={styles.infoLine}>RCCM: {shop.rccm || '-'}</Text>
                                    <Text style={styles.infoLine}>IDNAT: {shop.idnat || '-'}</Text>
                                    <Text style={styles.infoLine}>Abonnement: {shop.subscription || '-'}</Text>
                                </View>

                                <View style={styles.section}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={styles.sectionTitle}>Annonces publiees</Text>
                                        <TouchableOpacity onPress={() => router.push('/my-announcements')}>
                                            <Text style={styles.sectionLink}>Voir tout</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {isAnnouncementsLoading ? (
                                        <View style={styles.announcementsLoading}>
                                            <ActivityIndicator color={Colors.primary} />
                                            <Text style={styles.announcementsLoadingText}>Chargement des annonces...</Text>
                                        </View>
                                    ) : recentAnnouncements.length === 0 ? (
                                        <View style={styles.announcementsEmpty}>
                                            <Ionicons name="pricetag-outline" size={26} color={Colors.gray500} />
                                            <Text style={styles.announcementsEmptyTitle}>Aucune annonce publiee</Text>
                                            <Text style={styles.announcementsEmptyText}>
                                                Publiez votre premiere annonce pour demarrer les ventes.
                                            </Text>
                                            <TouchableOpacity style={styles.inlinePrimaryBtn} onPress={() => router.push('/publish')}>
                                                <Text style={styles.inlinePrimaryBtnText}>Publier maintenant</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        recentAnnouncements.map((announcement: Announcement) => (
                                            <View key={announcement._id} style={styles.announcementCard}>
                                                <View style={styles.announcementThumbWrap}>
                                                    {announcement.images?.[0] ? (
                                                        <Image source={{ uri: announcement.images[0] }} style={styles.announcementThumb} />
                                                    ) : (
                                                        <View style={styles.announcementThumbPlaceholder}>
                                                            <Ionicons name="image-outline" size={18} color={Colors.gray500} />
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={styles.announcementBody}>
                                                    <Text style={styles.announcementName} numberOfLines={1}>
                                                        {announcement.name || 'Annonce sans titre'}
                                                    </Text>
                                                    <Text style={styles.announcementPrice}>{formatPrice(announcement.price)}</Text>
                                                    <View style={styles.announcementMetaRow}>
                                                        <Text style={styles.announcementMetaText}>{announcement.views || 0} vues</Text>
                                                        <Text style={styles.announcementMetaText}>•</Text>
                                                        <Text style={styles.announcementMetaText}>{announcement.likes?.length || 0} likes</Text>
                                                        <Text style={styles.announcementMetaText}>•</Text>
                                                        <Text style={styles.announcementMetaText}>{formatDate(announcement.createdAt)}</Text>
                                                    </View>
                                                    <View style={styles.announcementActionsRow}>
                                                        <TouchableOpacity
                                                            style={styles.announcementActionGhost}
                                                            onPress={() => router.push(`/product/${announcement._id}`)}
                                                        >
                                                            <Text style={styles.announcementActionGhostText}>Voir</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.announcementActionPrimary}
                                                            onPress={() => router.push(`/edit-announcement/${announcement._id}`)}
                                                        >
                                                            <Text style={styles.announcementActionPrimaryText}>Modifier</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </View>

                                <TouchableOpacity style={styles.primaryBtn} onPress={startEdit}>
                                    <LinearGradient colors={Gradients.primary} style={styles.primaryBtnGradient}>
                                        <Text style={styles.primaryBtnText}>Mettre a jour en etapes</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.stepsRow}>
                                    {STEPS.map((s) => (
                                        <View key={s.id} style={styles.stepChipWrap}>
                                            <View style={[styles.stepChip, s.id === step && styles.stepChipActive, s.id < step && styles.stepChipDone]}>
                                                <Text style={[styles.stepChipText, (s.id === step || s.id < step) && styles.stepChipTextActive]}>{s.id}</Text>
                                            </View>
                                            <Text style={styles.stepTitle}>{s.title}</Text>
                                        </View>
                                    ))}
                                </View>

                                {step === 1 ? (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Etape 1: Infos</Text>
                                        <Text style={styles.label}>Nom *</Text>
                                        <TextInput value={name} onChangeText={setName} style={styles.input} />
                                        <Text style={styles.label}>Description</Text>
                                        <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} multiline />
                                        <View style={styles.switchRow}>
                                            <Text style={styles.switchLabel}>Entreprise</Text>
                                            <Switch value={isCorporate} onValueChange={setIsCorporate} />
                                        </View>
                                        <View style={styles.switchRow}>
                                            <Text style={styles.switchLabel}>Boutique active</Text>
                                            <Switch value={isActive} onValueChange={setIsActive} />
                                        </View>
                                    </View>
                                ) : null}

                                {step === 2 ? (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Etape 2: KYC</Text>
                                        <Text style={styles.sectionHint}>Verification type wallet: selfie en direct, piece lisible et consentement explicite.</Text>

                                        <View style={styles.kycIntroCard}>
                                            <Text style={styles.kycIntroTitle}>Niveau de verification vendeur</Text>
                                            <Text style={styles.kycIntroText}>{kycCompletedChecks}/{KYC_TOTAL_CHECKS} controles valides</Text>
                                            <View style={styles.kycProgressTrack}>
                                                <View style={[styles.kycProgressFill, { width: `${kycProgressPercent}%` }]} />
                                            </View>
                                            <Text style={styles.kycProgressLabel}>{kycProgressPercent}% complete</Text>

                                            {KYC_REQUIREMENTS.map((item) => (
                                                <View key={item} style={styles.kycRequirementRow}>
                                                    <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                                                    <Text style={styles.kycRequirementText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={[styles.kycCaptureCard, !hasKycSelfie && styles.kycCaptureCardDisabled]}>
                                            <View style={styles.kycCaptureHeader}>
                                                <Text style={styles.kycCaptureTitle}>1. Logo boutique / selfie</Text>
                                                <View style={[styles.kycStatusBadge, hasKycSelfie && styles.kycStatusBadgeDone]}>
                                                    <Text style={[styles.kycStatusText, hasKycSelfie && styles.kycStatusTextDone]}>
                                                        {hasKycSelfie ? 'Capturee' : 'Requise'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity style={styles.filePicker} onPress={() => captureImage('logo')} activeOpacity={0.85}>
                                                {logo ? (
                                                    <Image source={{ uri: logo.uri }} style={styles.filePreview} />
                                                ) : shop.logo ? (
                                                    <Image source={{ uri: shop.logo }} style={styles.filePreview} />
                                                ) : (
                                                    <View style={styles.filePlaceholder}>
                                                        <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                                                        <Text style={styles.filePlaceholderText}>Capturer ou ajouter le logo</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.captureActionButton} onPress={() => captureImage('logo')} activeOpacity={0.85}>
                                                <Ionicons name={hasKycSelfie ? 'refresh-outline' : 'camera'} size={16} color={Colors.primary} />
                                                <Text style={styles.captureActionText}>{hasKycSelfie ? 'Reprendre la capture' : 'Capturer maintenant'}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.captureActionSecondary} onPress={pickLogoFromLibrary} activeOpacity={0.85}>
                                                <Ionicons name="images-outline" size={16} color={Colors.gray600} />
                                                <Text style={styles.captureActionSecondaryText}>Importer un logo depuis la galerie</Text>
                                            </TouchableOpacity>
                                            {logo ? (
                                                <TouchableOpacity
                                                    style={styles.quickLogoSaveButton}
                                                    onPress={saveLogoOnly}
                                                    disabled={isSaving}
                                                    activeOpacity={0.85}
                                                >
                                                    {isSaving ? (
                                                        <ActivityIndicator color={Colors.white} size="small" />
                                                    ) : (
                                                        <Text style={styles.quickLogoSaveText}>Enregistrer ce logo</Text>
                                                    )}
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>

                                        <View style={styles.kycCaptureCard}>
                                            <View style={styles.kycCaptureHeader}>
                                                <Text style={styles.kycCaptureTitle}>2. Piece d identite</Text>
                                                <View style={[styles.kycStatusBadge, hasKycId && styles.kycStatusBadgeDone]}>
                                                    <Text style={[styles.kycStatusText, hasKycId && styles.kycStatusTextDone]}>
                                                        {hasKycId ? 'Capturee' : 'Requise'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.filePicker, !hasKycSelfie && styles.filePickerDisabled]}
                                                onPress={() => {
                                                    if (!hasKycSelfie) {
                                                        showAlert('Ordre KYC', 'Commencez par le selfie avant de scanner la piece d identite.', 'info');
                                                        return;
                                                    }
                                                    captureImage('ownerIdCard');
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                {ownerIdCard ? (
                                                    <Image source={{ uri: ownerIdCard.uri }} style={styles.filePreview} />
                                                ) : shop.ownerIdCard ? (
                                                    <Image source={{ uri: shop.ownerIdCard }} style={styles.filePreview} />
                                                ) : (
                                                    <View style={styles.filePlaceholder}>
                                                        <Ionicons name="id-card-outline" size={24} color={Colors.primary} />
                                                        <Text style={styles.filePlaceholderText}>Capturer la piece</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.captureActionButton, !hasKycSelfie && styles.captureActionButtonDisabled]}
                                                onPress={() => {
                                                    if (!hasKycSelfie) {
                                                        showAlert('Ordre KYC', 'Commencez par le selfie avant de scanner la piece d identite.', 'info');
                                                        return;
                                                    }
                                                    captureImage('ownerIdCard');
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                <Ionicons name={hasKycId ? 'refresh-outline' : 'camera'} size={16} color={Colors.primary} />
                                                <Text style={styles.captureActionText}>{hasKycId ? 'Reprendre la capture' : 'Scanner la piece'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.kycTickRow}
                                            activeOpacity={0.85}
                                            onPress={() => setKycConsent((prev) => !prev)}
                                        >
                                            <Ionicons
                                                name={kycConsent ? 'checkbox' : 'square-outline'}
                                                size={22}
                                                color={kycConsent ? Colors.success : Colors.gray400}
                                            />
                                            <Text style={[styles.kycTickText, kycConsent && styles.kycTickTextDone]}>
                                                Je confirme etre le proprietaire legal des documents fournis.
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.kycTickRow}
                                            activeOpacity={0.85}
                                            onPress={() => setKycDataConfirmed((prev) => !prev)}
                                        >
                                            <Ionicons
                                                name={kycDataConfirmed ? 'checkbox' : 'square-outline'}
                                                size={22}
                                                color={kycDataConfirmed ? Colors.success : Colors.gray400}
                                            />
                                            <Text style={[styles.kycTickText, kycDataConfirmed && styles.kycTickTextDone]}>
                                                Je certifie que les images sont nettes et non modifiees.
                                            </Text>
                                        </TouchableOpacity>

                                        <View style={styles.summaryCard}>
                                            <Text style={styles.summaryTitle}>Infos legales</Text>
                                            <Text style={styles.label}>ID National</Text>
                                            <TextInput value={idnat} onChangeText={setIdnat} style={styles.input} />
                                            <Text style={styles.label}>RCCM</Text>
                                            <TextInput value={rccm} onChangeText={setRccm} style={styles.input} />
                                            <Text style={styles.label}>NIF</Text>
                                            <TextInput value={nif} onChangeText={setNif} style={styles.input} />
                                        </View>

                                        <Text style={styles.sectionHint}>
                                            Statut KYC: {kycReady ? 'Pret pour soumission' : 'Completement requis avant la suite'}.
                                        </Text>
                                    </View>
                                ) : null}

                                {step === 3 ? (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Etape 3: Validation</Text>
                                        <Text style={styles.label}>Abonnement</Text>
                                        <TextInput value={subscription} onChangeText={setSubscription} style={styles.input} />
                                    </View>
                                ) : null}

                                <View style={styles.navRow}>
                                    <TouchableOpacity style={styles.ghostBtn} onPress={cancelEdit} disabled={isSaving}>
                                        <Text style={styles.ghostBtnText}>Annuler</Text>
                                    </TouchableOpacity>

                                    {step > 1 ? (
                                        <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep((prev) => Math.max(prev - 1, 1))} disabled={isSaving}>
                                            <Text style={styles.ghostBtnText}>Precedent</Text>
                                        </TouchableOpacity>
                                    ) : null}

                                    {step < STEPS.length ? (
                                        <TouchableOpacity
                                            style={styles.mainBtn}
                                            onPress={() => {
                                                if (!validateStep()) return;
                                                setStep((prev) => Math.min(prev + 1, STEPS.length));
                                            }}
                                            disabled={isSaving}
                                        >
                                            <LinearGradient colors={Gradients.primary} style={styles.mainBtnGradient}>
                                                <Text style={styles.mainBtnText}>Suivant</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={styles.mainBtn} onPress={save} disabled={isSaving}>
                                            <LinearGradient colors={Gradients.accent} style={styles.mainBtnGradient}>
                                                {isSaving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.mainBtnTextAccent}>Enregistrer</Text>}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}
                    </ScrollView>
                )}

                <CustomAlert
                    visible={alertState.visible}
                    title={alertState.title}
                    message={alertState.message}
                    type={alertState.type}
                    confirmText={alertState.confirmText}
                    onConfirm={() => setAlertState((prev) => ({ ...prev, visible: false }))}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
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
    headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: Typography.fontSize.lg, color: Colors.textPrimary, fontWeight: Typography.fontWeight.extrabold },
    headerMeta: { minWidth: 40, textAlign: 'right', color: Colors.gray500 },
    centerWrap: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
    emptyCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.xl,
        alignItems: 'center',
        ...Shadows.sm,
    },
    emptyTitle: { marginTop: Spacing.sm, fontSize: Typography.fontSize.xl, color: Colors.textPrimary, fontWeight: Typography.fontWeight.bold },
    emptyText: { marginTop: Spacing.xs, color: Colors.textSecondary, textAlign: 'center' },
    retryBtn: { marginTop: Spacing.lg, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    retryBtnText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
    scroll: { flex: 1 },
    content: { padding: Spacing.xl, paddingBottom: 120 },
    heroCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadows.md },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    heroLogoWrap: {
        width: 62,
        height: 62,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
        borderColor: Colors.white + '60',
        backgroundColor: Colors.white + '24',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroLogo: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroTitleWrap: { flex: 1 },
    heroTitle: { fontSize: Typography.fontSize.xl, color: Colors.white, fontWeight: Typography.fontWeight.extrabold },
    heroText: { marginTop: Spacing.xs, color: Colors.white + 'DD' },
    heroBadgeRow: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    heroBadge: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    heroBadgeSuccess: {
        borderColor: Colors.success + '50',
        backgroundColor: Colors.success + '26',
    },
    heroBadgeMuted: {
        borderColor: Colors.gray300,
        backgroundColor: Colors.gray200,
    },
    heroBadgeText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    heroBadgeTextSuccess: {
        color: Colors.white,
    },
    heroLogoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.white + '70',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.white + '1A',
    },
    heroLogoButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    quickActionsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.lg,
        padding: Spacing.sm,
        ...Shadows.sm,
    },
    quickActionItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    quickActionIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    quickActionTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    quickActionHint: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        ...Shadows.sm,
    },
    statLabel: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        marginBottom: Spacing.xs / 2,
    },
    statValue: {
        color: Colors.primary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    section: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    sectionTitle: { fontSize: Typography.fontSize.lg, color: Colors.textPrimary, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
    sectionLink: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    sectionHint: { color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 19 },
    infoLine: { color: Colors.gray600, marginTop: Spacing.xs },
    announcementsLoading: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    announcementsLoadingText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
    },
    announcementsEmpty: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    announcementsEmptyTitle: {
        marginTop: Spacing.sm,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    announcementsEmptyText: {
        marginTop: Spacing.xs,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    inlinePrimaryBtn: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    inlinePrimaryBtnText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    announcementCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    announcementThumbWrap: {
        width: 74,
        height: 74,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        backgroundColor: Colors.gray100,
    },
    announcementThumb: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    announcementThumbPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    announcementBody: {
        flex: 1,
    },
    announcementName: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    announcementPrice: {
        marginTop: 2,
        color: Colors.accentDark,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
    },
    announcementMetaRow: {
        marginTop: Spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        flexWrap: 'wrap',
    },
    announcementMetaText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
    },
    announcementActionsRow: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    announcementActionGhost: {
        flex: 1,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray300,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    announcementActionGhostText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    announcementActionPrimary: {
        flex: 1,
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },
    announcementActionPrimaryText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    label: { marginTop: Spacing.sm, marginBottom: Spacing.xs, color: Colors.textPrimary, fontWeight: Typography.fontWeight.semibold },
    input: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        color: Colors.textPrimary,
    },
    textArea: { minHeight: 96, textAlignVertical: 'top' },
    switchRow: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    switchLabel: { color: Colors.textPrimary, fontWeight: Typography.fontWeight.semibold },
    filePicker: {
        height: 120,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray200,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    fileText: { color: Colors.gray500, fontWeight: Typography.fontWeight.medium },
    filePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
    filePlaceholderText: { color: Colors.textSecondary, fontWeight: Typography.fontWeight.medium },
    kycIntroCard: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '10',
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    kycIntroTitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    kycIntroText: {
        marginTop: Spacing.xs / 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
    },
    kycProgressTrack: {
        marginTop: Spacing.sm,
        height: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        overflow: 'hidden',
    },
    kycProgressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    kycProgressLabel: {
        marginTop: Spacing.xs,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    kycRequirementRow: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    kycRequirementText: {
        flex: 1,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        lineHeight: 18,
    },
    kycCaptureCard: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        backgroundColor: Colors.gray50,
        padding: Spacing.md,
    },
    kycCaptureCardDisabled: {
        opacity: 0.7,
    },
    kycCaptureHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    kycCaptureTitle: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.bold,
    },
    kycStatusBadge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs / 2,
        backgroundColor: Colors.warning + '20',
    },
    kycStatusBadgeDone: {
        backgroundColor: Colors.success + '20',
    },
    kycStatusText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.warning,
        fontWeight: Typography.fontWeight.bold,
    },
    kycStatusTextDone: {
        color: Colors.success,
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
    captureActionButtonDisabled: {
        borderColor: Colors.gray300,
    },
    captureActionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    captureActionSecondary: {
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray300,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
        backgroundColor: Colors.white,
    },
    captureActionSecondaryText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    quickLogoSaveButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
    },
    quickLogoSaveText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    filePickerDisabled: {
        opacity: 0.75,
    },
    kycTickRow: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        padding: Spacing.md,
    },
    kycTickText: {
        flex: 1,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    kycTickTextDone: {
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
    },
    summaryCard: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.md,
    },
    summaryTitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        marginBottom: Spacing.xs,
    },
    stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
    stepChipWrap: { alignItems: 'center', flex: 1 },
    stepChip: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    stepChipActive: { backgroundColor: Colors.primary },
    stepChipDone: { backgroundColor: Colors.success },
    stepChipText: { color: Colors.gray500, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.xs },
    stepChipTextActive: { color: Colors.white },
    stepTitle: { fontSize: Typography.fontSize.xs, color: Colors.gray500 },
    navRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
    ghostBtn: {
        flex: 1,
        height: 48,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    ghostBtnText: { color: Colors.gray600, fontWeight: Typography.fontWeight.semibold },
    mainBtn: { flex: 1.25, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.sm },
    mainBtnGradient: { height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.xs },
    mainBtnText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
    mainBtnTextAccent: { color: Colors.primary, fontWeight: Typography.fontWeight.extrabold },
    primaryBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.sm },
    primaryBtnGradient: { height: 48, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
    primaryBtnTextAccent: { color: Colors.primary, fontWeight: Typography.fontWeight.extrabold },
});
