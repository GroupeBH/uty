import { DynamicAttributeField } from '@/components/DynamicAttributeField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useCreateAnnouncementMutation } from '@/store/api/announcementsApi';
import { useGetCategoriesByParentQuery, useGetCategoryAttributesQuery } from '@/store/api/categoriesApi';
import { Category, CategoryAttribute } from '@/types/category';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublishScreen() {
    const router = useRouter();
    const [createAnnouncement, { isLoading }] = useCreateAnnouncementMutation();

    // Category hierarchy navigation
    const [categoryPath, setCategoryPath] = useState<Category[]>([]);
    const [selectedLeafCategory, setSelectedLeafCategory] = useState<Category | null>(null);

    // Fetch categories for current level
    const currentParentId = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1]._id : null;
    const { data: currentLevelCategories, isLoading: categoriesLoading } = useGetCategoriesByParentQuery(currentParentId);

    // Fetch attributes for selected leaf category
    const { data: categoryAttributes, isLoading: attributesLoading } = useGetCategoryAttributesQuery(
        selectedLeafCategory?._id || '',
        { skip: !selectedLeafCategory }
    );

    console.log("categoryAttributes", categoryAttributes);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<any>({
        name: '',
        description: '',
        price: undefined,
        quantity: 1,
    });
    const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});
    const [images, setImages] = useState<string[]>([]);

    const handleCategorySelect = (category: Category) => {
        if (category.isLeaf) {
            // This is a leaf category, we can select it
            setSelectedLeafCategory(category);
            setCategoryPath([...categoryPath, category]);
        } else {
            // Navigate deeper into the hierarchy
            setCategoryPath([...categoryPath, category]);
        }
    };

    const handleCategoryBack = () => {
        if (categoryPath.length > 0) {
            const newPath = categoryPath.slice(0, -1);
            setCategoryPath(newPath);
            setSelectedLeafCategory(null);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAttributeChange = (attributeName: string, value: any) => {
        setDynamicAttributes(prev => ({
            ...prev,
            [attributeName]: value
        }));
    };

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
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map(asset => asset.uri);
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        if (!formData.name || !selectedLeafCategory) {
            Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (nom et catégorie)');
            return false;
        }

        // Validate required dynamic attributes
        if (categoryAttributes) {
            for (const attr of categoryAttributes) {
                if (attr.required && !dynamicAttributes[attr.name]) {
                    Alert.alert('Erreur', `Le champ "${attr.name}" est obligatoire`);
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const formDataToSend = new FormData();

        // Append basic fields
        formDataToSend.append('name', formData.name);
        if (formData.description) formDataToSend.append('description', formData.description);
        if (formData.price) formDataToSend.append('price', formData.price.toString());
        if (formData.quantity) formDataToSend.append('quantity', formData.quantity.toString());
        if (selectedLeafCategory) formDataToSend.append('category', selectedLeafCategory._id);

        // Append dynamic attributes as JSON string
        if (Object.keys(dynamicAttributes).length > 0) {
            formDataToSend.append('attributes', JSON.stringify(dynamicAttributes));
        }

        // Append images
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
            Alert.alert('Succès', 'Annonce publiée avec succès!', [
                { text: 'OK', onPress: () => router.push('/(tabs)') }
            ]);
        } catch (error) {
            console.error('Failed to create announcement:', error);
            Alert.alert('Erreur', 'Échec de la publication de l\'annonce');
        }
    };



    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.formContainer}>
                    {/* Step Indicator */}
                    <View style={styles.stepIndicator}>
                        <TouchableOpacity onPress={() => setStep(1)}>
                            <View style={[styles.stepCircle, step >= 1 && styles.activeStep]}>
                                <Text style={styles.stepNumber}>1</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.stepLine}></View>
                        <TouchableOpacity onPress={() => setStep(2)} disabled={!selectedLeafCategory}>
                            <View style={[styles.stepCircle, step >= 2 && styles.activeStep]}>
                                <Text style={styles.stepNumber}>2</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.stepLine}></View>
                        <TouchableOpacity onPress={() => setStep(3)} disabled={!selectedLeafCategory}>
                            <View style={[styles.stepCircle, step >= 3 && styles.activeStep]}>
                                <Text style={styles.stepNumber}>3</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Step 1: Category Selection */}
                    {step === 1 && (
                        <View>
                            <Text style={styles.stepTitle}>Sélectionnez une catégorie</Text>

                            {/* Breadcrumb */}
                            {categoryPath.length > 0 && (
                                <View style={styles.breadcrumb}>
                                    <TouchableOpacity onPress={() => {
                                        setCategoryPath([]);
                                        setSelectedLeafCategory(null);
                                    }}>
                                        <Text style={styles.breadcrumbText}>Accueil</Text>
                                    </TouchableOpacity>
                                    {categoryPath.map((cat, index) => (
                                        <React.Fragment key={cat._id}>
                                            <Text style={styles.breadcrumbSeparator}> {'>'} </Text>
                                            <TouchableOpacity onPress={() => {
                                                setCategoryPath(categoryPath.slice(0, index + 1));
                                                if (!cat.isLeaf) setSelectedLeafCategory(null);
                                            }}>
                                                <Text style={styles.breadcrumbText}>{cat.name}</Text>
                                            </TouchableOpacity>
                                        </React.Fragment>
                                    ))}
                                </View>
                            )}

                            {categoriesLoading ? (
                                <LoadingSpinner size="small" color={Colors.primary} />
                            ) : currentLevelCategories && currentLevelCategories.length > 0 ? (
                                <View>
                                    {currentLevelCategories.map((category) => (
                                        <TouchableOpacity
                                            key={category._id}
                                            style={[
                                                styles.categoryOption,
                                                selectedLeafCategory?._id === category._id && styles.selectedCategory
                                            ]}
                                            onPress={() => handleCategorySelect(category)}
                                        >
                                            <View style={styles.categoryContent}>
                                                <Text style={styles.categoryText}>{category.name}</Text>
                                                {!category.isLeaf && (
                                                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                                                )}
                                                {category.isLeaf && selectedLeafCategory?._id === category._id && (
                                                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <Text>Aucune catégorie disponible</Text>
                            )}

                            <TouchableOpacity
                                style={[styles.nextButton, !selectedLeafCategory && styles.disabledButton]}
                                onPress={() => setStep(2)}
                                disabled={!selectedLeafCategory}
                            >
                                <Text style={styles.nextButtonText}>Suivant</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 2: Product Details + Dynamic Attributes */}
                    {step === 2 && (
                        <View>
                            <Text style={styles.stepTitle}>Détails du produit</Text>

                            {/* Basic Fields */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nom de l'annonce *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.name}
                                    onChangeText={(value) => handleInputChange('name', value)}
                                    placeholder="Entrez le nom de votre annonce"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.description}
                                    onChangeText={(value) => handleInputChange('description', value)}
                                    placeholder="Décrivez votre annonce..."
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Prix (€)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.price?.toString()}
                                    onChangeText={(value) => handleInputChange('price', parseFloat(value) || undefined)}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Quantité</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.quantity?.toString()}
                                    onChangeText={(value) => handleInputChange('quantity', parseInt(value) || 1)}
                                    placeholder="1"
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Dynamic Attribute Fields */}
                            {attributesLoading ? (
                                <LoadingSpinner size="small" color={Colors.primary} />
                            ) : categoryAttributes && categoryAttributes.length > 0 ? (
                                <View>
                                    <Text style={styles.sectionTitle}>Attributs spécifiques</Text>
                                    {categoryAttributes.map((attr: CategoryAttribute) => (
                                        <DynamicAttributeField
                                            key={attr.name}
                                            attribute={attr}
                                            value={dynamicAttributes[attr.name]}
                                            onChange={(value) => handleAttributeChange(attr.name, value)}
                                        />
                                    ))}
                                </View>
                            ) : null}

                            <View style={styles.navigationButtons}>
                                <TouchableOpacity style={styles.prevButton} onPress={() => setStep(1)}>
                                    <Text style={styles.prevButtonText}>Précédent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.nextButtonRow} onPress={() => setStep(3)}>
                                    <Text style={styles.nextButtonText}>Suivant</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Step 3: Photo Upload */}
                    {step === 3 && (
                        <View>
                            <Text style={styles.stepTitle}>Ajouter des photos</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Photos</Text>
                                <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
                                    <Ionicons name="camera" size={24} color={Colors.white} />
                                    <Text style={styles.uploadButtonText}>Sélectionner des photos</Text>
                                </TouchableOpacity>

                                {/* Display added images */}
                                {images.length > 0 && (
                                    <View style={styles.imagePreviewContainer}>
                                        {images.map((img, index) => (
                                            <View key={index} style={styles.imagePreviewWrapper}>
                                                <Image source={{ uri: img }} style={styles.previewImage} />
                                                <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                                                    <Ionicons name="close" size={16} color={Colors.white} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.navigationButtons}>
                                <TouchableOpacity style={styles.prevButton} onPress={() => setStep(2)}>
                                    <Text style={styles.prevButtonText}>Précédent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitButton, isLoading && styles.disabledButton]}
                                    onPress={handleSubmit}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <LoadingSpinner size="small" color={Colors.white} />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Publier l'annonce</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: Spacing.lg,
    },
    formContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Platform.OS === 'android' ? { elevation: 2 } : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.gray300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeStep: {
        backgroundColor: Colors.primary,
    },
    stepNumber: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    stepLine: {
        width: 50,
        height: 2,
        backgroundColor: Colors.gray300,
    },
    stepTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
    },
    breadcrumb: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: Spacing.md,
        padding: Spacing.sm,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
    },
    breadcrumbText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    breadcrumbSeparator: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginHorizontal: Spacing.xs,
    },
    categoryOption: {
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
    },
    selectedCategory: {
        backgroundColor: Colors.primary + '20',
        borderColor: Colors.primary,
    },
    categoryContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryText: {
        fontSize: Typography.fontSize.md,
        color: Colors.textPrimary,
    },
    nextButton: {
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    disabledButton: {
        backgroundColor: Colors.gray300,
    },
    nextButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: Typography.fontSize.md,
        backgroundColor: Colors.white,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    navigationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.xl,
    },
    prevButton: {
        flex: 1,
        backgroundColor: Colors.gray300,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    prevButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
    },
    nextButtonRow: {
        flex: 1,
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginLeft: Spacing.sm,
    },
    submitButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginLeft: Spacing.sm,
    },
    submitButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    uploadButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: Spacing.md,
        gap: Spacing.sm,
    },
    imagePreviewWrapper: {
        position: 'relative',
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.md,
    },
    removeImageButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: Colors.error,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
