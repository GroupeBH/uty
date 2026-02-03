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
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Animated,
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
        Alert.alert(
            'Supprimer l\'annonce',
            `Êtes-vous sûr de vouloir supprimer "${actionMenu.announcementName}" ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        if (actionMenu.announcementId) {
                            try {
                                await deleteAnnouncement(actionMenu.announcementId).unwrap();
                                closeActionMenu();
                                Alert.alert('Succès', 'Annonce supprimée avec succès');
                            } catch (error) {
                                Alert.alert('Erreur', 'Impossible de supprimer l\'annonce');
                            }
                        }
                    },
                },
            ]
        );
    };

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
                <Ionicons name="megaphone-outline" size={64} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Aucune annonce</Text>
            <Text style={styles.emptySubtitle}>
                Vous n'avez pas encore publié d'annonce.{'\n'}
                Commencez dès maintenant !
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew}>
                <LinearGradient colors={Gradients.primary} style={styles.emptyButtonGradient}>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.white} />
                    <Text style={styles.emptyButtonText}>Publier une annonce</Text>
                </LinearGradient>
            </TouchableOpacity>
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

            {/* List */}
            <FlatList
                data={announcements}
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
});

