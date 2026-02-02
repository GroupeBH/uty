/**
 * Écran de détail d'un produit - Version améliorée
 * Avec ajout au panier, contact vendeur et avis
 */

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAnnouncementByIdQuery } from '@/store/api/announcementsApi';
import { useAddToCartMutation } from '@/store/api/cartApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { 
    Alert, 
    Animated, 
    Dimensions, 
    Image, 
    Modal, 
    ScrollView, 
    StyleSheet, 
    Text, 
    TextInput,
    TouchableOpacity, 
    View 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: product, isLoading } = useGetAnnouncementByIdQuery(id!);
    const [addToCart] = useAddToCartMutation();
    
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [quantity, setQuantity] = useState(1);
    
    // Review form states
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    
    // Contact form states
    const [message, setMessage] = useState('');
    
    const scrollY = useRef(new Animated.Value(0)).current;

    const handleAddToCart = async () => {
        if (product) {
            try {
                await addToCart({ productId: product._id, quantity }).unwrap();
                Alert.alert('✅ Succès', `${quantity} article(s) ajouté(s) au panier`);
            } catch (error) {
                Alert.alert('❌ Erreur', 'Échec de l\'ajout au panier');
            }
        }
    };

    const handleContactSeller = () => {
        if (!message.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un message');
            return;
        }
        // TODO: Implémenter l'envoi du message
        Alert.alert('Message envoyé', 'Le vendeur a reçu votre message');
        setShowContactModal(false);
        setMessage('');
    };

    const handleSubmitReview = () => {
        if (!reviewText.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un commentaire');
            return;
        }
        // TODO: Implémenter l'envoi de l'avis
        Alert.alert('Avis envoyé', 'Merci pour votre avis !');
        setShowReviewModal(false);
        setReviewText('');
        setRating(5);
    };

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!product) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
                <Text style={styles.errorText}>Produit non trouvé</Text>
                <TouchableOpacity 
                    style={styles.backToHomeButton}
                    onPress={() => router.push('/')}
                >
                    <Text style={styles.backToHomeText}>Retour à l'accueil</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Header flottant avec animation */}
            <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
                <LinearGradient
                    colors={Gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <SafeAreaView edges={['top']} style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
                        <TouchableOpacity onPress={toggleFavorite} style={styles.headerButton}>
                            <Ionicons 
                                name={isFavorite ? "heart" : "heart-outline"} 
                                size={24} 
                                color={isFavorite ? Colors.error : Colors.white} 
                            />
                        </TouchableOpacity>
                    </SafeAreaView>
                </LinearGradient>
            </Animated.View>

            {/* Boutons flottants */}
            <SafeAreaView edges={['top']} style={styles.topButtons}>
                <TouchableOpacity onPress={() => router.back()} style={styles.floatingButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleFavorite} style={styles.floatingButton}>
                    <Ionicons 
                        name={isFavorite ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isFavorite ? Colors.error : Colors.white} 
                    />
                </TouchableOpacity>
            </SafeAreaView>

            <Animated.ScrollView
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {/* Image principale avec galerie */}
                <View style={styles.imageContainer}>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        onPress={() => setShowImageModal(true)}
                    >
                        <Image
                            source={{ uri: product.images?.[selectedImageIndex] || 'https://via.placeholder.com/400' }}
                            style={styles.mainImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                    
                    {/* Indicateur de galerie */}
                    {product.images && product.images.length > 1 && (
                        <View style={styles.imageCounter}>
                            <Ionicons name="images-outline" size={16} color={Colors.white} />
                            <Text style={styles.imageCounterText}>
                                {selectedImageIndex + 1}/{product.images.length}
                            </Text>
                        </View>
                    )}

                    {/* Miniatures */}
                    {product.images && product.images.length > 1 && (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.thumbnailsContainer}
                            contentContainerStyle={styles.thumbnailsContent}
                        >
                            {product.images.map((image, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setSelectedImageIndex(index)}
                                    style={[
                                        styles.thumbnail,
                                        selectedImageIndex === index && styles.thumbnailActive
                                    ]}
                                >
                                    <Image
                                        source={{ uri: image }}
                                        style={styles.thumbnailImage}
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Contenu principal */}
                <View style={styles.contentContainer}>
                    {/* Prix et titre */}
                    <View style={styles.titleSection}>
                        <View style={styles.titleRow}>
                            <Text style={styles.productName}>{product.name}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.price}>{product.price?.toFixed(2) || 'N/A'} €</Text>
                            <View style={styles.ratingContainer}>
                                <Ionicons name="star" size={18} color={Colors.accent} />
                                <Text style={styles.ratingText}>4.5 (12)</Text>
                            </View>
                        </View>
                    </View>

                    {/* Quantité */}
                    <View style={styles.quantitySection}>
                        <Text style={styles.sectionLabel}>Quantité</Text>
                        <View style={styles.quantityControls}>
                            <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                <Ionicons name="remove" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{quantity}</Text>
                            <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => setQuantity(quantity + 1)}
                            >
                                <Ionicons name="add" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📝 Description</Text>
                        <Text style={styles.description}>{product.description || 'Aucune description disponible'}</Text>
                    </View>

                    {/* Informations vendeur */}
                    <View style={styles.sellerSection}>
                        <Text style={styles.sectionTitle}>👤 Vendeur</Text>
                        <View style={styles.sellerCard}>
                            <View style={styles.sellerAvatar}>
                                <Ionicons name="person" size={32} color={Colors.primary} />
                            </View>
                            <View style={styles.sellerInfo}>
                                <Text style={styles.sellerName}>
                                    {typeof product.user === 'object' && product.user?.username 
                                        ? product.user.username 
                                        : 'Anonyme'}
                                </Text>
                                <View style={styles.sellerRating}>
                                    <Ionicons name="star" size={14} color={Colors.accent} />
                                    <Text style={styles.sellerRatingText}>4.8 (156 ventes)</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                style={styles.contactSellerButton}
                                onPress={() => setShowContactModal(true)}
                            >
                                <Ionicons name="chatbubble-outline" size={20} color={Colors.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Avis clients */}
                    <View style={styles.section}>
                        <View style={styles.reviewsHeader}>
                            <Text style={styles.sectionTitle}>⭐ Avis clients</Text>
                            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
                                <Text style={styles.addReviewLink}>Donner un avis</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.emptyReviews}>
                            Aucun avis pour le moment. Soyez le premier à donner votre avis !
                        </Text>
                    </View>

                    {/* Espace pour le bottom bar */}
                    <View style={styles.bottomSpacer} />
                </View>
            </Animated.ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <SafeAreaView edges={['bottom']} style={styles.bottomBarContent}>
                    <TouchableOpacity 
                        style={styles.addToCartButton}
                        onPress={handleAddToCart}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={Gradients.accent}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.addToCartGradient}
                        >
                            <Ionicons name="cart" size={24} color={Colors.primary} />
                            <Text style={styles.addToCartText}>Ajouter au panier</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.buyNowButton}
                        onPress={() => Alert.alert('Acheter', 'Fonctionnalité à venir')}
                    >
                        <Text style={styles.buyNowText}>Acheter maintenant</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            {/* Modal Galerie d'images */}
            <Modal
                animationType="fade"
                transparent={false}
                visible={showImageModal}
                onRequestClose={() => setShowImageModal(false)}
            >
                <View style={styles.modalContainer}>
                    <SafeAreaView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity 
                                onPress={() => setShowImageModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={28} color={Colors.white} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {selectedImageIndex + 1} / {product.images?.length || 0}
                            </Text>
                        </View>
                        <ScrollView 
                            horizontal 
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(e) => {
                                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                                setSelectedImageIndex(index);
                            }}
                        >
                            {product.images?.map((image, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: image }}
                                    style={styles.fullImage}
                                    resizeMode="contain"
                                />
                            ))}
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Modal Contact Vendeur */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showContactModal}
                onRequestClose={() => setShowContactModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.contactModal}>
                        <View style={styles.contactModalHeader}>
                            <Text style={styles.contactModalTitle}>Contacter le vendeur</Text>
                            <TouchableOpacity onPress={() => setShowContactModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Votre message..."
                            placeholderTextColor={Colors.gray400}
                            multiline
                            numberOfLines={6}
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />
                        
                        <TouchableOpacity 
                            style={styles.sendMessageButton}
                            onPress={handleContactSeller}
                        >
                            <LinearGradient
                                colors={Gradients.primary}
                                style={styles.sendMessageGradient}
                            >
                                <Ionicons name="send" size={20} color={Colors.white} />
                                <Text style={styles.sendMessageText}>Envoyer le message</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Ajouter un Avis */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showReviewModal}
                onRequestClose={() => setShowReviewModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.reviewModal}>
                        <View style={styles.reviewModalHeader}>
                            <Text style={styles.reviewModalTitle}>Donner votre avis</Text>
                            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.ratingLabel}>Note</Text>
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRating(star)}
                                >
                                    <Ionicons
                                        name={star <= rating ? "star" : "star-outline"}
                                        size={40}
                                        color={star <= rating ? Colors.accent : Colors.gray300}
                                        style={styles.starIcon}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <Text style={styles.reviewLabel}>Votre commentaire</Text>
                        <TextInput
                            style={styles.reviewInput}
                            placeholder="Partagez votre expérience..."
                            placeholderTextColor={Colors.gray400}
                            multiline
                            numberOfLines={6}
                            value={reviewText}
                            onChangeText={setReviewText}
                            textAlignVertical="top"
                        />
                        
                        <TouchableOpacity 
                            style={styles.submitReviewButton}
                            onPress={handleSubmitReview}
                        >
                            <LinearGradient
                                colors={Gradients.accent}
                                style={styles.submitReviewGradient}
                            >
                                <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                <Text style={styles.submitReviewText}>Publier l'avis</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerGradient: {
        paddingBottom: Spacing.md,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    topButtons: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        zIndex: 50,
    },
    floatingButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    imageContainer: {
        backgroundColor: Colors.white,
    },
    mainImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
    },
    imageCounter: {
        position: 'absolute',
        bottom: Spacing.lg,
        right: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
    },
    imageCounterText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    thumbnailsContainer: {
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    thumbnailsContent: {
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        marginRight: Spacing.sm,
    },
    thumbnailActive: {
        borderColor: Colors.accent,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    contentContainer: {
        padding: Spacing.xl,
    },
    titleSection: {
        marginBottom: Spacing.xl,
    },
    titleRow: {
        marginBottom: Spacing.sm,
    },
    productName: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        lineHeight: 36,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    price: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.accent,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    ratingText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    quantitySection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.xl,
        ...Shadows.sm,
    },
    sectionLabel: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    quantityButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    quantityText: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        minWidth: 40,
        textAlign: 'center',
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    description: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        lineHeight: 24,
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
    },
    sellerSection: {
        marginBottom: Spacing.xl,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
    },
    sellerAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    sellerInfo: {
        flex: 1,
    },
    sellerName: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs / 2,
    },
    sellerRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs / 2,
    },
    sellerRatingText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    contactSellerButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    addReviewLink: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.accent,
    },
    emptyReviews: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        fontStyle: 'italic',
    },
    bottomSpacer: {
        height: 120,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        ...Shadows.xl,
    },
    bottomBarContent: {
        flexDirection: 'row',
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    addToCartButton: {
        flex: 2,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    addToCartGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    addToCartText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    buyNowButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
    },
    buyNowText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    errorText: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    backToHomeButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
    },
    backToHomeText: {
        color: Colors.white,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.black,
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    modalCloseButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    fullImage: {
        width: SCREEN_WIDTH,
        height: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    contactModal: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xxxl,
        borderTopRightRadius: BorderRadius.xxxl,
        padding: Spacing.xl,
    },
    contactModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    contactModalTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    messageInput: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        minHeight: 150,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    sendMessageButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    sendMessageGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    sendMessageText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    reviewModal: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xxxl,
        borderTopRightRadius: BorderRadius.xxxl,
        padding: Spacing.xl,
    },
    reviewModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    reviewModalTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    ratingLabel: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    starIcon: {
        marginHorizontal: Spacing.xs / 2,
    },
    reviewLabel: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    reviewInput: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        minHeight: 150,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    submitReviewButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    submitReviewGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    submitReviewText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
});
