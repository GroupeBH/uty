/**
 * Page du panier
 */

import { CartItem } from '@/components/CartItem';
import { MapPickerModal } from '@/components/MapPickerModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAddToCartMutation, useCheckoutCartMutation, useClearCartMutation, useGetCartQuery, useSetDeliveryLocationMutation, useUpdateCartItemMutation } from '@/store/api/cartApi';
import { useGetCurrenciesQuery } from '@/store/api/currenciesApi';
import { useLazyReverseGeocodeQuery } from '@/store/api/googleMapsApi';
import { Announcement } from '@/types/announcement';
import { Cart as CartType, CartProduct as CartItemType } from '@/types/cart';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toIdString = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === 'object') {
        const valueAsObject = value as any;
        if (valueAsObject?._id) {
            return toIdString(valueAsObject._id);
        }
        if (valueAsObject?.id) {
            return toIdString(valueAsObject.id);
        }
    }
    if (typeof (value as any)?.toString === 'function') {
        const serialized = (value as any).toString();
        if (serialized && serialized !== '[object Object]') {
            return serialized;
        }
    }
    return null;
};

const resolveCartProductId = (item: CartItemType): string | null => {
    if (typeof item.productId === 'string') {
        return toIdString(item.productId);
    }
    return toIdString((item.productId as Announcement)?._id || item.productId);
};

const getProductTotalQuantityFromRawLines = (products: CartItemType[] | undefined, productId: string): number => {
    if (!products || products.length === 0) return 0;
    return products.reduce((sum, line) => {
        const resolvedId = resolveCartProductId(line);
        if (resolvedId !== productId) return sum;
        return sum + Math.max(0, Number(line.quantity) || 0);
    }, 0);
};

const resolveAnnouncementSellerId = (product: Announcement | undefined): string | null => {
    if (!product) return null;
    return toIdString(
        (product as any)?.shop?.user?._id ||
        (product as any)?.shop?.user ||
        (product as any)?.user?._id ||
        (product as any)?.user,
    );
};

export default function CartScreen() {
    const router = useRouter();
    const { data: cart, isLoading, isFetching, refetch } = useGetCartQuery();
    const { data: currencies = [] } = useGetCurrenciesQuery();
    const [addToCart] = useAddToCartMutation();
    const [clearCart] = useClearCartMutation();
    const [updateCartItem] = useUpdateCartItemMutation();
    const [checkoutCart, { isLoading: isCheckoutLoading }] = useCheckoutCartMutation();
    const [setDeliveryLocation] = useSetDeliveryLocationMutation();
    const [triggerReverseGeocode, { isFetching: isResolvingDeliveryAddress }] = useLazyReverseGeocodeQuery();
    const [mapVisible, setMapVisible] = React.useState(false);
    const [checkoutModalVisible, setCheckoutModalVisible] = React.useState(false);
    const [deliveryAddress, setDeliveryAddress] = React.useState('');
    const [isSanitizingCart, setIsSanitizingCart] = React.useState(false);
    const lastSanitizedSignatureRef = React.useRef<string | null>(null);
    const [alertState, setAlertState] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
        onConfirm?: (() => void | Promise<void>) | undefined;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        confirmText: 'OK',
        cancelText: 'Annuler',
        showCancel: false,
        onConfirm: undefined,
    });
    const parseApiErrorMessage = React.useCallback((error: any, fallback: string) => {
        if (!error) return fallback;

        if (typeof error === 'string') return error;

        const data = error?.data;
        if (typeof data === 'string') return data;

        if (Array.isArray(data?.message) && data.message.length > 0) {
            return String(data.message[0]);
        }
        if (typeof data?.message === 'string') return data.message;
        if (typeof data?.error === 'string') return data.error;
        if (typeof error?.message === 'string') return error.message;

        return fallback;
    }, []);

    const hideAlert = React.useCallback(() => {
        setAlertState((prev) => ({ ...prev, visible: false, onConfirm: undefined }));
    }, []);

    const showAlert = React.useCallback((params: Omit<typeof alertState, 'visible'>) => {
        setAlertState({
            ...params,
            visible: true,
            confirmText: params.confirmText || 'OK',
            cancelText: params.cancelText || 'Annuler',
            showCancel: params.showCancel || false,
        });
    }, []);

    const rawCartProducts = React.useMemo(
        () => ((cart?.products || []) as CartItemType[]),
        [cart?.products],
    );

    const cartNormalization = React.useMemo(() => {
        const rawDuplicateCountByProductId = new Map<string, number>();
        const quantityByProductId = new Map<string, number>();
        const representativeByProductId = new Map<string, CartItemType>();
        let invalidProductIdCount = 0;

        rawCartProducts.forEach((item) => {
            const productId = resolveCartProductId(item);
            if (!productId) {
                invalidProductIdCount += 1;
                return;
            }

            rawDuplicateCountByProductId.set(
                productId,
                (rawDuplicateCountByProductId.get(productId) || 0) + 1,
            );
            quantityByProductId.set(
                productId,
                (quantityByProductId.get(productId) || 0) + Math.max(1, Number(item.quantity) || 1),
            );

            const representative = representativeByProductId.get(productId);
            if (!representative) {
                representativeByProductId.set(productId, {
                    ...item,
                    productId: typeof item.productId === 'object' ? item.productId : productId,
                    _id: toIdString(item._id) || item._id,
                });
                return;
            }

            if (typeof representative.productId === 'string' && typeof item.productId === 'object') {
                representative.productId = item.productId;
            }
        });

        const mergedItems: CartItemType[] = Array.from(quantityByProductId.entries()).map(
            ([productId, quantity]) => {
                const representative = representativeByProductId.get(productId)!;
                return {
                    ...representative,
                    quantity,
                };
            },
        );

        const rebuildableItems = mergedItems.filter((item) => {
            if (typeof item.productId !== 'object') return false;
            return Boolean(resolveAnnouncementSellerId(item.productId as Announcement));
        });

        const invalidSellerCount = mergedItems.length - rebuildableItems.length;
        const hasDuplicates = Array.from(rawDuplicateCountByProductId.values()).some((count) => count > 1);
        const hasInconsistency = hasDuplicates || invalidProductIdCount > 0 || invalidSellerCount > 0;

        return {
            mergedItems,
            rebuildableItems,
            rawDuplicateCountByProductId,
            rawCount: rawCartProducts.length,
            uniqueCount: mergedItems.length,
            invalidProductIdCount,
            invalidSellerCount,
            hasDuplicates,
            hasInconsistency,
        };
    }, [rawCartProducts]);

    const cartItems = cartNormalization.mergedItems;
    const rawDuplicateCountByProductId = cartNormalization.rawDuplicateCountByProductId;

    const rebuildCartFromSanitizedLines = React.useCallback(
        async (options?: { quantityOverrides?: Record<string, number>; removeProductIds?: string[] }) => {
            const quantityOverrides = options?.quantityOverrides || {};
            const removeSet = new Set(options?.removeProductIds || []);

            const linesToKeep = cartNormalization.rebuildableItems
                .map((item) => {
                    const productId = resolveCartProductId(item);
                    if (!productId || removeSet.has(productId)) {
                        return null;
                    }

                    const product = (typeof item.productId === 'object' ? item.productId : undefined) as Announcement | undefined;
                    const stock = typeof product?.quantity === 'number' ? Math.max(1, product.quantity) : undefined;
                    const requestedQuantityRaw =
                        quantityOverrides[productId] !== undefined
                            ? Number(quantityOverrides[productId])
                            : Number(item.quantity);
                    const requestedQuantity = Math.max(0, Number.isFinite(requestedQuantityRaw) ? requestedQuantityRaw : 0);
                    if (requestedQuantity <= 0) {
                        return null;
                    }

                    const safeQuantity = stock !== undefined ? Math.min(requestedQuantity, stock) : requestedQuantity;

                    return {
                        productId,
                        quantity: Math.max(1, safeQuantity),
                    };
                })
                .filter(Boolean) as { productId: string; quantity: number }[];

            await clearCart().unwrap();

            for (const line of linesToKeep) {
                await addToCart({ productId: line.productId, quantity: line.quantity }).unwrap();
            }

            await refetch();
        },
        [addToCart, cartNormalization.rebuildableItems, clearCart, refetch],
    );

    React.useEffect(() => {
        if (!cart || isSanitizingCart || !cartNormalization.hasInconsistency) {
            return;
        }

        const signature = `${cart._id}-${cart.updatedAt}-${cartNormalization.rawCount}-${cartNormalization.uniqueCount}-${cartNormalization.invalidProductIdCount}-${cartNormalization.invalidSellerCount}`;
        if (lastSanitizedSignatureRef.current === signature) {
            return;
        }

        lastSanitizedSignatureRef.current = signature;
        setIsSanitizingCart(true);

        (async () => {
            try {
                await rebuildCartFromSanitizedLines();

                const removedInvalid = cartNormalization.invalidProductIdCount + cartNormalization.invalidSellerCount;
                if (removedInvalid > 0 || cartNormalization.hasDuplicates) {
                    showAlert({
                        title: 'Panier optimise',
                        message: removedInvalid > 0
                            ? `${removedInvalid} article(s) invalide(s) ont ete retires automatiquement.`
                            : 'Les doublons ont ete fusionnes automatiquement.',
                        type: 'info',
                    });
                }
            } catch (error) {
                showAlert({
                    title: 'Panier incoherent',
                    message: parseApiErrorMessage(
                        error,
                        'Impossible de corriger automatiquement le panier. Reessayez plus tard.',
                    ),
                    type: 'error',
                });
            } finally {
                setIsSanitizingCart(false);
            }
        })();
    }, [
        cart,
        cartNormalization.hasDuplicates,
        cartNormalization.hasInconsistency,
        cartNormalization.invalidProductIdCount,
        cartNormalization.invalidSellerCount,
        cartNormalization.rawCount,
        cartNormalization.uniqueCount,
        isSanitizingCart,
        parseApiErrorMessage,
        rebuildCartFromSanitizedLines,
        showAlert,
    ]);

    const handleIncrement = async (item: CartItemType) => {
        if (isSanitizingCart) return;

        const product = (typeof item.productId === 'object' ? item.productId : undefined) as Announcement | undefined;
        const productStock = product?.quantity ?? Number.POSITIVE_INFINITY;
        if (item.quantity >= productStock) return;

        try {
            await updateQuantity(item, item.quantity + 1);
        } catch (error) {
            showAlert({
                title: 'Erreur',
                message: parseApiErrorMessage(error, 'Impossible de mettre a jour la quantite.'),
                type: 'error',
            });
        }
    };

    const handleDecrement = async (item: CartItemType) => {
        if (isSanitizingCart) return;
        if (item.quantity <= 1) return;

        try {
            await updateQuantity(item, item.quantity - 1);
        } catch (error) {
            showAlert({
                title: 'Erreur',
                message: parseApiErrorMessage(error, 'Impossible de mettre a jour la quantite.'),
                type: 'error',
            });
        }
    };

    const removeProductFromCart = async (item: CartItemType) => {
        const productId = resolveCartProductId(item);
        if (!productId) {
            throw new Error('Produit invalide');
        }
        await rebuildCartFromSanitizedLines({ removeProductIds: [productId] });
    };

    const handleRemove = (item: CartItemType) => {
        if (isSanitizingCart) return;
        showAlert({
            title: 'Retirer du panier',
            message: 'Voulez-vous retirer cet article du panier ?',
            type: 'warning',
            showCancel: true,
            cancelText: 'Annuler',
            confirmText: 'Retirer',
            onConfirm: async () => {
                try {
                    await removeProductFromCart(item);
                    showAlert({
                        title: 'Article retire',
                        message: 'Le produit a ete retire de votre panier.',
                        type: 'success',
                    });
                } catch (error) {
                    showAlert({
                        title: 'Erreur',
                        message: parseApiErrorMessage(error, "Impossible de retirer l'article."),
                        type: 'error',
                    });
                }
            },
        });
    };

    const handleDeliveryConfirm = async (location: { latitude: number; longitude: number; address?: string }) => {
        try {
            await setDeliveryLocation({ coordinates: [location.longitude, location.latitude] }).unwrap();
            setDeliveryAddress((location.address || '').trim());
            setMapVisible(false);
        } catch (error) {
            showAlert({
                title: 'Adresse non enregistree',
                message: parseApiErrorMessage(error, "Impossible de definir l'adresse de livraison."),
                type: 'error',
            });
        }
    };

    const updateQuantity = async (item: CartItemType, nextQuantity: number) => {
        const productId = resolveCartProductId(item);
        if (!productId) {
            throw new Error('Produit invalide');
        }
        const hasRawDuplicates = (rawDuplicateCountByProductId.get(productId) || 0) > 1;
        const rebuildWithQuantity = async () => {
            await rebuildCartFromSanitizedLines({
                quantityOverrides: { [productId]: nextQuantity },
            });
        };

        if (nextQuantity <= 0) {
            await removeProductFromCart(item);
            return;
        }

        if (hasRawDuplicates || cartNormalization.hasInconsistency) {
            // Rebuild from normalized lines to avoid duplicated/legacy rows exploding quantities.
            await rebuildWithQuantity();
            return;
        }

        await updateCartItem({ itemId: productId, quantity: nextQuantity }).unwrap();

        // Verify server state after update to avoid inconsistent quantities.
        const refreshedResult = await refetch();
        const refreshedCart = refreshedResult?.data as CartType | undefined;
        const actualTotal = getProductTotalQuantityFromRawLines(
            (refreshedCart?.products || []) as CartItemType[],
            productId,
        );

        if (actualTotal !== nextQuantity) {
            await rebuildWithQuantity();
        }
    };

    const handleCheckout = () => {
        if (isSanitizingCart) {
            showAlert({
                title: 'Panier en cours',
                message: 'Correction du panier en cours. Reessayez dans quelques secondes.',
                type: 'info',
            });
            return;
        }

        if (!hasDeliveryCoordinates) {
            showAlert({
                title: 'Adresse requise',
                message: 'Choisissez une adresse de livraison avant de valider votre panier.',
                type: 'warning',
            });
            return;
        }

        setCheckoutModalVisible(true);
    };

    const currencyById = React.useMemo(() => {
        const map = new Map<string, any>();
        currencies.forEach((currency) => {
            map.set(currency._id, currency);
        });
        return map;
    }, [currencies]);

    const resolveCurrency = React.useCallback((currency: any) => {
        if (!currency) return 'EUR';
        if (typeof currency === 'string') {
            const found = currencyById.get(currency);
            return found?.symbol || found?.code || currency;
        }
        if (typeof currency === 'object') {
            return currency.symbol || currency.code || 'EUR';
        }
        return 'EUR';
    }, [currencyById]);

    const currencySymbols = React.useMemo(() => {
        const symbols = new Set<string>();
        cartItems.forEach((item) => {
            const product = (typeof item.productId === 'object' ? item.productId : undefined) as Announcement | undefined;
            symbols.add(resolveCurrency(product?.currency));
        });
        return symbols;
    }, [cartItems, resolveCurrency]);

    const currencySymbol = currencySymbols.size === 1
        ? Array.from(currencySymbols)[0]
        : 'EUR';
    const currencyNote = currencySymbols.size > 1
        ? 'Plusieurs devises detectees. Total affiche en devise par defaut.'
        : '';

    const groupedSections = React.useMemo(() => {
        const groups = new Map<string, {
            sellerId: string;
            title: string;
            data: CartItemType[];
            subtotal: number;
            totalQuantity: number;
        }>();

        cartItems.forEach((item) => {
            const product = (typeof item.productId === 'object' ? item.productId : undefined) as Announcement | undefined;
            const seller: any = product?.user;
            const sellerId = typeof seller === 'string' ? seller : seller?._id || 'unknown';
            const sellerName =
                typeof seller === 'object' && seller?.firstName
                    ? seller.firstName
                    : 'Vendeur inconnu';
            const price = product?.price || 0;

            if (!groups.has(sellerId)) {
                groups.set(sellerId, {
                    sellerId,
                    title: sellerName,
                    data: [],
                    subtotal: 0,
                    totalQuantity: 0,
                });
            }

            const group = groups.get(sellerId);
            if (group) {
                group.data.push(item);
                group.subtotal += price * item.quantity;
                group.totalQuantity += item.quantity;
            }
        });

        return Array.from(groups.values());
    }, [cartItems]);

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = groupedSections.reduce((sum, section) => sum + section.subtotal, 0);
    const tax = subtotal * 0.2;
    const deliveryCost = cart?.deliveryCost ?? 0;
    const deliveryMode = cart?.deliveryMode ?? 'pending';
    const total = subtotal + tax + deliveryCost;
    const deliveryExplanation = deliveryMode === 'pending'
        ? 'Definis une adresse de livraison pour obtenir le cout.'
        : deliveryMode === 'none'
            ? 'Aucun article livrable dans ce panier.'
            : 'Cout calcule par le backend selon distance et classe de poids.';
    const deliveryCoords = cart?.deliveryLocation?.coordinates;
    const normalizedDeliveryAddress = deliveryAddress.trim();
    const deliveryLng = deliveryCoords?.[0];
    const deliveryLat = deliveryCoords?.[1];
    const deliveryCoordsKey =
        typeof deliveryLat === 'number' && typeof deliveryLng === 'number'
            ? `${deliveryLat.toFixed(6)},${deliveryLng.toFixed(6)}`
            : '';
    const hasDeliveryCoordinates = Boolean(deliveryCoordsKey);
    const initialMapLocation =
        typeof deliveryLat === 'number' && typeof deliveryLng === 'number'
            ? { latitude: deliveryLat, longitude: deliveryLng, address: normalizedDeliveryAddress || undefined }
            : undefined;
    const deliveryDisplayLabel = normalizedDeliveryAddress
        ? normalizedDeliveryAddress
        : hasDeliveryCoordinates
            ? (isResolvingDeliveryAddress ? 'Resolution de l adresse...' : 'Adresse enregistree (nom indisponible)')
            : '';
    const deliveryCoordinatesFallback =
        typeof deliveryLat === 'number' && typeof deliveryLng === 'number'
            ? `${deliveryLat.toFixed(5)}, ${deliveryLng.toFixed(5)}`
            : '';
    const checkoutAddressPreview = deliveryDisplayLabel
        ? deliveryDisplayLabel
        : deliveryCoordinatesFallback
            ? `Coordonnees: ${deliveryCoordinatesFallback}`
            : 'Non definie';
    const deliveryModeLabel =
        deliveryMode === 'walking'
            ? 'Marche'
            : deliveryMode === 'vehicle'
                ? 'Vehicule'
                : deliveryMode === 'none'
                    ? 'Aucune livraison'
                    : 'En attente';

    React.useEffect(() => {
        if (!deliveryCoordsKey) {
            if (deliveryAddress) {
                setDeliveryAddress('');
            }
            return;
        }

        if (normalizedDeliveryAddress) {
            return;
        }

        if (typeof deliveryLat !== 'number' || typeof deliveryLng !== 'number') {
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await triggerReverseGeocode({
                    lat: deliveryLat,
                    lng: deliveryLng,
                    language: 'fr',
                }).unwrap();
                const resolvedAddress =
                    typeof response?.formattedAddress === 'string'
                        ? response.formattedAddress.trim()
                        : '';

                if (!cancelled && resolvedAddress) {
                    setDeliveryAddress(resolvedAddress);
                }
            } catch {
                // Keep fallback delivery label when reverse geocoding fails.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        deliveryAddress,
        deliveryCoordsKey,
        deliveryLat,
        deliveryLng,
        normalizedDeliveryAddress,
        triggerReverseGeocode,
    ]);

    const handleCheckoutConfirm = async () => {
        try {
            if (isSanitizingCart) {
                showAlert({
                    title: 'Panier en cours',
                    message: 'La correction du panier est en cours. Reessayez dans un instant.',
                    type: 'info',
                });
                return;
            }

            const payload = normalizedDeliveryAddress
                ? { deliveryAddress: normalizedDeliveryAddress }
                : {};
            const orders = await checkoutCart(payload).unwrap();
            setCheckoutModalVisible(false);

            const orderCount = Array.isArray(orders) ? orders.length : 1;
            showAlert({
                title: 'Commande validee',
                message: `${orderCount} commande(s) creee(s) avec succes.`,
                type: 'success',
                confirmText: 'Voir mes commandes',
                showCancel: true,
                cancelText: 'Rester ici',
                onConfirm: () => router.push('/orders'),
            });
        } catch (error) {
            setCheckoutModalVisible(false);
            showAlert({
                title: 'Validation impossible',
                message: parseApiErrorMessage(error, 'Impossible de finaliser le panier pour le moment.'),
                type: 'error',
            });
        }
    };



    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={[styles.emptyContainer, { justifyContent: 'center' }]}>
                    <Text style={{ textAlign: 'center' }}>Chargement du panier...</Text>
                </View>
                
        </SafeAreaView>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={100} color={Colors.gray300} />
                    <Text style={styles.emptyTitle}>Votre panier est vide</Text>
                    <Text style={styles.emptyText}>
                        Ajoutez des produits pour commencer vos achats
                    </Text>
                    <Button
                        title="Decouvrir les produits"
                        variant="primary"
                        size="lg"
                        onPress={() => router.push('/')}
                    />
                </View>
                
        </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <SectionList
                sections={groupedSections}
                renderItem={({ item }) => (
                    <CartItem
                        item={item}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onRemove={handleRemove}
                        currencySymbol={currencySymbol}
                    />
                )}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sellerHeader}>
                        <View>
                            <Text style={styles.sellerTitle}>{section.title}</Text>
                            <Text style={styles.sellerMeta}>{section.totalQuantity} article(s)</Text>
                        </View>
                        <Text style={styles.sellerSubtotal}>
                            {section.subtotal.toFixed(2)} {currencySymbol}
                        </Text>
                    </View>
                )}
                renderSectionFooter={() => (
                    <View style={styles.sellerSummary}>
                        <Ionicons name="information-circle-outline" size={14} color={Colors.gray500} />
                        <Text style={styles.sellerNote}>Livraison calculee sur l ensemble du panier pour ce vendeur.</Text>
                    </View>
                )}
                keyExtractor={(item, index) => {
                    const productId = resolveCartProductId(item);
                    const lineId = toIdString(item._id) || item._id;
                    return lineId || productId || `${item.status}-${item.quantity}-${index}`;
                }}
                contentContainerStyle={styles.listContent}
                stickySectionHeadersEnabled={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        tintColor={Colors.primary}
                    />
                }
                ListHeaderComponent={
                    <View>
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <View style={styles.heroTopRow}>
                                <Text style={styles.heroTitle}>Votre panier</Text>
                                <View style={styles.heroBadge}>
                                    <Text style={styles.heroBadgeText}>{totalItems} article(s)</Text>
                                </View>
                            </View>
                            <View style={styles.heroBottomRow}>
                                <View>
                                    <Text style={styles.heroLabel}>Total provisoire</Text>
                                    <Text style={styles.heroTotal}>{total.toFixed(2)} {currencySymbol}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.heroAction}
                                    onPress={() => router.push('/')}
                                >
                                    <Ionicons name="add" size={16} color={Colors.primary} />
                                    <Text style={styles.heroActionText}>Continuer</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                        <View style={styles.groupedNotice}>
                            <Text style={styles.groupedNoticeTitle}>Commandes groupees par vendeur</Text>
                            <Text style={styles.groupedNoticeText}>Chaque vendeur a sa section, livraison calculee automatiquement.</Text>
                        </View>
                        {isSanitizingCart ? (
                            <View style={styles.sanitizeNotice}>
                                <Ionicons name="sync-outline" size={14} color={Colors.primary} />
                                <Text style={styles.sanitizeNoticeText}>
                                    Correction du panier en cours...
                                </Text>
                            </View>
                        ) : null}
                        <View style={styles.deliveryCard}>
                            <View style={styles.deliveryHeader}>
                                <Text style={styles.deliveryTitle}>Adresse de livraison</Text>
                                <TouchableOpacity
                                    style={styles.deliveryButton}
                                    onPress={() => setMapVisible(true)}
                                >
                                    <Ionicons name="map-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.deliveryButtonText}>
                                        {deliveryDisplayLabel ? 'Modifier' : 'Choisir'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.deliveryAddressText}>
                                {deliveryDisplayLabel || 'Aucune adresse selectionnee'}
                            </Text>
                            <Text style={styles.deliveryHint}>
                                Le cout est calcule automatiquement selon la distance et la classe de poids.
                            </Text>
                        </View>
                    </View>
                }
                ListFooterComponent={
                    <Card style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Recapitulatif</Text>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Sous-total</Text>
                            <Text style={styles.summaryValue}>{subtotal.toFixed(2)} {currencySymbol}</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>TVA (20%)</Text>
                            <Text style={styles.summaryValue}>{tax.toFixed(2)} {currencySymbol}</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Livraison</Text>
                            <Text style={styles.summaryValue}>{deliveryCost.toFixed(2)} {currencySymbol}</Text>
                        </View>

                        <Text style={styles.deliveryNote}>{deliveryExplanation}</Text>

                        <Text style={styles.deliveryMode}>Mode: {deliveryModeLabel}</Text>

                        {currencyNote ? (
                            <Text style={styles.currencyNote}>{currencyNote}</Text>
                        ) : null}

                        <View style={styles.divider} />

                        <View style={styles.summaryRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>{total.toFixed(2)} {currencySymbol}</Text>
                        </View>
                    </Card>
                }
            />
            <Modal
                transparent
                visible={checkoutModalVisible}
                animationType="fade"
                onRequestClose={() => setCheckoutModalVisible(false)}
                statusBarTranslucent
            >
                <View style={styles.checkoutModalOverlay}>
                    <View style={styles.checkoutModalCard}>
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.checkoutModalHeader}
                        >
                            <Text style={styles.checkoutModalTitle}>Confirmer la commande</Text>
                            <Text style={styles.checkoutModalSubtitle}>
                                Verifiez les details avant validation.
                            </Text>
                        </LinearGradient>

                        <View style={styles.checkoutModalBody}>
                            <View style={styles.checkoutModalRow}>
                                <Text style={styles.checkoutModalLabel}>Adresse</Text>
                                <Text style={styles.checkoutModalValue} numberOfLines={2}>
                                    {checkoutAddressPreview}
                                </Text>
                            </View>
                            <View style={styles.checkoutModalRow}>
                                <Text style={styles.checkoutModalLabel}>Mode</Text>
                                <Text style={styles.checkoutModalValue}>{deliveryModeLabel}</Text>
                            </View>
                            <View style={styles.checkoutModalRow}>
                                <Text style={styles.checkoutModalTotalLabel}>Total a payer</Text>
                                <Text style={styles.checkoutModalTotalValue}>
                                    {total.toFixed(2)} {currencySymbol}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.checkoutModalActions}>
                            <TouchableOpacity
                                style={styles.checkoutModalCancelButton}
                                onPress={() => setCheckoutModalVisible(false)}
                                disabled={isCheckoutLoading}
                            >
                                <Text style={styles.checkoutModalCancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <Button
                                title="Confirmer"
                                variant="primary"
                                size="lg"
                                onPress={handleCheckoutConfirm}
                                loading={isCheckoutLoading}
                                disabled={isCheckoutLoading || isSanitizingCart}
                                style={styles.checkoutModalConfirmButton}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={styles.checkoutBar}>
                <SafeAreaView edges={['bottom']} style={styles.checkoutBarInner}>
                    <View style={styles.checkoutInfo}>
                        <Text style={styles.checkoutLabel}>A payer</Text>
                        <Text
                            style={styles.checkoutValue}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                        >
                            {total.toFixed(2)} {currencySymbol}
                        </Text>
                    </View>
                    <Button
                        title="Passer la commande"
                        variant="primary"
                        size="lg"
                        onPress={handleCheckout}
                        disabled={isSanitizingCart}
                        style={styles.checkoutButton}
                    />
                </SafeAreaView>
            </View>
            <MapPickerModal
                visible={mapVisible}
                initialLocation={initialMapLocation}
                onClose={() => setMapVisible(false)}
                onConfirm={handleDeliveryConfirm}
            />
            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
                showCancel={alertState.showCancel}
                onCancel={() => {
                    hideAlert();
                }}
                onConfirm={async () => {
                    const callback = alertState.onConfirm;
                    hideAlert();
                    if (callback) {
                        await callback();
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
    listContent: {
        padding: Spacing.xl,
        paddingTop: Spacing.huge,
        paddingBottom: 190,
    },
    heroCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        ...Shadows.lg,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    heroTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    heroBadge: {
        backgroundColor: Colors.white + '33',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.white + '4D',
    },
    heroBadgeText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        fontWeight: Typography.fontWeight.semibold,
    },
    heroBottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    heroLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'CC',
        marginBottom: Spacing.xs / 2,
    },
    heroTotal: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    heroAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    heroActionText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    groupedNotice: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
    },
    groupedNoticeTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    groupedNoticeText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
    },
    sanitizeNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.primary + '12',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.md,
    },
    sanitizeNoticeText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    deliveryCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
    },
    deliveryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    deliveryTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    deliveryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    deliveryButtonText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.medium,
    },
    deliveryAddressText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        marginBottom: Spacing.xs,
    },
    deliveryHint: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
    },
    sellerNote: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        flex: 1,
    },
    deliveryMode: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        marginTop: Spacing.xs,
    },
    currencyNote: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        marginTop: Spacing.xs,
    },
    sellerHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        marginTop: Spacing.xs,
    },
    sellerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    sellerMeta: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: Spacing.xs / 2,
    },
    sellerSubtotal: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    sellerSummary: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.huge,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray400,
        textAlign: 'center',
        marginBottom: Spacing.huge,
        lineHeight: Typography.fontSize.md * 1.5,
    },
    summaryCard: {
        marginTop: Spacing.sm,
        padding: Spacing.xl,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        ...Shadows.lg,
    },
    summaryTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginBottom: Spacing.xl,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    summaryLabel: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    summaryValue: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    deliveryNote: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray400,
        marginBottom: Spacing.lg,
        marginTop: -Spacing.sm,
    },
    divider: {
        height: 2,
        backgroundColor: Colors.gray100,
        marginVertical: Spacing.xl,
    },
    totalLabel: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    totalValue: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.accent,
    },
    checkoutButton: {
        flex: 1.25,
        minWidth: 180,
        borderRadius: BorderRadius.lg,
    },
    checkoutBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.white + 'F5',
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        ...Shadows.lg,
    },
    checkoutBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
        minHeight: 88,
    },
    checkoutInfo: {
        flex: 0.95,
        minWidth: 0,
        paddingRight: Spacing.sm,
        maxWidth: 190,
    },
    checkoutLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
    },
    checkoutValue: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        lineHeight: 28,
        includeFontPadding: false,
    },
    checkoutModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    checkoutModalCard: {
        width: '100%',
        maxWidth: 520,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.xl,
    },
    checkoutModalHeader: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    checkoutModalTitle: {
        fontSize: Typography.fontSize.xl,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    checkoutModalSubtitle: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'CC',
    },
    checkoutModalBody: {
        padding: Spacing.xl,
        gap: Spacing.md,
        backgroundColor: Colors.gray50,
    },
    checkoutModalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    checkoutModalLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        flex: 1,
    },
    checkoutModalValue: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
        textAlign: 'right',
        flex: 1.4,
        lineHeight: 20,
    },
    checkoutModalTotalLabel: {
        fontSize: Typography.fontSize.md,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        flex: 1,
    },
    checkoutModalTotalValue: {
        fontSize: Typography.fontSize.lg,
        color: Colors.accentDark,
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'right',
        flex: 1.4,
    },
    checkoutModalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.sm,
    },
    checkoutModalCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        backgroundColor: Colors.gray50,
    },
    checkoutModalCancelText: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
    checkoutModalConfirmButton: {
        flex: 1.2,
    },
});

