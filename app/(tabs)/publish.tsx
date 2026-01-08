import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useCreateAnnouncementMutation } from '@/store/api/announcementsApi';
import { useGetCategoriesQuery, useGetSubcategoriesByCategoryQuery } from '@/store/api/categoriesApi';
import { CreateAnnouncementDto } from '@/types/announcement';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublishScreen() {
    const router = useRouter();
    const [createAnnouncement, { isLoading }] = useCreateAnnouncementMutation();
    const { data: categories, isLoading: categoriesLoading } = useGetCategoriesQuery();
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const { data: subcategories, isLoading: subcategoriesLoading } = useGetSubcategoriesByCategoryQuery(selectedCategory, { skip: !selectedCategory });
    const [step, setStep] = useState(1); // Multi-step form: Step 1: Category, Step 2: Details, Step 3: Photos
    const [formData, setFormData] = useState<Partial<CreateAnnouncementDto>>({
        name: '',
        description: '',
        price: undefined,
        category: '', // Using the correct field name from CreateAnnouncementDto
        subcategory: '', // Using the correct field name from CreateAnnouncementDto
        condition: '',
    });
    const [images, setImages] = useState<string[]>([]);
    const [newImage, setNewImage] = useState('');

    // Update category when selected
    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        setFormData(prev => ({
            ...prev,
            category,
            subcategory: '' // Reset subcategory when category changes
        }));
    };

    // Update subcategory when selected
    const handleSubcategoryChange = (subcategory: string) => {
        setFormData(prev => ({
            ...prev,
            subcategory
        }));
    };

    const handleInputChange = (field: keyof CreateAnnouncementDto, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addImage = () => {
        if (newImage.trim()) {
            setImages(prev => [...prev, newImage]);
            setNewImage('');
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.category) {
            Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (nom et catégorie)');
            return;
        }

        // Create FormData object for file uploads
        const form = new FormData();
        form.append('name', formData.name);
        if (formData.description) form.append('description', formData.description);
        if (formData.price) form.append('price', formData.price.toString());
        if (formData.category) form.append('category', formData.category);
        if (formData.condition) form.append('condition', formData.condition);
        if (formData.quantity) form.append('quantity', formData.quantity.toString());

        // Add images to form data
        images.forEach((img, index) => {
            form.append(`images`, {
                uri: img,
                type: 'image/jpeg', // This should match the actual image type
                name: `image_${index}.jpg`
            } as any);
        });

        try {
            await createAnnouncement(form).unwrap();
            Alert.alert('Succès', 'Annonce publiée avec succès!', [
                { text: 'OK', onPress: () => router.push('/(tabs)') }
            ]);
        } catch (error) {
            console.error('Failed to create announcement:', error);
            Alert.alert('Erreur', 'Échec de la publication de l\'annonce');
        }
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Publier une annonce</Text>
            </View>

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
                        <TouchableOpacity onPress={() => setStep(2)}>
                            <View style={[styles.stepCircle, step >= 2 && styles.activeStep]}>
                                <Text style={styles.stepNumber}>2</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.stepLine}></View>
                        <TouchableOpacity onPress={() => setStep(3)}>
                            <View style={[styles.stepCircle, step >= 3 && styles.activeStep]}>
                                <Text style={styles.stepNumber}>3</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Step 1: Category Selection */}
                    {step === 1 && (
                        <View>
                            <Text style={styles.stepTitle}>Sélectionnez une catégorie</Text>
                            
                            {categoriesLoading ? (
                                <Text>Chargement des catégories...</Text>
                            ) : categories ? (
                                <View>
                                    {categories.map((category) => (
                                        <TouchableOpacity
                                            key={category._id}
                                        style={[
                                            styles.categoryOption,
                                            formData.category === category._id && styles.selectedCategory
                                        ]}
                                        onPress={() => handleInputChange('category', category._id)}
                                        >
                                            <Text style={styles.categoryText}>{category.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    
                                    {selectedCategory && subcategories && subcategories.length > 0 && (
                                        <View style={styles.subcategoryContainer}>
                                            <Text style={styles.subcategoryTitle}>Sous-catégories:</Text>
                                            {subcategoriesLoading ? (
                                                <Text>Chargement des sous-catégories...</Text>
                                            ) : (
                                                subcategories.map((subcategory) => (
                                                    <TouchableOpacity
                                                        key={subcategory._id}
                                                        style={[
                                                            styles.subcategoryOption,
                                                            formData.subcategory === subcategory._id && styles.selectedSubcategory
                                                        ]}
                                                        onPress={() => handleInputChange('subcategory', subcategory._id)}
                                                    >
                                                        <Text style={styles.subcategoryText}>{subcategory.name}</Text>
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text>Aucune catégorie disponible</Text>
                            )}
                            
                            <TouchableOpacity style={styles.nextButton} onPress={() => setStep(2)} disabled={!formData.category}>
                                <Text style={styles.nextButtonText}>Suivant</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 2: Product Details */}
                    {step === 2 && (
                        <View>
                            <Text style={styles.stepTitle}>Détails du produit</Text>
                            
                            {/* Name Field */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nom de l'annonce *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.name}
                                    onChangeText={(value) => handleInputChange('name', value)}
                                    placeholder="Entrez le nom de votre annonce"
                                />
                            </View>

                            {/* Description Field */}
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

                            {/* Price Field */}
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

                            {/* Condition Field */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>État</Text>
                                <View style={styles.pickerContainer}>
                                    <TouchableOpacity
                                        style={[styles.pickerOption, formData.condition === 'neuf' && styles.selectedPickerOption]}
                                        onPress={() => handleInputChange('condition', 'neuf')}
                                    >
                                        <Text style={[styles.pickerText, formData.condition === 'neuf' && styles.selectedPickerText]}>Neuf</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.pickerOption, formData.condition === 'occasion' && styles.selectedPickerOption]}
                                        onPress={() => handleInputChange('condition', 'occasion')}
                                    >
                                        <Text style={[styles.pickerText, formData.condition === 'occasion' && styles.selectedPickerText]}>Occasion</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Quantity Field */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Quantité</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.quantity?.toString()}
                                    onChangeText={(value) => handleInputChange('quantity', parseInt(value) || undefined)}
                                    placeholder="1"
                                    keyboardType="numeric"
                                />
                            </View>
                            
                            <View style={styles.navigationButtons}>
                                <TouchableOpacity style={styles.prevButton} onPress={() => setStep(1)}>
                                    <Text style={styles.prevButtonText}>Précédent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
                                    <Text style={styles.nextButtonText}>Suivant</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Step 3: Photo Upload */}
                    {step === 3 && (
                        <View>
                            <Text style={styles.stepTitle}>Ajouter des photos</Text>
                            
                            {/* Images Section */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Photos</Text>
                                <View style={styles.imageInputContainer}>
                                    <TextInput
                                        style={styles.imageInput}
                                        value={newImage}
                                        onChangeText={setNewImage}
                                        placeholder="URL de l'image ou lien"
                                    />
                                    <TouchableOpacity style={styles.addButton} onPress={addImage}>
                                        <Ionicons name="add" size={24} color={Colors.white} />
                                    </TouchableOpacity>
                                </View>

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
                                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                                    <Text style={styles.submitButtonText}>Publier l'annonce</Text>
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
    categoryText: {
        fontSize: Typography.fontSize.md,
        color: Colors.textPrimary,
    },
    subcategoryContainer: {
        marginTop: Spacing.md,
        paddingLeft: Spacing.md,
    },
    subcategoryTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    subcategoryOption: {
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
    },
    selectedSubcategory: {
        backgroundColor: Colors.accent + '20',
        borderColor: Colors.accent,
    },
    subcategoryText: {
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
    pickerContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    pickerOption: {
        flex: 1,
        padding: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.gray50,
    },
    selectedPickerOption: {
        backgroundColor: Colors.primary,
    },
    pickerText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.md,
    },
    selectedPickerText: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
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
    nextButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginLeft: Spacing.sm,
    },
    nextButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    submitButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
    },
    imageInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    imageInput: {
        flex: 1,
        padding: Spacing.md,
        fontSize: Typography.fontSize.md,
        backgroundColor: Colors.white,
    },
    addButton: {
        backgroundColor: Colors.primary,
        padding: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
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
