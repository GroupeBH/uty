import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppDispatch } from '@/store/hooks';
import { useRegisterMutation, useVerifyOtpMutation } from '@/store/api/authApi';
import { useGetCategoriesQuery } from '@/store/api/categoriesApi';
import { setCredentials } from '@/store/slices/authSlice';
import { tokenService } from '@/services/tokenService';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
    Alert,
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

type SignupStep = 'otp' | 'identity' | 'security' | 'preferences';
const SIGNUP_STEPS: Exclude<SignupStep, 'otp'>[] = ['identity', 'security', 'preferences'];

export default function OtpScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const params = useLocalSearchParams<{ phone: string; mode: 'register' | 'login' }>();

    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [step, setStep] = useState<SignupStep>('otp');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const inputRefs = useRef<(TextInput | null)[]>([]);

    const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
    const [register, { isLoading: isRegistering }] = useRegisterMutation();
    const { data: categories } = useGetCategoriesQuery();
    const currentSignupStepIndex = SIGNUP_STEPS.indexOf(step as Exclude<SignupStep, 'otp'>);

    const handleOtpChange = (text: string, index: number) => {
        if (text.length > 1) {
            text = text.charAt(text.length - 1);
        }

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto focus next input
        if (text && index < 4) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 5) {
            Alert.alert('Erreur', 'Veuillez entrer le code à 5 chiffres');
            return;
        }

        try {
            await verifyOtp({ phone: params.phone, otp: otpCode }).unwrap();
            setStep('identity');
        } catch (error: any) {
            console.error('OTP verification error:', error);
            Alert.alert('Erreur', error?.data?.message || 'Code OTP invalide');
        }
    };

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const validateIdentityStep = () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Erreur', 'Veuillez remplir votre prénom et votre nom');
            return false;
        }
        return true;
    };

    const validateSecurityStep = () => {
        if (!/^\d{4}$/.test(pin)) {
            Alert.alert('Erreur', 'Le code PIN doit contenir 4 chiffres');
            return false;
        }
        if (pin !== confirmPin) {
            Alert.alert('Erreur', 'Les codes PIN ne correspondent pas');
            return false;
        }
        return true;
    };

    const validatePreferencesStep = () => {
        if (selectedCategories.length === 0) {
            Alert.alert('Erreur', 'Veuillez sélectionner au moins une catégorie');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateIdentityStep() || !validateSecurityStep() || !validatePreferencesStep()) {
            return;
        }

        try {
            const response = await register({
                phone: params.phone,
                firstName,
                lastName,
                pin,
                preferredCategoryIds: selectedCategories,
            }).unwrap();

            // Sauvegarder les tokens
            await tokenService.saveTokens(response.access_token, response.refresh_token);

            // Récupérer le profil
            const profileResponse = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200'}/users/profile`,
                {
                    headers: {
                        Authorization: `Bearer ${response.access_token}`,
                    },
                }
            );
            const user = await profileResponse.json();

            await storage.setUser(user);
            dispatch(
                setCredentials({
                    user,
                    accessToken: response.access_token,
                    refreshToken: response.refresh_token,
                })
            );

            Alert.alert('Succès', 'Votre compte a été créé !', [
                {
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)'),
                },
            ]);
        } catch (error: any) {
            console.error('Registration error:', error);
            Alert.alert('Erreur', error?.data?.message || 'Erreur lors de l\'inscription');
        }
    };

    const goToPreviousStep = () => {
        if (step === 'otp') {
            router.back();
            return;
        }
        if (step === 'identity') {
            setStep('otp');
            return;
        }
        if (step === 'security') {
            setStep('identity');
            return;
        }
        setStep('security');
    };

    const goToNextSignupStep = () => {
        if (step === 'identity') {
            if (!validateIdentityStep()) return;
            setStep('security');
            return;
        }
        if (step === 'security') {
            if (!validateSecurityStep()) return;
            setStep('preferences');
            return;
        }
        if (step === 'preferences') {
            if (!validatePreferencesStep()) return;
            void handleRegister();
        }
    };

    const signupTitle =
        step === 'identity'
            ? 'Complétez votre profil'
            : step === 'security'
              ? 'Sécurisez votre compte'
              : 'Choisissez vos préférences';

    const signupSubtitle =
        step === 'identity'
            ? 'Renseignez vos informations personnelles'
            : step === 'security'
              ? 'Créez un code PIN pour protéger votre compte'
              : 'Sélectionnez les catégories qui vous intéressent';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
                            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {step === 'otp' ? (
                        <>
                            {/* OTP Step */}
                            <View style={styles.illustrationContainer}>
                                <LinearGradient colors={Gradients.accent} style={styles.iconCircle}>
                                    <Ionicons name="shield-checkmark-outline" size={64} color={Colors.white} />
                                </LinearGradient>
                            </View>

                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Code de vérification</Text>
                                <Text style={styles.subtitle}>
                                    Entrez le code à 5 chiffres envoyé au{'\n'}
                                    <Text style={styles.phone}>{params.phone}</Text>
                                </Text>
                            </View>

                            {/* OTP Inputs */}
                            <View style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => (inputRefs.current[index] = ref)}
                                        style={styles.otpInput}
                                        value={digit}
                                        onChangeText={(text) => handleOtpChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.verifyButton, isVerifying && styles.disabledButton]}
                                onPress={handleVerifyOtp}
                                disabled={isVerifying}
                            >
                                <LinearGradient colors={Gradients.accent} style={styles.verifyGradient}>
                                    <Text style={styles.verifyButtonText}>
                                        {isVerifying ? 'Vérification...' : 'Vérifier'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.signupStepper}>
                                {SIGNUP_STEPS.map((signupStep, index) => {
                                    const stepIndex = index + 1;
                                    const isActive = currentSignupStepIndex === index;
                                    const isDone = currentSignupStepIndex > index;
                                    return (
                                        <View key={signupStep} style={styles.signupStepItem}>
                                            <View
                                                style={[
                                                    styles.signupStepCircle,
                                                    isActive && styles.signupStepCircleActive,
                                                    isDone && styles.signupStepCircleDone,
                                                ]}
                                            >
                                                {isDone ? (
                                                    <Ionicons name="checkmark" size={14} color={Colors.white} />
                                                ) : (
                                                    <Text
                                                        style={[
                                                            styles.signupStepNumber,
                                                            (isActive || isDone) && styles.signupStepNumberActive,
                                                        ]}
                                                    >
                                                        {stepIndex}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.signupStepLabel,
                                                    (isActive || isDone) && styles.signupStepLabelActive,
                                                ]}
                                            >
                                                {signupStep === 'identity'
                                                    ? 'Profil'
                                                    : signupStep === 'security'
                                                      ? 'Securite'
                                                      : 'Preferences'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>{signupTitle}</Text>
                                <Text style={styles.subtitle}>{signupSubtitle}</Text>
                            </View>

                            <View style={styles.form}>
                                {step === 'identity' && (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Prenom</Text>
                                            <View style={styles.inputContainer}>
                                                <Ionicons name="person-outline" size={20} color={Colors.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    value={firstName}
                                                    onChangeText={setFirstName}
                                                    placeholder="Votre prenom"
                                                    placeholderTextColor={Colors.gray400}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Nom</Text>
                                            <View style={styles.inputContainer}>
                                                <Ionicons name="person-outline" size={20} color={Colors.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    value={lastName}
                                                    onChangeText={setLastName}
                                                    placeholder="Votre nom"
                                                    placeholderTextColor={Colors.gray400}
                                                />
                                            </View>
                                        </View>
                                    </>
                                )}

                                {step === 'security' && (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Code PIN (4 chiffres)</Text>
                                            <View style={styles.inputContainer}>
                                                <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    value={pin}
                                                    onChangeText={setPin}
                                                    placeholder="4 chiffres"
                                                    placeholderTextColor={Colors.gray400}
                                                    secureTextEntry={!showPin}
                                                    keyboardType="number-pad"
                                                    maxLength={4}
                                                />
                                                <TouchableOpacity onPress={() => setShowPin(!showPin)}>
                                                    <Ionicons
                                                        name={showPin ? 'eye-off-outline' : 'eye-outline'}
                                                        size={20}
                                                        color={Colors.gray400}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Confirmer le code PIN</Text>
                                            <View style={styles.inputContainer}>
                                                <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />
                                                <TextInput
                                                    style={styles.input}
                                                    value={confirmPin}
                                                    onChangeText={setConfirmPin}
                                                    placeholder="4 chiffres"
                                                    placeholderTextColor={Colors.gray400}
                                                    secureTextEntry={!showConfirmPin}
                                                    keyboardType="number-pad"
                                                    maxLength={4}
                                                />
                                                <TouchableOpacity onPress={() => setShowConfirmPin(!showConfirmPin)}>
                                                    <Ionicons
                                                        name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                                                        size={20}
                                                        color={Colors.gray400}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {step === 'preferences' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Categories d&apos;interet</Text>
                                        <View style={styles.categoriesGrid}>
                                            {categories?.filter((cat) => !cat.parentId).map((category) => (
                                                <TouchableOpacity
                                                    key={category._id}
                                                    style={[
                                                        styles.categoryChip,
                                                        selectedCategories.includes(category._id) &&
                                                            styles.categoryChipSelected,
                                                    ]}
                                                    onPress={() => toggleCategory(category._id)}
                                                >
                                                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                                                    <Text
                                                        style={[
                                                            styles.categoryName,
                                                            selectedCategories.includes(category._id) &&
                                                                styles.categoryNameSelected,
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {category.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={goToPreviousStep}>
                                        <Text style={styles.secondaryButtonText}>Retour</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.registerButton, step === 'preferences' && isRegistering && styles.disabledButton]}
                                        onPress={goToNextSignupStep}
                                        disabled={step === 'preferences' && isRegistering}
                                    >
                                        <LinearGradient
                                            colors={Gradients.primary}
                                            style={styles.registerGradient}
                                        >
                                            {step === 'preferences' && isRegistering ? (
                                                <Text style={styles.registerButtonText}>Inscription...</Text>
                                            ) : (
                                                <>
                                                    <Text style={styles.registerButtonText}>
                                                        {step === 'preferences' ? 'Creer mon compte' : 'Continuer'}
                                                    </Text>
                                                    <Ionicons
                                                        name={step === 'preferences' ? 'checkmark-circle' : 'arrow-forward'}
                                                        size={20}
                                                        color={Colors.white}
                                                    />
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    header: {
        paddingVertical: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationContainer: {
        alignItems: 'center',
        marginVertical: Spacing.xxxl,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    titleContainer: {
        marginBottom: Spacing.xxxl,
    },
    title: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    phone: {
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xxxl,
    },
    otpInput: {
        width: 50,
        height: 60,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.gray100,
        textAlign: 'center',
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    verifyButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    verifyGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    verifyButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    disabledButton: {
        opacity: 0.5,
    },
    signupStepper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    signupStepItem: {
        flex: 1,
        alignItems: 'center',
        gap: Spacing.xs,
    },
    signupStepCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signupStepCircleActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '15',
    },
    signupStepCircleDone: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    signupStepNumber: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray500,
    },
    signupStepNumberActive: {
        color: Colors.primary,
    },
    signupStepLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    signupStepLabelActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    form: {
        gap: Spacing.lg,
    },
    inputGroup: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
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
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
    },
    categoryChipSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryName: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.textSecondary,
    },
    categoryNameSelected: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    registerButton: {
        flex: 1.2,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    registerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    registerButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    secondaryButton: {
        flex: 0.8,
        minHeight: 54,
        borderRadius: BorderRadius.xl,
        borderWidth: 2,
        borderColor: Colors.primary + '40',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    secondaryButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
});

