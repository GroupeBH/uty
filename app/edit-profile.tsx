/**
 * Écran de modification du profil utilisateur
 */

import { BottomActionBar } from '@/components/ui/BottomActionBar';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { useAuth } from '@/hooks/useAuth';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { getImageMimeType } from '@/utils/imageUtils';
import { storage } from '@/utils/storage';
import { normalizeTextInputValue } from '@/utils/textInput';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const { data: profile, isLoading } = useGetProfileQuery();
    const [updateProfile] = useUpdateProfileMutation();
    const { showAlert: showStyledAlert, alertNode } = useStyledAlert();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        username: '',
    });
    const [image, setImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile || user) {
            const data = profile || user;
            setFormData({
                firstName: data?.firstName || '',
                lastName: data?.lastName || '',
                email: data?.email || '',
                phone: data?.phone || data?.verified_phone || '',
                username: data?.username || '',
            });
            if (data?.image) {
                setImage(data.image);
            }
        }
    }, [profile, user]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showStyledAlert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos.', undefined, 'warning');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImage(result.assets[0].uri);
        }
    };

    const parseApiErrorMessage = (error: any, fallback: string) => {
        if (!error) return fallback;
        if (typeof error === 'string') return error;
        const data = error?.data;
        if (typeof data === 'string') return data;
        if (Array.isArray(data?.message) && data.message.length > 0) return String(data.message[0]);
        if (typeof data?.message === 'string') return data.message;
        if (typeof data?.error === 'string') return data.error;
        if (typeof error?.message === 'string') return error.message;
        return fallback;
    };

    const buildProfileImagePayload = async () => {
        const selectedImage = image?.trim();
        if (!selectedImage) {
            return undefined;
        }

        if (/^https?:\/\//i.test(selectedImage) || selectedImage.startsWith('data:')) {
            return selectedImage;
        }

        const base64 = await FileSystem.readAsStringAsync(selectedImage, {
            encoding: 'base64',
        });
        if (!base64) {
            throw new Error("Impossible de lire l'image selectionnee.");
        }

        return `data:${getImageMimeType(selectedImage)};base64,${base64}`;
    };

    const handleSave = async () => {
        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();
        const username = formData.username.trim();
        const email = formData.email.trim();

        if (!firstName || !lastName) {
            showStyledAlert('Erreur', 'Le prenom et le nom sont obligatoires');
            return;
        }

        setIsSaving(true);
        try {
            const imagePayload = await buildProfileImagePayload();
            const updatedUser = await updateProfile({
                firstName,
                lastName,
                ...(username ? { username } : {}),
                email,
                ...(imagePayload ? { image: imagePayload } : {}),
            }).unwrap();

            dispatch(setUser(updatedUser));
            await storage.setUser(updatedUser);
            setImage(updatedUser.image || null);

            showStyledAlert('Succes', 'Profil mis a jour avec succes', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            showStyledAlert(
                'Erreur',
                parseApiErrorMessage(error, 'Impossible de mettre a jour le profil'),
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const getInitials = () => {
        const first = formData.firstName?.[0] || '';
        const last = formData.lastName?.[0] || '';
        return (first + last).toUpperCase() || 'U';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Modifier le profil</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Photo de profil */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarContainer}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.avatarImage} />
                            ) : (
                                <LinearGradient colors={Gradients.accent} style={styles.avatar}>
                                    <Text style={styles.avatarText}>{getInitials()}</Text>
                                </LinearGradient>
                            )}
                            <TouchableOpacity
                                style={styles.editAvatarButton}
                                onPress={handlePickImage}
                            >
                                <Ionicons name="camera" size={20} color={Colors.white} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.avatarHint}>Appuyez pour changer la photo</Text>
                    </View>

                    {/* Formulaire */}
                    <View style={styles.formSection}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>
                                Prénom <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Votre prénom"
                                value={formData.firstName}
                                onChangeText={(text) => setFormData({ ...formData, firstName: normalizeTextInputValue(text) })}
                                placeholderTextColor={Colors.gray400}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>
                                Nom <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Votre nom"
                                value={formData.lastName}
                                onChangeText={(text) => setFormData({ ...formData, lastName: normalizeTextInputValue(text) })}
                                placeholderTextColor={Colors.gray400}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Nom d&apos;utilisateur</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Votre nom d'utilisateur"
                                value={formData.username}
                                onChangeText={(text) => setFormData({ ...formData, username: normalizeTextInputValue(text) })}
                                placeholderTextColor={Colors.gray400}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="votre@email.com"
                                value={formData.email}
                                onChangeText={(text) => setFormData({ ...formData, email: text })}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={Colors.gray400}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Téléphone</Text>
                            <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={formData.phone}
                                editable={false}
                                placeholderTextColor={Colors.gray400}
                            />
                            <Text style={styles.inputHint}>
                                Le numéro de téléphone ne peut pas être modifié
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bouton de sauvegarde */}
            <BottomActionBar style={styles.footer}>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <LinearGradient colors={Gradients.primary} style={styles.saveGradient}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={24} color={Colors.white} />
                                <Text style={styles.saveText}>Enregistrer</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </BottomActionBar>
            {alertNode}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    backButton: {
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: Spacing.md,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.xl,
    },
    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        ...Shadows.xl,
    },
    avatarText: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: Colors.white,
        ...Shadows.md,
    },
    avatarHint: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    formSection: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.sm,
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
    inputDisabled: {
        backgroundColor: Colors.gray100,
        color: Colors.textSecondary,
    },
    inputHint: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: Spacing.xs / 2,
        fontStyle: 'italic',
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        ...Shadows.lg,
    },
    saveButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    saveGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    saveText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
});

