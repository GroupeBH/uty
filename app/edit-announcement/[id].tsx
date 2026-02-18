/**
 * Écran d'édition d'une annonce existante
 * Flow en plusieurs étapes avec catégorie, détails, caractéristiques et photos
 */

import { DynamicAttributeField } from '@/components/DynamicAttributeField';
import { MapPickerModal } from '@/components/MapPickerModal';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { WEIGHT_CLASS_OPTIONS } from '@/constants/weightClass';
import { useAuth } from '@/hooks/useAuth';
import { useGetAnnouncementByIdQuery, useUpdateAnnouncementMutation } from '@/store/api/announcementsApi';
import { useGetCategoryAttributesQuery } from '@/store/api/categoriesApi';
import { useGetCurrenciesQuery } from '@/store/api/currenciesApi';
import { DEFAULT_CURRENCY_CODE, DEFAULT_CURRENCY_SYMBOL, resolveCurrencySelectionValue } from '@/utils/currency';
import { getImageMimeType } from '@/utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Switch,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_STEPS = [
    { key: 'category', title: 'Catégorie', icon: 'grid-outline' as const },
    { key: 'details', title: 'Détails', icon: 'document-text-outline' as const },
    { key: 'delivery', title: 'Livraison', icon: 'location-outline' as const },
    { key: 'attributes', title: 'Caractéristiques', icon: 'list-outline' as const },
    { key: 'photos', title: 'Photos', icon: 'images-outline' as const },
];

export default function EditAnnouncementScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { requireAuth } = useAuth();

    // Fetch announcement data
    const { data: announcement, isLoading: isLoadingAnnouncement } = useGetAnnouncementByIdQuery(id!);
    const [updateAnnouncement, { isLoading: isUpdating }] = useUpdateAnnouncementMutation();

    // État du flux
    const [currentStep, setCurrentStep] = useState(1);
    const progressAnim = useRef(new Animated.Value(0)).current;

    // État du formulaire
    const [formData, setFormData] = useState<any>({
        name: '',
        description: '',
        price: '',
        currency: DEFAULT_CURRENCY_CODE,
        quantity: '1',
        isDeliverable: false,
        weightClass: [] as string[],
        pickupAddress: '',
        pickupLatitude: '',
        pickupLongitude: '',
    });
    const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [images, setImages] = useState<Array<{ uri: string; name: string; type: string }>>([]);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [isConvertingImages, setIsConvertingImages] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [mapVisible, setMapVisible] = useState(false);

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

    // Queries
    const { data: currencies = [] } = useGetCurrenciesQuery();
    const { data: categoryAttributes, isLoading: attributesLoading } = useGetCategoryAttributesQuery(
        announcement?.category?._id || announcement?.category || '',
        { skip: !announcement?.category }
    );
    const activeCurrencies = React.useMemo(
        () => currencies.filter((currency) => currency.isActive !== false),
        [currencies],
    );
    const currencyOptions = React.useMemo(
        () =>
            activeCurrencies.length > 0
                ? activeCurrencies
                : [
                      {
                          _id: DEFAULT_CURRENCY_CODE,
                          code: DEFAULT_CURRENCY_CODE,
                          symbol: DEFAULT_CURRENCY_SYMBOL,
                      },
                  ],
        [activeCurrencies],
    );

    // Filtrer les attributs qui entrent en conflit avec les champs de base
    const baseFormFields = [
        'name',
        'description',
        'price',
        'quantity',
        'currency',
        'isDeliverable',
        'pickupLocation',
        'weightClass',
    ];
    const filteredAttributes = React.useMemo(() => {
        if (!categoryAttributes) return [];
        return categoryAttributes.filter(attr => !baseFormFields.includes(attr.name));
    }, [categoryAttributes]);

    // Calculer les étapes dynamiquement
    const STEPS = React.useMemo(() => {
        const steps = filteredAttributes.length > 0
            ? BASE_STEPS
            : BASE_STEPS.filter(step => step.key !== 'attributes');

        return steps.map((step, index) => ({
            ...step,
            id: index + 1,
        }));
    }, [filteredAttributes.length]);

    const getStepId = React.useCallback(
        (key: string) => STEPS.find((step) => step.key === key)?.id ?? -1,
        [STEPS]
    );

    // Check authentication
    useEffect(() => {
        if (!requireAuth('Vous devez être connecté pour modifier une annonce')) {
            router.back();
        }
    }, [requireAuth]);

    // Initialize form with announcement data
    useEffect(() => {
        if (announcement) {
            const pickupLocation: any = announcement.pickupLocation;
            const pickupCoords = Array.isArray(pickupLocation?.coordinates)
                ? pickupLocation.coordinates
                : null;
            const pickupLatitude =
                pickupCoords && pickupCoords.length === 2 ? String(pickupCoords[1]) : '';
            const pickupLongitude =
                pickupCoords && pickupCoords.length === 2 ? String(pickupCoords[0]) : '';
            const pickupAddress =
                pickupLocation?.address || announcement.address?.[0] || '';
            const normalizedWeightClass = Array.isArray(announcement.weightClass)
                ? announcement.weightClass
                : announcement.weightClass
                  ? [announcement.weightClass]
                  : [];

            setFormData({
                name: announcement.name || '',
                description: announcement.description || '',
                price: announcement.price?.toString() || '',
                currency:
                    (typeof announcement.currency === 'object'
                        ? (announcement.currency as any)?._id ||
                          (announcement.currency as any)?.code
                        : announcement.currency) || DEFAULT_CURRENCY_CODE,
                quantity: announcement.quantity?.toString() || '1',
                isDeliverable: !!announcement.isDeliverable,
                weightClass: normalizedWeightClass,
                pickupAddress,
                pickupLatitude,
                pickupLongitude,
            });
            setExistingImages(announcement.images || []);
            
            // Convert Map to object for dynamic attributes
            if (announcement.attributes) {
                const attrs: Record<string, any> = {};
                if (announcement.attributes instanceof Map) {
                    announcement.attributes.forEach((value, key) => {
                        attrs[key] = value;
                    });
                } else if (typeof announcement.attributes === 'object') {
                    Object.assign(attrs, announcement.attributes);
                }
                setDynamicAttributes(attrs);
            }
        }
    }, [announcement]);

    useEffect(() => {
        if (activeCurrencies.length === 0) {
            return;
        }

        setFormData((prev: any) => {
            const normalizedCurrency = resolveCurrencySelectionValue(prev.currency, activeCurrencies);
            if (prev.currency === normalizedCurrency) {
                return prev;
            }

            return {
                ...prev,
                currency: normalizedCurrency,
            };
        });
    }, [activeCurrencies]);

    // Animation du progress
    const updateProgress = React.useCallback((step: number) => {
        const progress = STEPS.length <= 1 ? 100 : ((step - 1) / (STEPS.length - 1)) * 100;
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [STEPS.length, progressAnim]);

    React.useEffect(() => {
        if (currentStep > STEPS.length) {
            setCurrentStep(STEPS.length);
        }
    }, [currentStep, STEPS.length]);

    // Initialiser le progress
    useEffect(() => {
        updateProgress(currentStep);
    }, [currentStep, updateProgress]);

    // Gestion des images
    const buildImageFile = (uri: string, name?: string) => {
        const mimeType = getImageMimeType(uri);
        const extension = mimeType.split('/')[1] || 'jpg';
        const safeName = name || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
        return { uri, name: safeName, type: mimeType };
    };

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert({ title: 'Permission refusee', message: 'Nous avons besoin de la permission pour acceder a vos photos.', variant: 'error' });
            return;
        }

        const selectionLimit = Math.max(0, 10 - (existingImages.length + images.length));
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit,
        });

        if (!result.canceled && result.assets) {
            setIsConvertingImages(true);
            try {
                const newImages = result.assets.map((asset: any) =>
                    buildImageFile(asset.uri, asset.fileName)
                );
                setImages((prev) => {
                    const remainingSlots = 10 - existingImages.length;
                    return [...prev, ...newImages].slice(0, remainingSlots);
                });
            } catch (error) {
                console.error('Error preparing selected images:', error);
                showAlert({ title: 'Erreur', message: 'Impossible de preparer les images', variant: 'error' });
            } finally {
                setIsConvertingImages(false);
            }
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert({ title: 'Permission refusee', message: 'Nous avons besoin de la permission pour utiliser la camera.', variant: 'error' });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result?.assets[0];
            setIsConvertingImages(true);
            try {
                const newImage = buildImageFile(asset.uri, asset.fileName);
                setImages((prev) => {
                    const remainingSlots = 10 - existingImages.length;
                    return [...prev, newImage].slice(0, remainingSlots);
                });
            } catch (error) {
                console.error('Error preparing captured photo:', error);
                showAlert({ title: 'Erreur', message: 'Impossible de preparer la photo', variant: 'error' });
            } finally {
                setIsConvertingImages(false);
            }
        }
    };

    const removeNewImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (imageUrl: string) => {
        setExistingImages(existingImages.filter((img) => img !== imageUrl));
        setImagesToDelete([...imagesToDelete, imageUrl]);
    };

    const handleDynamicAttributeChange = (name: string, value: any) => {
        setDynamicAttributes((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const parseCoordinate = (value: string) => {
        const normalized = (value || '').toString().replace(',', '.').trim();
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
    };

    const handleMapConfirm = (location: { latitude: number; longitude: number; address?: string }) => {
        setFormData((prev: any) => ({
            ...prev,
            pickupLatitude: String(location.latitude),
            pickupLongitude: String(location.longitude),
            pickupAddress: location.address || prev.pickupAddress,
        }));
        if (location.address && errors.pickupAddress) {
            setErrors((prev) => ({ ...prev, pickupAddress: '' }));
        }
        if (errors.pickupLocation) {
            setErrors((prev) => ({ ...prev, pickupLocation: '' }));
        }
    };

    // Validation
    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        const detailsStepId = getStepId('details');
        const deliveryStepId = getStepId('delivery');
        const attributesStepId = getStepId('attributes');
        const photosStepId = getStepId('photos');

        if (step === detailsStepId) {
            if (!formData.name?.trim()) {
                newErrors.name = 'Le nom est obligatoire';
            }
            if (!formData.price || parseFloat(formData.price) <= 0) {
                newErrors.price = 'Le prix doit être supérieur à 0';
            }
            if (!formData.currency) {
                newErrors.currency = 'La devise est obligatoire';
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                showAlert({ title: 'Erreur', message: 'Veuillez remplir tous les champs obligatoires', variant: 'error' });
                return false;
            }
        }

        if (step === deliveryStepId) {
            if (formData.isDeliverable && !formData.pickupAddress?.trim()) {
                newErrors.pickupAddress = "L'adresse de récupération est obligatoire";
            }
            if (formData.isDeliverable && (!formData.weightClass || formData.weightClass.length === 0)) {
                newErrors.weightClass = 'La classe de poids est obligatoire';
            }
            if (formData.isDeliverable) {
                const latitude = parseCoordinate(formData.pickupLatitude);
                const longitude = parseCoordinate(formData.pickupLongitude);
                if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                    newErrors.pickupLocation = 'Veuillez sélectionner un point sur la carte';
                }
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                showAlert({ title: 'Erreur', message: 'Veuillez remplir tous les champs obligatoires', variant: 'error' });
                return false;
            }
        }

        if (step === attributesStepId && filteredAttributes.length > 0) {
            for (const attr of filteredAttributes) {
                if (attr.required && !dynamicAttributes[attr.name]) {
                    newErrors[attr.name] = `${attr.label || attr.name} est obligatoire`;
                }
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                showAlert({ title: 'Erreur', message: 'Veuillez remplir tous les champs obligatoires', variant: 'error' });
                return false;
            }
        }

        if (step === photosStepId) {
            const totalImages = existingImages.length + images.length;
            if (totalImages === 0) {
                showAlert({ title: 'Erreur', message: 'Veuillez ajouter au moins une photo', variant: 'error' });
                return false;
            }
        }

        setErrors({});
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            const nextStep = Math.min(currentStep + 1, STEPS.length);
            setCurrentStep(nextStep);
            updateProgress(nextStep);
        }
    };

    const handlePrevious = () => {
        const prevStep = Math.max(currentStep - 1, 1);
        setCurrentStep(prevStep);
        updateProgress(prevStep);
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        try {
            const formDataToSend = new FormData();

            images.forEach((image) => {
                formDataToSend.append('files', {
                    uri: image.uri,
                    name: image.name,
                    type: image.type,
                } as any);
            });

            formDataToSend.append('name', formData.name.trim());
            if (formData.description) {
                formDataToSend.append('description', formData.description.trim());
            }
            formDataToSend.append('price', parseFloat(formData.price).toString());
            formDataToSend.append(
                'currency',
                resolveCurrencySelectionValue(formData.currency, activeCurrencies),
            );
            formDataToSend.append('quantity', (formData.quantity ? parseInt(formData.quantity) : 1).toString());

            formDataToSend.append('isDeliverable', String(!!formData.isDeliverable));
            if (formData.isDeliverable) {
                if (Array.isArray(formData.weightClass) && formData.weightClass.length > 0) {
                    formDataToSend.append('weightClass', JSON.stringify(formData.weightClass));
                }
                const latitude = parseCoordinate(formData.pickupLatitude);
                const longitude = parseCoordinate(formData.pickupLongitude);
                if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                    showAlert({
                        title: 'Erreur',
                        message: 'Veuillez sélectionner un point de récupération sur la carte',
                        variant: 'error',
                    });
                    return;
                }
                const pickupLocation = {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                    address: formData.pickupAddress?.trim(),
                };
                formDataToSend.append('pickupLocation', JSON.stringify(pickupLocation));
            } else {
                formDataToSend.append('pickupLocation', 'null');
            }
            formDataToSend.append('attributes', JSON.stringify(dynamicAttributes || {}));
            
            if (imagesToDelete.length > 0) {
                formDataToSend.append('imagesToDelete', JSON.stringify(imagesToDelete));
            }

            console.log('Updating announcement with FormData');

            await updateAnnouncement({
                id: id!,
                data: formDataToSend as any,
            }).unwrap();

            showAlert({
                title: 'Succes',
                message: 'Annonce mise a jour avec succes',
                variant: 'success',
                confirmText: 'OK',
                onConfirm: () => router.back(),
            });
        } catch (error: any) {
            console.error('Error updating announcement:', error);
            showAlert({ title: 'Erreur', message: error?.data?.message || "Impossible de mettre a jour l'annonce", variant: 'error' });
        }
    };

    const alertBadgeText =
        alertState.variant === 'success'
            ? 'Mission reussie'
            : alertState.variant === 'error'
              ? 'Petite correction'
              : 'Petit conseil';
    const alertPointsText =
        alertState.variant === 'success' ? '+15 XP' : 'Astuce';
    const alertProgress =
        alertState.variant === 'success'
            ? 0.78
            : alertState.variant === 'error'
              ? 0.35
              : 0.55;
    const initialLatitude = parseCoordinate(formData.pickupLatitude);
    const initialLongitude = parseCoordinate(formData.pickupLongitude);
    const initialMapLocation =
        typeof initialLatitude === 'number' && typeof initialLongitude === 'number'
            ? {
                  latitude: initialLatitude,
                  longitude: initialLongitude,
                  address: formData.pickupAddress,
              }
            : undefined;

    if (isLoadingAnnouncement) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    if (!announcement) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
                <Text style={styles.errorText}>Annonce introuvable</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const totalImages = existingImages.length + images.length;
    const canAddMore = totalImages < 10;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Modifier l'annonce</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>
                <View style={styles.stepsIndicator}>
                    {STEPS.map((step) => (
                        <View key={step.id} style={styles.stepIndicator}>
                            <View
                                style={[
                                    styles.stepIcon,
                                    currentStep >= step.id && styles.stepIconActive,
                                ]}
                            >
                                <Ionicons
                                    name={step.icon}
                                    size={20}
                                    color={currentStep >= step.id ? Colors.white : Colors.gray400}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.stepText,
                                    currentStep >= step.id && styles.stepTextActive,
                                ]}
                            >
                                {step.title}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Step 1: Catégorie */}
                    {currentStep === getStepId('category') && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>Catégorie</Text>
                            <Text style={styles.stepSubtitle}>
                                La catégorie de votre annonce
                            </Text>

                            {announcement.category && (
                                <View style={styles.categoryCard}>
                                    <LinearGradient
                                        colors={Gradients.primary}
                                        style={styles.categoryGradient}
                                    >
                                        <Ionicons
                                            name={announcement.category.icon || 'cube-outline'}
                                            size={48}
                                            color={Colors.white}
                                        />
                                    </LinearGradient>
                                    <View style={styles.categoryInfo}>
                                        <Text style={styles.categoryName}>
                                            {announcement.category.name}
                                        </Text>
                                        {announcement.category.description && (
                                            <Text style={styles.categoryDescription}>
                                                {announcement.category.description}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            <Text style={styles.infoText}>
                                La catégorie ne peut pas être modifiée après la publication.
                            </Text>
                        </View>
                    )}

                    {/* Step 2: Détails */}
                    {currentStep === getStepId('details') && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>Détails de l'annonce</Text>
                            <Text style={styles.stepSubtitle}>
                                Remplissez les informations de base
                            </Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>
                                    Nom <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    style={[styles.input, errors.name && styles.inputError]}
                                    placeholder="Ex: iPhone 13 Pro"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    placeholderTextColor={Colors.gray400}
                                />
                                {errors.name && (
                                    <Text style={styles.errorText}>{errors.name}</Text>
                                )}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Décrivez votre produit..."
                                    value={formData.description}
                                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    placeholderTextColor={Colors.gray400}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputContainer, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>
                                        Prix <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[styles.input, errors.price && styles.inputError]}
                                        placeholder="0"
                                        value={formData.price}
                                        onChangeText={(text) => setFormData({ ...formData, price: text })}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.gray400}
                                    />
                                    {errors.price && (
                                        <Text style={styles.errorText}>{errors.price}</Text>
                                    )}
                                </View>
                                <View style={[styles.inputContainer, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Quantité</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="1"
                                        value={formData.quantity}
                                        onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.gray400}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>
                                    Devise <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={styles.weightChips}>
                                    {currencyOptions.map((currency) => {
                                        const optionValue = currency._id || currency.code;
                                        const isActive =
                                            formData.currency === optionValue ||
                                            formData.currency === currency.code;

                                        return (
                                            <TouchableOpacity
                                                key={optionValue}
                                                style={[
                                                    styles.weightChip,
                                                    isActive && styles.weightChipActive,
                                                ]}
                                                onPress={() =>
                                                    setFormData({ ...formData, currency: optionValue })
                                                }
                                                activeOpacity={0.8}
                                            >
                                                <Text
                                                    style={[
                                                        styles.weightChipText,
                                                        isActive && styles.weightChipTextActive,
                                                    ]}
                                                >
                                                    {currency.code}
                                                    {currency.symbol ? ` (${currency.symbol})` : ''}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {errors.currency && (
                                    <Text style={styles.errorText}>{errors.currency}</Text>
                                )}
                            </View>

                        </View>
                    )}

                    {/* Step 3: Livraison */}
                    {currentStep === getStepId('delivery') && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>Livraison</Text>
                            <Text style={styles.stepSubtitle}>
                                Précisez si l'annonce est livrable et le point de récupération
                            </Text>

                            <View style={styles.deliveryCard}>
                                <View style={styles.deliveryHeader}>
                                    <View style={styles.deliveryHeaderText}>
                                        <Text style={styles.deliveryTitle}>Livraison</Text>
                                        <Text style={styles.deliverySubtitle}>
                                            Indiquez si cette annonce est livrable
                                        </Text>
                                    </View>
                                    <Switch
                                        value={!!formData.isDeliverable}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, isDeliverable: value });
                                            if (!value && errors.pickupAddress) {
                                                setErrors((prev) => ({ ...prev, pickupAddress: '' }));
                                            }
                                            if (!value && errors.weightClass) {
                                                setErrors((prev) => ({ ...prev, weightClass: '' }));
                                            }
                                            if (!value && errors.pickupLocation) {
                                                setErrors((prev) => ({ ...prev, pickupLocation: '' }));
                                            }
                                        }}
                                        trackColor={{
                                            false: Colors.gray300,
                                            true: Colors.primary + '80',
                                        }}
                                        thumbColor={formData.isDeliverable ? Colors.primary : Colors.gray400}
                                    />
                                </View>

                                {formData.isDeliverable && (
                                    <>
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>
                                                Classe de poids <Text style={styles.required}>*</Text>
                                            </Text>
                                            <View style={styles.weightChips}>
                                                {WEIGHT_CLASS_OPTIONS.map((option) => {
                                                    const selectedClasses = Array.isArray(formData.weightClass)
                                                        ? formData.weightClass
                                                        : [];
                                                    const isActive = selectedClasses.includes(option.value);
                                                    return (
                                                        <TouchableOpacity
                                                            key={option.value}
                                                            style={[
                                                                styles.weightChip,
                                                                isActive && styles.weightChipActive,
                                                            ]}
                                                            onPress={() => {
                                                                const next = isActive
                                                                    ? selectedClasses.filter((value: string) => value !== option.value)
                                                                    : [...selectedClasses, option.value];
                                                                setFormData({ ...formData, weightClass: next });
                                                            }}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.weightChipText,
                                                                    isActive && styles.weightChipTextActive,
                                                                ]}
                                                            >
                                                                {option.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                            {errors.weightClass && (
                                                <Text style={styles.errorText}>{errors.weightClass}</Text>
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            style={styles.mapSelectButton}
                                            onPress={() => setMapVisible(true)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient colors={Gradients.primary} style={styles.mapSelectGradient}>
                                                <Ionicons name="map-outline" size={18} color={Colors.white} />
                                                <Text style={styles.mapSelectText}>Choisir sur la carte</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                        {errors.pickupLocation && (
                                            <Text style={styles.errorText}>{errors.pickupLocation}</Text>
                                        )}

                                        <View style={styles.inputContainer}>
                                            <Text style={styles.inputLabel}>
                                                Adresse de récupération <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TextInput
                                                style={[styles.input, errors.pickupAddress && styles.inputError]}
                                                placeholder="Ex: 12 rue des Fleurs, Abidjan"
                                                value={formData.pickupAddress}
                                                onChangeText={(text) =>
                                                    setFormData({ ...formData, pickupAddress: text })
                                                }
                                                placeholderTextColor={Colors.gray400}
                                            />
                                            {errors.pickupAddress && (
                                                <Text style={styles.errorText}>{errors.pickupAddress}</Text>
                                            )}
                                        </View>

                                        <View style={styles.row}>
                                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                                <Text style={styles.inputLabel}>Latitude (optionnel)</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="5.3166"
                                                    value={formData.pickupLatitude}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, pickupLatitude: text })
                                                    }
                                                    keyboardType="decimal-pad"
                                                    placeholderTextColor={Colors.gray400}
                                                />
                                            </View>
                                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                                <Text style={styles.inputLabel}>Longitude (optionnel)</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="-4.0333"
                                                    value={formData.pickupLongitude}
                                                    onChangeText={(text) =>
                                                        setFormData({ ...formData, pickupLongitude: text })
                                                    }
                                                    keyboardType="decimal-pad"
                                                    placeholderTextColor={Colors.gray400}
                                                />
                                            </View>
                                        </View>

                                        <Text style={styles.deliveryHint}>
                                            Cette adresse servira de point de récupération pour le livreur.
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    )}
                    {/* Step 4: Caractéristiques */}
                    {currentStep === getStepId('attributes') && filteredAttributes.length > 0 && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>Caractéristiques</Text>
                            <Text style={styles.stepSubtitle}>
                                Ajoutez les détails spécifiques à la catégorie
                            </Text>

                            {attributesLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                </View>
                            ) : (
                                filteredAttributes.map((attribute) => (
                                    <DynamicAttributeField
                                        key={attribute._id || attribute.name}
                                        attribute={attribute}
                                        value={dynamicAttributes[attribute.name]}
                                        onChange={(value) => handleDynamicAttributeChange(attribute.name, value)}
                                        // error={errors[attribute.name]}
                                    />
                                ))
                            )}

                            {filteredAttributes.length === 0 && (
                                <View style={styles.noAttributesContainer}>
                                    <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
                                    <Text style={styles.noAttributesText}>
                                        Aucune caractéristique supplémentaire requise
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 5: Photos */}
                    {currentStep === getStepId('photos') && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>Photos</Text>
                            <Text style={styles.stepSubtitle}>
                                Ajoutez jusqu'à 10 photos de qualité ({totalImages}/10)
                            </Text>

                            <View style={styles.imagesGrid}>
                                {existingImages.map((imageUrl, index) => (
                                    <View key={`existing-${index}`} style={styles.imageItem}>
                                        <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeExistingImage(imageUrl)}
                                        >
                                            <Ionicons name="close-circle" size={28} color={Colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {images.map((image, index) => (
                                    <View key={`new-${index}`} style={styles.imageItem}>
                                        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeNewImage(index)}
                                        >
                                            <Ionicons name="close-circle" size={28} color={Colors.error} />
                                        </TouchableOpacity>
                                        <View style={styles.newBadge}>
                                            <Text style={styles.newBadgeText}>NEW</Text>
                                        </View>
                                    </View>
                                ))}

                                {isConvertingImages && (
                                    <View style={styles.imageLoadingItem}>
                                        <ActivityIndicator size="large" color={Colors.primary} />
                                        <Text style={styles.loadingText}>Conversion...</Text>
                                    </View>
                                )}

                                {canAddMore && !isConvertingImages && (
                                    <>
                                        <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                                            <LinearGradient
                                                colors={Gradients.cool}
                                                style={styles.addImageGradient}
                                            >
                                                <Ionicons name="images" size={32} color={Colors.white} />
                                                <Text style={styles.addImageText}>Galerie</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.addImageButton} onPress={takePhoto}>
                                            <LinearGradient
                                                colors={Gradients.warm}
                                                style={styles.addImageGradient}
                                            >
                                                <Ionicons name="camera" size={32} color={Colors.white} />
                                                <Text style={styles.addImageText}>Caméra</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>

                            {totalImages === 0 && (
                                <View style={styles.emptyImagesContainer}>
                                    <Ionicons name="image-outline" size={64} color={Colors.gray300} />
                                    <Text style={styles.emptyText}>Aucune photo ajoutée</Text>
                                    <Text style={styles.emptySubtext}>
                                        Ajoutez des photos pour rendre votre annonce plus attractive
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <MapPickerModal
                visible={mapVisible}
                initialLocation={initialMapLocation}
                onClose={() => setMapVisible(false)}
                onConfirm={handleMapConfirm}
            />

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

            {/* Navigation Buttons */}
            <View style={styles.navigationContainer}>
                {currentStep > 1 && (
                    <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
                        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                        <Text style={styles.navButtonText}>Précédent</Text>
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                {currentStep < STEPS.length ? (
                    <TouchableOpacity style={styles.navButtonPrimary} onPress={handleNext}>
                        <Text style={styles.navButtonPrimaryText}>Suivant</Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={isUpdating}
                    >
                        <LinearGradient colors={Gradients.primary} style={styles.submitGradient}>
                            {isUpdating ? (
                                <ActivityIndicator size="small" color={Colors.white} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={24} color={Colors.white} />
                                    <Text style={styles.submitText}>Enregistrer</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
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
        backgroundColor: Colors.backgroundSecondary,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    errorText: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.error,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
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
    progressContainer: {
        backgroundColor: Colors.white,
        paddingVertical: Spacing.lg,
        ...Shadows.sm,
    },
    progressTrack: {
        height: 4,
        backgroundColor: Colors.gray100,
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    stepsIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
    },
    stepIndicator: {
        alignItems: 'center',
        flex: 1,
    },
    stepIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    stepIconActive: {
        backgroundColor: Colors.primary,
    },
    stepText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        fontWeight: Typography.fontWeight.semibold,
    },
    stepTextActive: {
        color: Colors.primary,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    stepContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        ...Shadows.md,
    },
    stepTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    stepSubtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        marginBottom: Spacing.xl,
    },
    categoryCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    categoryGradient: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    categoryInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    categoryName: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    categoryDescription: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    infoText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.md,
    },
    inputContainer: {
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    required: {
        color: Colors.error,
    },
    input: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    inputError: {
        borderColor: Colors.error,
    },
    errorText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.error,
        marginTop: Spacing.xs,
    },
    textArea: {
        minHeight: 100,
        paddingTop: Spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    deliveryCard: {
        marginTop: Spacing.lg,
        padding: Spacing.lg,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    deliveryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    deliveryHeaderText: {
        flex: 1,
        marginRight: Spacing.md,
    },
    deliveryTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    deliverySubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    deliveryHint: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray400,
        marginTop: Spacing.xs,
    },
    mapSelectButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    mapSelectGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    mapSelectText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    weightChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    weightChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    weightChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    weightChipText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    weightChipTextActive: {
        color: Colors.white,
    },
    noAttributesContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
    },
    noAttributesText: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        marginTop: Spacing.lg,
        textAlign: 'center',
    },
    imagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    imageItem: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    imageLoadingItem: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
    },
    removeImageButton: {
        position: 'absolute',
        top: Spacing.xs,
        right: Spacing.xs,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.full,
        ...Shadows.md,
    },
    newBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: Colors.accent,
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    newBadgeText: {
        fontSize: 8,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    addImageButton: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.md,
    },
    addImageGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.white,
        marginTop: Spacing.xs,
    },
    emptyImagesContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
    },
    emptyText: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginTop: Spacing.lg,
    },
    emptySubtext: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    navigationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        ...Shadows.lg,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary,
        gap: Spacing.sm,
    },
    navButtonText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.primary,
    },
    navButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary,
        gap: Spacing.sm,
    },
    navButtonPrimaryText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    submitButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    submitText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
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
    backButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.lg,
    },
    backButtonText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.white,
    },
});
