/**
 * Écran d'édition d'une annonce existante
 * Flow en plusieurs étapes avec catégorie, détails, caractéristiques et photos
 */

import { DynamicAttributeField } from '@/components/DynamicAttributeField';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetAnnouncementByIdQuery, useUpdateAnnouncementMutation } from '@/store/api/announcementsApi';
import { useGetCategoryAttributesQuery } from '@/store/api/categoriesApi';
import { convertImagesToDataUrls } from '@/utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_STEPS = [
    { id: 1, title: 'Catégorie', icon: 'grid-outline' as const },
    { id: 2, title: 'Détails', icon: 'document-text-outline' as const },
    { id: 3, title: 'Caractéristiques', icon: 'list-outline' as const },
    { id: 4, title: 'Photos', icon: 'images-outline' as const },
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
        quantity: '1',
    });
    const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [images, setImages] = useState<string[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [isConvertingImages, setIsConvertingImages] = useState(false);
    const formDataWithFilesRef = useRef<FormData>(new FormData());
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Queries
    const { data: categoryAttributes, isLoading: attributesLoading } = useGetCategoryAttributesQuery(
        announcement?.category?._id || announcement?.category || '',
        { skip: !announcement?.category }
    );

    // Filtrer les attributs qui entrent en conflit avec les champs de base
    const baseFormFields = ['name', 'description', 'price', 'quantity', 'currency'];
    const filteredAttributes = React.useMemo(() => {
        if (!categoryAttributes) return [];
        return categoryAttributes.filter(attr => !baseFormFields.includes(attr.name));
    }, [categoryAttributes]);

    // Calculer les étapes dynamiquement
    const STEPS = React.useMemo(() => {
        if (filteredAttributes.length > 0) {
            return BASE_STEPS;
        } else {
            return BASE_STEPS.filter(step => step.id !== 3).map((step, index) => ({
                ...step,
                id: index + 1,
            }));
        }
    }, [filteredAttributes.length]);

    // Check authentication
    useEffect(() => {
        if (!requireAuth('Vous devez être connecté pour modifier une annonce')) {
            router.back();
        }
    }, [requireAuth]);

    // Initialize form with announcement data
    useEffect(() => {
        if (announcement) {
            setFormData({
                name: announcement.name || '',
                description: announcement.description || '',
                price: announcement.price?.toString() || '',
                quantity: announcement.quantity?.toString() || '1',
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

    // Animation du progress
    const updateProgress = React.useCallback((step: number) => {
        const progress = ((step - 1) / (STEPS.length - 1)) * 100;
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [STEPS.length, progressAnim]);

    // Initialiser le progress
    useEffect(() => {
        updateProgress(currentStep);
    }, [currentStep, updateProgress]);

    // Gestion des images
    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 10 - existingImages.length - images.length + imagesToDelete.length,
        });

        if (!result.canceled && result.assets) {
            const imageUris = result.assets.map((asset) => asset.uri);
            console.log('Converting', imageUris.length, 'selected images to base64...');
            
            setIsConvertingImages(true);
            try {
                const base64Images = await convertImagesToDataUrls(imageUris);
                console.log('Images converted to base64 successfully');
                
                setImages((prev) => {
                    const newImages = [...prev, ...base64Images].slice(0, 10 - existingImages.length + imagesToDelete.length);
                    
                    base64Images.forEach((base64Image) => {
                        formDataWithFilesRef.current.append('files', base64Image);
                    });
                    
                    return newImages;
                });
            } catch (error) {
                console.error('Error converting images to base64:', error);
                Alert.alert('Erreur', 'Impossible de convertir les images');
            } finally {
                setIsConvertingImages(false);
            }
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour utiliser la caméra.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const imageUri = result.assets[0].uri;
            console.log('Converting captured photo to base64...');
            
            setIsConvertingImages(true);
            try {
                const base64Images = await convertImagesToDataUrls([imageUri]);
                console.log('Captured photo converted to base64 successfully');
                
                setImages((prev) => {
                    const newImages = [...prev, base64Images[0]].slice(0, 10 - existingImages.length + imagesToDelete.length);
                    
                    formDataWithFilesRef.current.append('files', base64Images[0]);
                    
                    return newImages;
                });
            } catch (error) {
                console.error('Error converting photo to base64:', error);
                Alert.alert('Erreur', 'Impossible de convertir la photo');
            } finally {
                setIsConvertingImages(false);
            }
        }
    };

    const removeNewImage = (index: number) => {
        setImages((prev) => {
            const newImages = prev.filter((_, i) => i !== index);
            
            // Reconstruire le FormData avec les images restantes
            formDataWithFilesRef.current = new FormData();
            newImages.forEach((base64Image) => {
                formDataWithFilesRef.current.append('files', base64Image);
            });
            
            return newImages;
        });
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

    // Validation
    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 2) {
            if (!formData.name?.trim()) {
                newErrors.name = 'Le nom est obligatoire';
            }
            if (!formData.price || parseFloat(formData.price) <= 0) {
                newErrors.price = 'Le prix doit être supérieur à 0';
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
                return false;
            }
        }

        setErrors({});
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            let nextStep = currentStep + 1;
            
            if (nextStep === 3 && filteredAttributes.length === 0) {
                nextStep = 4;
            }
            
            setCurrentStep(nextStep);
            updateProgress(nextStep);
        }
    };

    const handlePrevious = () => {
        let prevStep = currentStep - 1;
        
        if (prevStep === 3 && filteredAttributes.length === 0) {
            prevStep = 2;
        }
        
        setCurrentStep(prevStep);
        updateProgress(prevStep);
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        try {
            const formDataToSend = formDataWithFilesRef.current;
            
            formDataToSend.append('name', formData.name.trim());
            if (formData.description) {
                formDataToSend.append('description', formData.description.trim());
            }
            formDataToSend.append('price', parseFloat(formData.price).toString());
            formDataToSend.append('quantity', (formData.quantity ? parseInt(formData.quantity) : 1).toString());
            
            if (Object.keys(dynamicAttributes).length > 0) {
                formDataToSend.append('attributes', JSON.stringify(dynamicAttributes));
            }
            
            if (imagesToDelete.length > 0) {
                formDataToSend.append('imagesToDelete', JSON.stringify(imagesToDelete));
            }

            console.log('Updating announcement with FormData');

            await updateAnnouncement({
                id: id!,
                data: formDataToSend as any,
            }).unwrap();

            Alert.alert('Succès', 'Annonce mise à jour avec succès', [
                {
                    text: 'OK',
                    onPress: () => router.back(),
                },
            ]);
        } catch (error: any) {
            console.error('Error updating announcement:', error);
            Alert.alert(
                'Erreur',
                error?.data?.message || 'Impossible de mettre à jour l\'annonce'
            );
        }
    };

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
                    {currentStep === 1 && (
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
                    {currentStep === 2 && (
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
                        </View>
                    )}

                    {/* Step 3: Caractéristiques */}
                    {currentStep === 3 && filteredAttributes.length > 0 && (
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
                                        error={errors[attribute.name]}
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

                    {/* Step 4: Photos */}
                    {currentStep === 4 && (
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

                                {images.map((uri, index) => (
                                    <View key={`new-${index}`} style={styles.imageItem}>
                                        <Image source={{ uri }} style={styles.imagePreview} />
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
