/**
 * Écran de Publication d'Annonce - Version Améliorée
 * Flow complet avec sélection de catégorie, détails et images
 */

import { DynamicAttributeField } from '@/components/DynamicAttributeField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useCreateAnnouncementMutation } from '@/store/api/announcementsApi';
import { useGetCategoriesByParentQuery, useGetCategoryAttributesQuery } from '@/store/api/categoriesApi';
import { Category } from '@/types/category';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
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
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_STEPS = [
    { id: 1, title: 'Catégorie', icon: 'grid-outline' as const },
    { id: 2, title: 'Détails', icon: 'document-text-outline' as const },
    { id: 3, title: 'Caractéristiques', icon: 'list-outline' as const },
    { id: 4, title: 'Photos', icon: 'images-outline' as const },
];

export default function PublishScreen() {
    const router = useRouter();
    const [createAnnouncement, { isLoading: isPublishing }] = useCreateAnnouncementMutation();

    // État du flux
    const [currentStep, setCurrentStep] = useState(1);
    const progressAnim = useRef(new Animated.Value(0)).current;

    // État des catégories
    const [categoryPath, setCategoryPath] = useState<Category[]>([]);
    const [selectedLeafCategory, setSelectedLeafCategory] = useState<Category | null>(null);

    // État du formulaire
    const [formData, setFormData] = useState<any>({
        name: '',
        description: '',
        price: '',
        quantity: '1',
    });
    const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});
    const [images, setImages] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Queries
    const currentParentId = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1]._id : null;
    const { data: currentLevelCategories, isLoading: categoriesLoading } = useGetCategoriesByParentQuery(currentParentId);
    const { data: categoryAttributes, isLoading: attributesLoading } = useGetCategoryAttributesQuery(
        selectedLeafCategory?._id || '',
        { skip: !selectedLeafCategory }
    );

    // Filtrer les attributs qui entrent en conflit avec les champs de base
    const baseFormFields = ['name', 'description', 'price', 'quantity', 'currency'];
    const filteredAttributes = React.useMemo(() => {
        if (!categoryAttributes) return [];
        return categoryAttributes.filter(attr => !baseFormFields.includes(attr.name));
    }, [categoryAttributes]);

    // Calculer les étapes dynamiquement en fonction des attributs
    const STEPS = React.useMemo(() => {
        if (filteredAttributes.length > 0) {
            return BASE_STEPS; // Toutes les étapes incluant Caractéristiques
        } else {
            // Skip l'étape Caractéristiques
            return BASE_STEPS.filter(step => step.id !== 3).map((step, index) => ({
                ...step,
                id: index + 1, // Réindexer les étapes
            }));
        }
    }, [filteredAttributes.length]);

    // Debug: Log category attributes when they change
    React.useEffect(() => {
        if (categoryAttributes) {
            console.log('📋 Category Attributes:', categoryAttributes);
            console.log('📋 Number of attributes:', categoryAttributes.length);
            
            const filtered = categoryAttributes.filter(attr => baseFormFields.includes(attr.name));
            if (filtered.length > 0) {
                console.log('⚠️ Attributs filtrés (conflit avec champs de base):', filtered.map(a => a.name));
            }
            
            console.log('✅ Filtered Attributes (à afficher):', filteredAttributes);
            console.log('✅ Number of filtered attributes:', filteredAttributes.length);
        }
    }, [categoryAttributes, filteredAttributes]);

    // Ajuster currentStep si on est sur l'étape 3 mais qu'il n'y a plus d'attributs
    React.useEffect(() => {
        if (currentStep === 3 && filteredAttributes.length === 0) {
            setCurrentStep(2); // Retour à l'étape détails
        }
    }, [currentStep, filteredAttributes.length]);

    // Animation du progress
    const updateProgress = React.useCallback((step: number) => {
        const progress = ((step - 1) / (STEPS.length - 1)) * 100;
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [STEPS.length, progressAnim]);

    // Gestion des catégories
    const handleCategorySelect = (category: Category) => {
        if (category.isLeaf) {
            setSelectedLeafCategory(category);
            setCategoryPath([...categoryPath, category]);
        } else {
            setCategoryPath([...categoryPath, category]);
            setSelectedLeafCategory(null);
        }
    };

    const handleCategoryBack = () => {
        if (categoryPath.length > 0) {
            const newPath = categoryPath.slice(0, -1);
            setCategoryPath(newPath);
            setSelectedLeafCategory(null);
        }
    };

    const resetCategorySelection = () => {
        setCategoryPath([]);
        setSelectedLeafCategory(null);
    };

    // Gestion du formulaire
    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const handleAttributeChange = (attributeName: string, value: any) => {
        setDynamicAttributes((prev) => ({ ...prev, [attributeName]: value }));
        if (errors[attributeName]) {
            setErrors((prev) => ({ ...prev, [attributeName]: '' }));
        }
    };

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
            selectionLimit: 10 - images.length,
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map((asset) => asset.uri);
            setImages((prev) => [...prev, ...newImages].slice(0, 10));
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
            setImages((prev) => [...prev, result.assets[0].uri].slice(0, 10));
        }
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    // Validation
    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        // Étape 1: Catégorie
        if (step === 1) {
            if (!selectedLeafCategory) {
                Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
                return false;
            }
        }

        // Étape 2: Détails de base
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

        // Étape 3: Attributs dynamiques (seulement si présents)
        if (step === 3 && filteredAttributes.length > 0) {
            for (const attr of filteredAttributes) {
                if (attr.required && !dynamicAttributes[attr.name]) {
                    newErrors[attr.name] = `${attr.label || attr.name} est obligatoire`;
                }
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
                return false;
            }
        }

        // Étape Photos (3 ou 4 selon présence d'attributs)
        const photosStep = filteredAttributes.length > 0 ? 4 : 3;
        if (step === photosStep) {
            if (images.length === 0) {
                Alert.alert('Erreur', 'Veuillez ajouter au moins une photo');
                return false;
            }
        }

        return true;
    };

    // Navigation entre étapes
    const handleNext = () => {
        if (validateStep(currentStep)) {
            let nextStep = currentStep + 1;
            
            // Skip l'étape 3 (Caractéristiques) s'il n'y a pas d'attributs dynamiques
            if (nextStep === 3 && filteredAttributes.length === 0) {
                nextStep = 4;
            }
            
            setCurrentStep(nextStep);
            updateProgress(nextStep);
        }
    };

    const handlePrevious = () => {
        let prevStep = currentStep - 1;
        
        // Skip l'étape 3 (Caractéristiques) en arrière s'il n'y a pas d'attributs dynamiques
        if (prevStep === 3 && filteredAttributes.length === 0) {
            prevStep = 2;
        }
        
        setCurrentStep(prevStep);
        updateProgress(prevStep);
    };

    // Soumission
    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        const formDataToSend = new FormData();

        formDataToSend.append('name', formData.name);
        if (formData.description) formDataToSend.append('description', formData.description);
        if (formData.price) formDataToSend.append('price', parseFloat(formData.price).toString());
        if (formData.quantity) formDataToSend.append('quantity', parseInt(formData.quantity).toString());
        if (selectedLeafCategory) formDataToSend.append('category', selectedLeafCategory._id);

        if (Object.keys(dynamicAttributes).length > 0) {
            formDataToSend.append('attributes', JSON.stringify(dynamicAttributes));
        }

        for (let i = 0; i < images.length; i++) {
            const uri = images[i];
            const filename = uri.split('/').pop() || `image_${i}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formDataToSend.append('files', {
                uri,
                name: filename,
                type,
            } as any);
        }

        try {
            await createAnnouncement(formDataToSend).unwrap();
            Alert.alert(
                '🎉 Succès',
                'Votre annonce a été publiée avec succès!',
                [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
            );
        } catch (error: any) {
            console.error('Failed to create announcement:', error);
            Alert.alert('❌ Erreur', error?.data?.message || 'Échec de la publication de l\'annonce');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Publier une annonce</Text>
                <View style={styles.headerSpacer} />
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
                    {STEPS.map((step, index) => (
                        <View key={step.id} style={styles.stepItem}>
                            <View
                                style={[
                                    styles.stepIconContainer,
                                    currentStep >= step.id && styles.stepIconActive,
                                    currentStep > step.id && styles.stepIconComplete,
                                ]}
                            >
                                <Ionicons
                                    name={currentStep > step.id ? 'checkmark' : step.icon}
                                    size={20}
                                    color={currentStep >= step.id ? Colors.white : Colors.gray400}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    currentStep >= step.id && styles.stepLabelActive,
                                ]}
                            >
                                {step.title}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Content */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Step 1: Sélection Catégorie */}
                    {currentStep === 1 && (
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>📂 Choisissez une catégorie</Text>
                            <Text style={styles.stepSubtitle}>
                                Sélectionnez la catégorie qui correspond le mieux à votre annonce
                            </Text>

                            {/* Breadcrumb */}
                            {categoryPath.length > 0 && (
                                <View style={styles.breadcrumb}>
                                    <TouchableOpacity onPress={resetCategorySelection} style={styles.breadcrumbItem}>
                                        <Ionicons name="home" size={16} color={Colors.accent} />
                                        <Text style={styles.breadcrumbText}>Accueil</Text>
                                    </TouchableOpacity>
                                    {categoryPath.map((cat, index) => (
                                        <React.Fragment key={cat._id}>
                                            <Ionicons name="chevron-forward" size={14} color={Colors.gray400} />
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setCategoryPath(categoryPath.slice(0, index + 1));
                                                    if (!cat.isLeaf) setSelectedLeafCategory(null);
                                                }}
                                                style={styles.breadcrumbItem}
                                            >
                                                <Text style={styles.breadcrumbText}>{cat.name}</Text>
                                            </TouchableOpacity>
                                        </React.Fragment>
                                    ))}
                                </View>
                            )}

                            {/* Liste des catégories */}
                            {categoriesLoading ? (
                                <View style={styles.loadingContainer}>
                                    <LoadingSpinner size="large" />
                                    <Text style={styles.loadingText}>Chargement des catégories...</Text>
                                </View>
                            ) : currentLevelCategories && currentLevelCategories.length > 0 ? (
                                <View style={styles.categoriesGrid}>
                                    {currentLevelCategories.map((category) => (
                                        <TouchableOpacity
                                            key={category._id}
                                            style={[
                                                styles.categoryCard,
                                                selectedLeafCategory?._id === category._id && styles.categoryCardSelected,
                                            ]}
                                            onPress={() => handleCategorySelect(category)}
                                            activeOpacity={0.7}
                                        >
                                            <LinearGradient
                                                colors={
                                                    selectedLeafCategory?._id === category._id
                                                        ? Gradients.accent
                                                        : [Colors.white, Colors.gray50]
                                                }
                                                style={styles.categoryCardGradient}
                                            >
                                                {category.icon ? (
                                                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                                                ) : (
                                                    <Ionicons
                                                        name={category.isLeaf ? 'folder' : 'folder-open'}
                                                        size={32}
                                                        color={
                                                            selectedLeafCategory?._id === category._id
                                                                ? Colors.primary
                                                                : Colors.textSecondary
                                                        }
                                                    />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.categoryName,
                                                        selectedLeafCategory?._id === category._id && styles.categoryNameSelected,
                                                    ]}
                                                    numberOfLines={2}
                                                >
                                                    {category.name}
                                                </Text>
                                                {!category.isLeaf && (
                                                    <Ionicons
                                                        name="chevron-forward"
                                                        size={18}
                                                        color={Colors.gray400}
                                                        style={styles.categoryArrow}
                                                    />
                                                )}
                                                {selectedLeafCategory?._id === category._id && (
                                                    <View style={styles.checkmarkBadge}>
                                                        <Ionicons name="checkmark" size={16} color={Colors.white} />
                                                    </View>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="folder-open-outline" size={64} color={Colors.gray300} />
                                    <Text style={styles.emptyText}>Aucune catégorie disponible</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 2: Détails du Produit */}
                    {currentStep === 2 && (
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>📝 Détails de l'annonce</Text>
                            <Text style={styles.stepSubtitle}>
                                Remplissez les informations sur votre produit ou service
                            </Text>

                            {/* Nom */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Nom de l'annonce <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                                    <Ionicons name="pricetag-outline" size={20} color={Colors.gray400} />
                                    <TextInput
                                        style={styles.input}
                                        value={formData.name}
                                        onChangeText={(value) => handleInputChange('name', value)}
                                        placeholder="Ex: iPhone 14 Pro 256GB"
                                        placeholderTextColor={Colors.gray400}
                                    />
                                </View>
                                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                            </View>

                            {/* Description */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <View style={styles.textAreaContainer}>
                                    <TextInput
                                        style={styles.textArea}
                                        value={formData.description}
                                        onChangeText={(value) => handleInputChange('description', value)}
                                        placeholder="Décrivez votre produit en détail..."
                                        placeholderTextColor={Colors.gray400}
                                        multiline
                                        numberOfLines={5}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>

                            {/* Prix et Quantité */}
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, styles.flex1, styles.marginRight]}>
                                    <Text style={styles.inputLabel}>
                                        Prix (€) <Text style={styles.required}>*</Text>
                                    </Text>
                                    <View style={[styles.inputContainer, errors.price && styles.inputError]}>
                                        <Ionicons name="cash-outline" size={20} color={Colors.gray400} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.price}
                                            onChangeText={(value) => handleInputChange('price', value)}
                                            placeholder="0.00"
                                            placeholderTextColor={Colors.gray400}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                    {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
                                </View>

                                <View style={[styles.inputGroup, styles.flex1]}>
                                    <Text style={styles.inputLabel}>Quantité</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="cube-outline" size={20} color={Colors.gray400} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.quantity}
                                            onChangeText={(value) => handleInputChange('quantity', value)}
                                            placeholder="1"
                                            placeholderTextColor={Colors.gray400}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Step 3: Caractéristiques spécifiques (seulement si présents) */}
                    {currentStep === 3 && filteredAttributes.length > 0 && (
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>🎯 Caractéristiques spécifiques</Text>
                            <Text style={styles.stepSubtitle}>
                                Précisez les détails importants pour votre {selectedLeafCategory?.name?.toLowerCase() || 'produit'}
                            </Text>

                            {attributesLoading ? (
                                <View style={styles.loadingContainer}>
                                    <LoadingSpinner size="small" />
                                    <Text style={styles.loadingText}>Chargement des caractéristiques...</Text>
                                </View>
                            ) : (
                                <View style={styles.attributesContainer}>
                                    {filteredAttributes.map((attr: any, index: number) => (
                                        <DynamicAttributeField
                                            key={attr._id || attr.name || `attr-${index}`}
                                            attribute={attr}
                                            value={dynamicAttributes[attr.name]}
                                            onChange={(value) => handleAttributeChange(attr.name, value)}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 4 (ou 3): Photos */}
                    {currentStep === (filteredAttributes.length > 0 ? 4 : 3) && (
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>📸 Ajoutez des photos</Text>
                            <Text style={styles.stepSubtitle}>
                                Ajoutez jusqu'à 10 photos de qualité ({images.length}/10)
                            </Text>

                            {/* Grid des images */}
                            <View style={styles.imagesGrid}>
                                {images.map((uri, index) => (
                                    <View key={index} style={styles.imageItem}>
                                        <Image source={{ uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeImage(index)}
                                        >
                                            <Ionicons name="close-circle" size={28} color={Colors.error} />
                                        </TouchableOpacity>
                                        {index === 0 && (
                                            <View style={styles.mainImageBadge}>
                                                <Text style={styles.mainImageText}>Principale</Text>
                                            </View>
                                        )}
                                    </View>
                                ))}

                                {/* Boutons d'ajout */}
                                {images.length < 10 && (
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

                            {images.length === 0 && (
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

                {/* Navigation Buttons */}
                <View style={styles.navigationBar}>
                    {currentStep > 1 && (
                        <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
                            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                            <Text style={styles.previousButtonText}>Précédent</Text>
                        </TouchableOpacity>
                    )}

                    {currentStep < STEPS.length ? (
                        <TouchableOpacity
                            style={[styles.nextButton, currentStep === 1 && !selectedLeafCategory && styles.disabledButton]}
                            onPress={handleNext}
                            disabled={currentStep === 1 && !selectedLeafCategory}
                        >
                            <LinearGradient
                                colors={currentStep === 1 && !selectedLeafCategory ? [Colors.gray300, Colors.gray400] : Gradients.primary}
                                style={styles.nextButtonGradient}
                            >
                                <Text style={styles.nextButtonText}>Suivant</Text>
                                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.publishButton, isPublishing && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={isPublishing}
                        >
                            <LinearGradient colors={Gradients.accent} style={styles.publishButtonGradient}>
                                {isPublishing ? (
                                    <LoadingSpinner size="small" color={Colors.primary} />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                                        <Text style={styles.publishButtonText}>Publier l'annonce</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
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
    headerSpacer: {
        width: 40,
    },
    progressContainer: {
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    progressTrack: {
        height: 6,
        backgroundColor: Colors.gray100,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.full,
    },
    stepsIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
    },
    stepIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    stepIconActive: {
        backgroundColor: Colors.primary,
    },
    stepIconComplete: {
        backgroundColor: Colors.success,
    },
    stepLabel: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.gray400,
    },
    stepLabelActive: {
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.bold,
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xxxl,
    },
    stepContent: {
        padding: Spacing.xl,
    },
    stepTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    stepSubtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        marginBottom: Spacing.xl,
        lineHeight: 22,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        backgroundColor: Colors.white,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
        gap: Spacing.xs,
    },
    breadcrumbItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs / 2,
    },
    breadcrumbText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.accent,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    categoryCard: {
        width: '48%',
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    categoryCardSelected: {
        transform: [{ scale: 1.02 }],
    },
    categoryCardGradient: {
        padding: Spacing.lg,
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    categoryIcon: {
        fontSize: 40,
        marginBottom: Spacing.sm,
    },
    categoryName: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        textAlign: 'center',
        marginTop: Spacing.sm,
    },
    categoryNameSelected: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    categoryArrow: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
    },
    checkmarkBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl * 2,
    },
    emptyText: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    inputLabel: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    required: {
        color: Colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    inputError: {
        borderColor: Colors.error,
    },
    errorText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.error,
        marginTop: Spacing.xs,
        marginLeft: Spacing.sm,
    },
    textAreaContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    textArea: {
        padding: Spacing.lg,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        minHeight: 120,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    flex1: {
        flex: 1,
    },
    marginRight: {
        marginRight: 0,
    },
    dynamicAttributesSection: {
        marginTop: Spacing.lg,
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.lg,
    },
    loadingText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    noAttributesContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        marginTop: Spacing.lg,
        ...Shadows.sm,
    },
    noAttributesText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
        textAlign: 'center',
    },
    noAttributesSubtext: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray400,
        marginTop: Spacing.xs,
        textAlign: 'center',
    },
    attributesContainer: {
        gap: Spacing.sm,
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
    removeImageButton: {
        position: 'absolute',
        top: Spacing.xs,
        right: Spacing.xs,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.full,
    },
    mainImageBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.accent,
        paddingVertical: Spacing.xs / 2,
    },
    mainImageText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        textAlign: 'center',
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
        gap: Spacing.xs,
    },
    addImageText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    emptyImagesContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl * 2,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        marginTop: Spacing.lg,
    },
    emptySubtext: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
        paddingHorizontal: Spacing.xl,
    },
    navigationBar: {
        flexDirection: 'row',
        gap: Spacing.md,
        padding: Spacing.xl,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        ...Shadows.xl,
    },
    previousButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderWidth: 2,
        borderColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    previousButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    nextButton: {
        flex: 2,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    nextButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    disabledButton: {
        opacity: 0.5,
    },
    publishButton: {
        flex: 2,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    publishButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    publishButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
});
