import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useGetAnnouncementByIdQuery } from '@/store/api/announcementsApi';
import { useAddToCartMutation } from '@/store/api/cartApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: product, isLoading } = useGetAnnouncementByIdQuery(id!);
    const [addToCart] = useAddToCartMutation();
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showActionsModal, setShowActionsModal] = useState(false);

    // Add to cart function
    const handleAddToCart = () => {
        if (product) {
            addToCart({ productId: product._id, quantity: 1 })
                .unwrap()
                .then(() => Alert.alert('Succès', 'Article ajouté au panier'))
                .catch((error) => Alert.alert('Erreur', 'Échec de l\'ajout au panier'));
        }
    };

    // Show all images in a modal
    const openImageGallery = () => {
        setShowImageModal(true);
    };

    // Contact seller function (placeholder)
    const contactSeller = () => {
        Alert.alert('Contact', 'Fonctionnalité de contact du vendeur');
    };

    // Share link function (placeholder)
    const shareLink = () => {
        Alert.alert('Partager', 'Fonctionnalité de partage du lien');
    };

    // Report listing function (placeholder)
    const reportListing = () => {
        Alert.alert('Signaler', 'Fonctionnalité de signalement de l\'annonce');
    };

    // View comments function (placeholder)
    const viewComments = () => {
        Alert.alert('Commentaires', 'Fonctionnalité de consultation des commentaires');
    };

    // Add review function (placeholder)
    const addReview = () => {
        Alert.alert('Avis', 'Fonctionnalité d\'ajout d\'un avis');
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!product) {
        return (
            <View style={styles.center}>
                <Text>Produit non trouvé</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Détails du produit</Text>
                <TouchableOpacity onPress={() => setShowActionsModal(true)} style={styles.shareButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color={Colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Main image with gallery indicator */}
                <TouchableOpacity onPress={openImageGallery}>
                    <Image
                        source={{ uri: product.images?.[selectedImageIndex] || 'https://via.placeholder.com/300' }}
                        style={styles.image}
                    />
                    {product.images && product.images.length > 1 && (
                        <View style={styles.galleryIndicator}>
                            <Text style={styles.galleryText}>{selectedImageIndex + 1}/{product.images.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                
                <View style={styles.details}>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.price}>{product.price?.toFixed(2) || 'N/A'} €</Text>
                    <Text style={styles.description}>{product.description}</Text>
                    
                    {/* Seller info */}
                    <View style={styles.sellerSection}>
                        <Text style={styles.sellerLabel}>Vendu par:</Text>
                        <Text style={styles.sellerName}>{typeof product.user === 'object' && product.user?.username ? product.user.username : 'Anonyme'}</Text>
                        <TouchableOpacity onPress={contactSeller} style={styles.contactButton}>
                            <Text style={styles.contactButtonText}>Contacter le vendeur</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleAddToCart}>
                    <Ionicons name="cart" size={24} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Ajouter au panier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={viewComments}>
                    <Ionicons name="chatbubble-outline" size={24} color={Colors.primary} />
                    <Text style={styles.secondaryButtonText}>Avis ({product.ratings?.length || 0})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={addReview}>
                    <Ionicons name="star-outline" size={24} color={Colors.primary} />
                    <Text style={styles.secondaryButtonText}>Donner un avis</Text>
                </TouchableOpacity>
            </View>

            {/* Image Gallery Modal */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={showImageModal}
                onRequestClose={() => setShowImageModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowImageModal(false)} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={28} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Galerie d'images</Text>
                        {product.images && product.images.length > 1 && (
                            <Text style={styles.modalCounter}>{selectedImageIndex + 1}/{product.images.length}</Text>
                        )}
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {product.images && product.images.map((imageUri, index) => (
                            <TouchableOpacity key={index} onPress={() => setSelectedImageIndex(index)}>
                                <Image
                                    source={{ uri: imageUri || 'https://via.placeholder.com/300' }}
                                    style={[styles.modalImage, selectedImageIndex === index && styles.selectedModalImage]}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Actions Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showActionsModal}
                onRequestClose={() => setShowActionsModal(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowActionsModal(false)}>
                    <View style={styles.actionsModalContent}>
                        <TouchableOpacity style={styles.actionModalItem} onPress={shareLink}>
                            <Ionicons name="share" size={24} color={Colors.primary} />
                            <Text style={styles.actionModalText}>Partager</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionModalItem} onPress={reportListing}>
                            <Ionicons name="flag" size={24} color={Colors.error} />
                            <Text style={styles.actionModalText}>Signaler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionModalItem} onPress={() => setShowActionsModal(false)}>
                            <Ionicons name="close" size={24} color={Colors.gray400} />
                            <Text style={styles.actionModalText}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.primary,
    },
    backButton: {
        marginRight: Spacing.md,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
        flex: 1,
    },
    shareButton: {
        marginLeft: Spacing.md,
    },
    image: {
        width: '100%',
        height: 300,
    },
    scrollContent: {
        paddingBottom: Spacing.xl,
    },
    details: {
        padding: Spacing.lg,
    },
    name: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    price: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.accent,
        marginBottom: Spacing.md,
    },
    description: {
        fontSize: Typography.fontSize.md,
        color: Colors.textSecondary,
        lineHeight: 24,
        marginBottom: Spacing.lg,
    },
    galleryIndicator: {
        position: 'absolute',
        bottom: Spacing.md,
        right: Spacing.md,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
    },
    galleryText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    sellerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        marginTop: Spacing.lg,
    },
    sellerLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        marginRight: Spacing.xs,
    },
    sellerName: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        flex: 1,
    },
    contactButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    contactButtonText: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
        fontSize: Typography.fontSize.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: Spacing.lg,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        flex: 1,
        marginRight: Spacing.md,
        justifyContent: 'center',
    },
    actionButtonText: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
        fontSize: Typography.fontSize.sm,
        marginLeft: Spacing.sm,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary,
        flex: 1,
        marginHorizontal: Spacing.sm,
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        fontSize: Typography.fontSize.sm,
        marginLeft: Spacing.sm,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.black,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        backgroundColor: Colors.black,
    },
    modalCloseButton: {
        padding: Spacing.sm,
    },
    modalTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        flex: 1,
        textAlign: 'center',
    },
    modalCounter: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
    },
    modalContent: {
        flexGrow: 1,
        padding: Spacing.md,
    },
    modalImage: {
        width: '100%',
        height: 300,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    selectedModalImage: {
        borderWidth: 2,
        borderColor: Colors.accent,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionsModalContent: {
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
    },
    actionModalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    actionModalText: {
        fontSize: Typography.fontSize.md,
        marginLeft: Spacing.md,
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
