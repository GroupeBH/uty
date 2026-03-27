/**
 * Page du panier
 */

import { CartItem } from '@/components/CartItem';
import { KinshasaAddressForm } from '@/components/forms/KinshasaAddressForm';
import { MapPickerModal } from '@/components/MapPickerModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { KINSHASA_ADDRESS_HELP_TEXT } from '@/constants/kinshasa';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAppConfigQuery } from '@/store/api/appConfigApi';
import { useAddToCartMutation, useCheckoutCartMutation, useClearCartMutation, useGetCartQuery, useSetDeliveryLocationMutation, useUpdateCartItemMutation } from '@/store/api/cartApi';
import { useGetCurrenciesQuery } from '@/store/api/currenciesApi';
import { useLazyReverseGeocodeQuery } from '@/store/api/googleMapsApi';
import { Announcement } from '@/types/announcement';
import { CartProduct as CartItemType, Cart as CartType } from '@/types/cart';
import { formatCurrencyAmount, resolveCurrencyDisplay } from '@/utils/currency';
import { localDrafts } from '@/utils/localDrafts';
import { formatKinshasaAddress, hasKinshasaAddressValue, KinshasaAddressFields, parseKinshasaAddress } from '@/utils/kinshasaAddress';
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

const DEFAULT_USD_TO_CDF_RATE = 2300;
const DEFAULT_TAX_RATE = 0.01;
const SELLER_BASE_DELIVERY_FEE_CDF = 1000;
const DEFAULT_ITEM_DELIVERY_FEE_CDF = 2000;
const DELIVERY_FEE_BY_WEIGHT_CLASS_CDF: Record<string, number> = {
    light: 1200,
    medium: 2000,
    heavy: 3500,
    bulky: 5000,
    fragile: 2500,
};

type DeliveryInputMode = 'guided' | 'map';

const DELIVERY_INPUT_MODE_OPTIONS: {
    id: DeliveryInputMode;
    label: string;
    description: string;
    badge?: string;
}[] = [
    {
        id: 'guided',
        label: 'Adresse guidee',
        description: 'Commune, quartier, avenue et repere',
        badge: 'Plus detaillee',
    },
    {
        id: 'map',
        label: 'Carte',
        description: 'Point GPS exact sur la carte',
        badge: 'Plus precise',
    },
];

export default function CartScreen() {
    const router = useRouter();
    const { data: cart, isLoading, isFetching, refetch } = useGetCartQuery();
    const { data: currencies = [] } = useGetCurrenciesQuery();
    const { data: appConfig } = useGetAppConfigQuery();
    const [addToCart] = useAddToCartMutation();
    const [clearCart] = useClearCartMutation();
    const [updateCartItem] = useUpdateCartItemMutation();
    const [checkoutCart, { isLoading: isCheckoutLoading }] = useCheckoutCartMutation();
    const [setDeliveryLocation] = useSetDeliveryLocationMutation();
    const [triggerReverseGeocode, { isFetching: isResolvingDeliveryAddress }] = useLazyReverseGeocodeQuery();
    const [mapVisible, setMapVisible] = React.useState(false);
    const [checkoutModalVisible, setCheckoutModalVisible] = React.useState(false);
    const [deliveryAddress, setDeliveryAddress] = React.useState('');
    const [deliveryInputMode, setDeliveryInputMode] = React.useState<DeliveryInputMode | null>(null);
    const [deliveryAddressFields, setDeliveryAddressFields] = React.useState<KinshasaAddressFields>(
        () => parseKinshasaAddress(''),
    );
    const [deliveryDraftReady, setDeliveryDraftReady] = React.useState(false);
    const deliveryDraftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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

    const handleStructuredDeliveryAddressChange = React.useCallback(
        (fields: KinshasaAddressFields) => {
            const formattedAddress = formatKinshasaAddress(fields);
            setDeliveryAddressFields(fields);
            setDeliveryAddress(formattedAddress);
        },
        [],
    );

    const handleDeliveryInputModeChange = React.useCallback((mode: DeliveryInputMode) => {
        setDeliveryInputMode(mode);
    }, []);

    const handleDeliveryConfirm = async (location: { latitude: number; longitude: number; address?: string }) => {
        try {
            await setDeliveryLocation({
                coordinates: [location.longitude, location.latitude],
                address: (location.address || '').trim() || undefined,
            }).unwrap();
            setDeliveryInputMode('map');
            setDeliveryAddress((location.address || '').trim());
            if (location.address) {
                setDeliveryAddressFields(parseKinshasaAddress(location.address));
            }
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

        if (!normalizedDeliveryAddress) {
            showAlert({
                title: 'Adresse requise',
                message: 'Renseignez au moins une adresse de livraison avant de valider votre panier.',
                type: 'warning',
            });
            return;
        }

        setCheckoutModalVisible(true);
    };

    const resolveCurrency = React.useCallback((currency: any) => {
        return resolveCurrencyDisplay(currency, { currencies });
    }, [currencies]);
    const resolveCurrencyCode = React.useCallback((currency: any): string => {
        if (!currency) return 'CDF';

        if (typeof currency === 'object') {
            const code = typeof currency.code === 'string' ? currency.code.trim().toUpperCase() : '';
            if (code) return code;
            const symbol = typeof currency.symbol === 'string' ? currency.symbol.trim() : '';
            if (symbol === '$') return 'USD';
            const id = typeof currency._id === 'string' ? currency._id.trim() : '';
            if (id) {
                const byId = currencies.find((entry) => entry?._id === id);
                if (byId?.code) return byId.code.trim().toUpperCase();
                if (byId?.symbol === '$') return 'USD';
            }
            return 'CDF';
        }

        if (typeof currency === 'string') {
            const raw = currency.trim();
            if (!raw) return 'CDF';
            if (raw === '$') return 'USD';

            const byId = currencies.find((entry) => entry?._id === raw);
            if (byId?.code) return byId.code.trim().toUpperCase();
            if (byId?.symbol === '$') return 'USD';

            const normalized = raw.toUpperCase();
            if (/^[A-Z]{2,6}$/.test(normalized)) return normalized;
        }

        return 'CDF';
    }, [currencies]);
    const derivedUsdToCdfRate = React.useMemo(() => {
        const usdCurrency = currencies.find((entry) => entry?.code?.trim?.().toUpperCase() === 'USD');
        const cdfCurrency = currencies.find((entry) => entry?.code?.trim?.().toUpperCase() === 'CDF');
        if (!usdCurrency) {
            return undefined;
        }

        if (usdCurrency.exchangeRate > 1 && (!cdfCurrency || cdfCurrency.exchangeRate === 1)) {
            return usdCurrency.exchangeRate;
        }

        if (cdfCurrency && usdCurrency.exchangeRate > 0 && cdfCurrency.exchangeRate > 0) {
            const ratio = usdCurrency.exchangeRate / cdfCurrency.exchangeRate;
            if (Number.isFinite(ratio) && ratio > 1) {
                return ratio;
            }
        }

        return undefined;
    }, [currencies]);
    const usdToCdfRate = appConfig?.checkout?.usdToCdfRate || derivedUsdToCdfRate || DEFAULT_USD_TO_CDF_RATE;
    const taxRate = appConfig?.checkout?.taxRate ?? DEFAULT_TAX_RATE;
    const deliveryHints = appConfig?.checkout?.deliveryHints || [];
    const convertAmountToCdf = React.useCallback(
        (amount: number, currency: any): number => {
            const safeAmount = Number.isFinite(amount) ? amount : 0;
            const code = resolveCurrencyCode(currency);
            if (code === 'USD') {
                return safeAmount * usdToCdfRate;
            }
            return safeAmount;
        },
        [resolveCurrencyCode, usdToCdfRate],
    );
    const estimateLineDeliveryCostCdf = React.useCallback(
        (product: Announcement | undefined, quantity: number): number => {
            if (product?.isDeliverable === false) return 0;
            const safeQuantity = Math.max(1, Number(quantity) || 1);
            const weightClasses = Array.isArray(product?.weightClass) ? product.weightClass : [];
            const perItemFee = weightClasses.reduce((maxFee, className) => {
                const nextFee = DELIVERY_FEE_BY_WEIGHT_CLASS_CDF[String(className)] || 0;
                return Math.max(maxFee, nextFee);
            }, 0);
            const effectivePerItemFee = perItemFee || DEFAULT_ITEM_DELIVERY_FEE_CDF;
            return effectivePerItemFee * safeQuantity;
        },
        [],
    );

    const containsUsdItem = React.useMemo(
        () =>
            cartItems.some((item) => {
                const product = (typeof item.productId === 'object' ? item.productId : undefined) as Announcement | undefined;
                return resolveCurrencyCode(product?.currency) === 'USD';
            }),
        [cartItems, resolveCurrencyCode],
    );
    const currencyNote = containsUsdItem
        ? `Les montants en USD sont convertis en CDF au taux 1 USD = ${Math.round(usdToCdfRate).toLocaleString('fr-FR')} CDF.`
        : '';
    const formatAmount = React.useCallback(
        (value: number) =>
            formatCurrencyAmount(value, 'CDF', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }),
        [],
    );

    const groupedSections = React.useMemo(() => {
        const groups = new Map<string, {
            sellerId: string;
            title: string;
            data: CartItemType[];
            subtotal: number;
            deliveryCost: number;
            totalQuantity: number;
            hasDeliverableProduct: boolean;
        }>();

        cartItems.forEach((item) => {
            const product = (typeof item.productId === 'object' ? item.productId : undefined) as Announcement | undefined;
            const seller: any = product?.user;
            const sellerId = typeof seller === 'string' ? seller : seller?._id || 'unknown';
            const sellerName =
                typeof seller === 'object' && seller?.firstName
                    ? seller.firstName
                    : 'Vendeur inconnu';
            const quantity = Math.max(1, Number(item.quantity) || 1);
            const unitPrice = Number(product?.price) || 0;
            const lineSubtotal = convertAmountToCdf(unitPrice * quantity, product?.currency);
            const lineDeliveryCost = estimateLineDeliveryCostCdf(product, quantity);

            if (!groups.has(sellerId)) {
                groups.set(sellerId, {
                    sellerId,
                    title: sellerName,
                    data: [],
                    subtotal: 0,
                    deliveryCost: 0,
                    totalQuantity: 0,
                    hasDeliverableProduct: false,
                });
            }

            const group = groups.get(sellerId);
            if (group) {
                group.data.push(item);
                group.subtotal += lineSubtotal;
                group.totalQuantity += quantity;
                group.deliveryCost += lineDeliveryCost;
                if (lineDeliveryCost > 0) {
                    group.hasDeliverableProduct = true;
                }
            }
        });

        return Array.from(groups.values()).map((group) => ({
            ...group,
            deliveryCost:
                group.hasDeliverableProduct
                    ? group.deliveryCost + SELLER_BASE_DELIVERY_FEE_CDF
                    : 0,
        }));
    }, [cartItems, convertAmountToCdf, estimateLineDeliveryCostCdf]);

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const deliveryCoords = cart?.deliveryLocation?.coordinates;
    const persistedDeliveryAddress = (cart?.deliveryAddress || '').trim();
    const normalizedDeliveryAddress = deliveryAddress.trim() || persistedDeliveryAddress;
    const deliveryLng = deliveryCoords?.[0];
    const deliveryLat = deliveryCoords?.[1];
    const deliveryCoordsKey =
        typeof deliveryLat === 'number' && typeof deliveryLng === 'number'
            ? `${deliveryLat.toFixed(6)},${deliveryLng.toFixed(6)}`
            : '';
    const hasDeliveryCoordinates = Boolean(deliveryCoordsKey);
    const subtotal = groupedSections.reduce((sum, section) => sum + section.subtotal, 0);
    const tax = subtotal * taxRate;
    const estimatedDeliveryCost = groupedSections.reduce((sum, section) => sum + section.deliveryCost, 0);
    const serverDeliveryCost = Number.isFinite(Number(cart?.deliveryCost)) ? Number(cart?.deliveryCost) : undefined;
    const deliveryCost = hasDeliveryCoordinates ? (serverDeliveryCost ?? estimatedDeliveryCost) : 0;
    const deliveryMode = cart?.deliveryMode ?? 'pending';
    const total = subtotal + tax + deliveryCost;
    const sellersWithDelivery = groupedSections.filter((section) => section.deliveryCost > 0).length;
    const deliveryExplanation = !normalizedDeliveryAddress
        ? 'Definis une adresse de livraison pour continuer.'
        : !hasDeliveryCoordinates
            ? 'Adresse enregistree sans carte. Le cout exact sera confirme apres validation.'
        : estimatedDeliveryCost <= 0
            ? 'Aucun article livrable dans ce panier.'
            : `Livraison calculee selon chaque produit et vendeur (${sellersWithDelivery} vendeur(s)).`;
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
    const checkoutModeLabel = hasDeliveryCoordinates
        ? deliveryModeLabel
        : deliveryInputMode === 'map'
            ? 'Adresse via carte'
            : deliveryInputMode === 'guided'
                ? 'Adresse guidee'
                : 'Adresse manuelle';

    React.useEffect(() => {
        if (!deliveryCoordsKey) {
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
    React.useEffect(() => {
        if (persistedDeliveryAddress) {
            setDeliveryAddress((prev) => prev || persistedDeliveryAddress);
        }
    }, [persistedDeliveryAddress]);

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            const draft = await localDrafts.getCartDeliveryDraft();
            if (cancelled) {
                return;
            }

            if (!persistedDeliveryAddress && draft?.deliveryAddress) {
                setDeliveryAddress((prev) => prev || draft.deliveryAddress);
            }

            if (draft?.deliveryInputMode) {
                setDeliveryInputMode(draft.deliveryInputMode);
            }

            if (persistedDeliveryAddress) {
                setDeliveryAddressFields(parseKinshasaAddress(persistedDeliveryAddress));
            } else if (draft?.deliveryAddressFields && hasKinshasaAddressValue(draft.deliveryAddressFields)) {
                setDeliveryAddressFields(draft.deliveryAddressFields);
            }

            setDeliveryDraftReady(true);
        })();

        return () => {
            cancelled = true;
            if (deliveryDraftTimerRef.current) {
                clearTimeout(deliveryDraftTimerRef.current);
            }
        };
    }, [hasDeliveryCoordinates, persistedDeliveryAddress]);

    React.useEffect(() => {
            if (!deliveryDraftReady) {
                return;
            }

        if (deliveryDraftTimerRef.current) {
            clearTimeout(deliveryDraftTimerRef.current);
        }

        deliveryDraftTimerRef.current = setTimeout(() => {
            if (!normalizedDeliveryAddress && !hasKinshasaAddressValue(deliveryAddressFields)) {
                void localDrafts.clearCartDeliveryDraft();
                return;
            }

            void localDrafts.saveCartDeliveryDraft({
                deliveryAddress: normalizedDeliveryAddress,
                deliveryAddressFields,
                deliveryInputMode: deliveryInputMode || undefined,
                savedAt: new Date().toISOString(),
            });
        }, 300);

        return () => {
            if (deliveryDraftTimerRef.current) {
                clearTimeout(deliveryDraftTimerRef.current);
            }
        };
    }, [deliveryAddressFields, deliveryDraftReady, deliveryInputMode, normalizedDeliveryAddress]);

    React.useEffect(() => {
        if (normalizedDeliveryAddress) {
            setDeliveryAddressFields(parseKinshasaAddress(normalizedDeliveryAddress));
        }
    }, [normalizedDeliveryAddress]);

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
            await localDrafts.clearCartDeliveryDraft();
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
                renderItem={({ item }) => {
                    const product = (typeof item.productId === 'object' ? item.productId : undefined) as Announcement | undefined;
                    const itemCurrency = resolveCurrency(product?.currency);
                    return (
                        <CartItem
                            item={item}
                            onIncrement={handleIncrement}
                            onDecrement={handleDecrement}
                            onRemove={handleRemove}
                            currencySymbol={itemCurrency}
                        />
                    );
                }}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sellerHeader}>
                        <View style={styles.sellerHeaderLeft}>
                            <View style={styles.sellerAvatar}>
                                <Text style={styles.sellerAvatarText}>
                                    {(section.title || 'V').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.sellerTitle}>{section.title}</Text>
                                <Text style={styles.sellerMeta}>{section.totalQuantity} article(s)</Text>
                            </View>
                        </View>
                        <View style={styles.sellerSubtotalBadge}>
                            <Text style={styles.sellerSubtotal}>
                                {formatAmount(section.subtotal)}
                            </Text>
                            <Text style={styles.sellerDeliveryFee}>
                                Livraison: {formatAmount(section.deliveryCost)}
                            </Text>
                        </View>
                    </View>
                )}
                renderSectionFooter={() => (
                    <View style={styles.sellerSummary}>
                        <View style={styles.sellerSummaryIcon}>
                            <Ionicons name="cube-outline" size={13} color={Colors.primary} />
                        </View>
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
                                    <Text style={styles.heroTotal}>{formatAmount(total)}</Text>
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
                                <View style={styles.deliveryTitleRow}>
                                    <View style={styles.deliveryPinIcon}>
                                        <Ionicons name="location" size={16} color={Colors.white} />
                                    </View>
                                    <Text style={styles.deliveryTitle}>Adresse de livraison</Text>
                                </View>
                            </View>
                            <Text style={styles.deliveryAddressText}>
                                {deliveryDisplayLabel || 'Aucune adresse selectionnee'}
                            </Text>
                            <View style={styles.deliveryInputSelector}>
                                <Text style={styles.deliverySelectorTitle}>Choisissez comment entrer votre adresse</Text>
                                <Text style={styles.deliverySelectorSubtitle}>
                                    L adresse guidee donne le plus de details au livreur. La carte sert surtout a placer le point exact.
                                </Text>
                                <View style={styles.deliveryInputChips}>
                                    {DELIVERY_INPUT_MODE_OPTIONS.map((option) => {
                                        const isActive = deliveryInputMode === option.id;
                                        return (
                                            <TouchableOpacity
                                                key={option.id}
                                                style={[
                                                    styles.deliveryInputChip,
                                                    isActive && styles.deliveryInputChipActive,
                                                ]}
                                                onPress={() => handleDeliveryInputModeChange(option.id)}
                                                activeOpacity={0.85}
                                            >
                                                <Text
                                                    style={[
                                                        styles.deliveryInputChipLabel,
                                                        isActive && styles.deliveryInputChipLabelActive,
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                                {option.badge ? (
                                                    <View
                                                        style={[
                                                            styles.deliveryInputChipBadge,
                                                            isActive && styles.deliveryInputChipBadgeActive,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.deliveryInputChipBadgeText,
                                                                isActive && styles.deliveryInputChipBadgeTextActive,
                                                            ]}
                                                        >
                                                            {option.badge}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                                <Text
                                                    style={[
                                                        styles.deliveryInputChipDescription,
                                                        isActive && styles.deliveryInputChipDescriptionActive,
                                                    ]}
                                                >
                                                    {option.description}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                            {!deliveryInputMode ? (
                                <View style={styles.deliveryChoiceNotice}>
                                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.deliveryChoiceNoticeText}>
                                        Choisissez d abord une methode pour ajouter ou modifier votre adresse de livraison.
                                    </Text>
                                </View>
                            ) : deliveryInputMode === 'guided' ? (
                                <KinshasaAddressForm
                                    fields={deliveryAddressFields}
                                    onChange={handleStructuredDeliveryAddressChange}
                                    helperText="Methode recommandee si vous voulez donner plus de details: commune, quartier, avenue et repere."
                                />
                            ) : (
                                <View style={styles.deliveryMapSection}>
                                    <TouchableOpacity
                                        style={styles.deliveryButton}
                                        onPress={() => setMapVisible(true)}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="map-outline" size={14} color={Colors.white} />
                                        <Text style={styles.deliveryButtonText}>
                                            {hasDeliveryCoordinates ? 'Mettre a jour sur carte' : 'Choisir sur carte'}
                                        </Text>
                                    </TouchableOpacity>
                                    <Text style={styles.deliveryHint}>
                                        Utilisez la carte si vous voulez surtout montrer le point exact de livraison.
                                    </Text>
                                </View>
                            )}
                            {hasDeliveryCoordinates && deliveryModeLabel !== 'En attente' ? (
                                <View style={styles.deliveryModeBadge}>
                                    <Ionicons name={deliveryMode === 'walking' ? 'walk-outline' : 'car-outline'} size={12} color={Colors.primary} />
                                    <Text style={styles.deliveryModeBadgeText}>{deliveryModeLabel}</Text>
                                </View>
                            ) : null}
                            <Text style={styles.deliveryHint}>
                                {hasDeliveryCoordinates
                                    ? 'Le cout est calcule automatiquement selon la distance et la classe de poids.'
                                    : 'La carte reste utile pour obtenir un cout de livraison plus precis.'}
                            </Text>
                            <Text style={styles.deliveryHintSecondary}>
                                {deliveryHints[0] || KINSHASA_ADDRESS_HELP_TEXT}
                            </Text>
                        </View>
                    </View>
                }
                ListFooterComponent={
                    <Card style={styles.summaryCard}>
                        <View style={styles.summaryTitleRow}>
                            <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                            <Text style={styles.summaryTitle}>Recapitulatif</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryLabelRow}>
                                <Ionicons name="cart-outline" size={14} color={Colors.gray400} />
                                <Text style={styles.summaryLabel}>Sous-total</Text>
                            </View>
                            <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryLabelRow}>
                                <Ionicons name="document-text-outline" size={14} color={Colors.gray400} />
                                <Text style={styles.summaryLabel}>TVA (1%)</Text>
                            </View>
                            <Text style={styles.summaryValue}>{formatAmount(tax)}</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryLabelRow}>
                                <Ionicons name="bicycle-outline" size={14} color={Colors.gray400} />
                                <Text style={styles.summaryLabel}>Livraison</Text>
                            </View>
                            <Text style={styles.summaryValue}>{formatAmount(deliveryCost)}</Text>
                        </View>

                        <Text style={styles.deliveryNote}>{deliveryExplanation}</Text>

                        {currencyNote ? (
                            <Text style={styles.currencyNote}>{currencyNote}</Text>
                        ) : null}

                        <View style={styles.divider} />

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>
                                {hasDeliveryCoordinates ? 'Total a payer' : 'Total provisoire'}
                            </Text>
                            <View style={styles.totalValueBadge}>
                                <Text style={styles.totalValue}>{formatAmount(total)}</Text>
                            </View>
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
                                <Text style={styles.checkoutModalValue}>{checkoutModeLabel}</Text>
                            </View>
                            {!hasDeliveryCoordinates ? (
                                <Text style={styles.checkoutManualNotice}>
                                    Le cout de livraison sera confirme apres contact avec le vendeur ou le support.
                                </Text>
                            ) : null}
                            <View style={styles.checkoutModalRow}>
                                <Text style={styles.checkoutModalTotalLabel}>
                                    {hasDeliveryCoordinates ? 'Total a payer' : 'Total provisoire'}
                                </Text>
                                <Text style={styles.checkoutModalTotalValue}>
                                    {formatAmount(total)}
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
        paddingBottom: 200,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        marginBottom: Spacing.lg,
        ...Shadows.xl,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    heroTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
        letterSpacing: 0.3,
    },
    heroBadge: {
        backgroundColor: Colors.white + '28',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        borderWidth: 1,
        borderColor: Colors.white + '40',
    },
    heroBadgeText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    heroBottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    heroLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'AA',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontWeight: Typography.fontWeight.semibold,
    },
    heroTotal: {
        fontSize: Typography.fontSize.huge,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    heroAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 2,
        ...Shadows.sm,
    },
    heroActionText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primaryDark,
        fontWeight: Typography.fontWeight.extrabold,
    },
    groupedNotice: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '15',
        ...Shadows.sm,
    },
    groupedNoticeTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    groupedNoticeText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        lineHeight: 18,
    },
    sanitizeNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary + '0D',
        borderWidth: 1,
        borderColor: Colors.primary + '22',
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
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        ...Shadows.md,
    },
    deliveryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    deliveryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    deliveryPinIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deliveryTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    deliveryInputSelector: {
        marginBottom: Spacing.md,
    },
    deliverySelectorTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.gray800,
        marginBottom: 4,
    },
    deliverySelectorSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        lineHeight: 18,
        marginBottom: Spacing.sm,
    },
    deliveryInputChips: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    deliveryInputChip: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        backgroundColor: Colors.gray50,
    },
    deliveryInputChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        ...Shadows.sm,
    },
    deliveryInputChipLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginBottom: 2,
    },
    deliveryInputChipLabelActive: {
        color: Colors.white,
    },
    deliveryInputChipBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primary + '10',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.xs + 2,
        paddingVertical: 3,
        marginBottom: 6,
    },
    deliveryInputChipBadgeActive: {
        backgroundColor: Colors.white + '24',
    },
    deliveryInputChipBadgeText: {
        fontSize: 10,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    deliveryInputChipBadgeTextActive: {
        color: Colors.white,
    },
    deliveryInputChipDescription: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        lineHeight: 16,
    },
    deliveryInputChipDescriptionActive: {
        color: Colors.white + 'DD',
    },
    deliveryMapSection: {
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    deliveryChoiceNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
        backgroundColor: Colors.primary + '0D',
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    deliveryChoiceNoticeText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        lineHeight: 18,
        fontWeight: Typography.fontWeight.semibold,
    },
    deliveryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
    },
    deliveryButtonText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    deliveryAddressText: {
        fontSize: Typography.fontSize.base,
        color: Colors.gray700,
        marginBottom: Spacing.xs,
        fontWeight: Typography.fontWeight.medium,
        lineHeight: 20,
    },
    deliveryModeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.primary + '0D',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        alignSelf: 'flex-start',
        marginBottom: Spacing.xs,
    },
    deliveryModeBadgeText: {
        fontSize: 10,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    deliveryHint: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        lineHeight: 16,
    },
    deliveryHintSecondary: {
        marginTop: 6,
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        lineHeight: 18,
        fontWeight: Typography.fontWeight.semibold,
    },
    sellerNote: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        flex: 1,
        lineHeight: 16,
    },
    currencyNote: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        marginTop: Spacing.xs,
    },
    sellerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        marginTop: Spacing.sm,
        backgroundColor: Colors.white,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        ...Shadows.sm,
    },
    sellerHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    sellerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sellerAvatarText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    sellerTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray800,
    },
    sellerMeta: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 1,
    },
    sellerSubtotalBadge: {
        backgroundColor: Colors.accent + '1A',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    sellerSubtotal: {
        fontSize: Typography.fontSize.sm,
        color: Colors.accentDark,
        fontWeight: Typography.fontWeight.extrabold,
    },
    sellerDeliveryFee: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        fontWeight: Typography.fontWeight.semibold,
    },
    sellerSummary: {
        backgroundColor: Colors.primary + '08',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        marginBottom: Spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    sellerSummaryIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
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
        lineHeight: Typography.fontSize.md * 1.6,
    },
    summaryCard: {
        marginTop: Spacing.sm,
        padding: Spacing.xxl,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        ...Shadows.lg,
    },
    summaryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    summaryTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    summaryLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    summaryLabel: {
        fontSize: Typography.fontSize.base,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.medium,
    },
    summaryValue: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray800,
    },
    deliveryNote: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        marginBottom: Spacing.md,
        marginTop: -Spacing.xs,
        lineHeight: 16,
    },
    divider: {
        height: 2,
        backgroundColor: Colors.primary + '12',
        marginVertical: Spacing.lg,
        borderRadius: 1,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    totalValueBadge: {
        backgroundColor: Colors.accent + '20',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    totalValue: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.accentDark,
    },
    checkoutButton: {
        width: '100%',
        borderRadius: BorderRadius.lg,
    },
    checkoutBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.white + 'F8',
        borderTopWidth: 1,
        borderTopColor: Colors.primary + '15',
        ...Shadows.xl,
    },
    checkoutBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
        minHeight: 92,
    },
    checkoutModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(3, 12, 30, 0.64)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    checkoutModalCard: {
        width: '100%',
        maxWidth: 520,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        overflow: 'hidden',
        ...Shadows.xl,
    },
    checkoutModalHeader: {
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.xl,
    },
    checkoutModalTitle: {
        fontSize: Typography.fontSize.xxl,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    checkoutModalSubtitle: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'BB',
    },
    checkoutModalBody: {
        padding: Spacing.xxl,
        gap: Spacing.md,
        backgroundColor: Colors.gray50,
    },
    checkoutModalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    checkoutModalLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        flex: 1,
        fontWeight: Typography.fontWeight.medium,
    },
    checkoutModalValue: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray800,
        fontWeight: Typography.fontWeight.bold,
        textAlign: 'right',
        flex: 1.4,
        lineHeight: 20,
    },
    checkoutManualNotice: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        backgroundColor: Colors.primary + '0D',
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        lineHeight: 18,
        fontWeight: Typography.fontWeight.medium,
    },
    checkoutModalTotalLabel: {
        fontSize: Typography.fontSize.lg,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
        flex: 1,
    },
    checkoutModalTotalValue: {
        fontSize: Typography.fontSize.xl,
        color: Colors.accentDark,
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'right',
        flex: 1.4,
    },
    checkoutModalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        paddingBottom: Spacing.xxl,
        paddingTop: Spacing.md,
    },
    checkoutModalCancelButton: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: Colors.gray300,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        backgroundColor: Colors.white,
    },
    checkoutModalCancelText: {
        fontSize: Typography.fontSize.base,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.bold,
    },
    checkoutModalConfirmButton: {
        flex: 1.2,
    },
});
