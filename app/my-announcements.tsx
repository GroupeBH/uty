/**
 * Écran de gestion des annonces de l'utilisateur
 * Permet de voir, modifier, supprimer et ajouter des annonces
 */

import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteAnnouncementMutation, useGetMyAnnouncementsQuery } from '@/store/api/announcementsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type ActionMenuType = {
    visible: boolean;
    announcementId: string | null;
    announcementName: string;
};

export default function MyAnnouncementsScreen() {
    const router = useRouter();
    const { requireAuth, user } = useAuth();

    const { data: announcements, isLoading, refetch } = useGetMyAnnouncementsQuery();
    const [deleteAnnouncement] = useDeleteAnnouncementMutation();

    const [refreshing, setRefreshing] = useState(false);
    const [actionMenu, setActionMenu] = useState<ActionMenuType>({
        visible: false,
        announcementId: null,
        announcementName: '',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');

    type AlertVariant = 'success' | 'error' | 'info';
    const [alertState, setAlertState] = useState<{
        visible: boolean;
        title: string;
        message: string;
        variant: AlertVariant;
        confirmText?: string;
        onConfirm?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        variant: 'info',
    });
    const [confirmState, setConfirmState] = useState<{
        visible: boolean;
        announcementId: string | null;
        announcementName: string;
    }>({
        visible: false,
        announcementId: null,
        announcementName: '',
    });

    const slideAnim = React.useRef(new Animated.Value(300)).current;

    // Check authentication
    useEffect(() => {
        if (!requireAuth('Vous devez être connecté pour voir vos annonces')) {
            router.back();
        }
    }, [requireAuth]);

    useEffect(() => {
        if (actionMenu.visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [actionMenu.visible]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleAddNew = () => {
        router.push('/publish');
    };

    const openActionMenu = (id: string, name: string) => {
        setActionMenu({
            visible: true,
            announcementId: id,
            announcementName: name,
        });
    };

    const closeActionMenu = () => {
        setActionMenu({
            visible: false,
            announcementId: null,
            announcementName: '',
        });
    };

    const showAlert = (options: {
        title: string;
        message: string;
        variant?: AlertVariant;
        confirmText?: string;
        onConfirm?: () => void;
    }) => {
        setAlertState({
            visible: true,
            title: options.title,
            message: options.message,
            variant: options.variant || 'info',
            confirmText: options.confirmText || 'OK',
            onConfirm: options.onConfirm,
        });
    };

    const closeAlert = () => {
        const onConfirm = alertState.onConfirm;
        setAlertState({
            visible: false,
            title: '',
            message: '',
            variant: 'info',
            confirmText: 'OK',
            onConfirm: undefined,
        });
        if (onConfirm) onConfirm();
    };

    const openDeleteConfirm = (id: string, name: string) => {
        closeActionMenu();
        setConfirmState({
            visible: true,
            announcementId: id,
            announcementName: name,
        });
    };

    const closeDeleteConfirm = () => {
        setConfirmState({
            visible: false,
            announcementId: null,
            announcementName: '',
        });
    };

    const handleView = () => {
        if (actionMenu.announcementId) {
            closeActionMenu();
            router.push(`/product/${actionMenu.announcementId}`);
        }
    };

    const handleEdit = () => {
        if (actionMenu.announcementId) {
            closeActionMenu();
            router.push(`/edit-announcement/${actionMenu.announcementId}`);
        }
    };

    const handleDelete = () => {
        if (actionMenu.announcementId) {
            openDeleteConfirm(actionMenu.announcementId, actionMenu.announcementName);
        }
    };

    const confirmDelete = async () => {
        if (!confirmState.announcementId) return;
        try {
            await deleteAnnouncement(confirmState.announcementId).unwrap();
            closeDeleteConfirm();
            showAlert({
                title: 'Succes',
                message: 'Annonce supprimee avec succes',
                variant: 'success',
            });
        } catch (error) {
            closeDeleteConfirm();
            showAlert({
                title: 'Erreur',
                message: "Impossible de supprimer l'annonce",
                variant: 'error',
            });
        }
    };

    const categories = React.useMemo(() => {
        if (!announcements) return [];
        const map = new Map<string, string>();
        announcements.forEach((item: any) => {
            const categoryId =
                typeof item.category === 'string' ? item.category : item.category?._id;
            const categoryName =
                typeof item.category === 'string' ? 'Categorie' : item.category?.name;
            if (categoryId && categoryName && !map.has(categoryId)) {
                map.set(categoryId, categoryName);
            }
        });
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [announcements]);

    const filteredAnnouncements = React.useMemo(() => {
        if (!announcements) return [];
        const query = searchQuery.trim().toLowerCase();
        return announcements.filter((item: any) => {
            const name = (item.name || '').toLowerCase();
            const categoryName = (item.category?.name || '').toLowerCase();
            const categoryId =
                typeof item.category === 'string' ? item.category : item.category?._id;
            const matchesQuery =
                query.length === 0 || name.includes(query) || categoryName.includes(query);
            const matchesCategory =
                selectedCategoryId === 'all' ||
                (categoryId && categoryId === selectedCategoryId);
            return matchesQuery && matchesCategory;
        });
    }, [announcements, searchQuery, selectedCategoryId]);

    const hasFilters =
        searchQuery.trim().length > 0 || selectedCategoryId !== 'all';

    const alertBadgeText =
        alertState.variant === 'success'
            ? 'Bravo'
            : alertState.variant === 'error'
              ? 'Petit soucis'
              : 'Petit conseil';
    const alertPointsText =
        alertState.variant === 'success' ? '+10 XP' : 'Astuce';
    const alertProgress =
        alertState.variant === 'success'
            ? 0.8
            : alertState.variant === 'error'
              ? 0.35
              : 0.55;

    const renderAnnouncementCard = ({ item }: any) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/product/${item._id}`)}
            activeOpacity={0.9}
        >
            <View style={styles.cardContent}>
                {/* Image */}
                <View style={styles.imageContainer}>
                    {item.images && item.images.length > 0 ? (
                        <Image source={{ uri: item.images[0] }} style={styles.image} />
                    ) : (
                        <View style={[styles.image, styles.noImage]}>
                            <Ionicons name="image-outline" size={40} color={Colors.gray300} />
                        </View>
                    )}
                    {item.isSold && (
                        <View style={styles.soldBadge}>
                            <Text style={styles.soldText}>VENDU</Text>
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.name}
                    </Text>
                    <Text style={styles.cardCategory} numberOfLines={1}>
                        {item.category?.name || 'Sans catégorie'}
                    </Text>
                    <View style={styles.cardFooter}>
                        <Text style={styles.cardPrice}>
                            {item.price?.toLocaleString('fr-FR')} {item.currency?.symbol || '€'}
                        </Text>
                        <View style={styles.cardStats}>
                            <View style={styles.stat}>
                                <Ionicons name="eye-outline" size={14} color={Colors.textSecondary} />
                                <Text style={styles.statText}>{item.views || 0}</Text>
                            </View>
                            <View style={styles.stat}>
                                <Ionicons name="heart-outline" size={14} color={Colors.textSecondary} />
                                <Text style={styles.statText}>{item.likes?.length || 0}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Actions Button */}
                <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => openActionMenu(item._id, item.name)}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <LinearGradient colors={Gradients.cool} style={styles.emptyIcon}>
                <Ionicons name={hasFilters ? 'search-outline' : 'megaphone-outline'} size={64} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>
                {hasFilters ? 'Aucun resultat' : 'Aucune annonce'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {hasFilters
                    ? 'Essayez un autre mot cle ou une autre categorie.'
                    : "Vous n'avez pas encore publie d'annonce.\nCommencez des maintenant !"}
            </Text>
            {!hasFilters && (
                <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew}>
                    <LinearGradient colors={Gradients.primary} style={styles.emptyButtonGradient}>
                        <Ionicons name="add-circle-outline" size={24} color={Colors.white} />
                        <Text style={styles.emptyButtonText}>Publier une annonce</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );

    if (isLoading && !announcements) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mes annonces</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
                    <Ionicons name="add" size={28} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Stats */}
            {announcements && announcements.length > 0 && (
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{announcements.length}</Text>
                        <Text style={styles.statLabel}>Annonces</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>
                            {announcements.reduce((sum, a) => sum + (a.views || 0), 0)}
                        </Text>
                        <Text style={styles.statLabel}>Vues</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>
                            {announcements.reduce((sum, a) => sum + (a.likes?.length || 0), 0)}
                        </Text>
                        <Text style={styles.statLabel}>J'aime</Text>
                    </View>
                </View>
            )}

            {announcements && announcements.length > 0 && (
                <View style={styles.filtersContainer}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color={Colors.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Rechercher une annonce"
                            placeholderTextColor={Colors.gray400}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={styles.searchClear}
                                onPress={() => setSearchQuery('')}
                            >
                                <Ionicons name="close-circle" size={18} color={Colors.gray300} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {categories.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterRow}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    selectedCategoryId === 'all' && styles.filterChipActive,
                                ]}
                                onPress={() => setSelectedCategoryId('all')}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        selectedCategoryId === 'all' && styles.filterChipTextActive,
                                    ]}
                                >
                                    Toutes
                                </Text>
                            </TouchableOpacity>
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.filterChip,
                                        selectedCategoryId === category.id && styles.filterChipActive,
                                    ]}
                                    onPress={() => setSelectedCategoryId(category.id)}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            selectedCategoryId === category.id && styles.filterChipTextActive,
                                        ]}
                                    >
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* List */}
            <FlatList
                data={filteredAnnouncements}
                renderItem={renderAnnouncementCard}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />

            {/* Floating Action Button */}
            {announcements && announcements.length > 0 && (
                <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
                    <LinearGradient colors={Gradients.primary} style={styles.fabGradient}>
                        <Ionicons name="add" size={28} color={Colors.white} />
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Action Menu Modal */}
            <Modal
                visible={actionMenu.visible}
                transparent
                animationType="fade"
                onRequestClose={closeActionMenu}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={closeActionMenu}
                >
                    <Animated.View
                        style={[
                            styles.actionMenu,
                            {
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.actionMenuHandle} />
                        <Text style={styles.actionMenuTitle} numberOfLines={2}>
                            {actionMenu.announcementName}
                        </Text>

                        <TouchableOpacity style={styles.actionMenuItem} onPress={handleView}>
                            <Ionicons name="eye-outline" size={24} color={Colors.accent} />
                            <Text style={styles.actionMenuItemText}>Voir l'annonce</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionMenuItem} onPress={handleEdit}>
                            <Ionicons name="create-outline" size={24} color={Colors.primary} />
                            <Text style={styles.actionMenuItemText}>Modifier</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionMenuItem, styles.actionMenuItemDanger]}
                            onPress={handleDelete}
                        >
                            <Ionicons name="trash-outline" size={24} color={Colors.error} />
                            <Text style={[styles.actionMenuItemText, styles.actionMenuItemTextDanger]}>
                                Supprimer
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionMenuCancel} onPress={closeActionMenu}>
                            <Text style={styles.actionMenuCancelText}>Annuler</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={confirmState.visible}
                transparent
                animationType="fade"
                onRequestClose={closeDeleteConfirm}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <View style={styles.confirmIcon}>
                            <Ionicons name="trash-outline" size={22} color={Colors.white} />
                        </View>
                        <Text style={styles.confirmTitle}>Supprimer l'annonce ?</Text>
                        <Text style={styles.confirmMessage}>
                            Cette action est definitive. "{confirmState.announcementName}"
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity style={styles.confirmCancel} onPress={closeDeleteConfirm}>
                                <Text style={styles.confirmCancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmDelete} onPress={confirmDelete}>
                                <LinearGradient colors={Gradients.warm} style={styles.confirmDeleteGradient}>
                                    <Text style={styles.confirmDeleteText}>Supprimer</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={alertState.visible}
                transparent
                animationType="fade"
                onRequestClose={closeAlert}
            >
                <View style={styles.alertOverlay}>
                    <View style={styles.alertCard}>
                        <View style={styles.alertTopRow}>
                            <View style={[styles.alertIcon, styles[`alertIcon_${alertState.variant}`]]}>
                                <Ionicons
                                    name={
                                        alertState.variant === 'success'
                                            ? 'checkmark'
                                            : alertState.variant === 'error'
                                              ? 'close'
                                              : 'information'
                                    }
                                    size={20}
                                    color={Colors.white}
                                />
                            </View>
                            <View style={styles.alertMeta}>
                                <View style={[styles.alertBadge, styles[`alertBadge_${alertState.variant}`]]}>
                                    <Text style={styles.alertBadgeText}>{alertBadgeText}</Text>
                                </View>
                                <View style={styles.alertPoints}>
                                    <Ionicons name="sparkles" size={14} color={Colors.accent} />
                                    <Text style={styles.alertPointsText}>{alertPointsText}</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.alertTitle}>{alertState.title}</Text>
                        <Text style={styles.alertMessage}>{alertState.message}</Text>
                        <View style={styles.alertProgressTrack}>
                            <View
                                style={[
                                    styles.alertProgressFill,
                                    { width: `${Math.round(alertProgress * 100)}%` },
                                ]}
                            />
                        </View>
                        <TouchableOpacity style={styles.alertButton} onPress={closeAlert}>
                            <LinearGradient colors={Gradients.primary} style={styles.alertButtonGradient}>
                                <Text style={styles.alertButtonText}>{alertState.confirmText || 'OK'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    addButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        alignItems: 'center',
        ...Shadows.sm,
    },
    statNumber: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    statLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    cardContent: {
        flexDirection: 'row',
        padding: Spacing.md,
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: BorderRadius.lg,
    },
    noImage: {
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    soldBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: Colors.error,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs / 2,
        borderTopRightRadius: BorderRadius.lg,
        borderBottomLeftRadius: BorderRadius.lg,
    },
    soldText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    cardInfo: {
        flex: 1,
        marginLeft: Spacing.md,
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    cardCategory: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs / 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    cardPrice: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    cardStats: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs / 2,
    },
    statText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    moreButton: {
        padding: Spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl * 2,
        paddingHorizontal: Spacing.xl,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        ...Shadows.lg,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.xxxl,
    },
    emptyButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    emptyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    emptyButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    fab: {
        position: 'absolute',
        bottom: Spacing.xxl,
        right: Spacing.xxl,
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        ...Shadows.xl,
    },
    fabGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    actionMenu: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xxxl,
        borderTopRightRadius: BorderRadius.xxxl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    actionMenuHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.gray300,
        borderRadius: BorderRadius.full,
        alignSelf: 'center',
        marginBottom: Spacing.lg,
    },
    actionMenuTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xl,
        textAlign: 'center',
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        backgroundColor: Colors.gray50,
    },
    actionMenuItemText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginLeft: Spacing.md,
    },
    actionMenuItemDanger: {
        backgroundColor: Colors.error + '10',
    },
    actionMenuItemTextDanger: {
        color: Colors.error,
    },
    actionMenuCancel: {
        alignItems: 'center',
        padding: Spacing.lg,
        marginTop: Spacing.md,
    },
    actionMenuCancelText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textSecondary,
    },
    filtersContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        paddingVertical: 2,
    },
    searchClear: {
        padding: Spacing.xs / 2,
    },
    filterRow: {
        gap: Spacing.sm,
        paddingRight: Spacing.lg,
    },
    filterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterChipText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        fontWeight: Typography.fontWeight.semibold,
    },
    filterChipTextActive: {
        color: Colors.white,
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    confirmCard: {
        width: '100%',
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.lg,
    },
    confirmIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    confirmTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        width: '100%',
    },
    confirmCancel: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    confirmCancelText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textSecondary,
    },
    confirmDelete: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    confirmDeleteGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmDeleteText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    alertCard: {
        width: '100%',
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.lg,
    },
    alertTopRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    alertIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertIcon_success: {
        backgroundColor: Colors.success,
    },
    alertIcon_error: {
        backgroundColor: Colors.error,
    },
    alertIcon_info: {
        backgroundColor: Colors.accent,
    },
    alertMeta: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
    alertBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs / 2,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
    },
    alertBadge_success: {
        backgroundColor: Colors.success + '20',
    },
    alertBadge_error: {
        backgroundColor: Colors.error + '20',
    },
    alertBadge_info: {
        backgroundColor: Colors.accent + '20',
    },
    alertBadgeText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    alertPoints: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs / 2,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs / 2,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray50,
    },
    alertPointsText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textSecondary,
    },
    alertTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    alertMessage: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
        lineHeight: 22,
    },
    alertProgressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: Colors.gray100,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    alertProgressFill: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.full,
    },
    alertButton: {
        width: '100%',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    alertButtonGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertButtonText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
});

