import { MapPickerModal } from '@/components/MapPickerModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    AddressBookEntry,
    AddressBookKind,
    addressBookStorage,
} from '@/utils/addressBook';
import { normalizeTextInputValue } from '@/utils/textInput';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type DraftAddress = {
    label: string;
    address: string;
    kind: AddressBookKind;
    latitude?: number;
    longitude?: number;
};

const KIND_OPTIONS: {
    value: AddressBookKind;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { value: 'delivery', label: 'Livraison', icon: 'location-outline' },
    { value: 'pickup', label: 'Retrait', icon: 'storefront-outline' },
    { value: 'usual', label: 'Habituelle', icon: 'bookmark-outline' },
];

const emptyDraft: DraftAddress = {
    label: '',
    address: '',
    kind: 'delivery',
};

const formatCoordinateLabel = (entry?: Pick<AddressBookEntry, 'latitude' | 'longitude'> | null) => {
    if (!Number.isFinite(entry?.latitude) || !Number.isFinite(entry?.longitude)) return '';
    return `${Number(entry?.latitude).toFixed(5)}, ${Number(entry?.longitude).toFixed(5)}`;
};

export default function AddressesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, isAuthenticated, isLoading, requireAuth } = useAuth();
    const { showAlert: showStyledAlert, alertNode } = useStyledAlert();

    const [entries, setEntries] = React.useState<AddressBookEntry[]>([]);
    const [isLoadingEntries, setIsLoadingEntries] = React.useState(true);
    const [draft, setDraft] = React.useState<DraftAddress>(emptyDraft);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [mapPickerVisible, setMapPickerVisible] = React.useState(false);

    const userId = user?._id || null;

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour gerer vos adresses.');
        }
    }, [isAuthenticated, requireAuth]);

    React.useEffect(() => {
        if (!isAuthenticated || !userId) return;
        let cancelled = false;
        setIsLoadingEntries(true);
        addressBookStorage.list(userId).then((savedEntries) => {
            if (cancelled) return;
            setEntries(savedEntries);
            setIsLoadingEntries(false);
        });
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, userId]);

    const defaultPickup = entries.find((entry) => entry.isDefaultPickup);
    const defaultDelivery = entries.find((entry) => entry.isDefaultDelivery);
    const draftHasCoordinates =
        Number.isFinite(draft.latitude) && Number.isFinite(draft.longitude);

    const openCreateModal = (kind: AddressBookKind = 'delivery') => {
        setEditingId(null);
        setDraft({ ...emptyDraft, kind });
        setModalVisible(true);
    };

    const openEditModal = (entry: AddressBookEntry) => {
        setEditingId(entry.id);
        setDraft({
            label: entry.label,
            address: entry.address,
            kind: entry.kind,
            latitude: entry.latitude,
            longitude: entry.longitude,
        });
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setEditingId(null);
        setDraft(emptyDraft);
    };

    const saveDraft = async () => {
        const label = draft.label.trim();
        const address = draft.address.trim();
        if (!label || !address) {
            showStyledAlert(
                'Adresse incomplete',
                'Ajoutez un nom et une adresse avant d enregistrer.',
                undefined,
                'warning',
            );
            return;
        }

        const previous = editingId ? entries.find((entry) => entry.id === editingId) : null;
        const now = new Date().toISOString();
        const nextEntry: AddressBookEntry = {
            id: previous?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            label,
            address,
            kind: draft.kind,
            latitude: draft.latitude,
            longitude: draft.longitude,
            isDefaultPickup:
                previous?.isDefaultPickup ||
                (draft.kind === 'pickup' && !entries.some((entry) => entry.isDefaultPickup)),
            isDefaultDelivery:
                previous?.isDefaultDelivery ||
                (draft.kind === 'delivery' && !entries.some((entry) => entry.isDefaultDelivery)),
            createdAt: previous?.createdAt || now,
            updatedAt: now,
        };

        const saved = await addressBookStorage.upsert(userId, nextEntry);
        setEntries(saved);
        closeModal();
    };

    const setDefault = async (entryId: string, target: 'pickup' | 'delivery') => {
        const saved = await addressBookStorage.setDefault(userId, entryId, target);
        setEntries(saved);
    };

    const removeEntry = async (entryId: string) => {
        const saved = await addressBookStorage.remove(userId, entryId);
        setEntries(saved);
    };

    const onMapConfirm = (location: { latitude: number; longitude: number; address?: string }) => {
        setDraft((prev) => ({
            ...prev,
            address:
                location.address?.trim() ||
                `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`,
            latitude: location.latitude,
            longitude: location.longitude,
        }));
        setMapPickerVisible(false);
    };

    if (isLoading || (!isAuthenticated && !user)) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerCopy}>
                    <Text style={styles.headerTitle}>Adresses</Text>
                    <Text style={styles.headerSubtitle}>
                        Retrait, livraison et lieux habituels
                    </Text>
                </View>
                <TouchableOpacity style={styles.headerButton} onPress={() => openCreateModal()}>
                    <Ionicons name="add" size={22} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <Text style={styles.heroEyebrow}>Carnet pratique</Text>
                    <Text style={styles.heroTitle}>Des points fiables pour vos livraisons</Text>
                    <Text style={styles.heroText}>
                        Definissez un retrait vendeur par defaut, une livraison par defaut et vos adresses frequentes.
                    </Text>
                </View>

                <View style={styles.defaultsGrid}>
                    <DefaultAddressCard
                        title="Retrait par defaut"
                        subtitle="Utilise pour vos annonces et demandes de livraison"
                        icon="storefront-outline"
                        entry={defaultPickup}
                        emptyLabel="Ajouter un point de retrait"
                        onCreate={() => openCreateModal('pickup')}
                        onEdit={defaultPickup ? () => openEditModal(defaultPickup) : undefined}
                    />
                    <DefaultAddressCard
                        title="Livraison par defaut"
                        subtitle="Pratique pour vos achats reguliers"
                        icon="location-outline"
                        entry={defaultDelivery}
                        emptyLabel="Ajouter une destination"
                        onCreate={() => openCreateModal('delivery')}
                        onEdit={defaultDelivery ? () => openEditModal(defaultDelivery) : undefined}
                    />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Adresses habituelles</Text>
                    <TouchableOpacity style={styles.addSmallButton} onPress={() => openCreateModal('usual')}>
                        <Ionicons name="add" size={14} color={Colors.primary} />
                        <Text style={styles.addSmallButtonText}>Ajouter</Text>
                    </TouchableOpacity>
                </View>

                {isLoadingEntries ? (
                    <LoadingSpinner />
                ) : entries.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="map-outline" size={32} color={Colors.gray400} />
                        <Text style={styles.emptyTitle}>Aucune adresse enregistree</Text>
                        <Text style={styles.emptyText}>
                            Ajoutez une adresse et choisissez le point exact sur la carte.
                        </Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={() => openCreateModal()}>
                            <Text style={styles.primaryButtonText}>Ajouter une adresse</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    entries.map((entry) => (
                        <AddressCard
                            key={entry.id}
                            entry={entry}
                            onEdit={() => openEditModal(entry)}
                            onDelete={() => removeEntry(entry.id)}
                            onSetPickup={() => setDefault(entry.id, 'pickup')}
                            onSetDelivery={() => setDefault(entry.id, 'delivery')}
                        />
                    ))
                )}
            </ScrollView>

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalSheet, { paddingBottom: Spacing.lg + insets.bottom }]}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalEyebrow}>Adresse</Text>
                                <Text style={styles.modalTitle}>
                                    {editingId ? 'Modifier adresse' : 'Nouvelle adresse'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                                <Ionicons name="close" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Type</Text>
                        <View style={styles.kindRow}>
                            {KIND_OPTIONS.map((option) => {
                                const active = draft.kind === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[styles.kindChip, active && styles.kindChipActive]}
                                        onPress={() => setDraft((prev) => ({ ...prev, kind: option.value }))}
                                    >
                                        <Ionicons
                                            name={option.icon}
                                            size={14}
                                            color={active ? Colors.white : Colors.primary}
                                        />
                                        <Text style={[styles.kindText, active && styles.kindTextActive]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Nom</Text>
                        <TextInput
                            style={styles.input}
                            value={draft.label}
                            onChangeText={(text) =>
                                setDraft((prev) => ({ ...prev, label: normalizeTextInputValue(text) }))
                            }
                            placeholder="Ex: Maison, Boutique Gombe, Bureau"
                            placeholderTextColor={Colors.gray400}
                        />

                        <Text style={styles.label}>Adresse</Text>
                        <TextInput
                            style={[styles.input, styles.addressInput]}
                            value={draft.address}
                            onChangeText={(text) =>
                                setDraft((prev) => ({ ...prev, address: normalizeTextInputValue(text) }))
                            }
                            placeholder="Adresse lisible ou point GPS"
                            placeholderTextColor={Colors.gray400}
                            multiline
                        />

                        <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => setMapPickerVisible(true)}
                        >
                            <Ionicons name="map-outline" size={17} color={Colors.primary} />
                            <Text style={styles.mapButtonText}>
                                {draftHasCoordinates
                                    ? 'Modifier le point sur la carte'
                                    : 'Choisir sur la carte'}
                            </Text>
                        </TouchableOpacity>

                        {formatCoordinateLabel(draft) ? (
                            <Text style={styles.coordinatesText}>{formatCoordinateLabel(draft)}</Text>
                        ) : null}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.secondaryModalButton} onPress={closeModal}>
                                <Text style={styles.secondaryModalButtonText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryModalButton} onPress={saveDraft}>
                                <Text style={styles.primaryModalButtonText}>Enregistrer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <MapPickerModal
                visible={mapPickerVisible}
                initialLocation={
                    draftHasCoordinates
                        ? {
                              latitude: Number(draft.latitude),
                              longitude: Number(draft.longitude),
                              address: draft.address || undefined,
                          }
                        : undefined
                }
                onClose={() => setMapPickerVisible(false)}
                onConfirm={onMapConfirm}
            />

            {alertNode}
        </SafeAreaView>
    );
}

function DefaultAddressCard({
    title,
    subtitle,
    icon,
    entry,
    emptyLabel,
    onCreate,
    onEdit,
}: {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    entry?: AddressBookEntry;
    emptyLabel: string;
    onCreate: () => void;
    onEdit?: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.defaultCard, entry && styles.defaultCardFilled]}
            onPress={entry && onEdit ? onEdit : onCreate}
            activeOpacity={0.88}
        >
            <View style={styles.defaultIcon}>
                <Ionicons name={icon} size={18} color={entry ? Colors.white : Colors.primary} />
            </View>
            <Text style={[styles.defaultTitle, entry && styles.defaultTitleFilled]}>{title}</Text>
            <Text style={[styles.defaultSubtitle, entry && styles.defaultSubtitleFilled]}>{subtitle}</Text>
            <Text style={[styles.defaultValue, entry && styles.defaultValueFilled]} numberOfLines={2}>
                {entry ? entry.address : emptyLabel}
            </Text>
            <Ionicons
                name={entry ? 'create-outline' : 'add-circle-outline'}
                size={18}
                color={entry ? Colors.accent : Colors.primary}
                style={styles.defaultCornerIcon}
            />
        </TouchableOpacity>
    );
}

function AddressCard({
    entry,
    onEdit,
    onDelete,
    onSetPickup,
    onSetDelivery,
}: {
    entry: AddressBookEntry;
    onEdit: () => void;
    onDelete: () => void;
    onSetPickup: () => void;
    onSetDelivery: () => void;
}) {
    const kindMeta = KIND_OPTIONS.find((option) => option.value === entry.kind) || KIND_OPTIONS[2];
    return (
        <View style={styles.addressCard}>
            <View style={styles.addressTopRow}>
                <View style={styles.addressIcon}>
                    <Ionicons name={kindMeta.icon} size={17} color={Colors.primary} />
                </View>
                <View style={styles.addressCopy}>
                    <Text style={styles.addressLabel}>{entry.label}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>{entry.address}</Text>
                </View>
                <TouchableOpacity style={styles.iconAction} onPress={onEdit}>
                    <Ionicons name="create-outline" size={17} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.badgesRow}>
                <View style={styles.softBadge}>
                    <Text style={styles.softBadgeText}>{kindMeta.label}</Text>
                </View>
                {entry.isDefaultPickup ? (
                    <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Retrait par defaut</Text>
                    </View>
                ) : null}
                {entry.isDefaultDelivery ? (
                    <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Livraison par defaut</Text>
                    </View>
                ) : null}
            </View>

            {formatCoordinateLabel(entry) ? (
                <Text style={styles.cardCoordinates}>{formatCoordinateLabel(entry)}</Text>
            ) : null}

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.cardActionButton, entry.isDefaultPickup && styles.cardActionButtonActive]}
                    onPress={onSetPickup}
                    disabled={entry.isDefaultPickup}
                >
                    <Text
                        style={[
                            styles.cardActionButtonText,
                            entry.isDefaultPickup && styles.cardActionButtonTextActive,
                        ]}
                    >
                        Retrait
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.cardActionButton, entry.isDefaultDelivery && styles.cardActionButtonActive]}
                    onPress={onSetDelivery}
                    disabled={entry.isDefaultDelivery}
                >
                    <Text
                        style={[
                            styles.cardActionButtonText,
                            entry.isDefaultDelivery && styles.cardActionButtonTextActive,
                        ]}
                    >
                        Livraison
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                    <Ionicons name="trash-outline" size={15} color={Colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F7FC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.primary + '10',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary + '14',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '08',
    },
    headerCopy: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.xl,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    headerSubtitle: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        ...Shadows.md,
    },
    heroEyebrow: {
        color: Colors.accent,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroTitle: {
        marginTop: 4,
        color: Colors.white,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroText: {
        marginTop: Spacing.xs,
        color: Colors.white + 'D9',
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    defaultsGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    defaultCard: {
        flex: 1,
        minHeight: 170,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '14',
        backgroundColor: Colors.white,
        padding: Spacing.md,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    defaultCardFilled: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    defaultIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '10',
        borderWidth: 1,
        borderColor: Colors.white + '20',
    },
    defaultTitle: {
        marginTop: Spacing.md,
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    defaultTitleFilled: {
        color: Colors.white,
    },
    defaultSubtitle: {
        marginTop: 3,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        lineHeight: 16,
    },
    defaultSubtitleFilled: {
        color: Colors.white + 'C9',
    },
    defaultValue: {
        marginTop: Spacing.sm,
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 17,
    },
    defaultValueFilled: {
        color: Colors.accent,
    },
    defaultCornerIcon: {
        position: 'absolute',
        right: Spacing.md,
        top: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    sectionTitle: {
        color: Colors.primary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    addSmallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '24',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        backgroundColor: Colors.white,
    },
    addSmallButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    emptyCard: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        alignItems: 'center',
        ...Shadows.sm,
    },
    emptyTitle: {
        marginTop: Spacing.sm,
        color: Colors.primary,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
    },
    emptyText: {
        marginTop: Spacing.xs,
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    primaryButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.accent,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    primaryButtonText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    addressCard: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    addressTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    addressIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '10',
    },
    addressCopy: {
        flex: 1,
        minWidth: 0,
    },
    addressLabel: {
        color: Colors.primary,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
    },
    addressText: {
        marginTop: 3,
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        lineHeight: 19,
    },
    iconAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '08',
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    softBadge: {
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    softBadgeText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    defaultBadge: {
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.accent + '22',
        borderWidth: 1,
        borderColor: Colors.accent + '55',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    defaultBadgeText: {
        color: Colors.accentDark,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    cardCoordinates: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    cardActions: {
        flexDirection: 'row',
        gap: Spacing.xs,
        alignItems: 'center',
    },
    cardActionButton: {
        flex: 1,
        minHeight: 36,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '24',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    cardActionButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    cardActionButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    cardActionButtonTextActive: {
        color: Colors.white,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.error + '10',
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(12, 20, 35, 0.48)',
    },
    modalSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        gap: Spacing.sm,
    },
    modalHandle: {
        alignSelf: 'center',
        width: 54,
        height: 5,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray300,
        marginBottom: Spacing.xs,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    modalEyebrow: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        textTransform: 'uppercase',
    },
    modalTitle: {
        marginTop: 2,
        color: Colors.primary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '08',
    },
    label: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    kindRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    kindChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '24',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
        backgroundColor: Colors.white,
    },
    kindChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    kindText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    kindTextActive: {
        color: Colors.white,
    },
    input: {
        minHeight: 46,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    addressInput: {
        minHeight: 76,
        textAlignVertical: 'top',
    },
    mapButton: {
        minHeight: 44,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '08',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    mapButtonText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    coordinatesText: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    secondaryModalButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    secondaryModalButtonText: {
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.bold,
    },
    primaryModalButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.accent,
    },
    primaryModalButtonText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
});
