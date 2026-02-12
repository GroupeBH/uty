/**
 * Écran de détail d'un produit - Version améliorée
 * Avec ajout au panier, contact vendeur et avis
 */

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetAnnouncementByIdQuery } from '@/store/api/announcementsApi';
import { useAddToCartMutation, useGetCartQuery, useRemoveFromCartMutation, useUpdateCartItemMutation } from '@/store/api/cartApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
    const { requireAuth, isAuthenticated } = useAuth();
    const safeBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    const { data: product, isLoading } = useGetAnnouncementByIdQuery(id!);
    const [addToCart] = useAddToCartMutation();
    const [removeFromCart] = useRemoveFromCartMutation();
    const [updateCartItem] = useUpdateCartItemMutation();
    const { data: cart } = useGetCartQuery(undefined, { skip: !isAuthenticated });
    
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
    const [alertState, setAlertState] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
    });
    
    const scrollY = useRef(new Animated.Value(0)).current;
    const cartItem = cart?.products?.find((item) => {
        const productId =
            typeof item.productId === 'string' ? item.productId : item.productId?._id;
        return productId === product?._id;
    });
    const inCartQuantity = cartItem?.quantity || 0;
    const stock = typeof product?.quantity === 'number' ? product.quantity : undefined;
    const remainingStock = stock === undefined ? undefined : Math.max(stock - inCartQuantity, 0);
    const hasStockLeft = remainingStock === undefined ? true : remainingStock > 0;
    const showAlert = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' | 'warning' = 'info',
    ) => {
        setAlertState({
            visible: true,
            title,
            message,
            type,
        });
    };
    const infoChips = [
        product?.category?.name ? { icon: 'pricetag-outline', label: product.category.name } : null,
        product?.location?.[0] ? { icon: 'location-outline', label: product.location[0] } : null,
        product?.quantity ? { icon: 'layers-outline', label: `${product.quantity} en stock` } : null,
    ].filter(Boolean) as { icon: string; label: string }[];
    const normalizeObject = (value: any): Record<string, any> => {
        if (!value) return {};
        if (value instanceof Map) {
            const result: Record<string, any> = {};
            value.forEach((val, key) => {
                result[key as string] = val;
            });
            return result;
        }
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return typeof parsed === 'object' && parsed ? parsed : {};
            } catch {
                return {};
            }
        }
        if (typeof value === 'object') return value;
        return {};
    };
    const formatAttributeValue = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            if (value.minimum !== undefined && value.maximum !== undefined) {
                return `${value.minimum} - ${value.maximum}`;
            }
            if (value.valueMin !== undefined && value.valueMax !== undefined) {
                return `${value.valueMin} - ${value.valueMax}`;
            }
            if (value.name) return value.name;
            try {
                return JSON.stringify(value);
            } catch {
                return '';
            }
        }
        return '';
    };
    const attributeEntries = React.useMemo(() => {
        if (!product) return [];
        const attributes = normalizeObject(product.attributes);
        const specifications = normalizeObject(product.specifications);
        const merged = { ...specifications, ...attributes };
        return Object.entries(merged)
            .map(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const display = formatAttributeValue(value);
                return { key, label, value: display };
            })
            .filter((item) => item.value && item.value.toString().length > 0);
    }, [product]);

    React.useEffect(() => {
        if (remainingStock === undefined) return;

        setQuantity((prev) => {
            if (remainingStock <= 0) return 1;
            return Math.min(Math.max(prev, 1), remainingStock);
        });
    }, [remainingStock]);

    const handleAddToCart = async () => {
        if (!requireAuth('Vous devez etre connecte pour ajouter au panier')) {
            return;
        }

        if (!product) {
            return;
        }

        if (!hasStockLeft) {
            showAlert('Stock', 'Ce produit est deja au maximum dans votre panier.', 'warning');
            return;
        }

        const quantityToAdd = Math.max(1, quantity);
        const mergedQuantity = inCartQuantity + quantityToAdd;
        const nextQuantity = stock === undefined ? mergedQuantity : Math.min(mergedQuantity, stock);

        try {
            if (inCartQuantity > 0) {
                try {
                    await updateCartItem({ itemId: product._id, quantity: nextQuantity }).unwrap();
                } catch {
                    // Fallback for backends without PATCH /carts/items/:id
                    await removeFromCart(product._id).unwrap();
                    await addToCart({ productId: product._id, quantity: nextQuantity }).unwrap();
                }
            } else {
                await addToCart({ productId: product._id, quantity: nextQuantity }).unwrap();
            }

            const added = nextQuantity - inCartQuantity;
            if (added <= 0) {
                showAlert('Stock', 'Quantite maximale deja atteinte pour ce produit.', 'warning');
            } else {
                showAlert('Succes', `${added} article(s) ajoute(s). Total dans le panier: ${nextQuantity}.`, 'success');
            }
        } catch {
            showAlert('Erreur', "Echec de l'ajout au panier", 'error');
        }
    };

    const handleRemoveFromCart = async () => {
        if (!requireAuth('Vous devez ??tre connect?? pour modifier le panier')) {
            return;
        }

        if (product) {
            try {
                await removeFromCart(product._id).unwrap();
                showAlert('Info', 'Article retire du panier', 'info');
            } catch {
                showAlert('Erreur', 'Impossible de retirer l\'article', 'error');
            }
        }
    };

    const handleContactSeller = () => {
        if (!requireAuth('Vous devez être connecté pour contacter le vendeur')) {
            return;
        }

        if (!message.trim()) {
            showAlert('Erreur', 'Veuillez entrer un message', 'warning');
            return;
        }
        // TODO: Implémenter l'envoi du message
        showAlert('Message envoye', 'Le vendeur a recu votre message', 'success');
        setShowContactModal(false);
        setMessage('');
    };

    const handleSubmitReview = () => {
        if (!requireAuth('Vous devez être connecté pour laisser un avis')) {
            setShowReviewModal(false);
            return;
        }

        if (!reviewText.trim()) {
            showAlert('Erreur', 'Veuillez entrer un commentaire', 'warning');
            return;
        }
        // TODO: Implémenter l'envoi de l'avis
        showAlert('Avis envoye', 'Merci pour votre avis !', 'success');
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
                    <Text style={styles.backToHomeText}>Retour à l&apos;accueil</Text>
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
                        <TouchableOpacity onPress={() => safeBack()} style={styles.headerButton}>
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
                <TouchableOpacity onPress={() => safeBack()} style={styles.floatingButton}>
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

                    {infoChips.length > 0 && (
                        <View style={styles.infoChips}>
                            {infoChips.map((chip, index) => (
                                <View key={`${chip.label}-${index}`} style={styles.infoChip}>
                                    <Ionicons name={chip.icon as any} size={14} color={Colors.accent} />
                                    <Text style={styles.infoChipText}>{chip.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Quantite */}
                    <View style={styles.purchasePanel}>
                        <View style={styles.quantitySection}>
                            <View>
                                <Text style={styles.sectionLabel}>Quantite a ajouter</Text>
                                <Text style={styles.quantityHint}>
                                    {remainingStock === undefined
                                        ? 'Stock non precise par le vendeur.'
                                        : remainingStock > 0
                                            ? `${remainingStock} article(s) encore disponible(s)`
                                            : 'Stock maximal deja dans le panier'}
                                </Text>
                            </View>
                            <View style={styles.quantityControls}>
                                <TouchableOpacity
                                    style={[
                                        styles.quantityButton,
                                        quantity <= 1 && styles.quantityButtonDisabled,
                                    ]}
                                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                >
                                    <Ionicons
                                        name="remove"
                                        size={20}
                                        color={quantity <= 1 ? Colors.gray300 : Colors.primary}
                                    />
                                </TouchableOpacity>
                                <Text style={styles.quantityText}>{quantity}</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.quantityButton,
                                        (!hasStockLeft ||
                                            (remainingStock !== undefined && quantity >= remainingStock)) &&
                                            styles.quantityButtonDisabled,
                                    ]}
                                    onPress={() =>
                                        setQuantity((prev) => {
                                            const next = prev + 1;
                                            if (remainingStock === undefined) return next;
                                            return Math.min(next, Math.max(remainingStock, 1));
                                        })
                                    }
                                    disabled={!hasStockLeft || (remainingStock !== undefined && quantity >= remainingStock)}
                                >
                                    <Ionicons
                                        name="add"
                                        size={20}
                                        color={
                                            !hasStockLeft || (remainingStock !== undefined && quantity >= remainingStock)
                                                ? Colors.gray300
                                                : Colors.primary
                                        }
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Panier */}
                        <View style={styles.cartStatusCard}>
                            <View style={styles.cartStatusCopy}>
                                <Text style={styles.sectionLabel}>Panier</Text>
                                <Text style={styles.cartStatusText}>
                                    {inCartQuantity > 0
                                        ? `Deja dans le panier: ${inCartQuantity}`
                                        : 'Pas encore dans le panier'}
                                </Text>
                                <Text style={styles.cartStatusHint}>
                                    {hasStockLeft
                                        ? 'Ajoute en un clic, la quantite se cumule automatiquement.'
                                        : 'Aucun ajout possible tant qu il n y a pas de stock.'}
                                </Text>
                            </View>
                            <View style={styles.cartActions}>
                                {inCartQuantity > 0 && (
                                    <TouchableOpacity
                                        style={styles.cartRemoveButton}
                                        onPress={handleRemoveFromCart}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                                        <Text style={styles.cartRemoveText}>Retirer</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.cartViewButton}
                                    onPress={() => router.push('/(tabs)/cart')}
                                >
                                    <Ionicons name="cart-outline" size={16} color={Colors.white} />
                                    <Text style={styles.cartViewText}>Voir panier</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📝 Description</Text>
                        <Text style={styles.description}>{product.description || 'Aucune description disponible'}</Text>
                    </View>

                    
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Caract\u00e9ristiques</Text>
                        {attributeEntries.length > 0 ? (
                            <View style={styles.attributesGrid}>
                                {attributeEntries.map((item) => (
                                    <View key={item.key} style={styles.attributeCard}>
                                        <Text style={styles.attributeLabel}>{item.label}</Text>
                                        <Text style={styles.attributeValue}>{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyAttributes}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={20}
                                    color={Colors.gray400}
                                />
                                <Text style={styles.emptyAttributesText}>
                                    Aucune caract\u00e9ristique disponible
                                </Text>
                            </View>
                        )}
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
                                    {typeof product.user === 'object' && product.user?.firstName 
                                        ? product?.user?.firstName 
                                        : 'Anonyme'}
                                </Text>
                                <View style={styles.sellerRating}>
                                    <Ionicons name="star" size={14} color={Colors.accent} />
                                    <Text style={styles.sellerRatingText}>4.8 (156 ventes)</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                style={styles.contactSellerButton}
                                onPress={() => {
                                    if (requireAuth('Vous devez être connecté pour contacter le vendeur')) {
                                        setShowContactModal(true);
                                    }
                                }}
                            >
                                <Ionicons name="chatbubble-outline" size={20} color={Colors.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Avis clients */}
                    <View style={styles.section}>
                        <View style={styles.reviewsHeader}>
                            <Text style={styles.sectionTitle}>⭐ Avis clients</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    if (requireAuth('Vous devez être connecté pour laisser un avis')) {
                                        setShowReviewModal(true);
                                    }
                                }}
                            >
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
                    <View style={styles.bottomBarInfoRow}>
                        <Text style={styles.bottomBarLabel}>Dans le panier</Text>
                        <Text style={styles.bottomBarValue}>{inCartQuantity} article(s)</Text>
                        <Text style={styles.bottomBarState}>
                            {hasStockLeft ? 'Pret pour ajout' : 'Stock atteint'}
                        </Text>
                    </View>

                    <View style={styles.bottomBarButtons}>
                        <TouchableOpacity
                            style={[styles.addToCartButton, !hasStockLeft && styles.addToCartButtonDisabled]}
                            onPress={handleAddToCart}
                            activeOpacity={0.8}
                            disabled={!hasStockLeft}
                        >
                            {hasStockLeft ? (
                                <LinearGradient
                                    colors={Gradients.accent}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.addToCartGradient}
                                >
                                    <Ionicons name="cart" size={20} color={Colors.primary} />
                                    <Text style={styles.addToCartText}>Ajouter {quantity}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.addToCartGradient, styles.addToCartGradientDisabled]}>
                                    <Ionicons name="alert-circle-outline" size={20} color={Colors.gray500} />
                                    <Text style={[styles.addToCartText, styles.addToCartTextDisabled]}>
                                        Stock atteint
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.buyNowButton}
                            onPress={() => showAlert('Acheter', 'Fonctionnalite a venir', 'info')}
                        >
                            <Text style={styles.buyNowText} numberOfLines={2}>Acheter maintenant</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* Modal Galerie d'images */}
            <Modal
                animationType="fade"
                transparent={false}
                visible={showImageModal}
                onRequestClose={() => setShowImageModal(false)}
                statusBarTranslucent
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
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.sheetKeyboardWrap}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={styles.contactModal}>
                            <View style={styles.contactModalHeader}>
                                <Text style={styles.contactModalTitle}>Contacter le vendeur</Text>
                                <TouchableOpacity
                                    style={styles.sheetCloseButton}
                                    onPress={() => setShowContactModal(false)}
                                >
                                    <Ionicons name="close" size={20} color={Colors.textPrimary} />
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
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Modal Ajouter un Avis */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showReviewModal}
                onRequestClose={() => setShowReviewModal(false)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.sheetKeyboardWrap}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <ScrollView
                            style={styles.sheetScroll}
                            contentContainerStyle={styles.sheetScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.reviewModal}>
                                <View style={styles.reviewModalHeader}>
                                    <Text style={styles.reviewModalTitle}>Donner votre avis</Text>
                                    <TouchableOpacity
                                        style={styles.sheetCloseButton}
                                        onPress={() => setShowReviewModal(false)}
                                    >
                                        <Ionicons name="close" size={20} color={Colors.textPrimary} />
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
                                    placeholder="Partagez votre experience..."
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
                                        <Text style={styles.submitReviewText}>Publier l&apos;avis</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onConfirm={() => setAlertState((prev) => ({ ...prev, visible: false }))}
                confirmText="OK"
            />
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
    infoChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    infoChipText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    purchasePanel: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        gap: Spacing.md,
        ...Shadows.md,
    },
    quantitySection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    quantityHint: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs / 2,
    },
    cartStatusCard: {
        backgroundColor: Colors.gray50,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    cartStatusCopy: {
        marginBottom: Spacing.md,
    },
    cartStatusText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
        marginTop: Spacing.xs / 2,
    },
    cartStatusHint: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    cartActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    cartRemoveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.error + '10',
        borderWidth: 1,
        borderColor: Colors.error + '30',
    },
    cartRemoveText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.error,
    },
    cartViewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
    },
    cartViewText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
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
    quantityButtonDisabled: {
        backgroundColor: Colors.gray100,
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
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    attributesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    attributeCard: {
        width: '48%',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    attributeLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        fontWeight: Typography.fontWeight.semibold,
    },
    attributeValue: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.bold,
        marginTop: Spacing.xs,
    },
    emptyAttributes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    emptyAttributesText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    description: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        lineHeight: 24,
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
        height: 164,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white + 'F5',
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        ...Shadows.xl,
    },
    bottomBarContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    bottomBarInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xs,
        gap: Spacing.xs,
    },
    bottomBarLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    bottomBarValue: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    bottomBarState: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
        backgroundColor: Colors.primary + '12',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    bottomBarButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingBottom: Spacing.xs,
    },
    addToCartButton: {
        flex: 1.15,
        minWidth: 180,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    addToCartButtonDisabled: {
        opacity: 1,
    },
    addToCartGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md + 2,
        gap: Spacing.sm,
    },
    addToCartGradientDisabled: {
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    addToCartText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    addToCartTextDisabled: {
        color: Colors.gray500,
    },
    buyNowButton: {
        flex: 1,
        minWidth: 148,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md + 2,
    },
    buyNowText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
        textAlign: 'center',
        lineHeight: 20,
        includeFontPadding: false,
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
        paddingHorizontal: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    sheetKeyboardWrap: {
        width: '100%',
    },
    sheetScroll: {
        width: '100%',
        maxHeight: '88%',
    },
    sheetScrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    sheetCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactModal: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xxxl,
        borderTopRightRadius: BorderRadius.xxxl,
        padding: Spacing.xl,
        maxHeight: '88%',
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
        maxHeight: '88%',
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

