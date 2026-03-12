import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useAppDispatch } from '@/store/hooks';
import { useRegisterMutation, useVerifyOtpMutation } from '@/store/api/authApi';
import { useGetCategoriesQuery } from '@/store/api/categoriesApi';
import { setCredentials } from '@/store/slices/authSlice';
import { tokenService } from '@/services/tokenService';
import { storage } from '@/utils/storage';
import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type SignupStep = 'otp' | 'identity' | 'security' | 'preferences';
const SIGNUP_STEPS: Exclude<SignupStep, 'otp'>[] = ['identity', 'security', 'preferences'];

export default function OtpScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const params = useLocalSearchParams<{ phone: string; mode: 'register' | 'login' }>();
    const { showAlert: showStyledAlert, alertNode } = useStyledAlert();

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
    const keyboardVerticalOffset = Platform.select({
        ios: 0,
        android: Math.max(insets.bottom, 10),
        default: 0,
    });

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
            showStyledAlert('Erreur', 'Veuillez entrer le code à 5 chiffres');
            return;
        }

        try {
            await verifyOtp({ phone: params.phone, otp: otpCode }).unwrap();
            setStep('identity');
        } catch (error: any) {
            console.error('OTP verification error:', error);
            showStyledAlert('Erreur', error?.data?.message || 'Code OTP invalide');
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
            showStyledAlert('Erreur', 'Veuillez remplir votre prénom et votre nom');
            return false;
        }
        return true;
    };

    const validateSecurityStep = () => {
        if (!/^\d{4}$/.test(pin)) {
            showStyledAlert('Erreur', 'Le code PIN doit contenir 4 chiffres');
            return false;
        }
        if (pin !== confirmPin) {
            showStyledAlert('Erreur', 'Les codes PIN ne correspondent pas');
            return false;
        }
        return true;
    };

    const validatePreferencesStep = () => {
        if (selectedCategories.length === 0) {
            showStyledAlert('Erreur', 'Veuillez sélectionner au moins une catégorie');
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

            showStyledAlert('Succès', 'Votre compte a été créé !', [
                {
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)'),
                },
            ]);
        } catch (error: any) {
            console.error('Registration error:', error);
            showStyledAlert('Erreur', error?.data?.message || 'Erreur lors de l\'inscription');
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

    const modeTitle =
        step === 'otp'
            ? 'Verification OTP'
            : step === 'identity'
              ? 'Completez votre profil'
              : step === 'security'
                ? 'Securisez votre compte'
                : 'Choisissez vos preferences';

    const modeSubtitle =
        step === 'otp'
            ? `Entrez le code recu au ${params.phone || 'numero renseigne'}.`
            : step === 'identity'
              ? 'Renseignez vos informations personnelles.'
              : step === 'security'
                ? 'Creez un code PIN pour proteger votre compte.'
                : 'Selectionnez les categories qui vous interessent.';

    const helperMessage =
        step === 'otp'
            ? 'Le code OTP contient 5 chiffres.'
            : step === 'identity'
              ? 'Utilisez vos vraies informations pour faciliter le support.'
              : step === 'security'
                ? 'Votre PIN doit contenir exactement 4 chiffres.'
                : 'Choisissez au moins une categorie pour continuer.';

    const modeColors = step === 'otp' ? Gradients.accent : Gradients.primary;
    const modeIcon =
        step === 'otp'
            ? 'shield-checkmark-outline'
            : step === 'identity'
              ? 'person-outline'
              : step === 'security'
                ? 'lock-closed-outline'
                : 'grid-outline';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={keyboardVerticalOffset}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <View pointerEvents="none" style={styles.colorOrbPrimary} />
                    <View pointerEvents="none" style={styles.colorOrbAccent} />

                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
                            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <LinearGradient colors={modeColors} style={styles.brandBadge}>
                            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.white} />
                            <Text style={styles.brandBadgeText}>UTY Secure</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.modeCard}>
                        <LinearGradient colors={modeColors} style={styles.modeCardGradient}>
                            <View style={styles.modeIconCircle}>
                                <Ionicons
                                    name={modeIcon as keyof typeof Ionicons.glyphMap}
                                    size={22}
                                    color={Colors.white}
                                />
                            </View>
                            <View style={styles.modeTextWrap}>
                                <Text style={styles.modeStepLabel}>
                                    {step === 'otp' ? 'Etape 1/4' : `Etape ${currentSignupStepIndex + 2}/4`}
                                </Text>
                                <Text style={styles.modeTitle}>{modeTitle}</Text>
                                <Text style={styles.modeSubtitle}>{modeSubtitle}</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {step === 'otp' ? (
                        <>
                            <View style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            inputRefs.current[index] = ref;
                                        }}
                                        style={[styles.otpInput, digit && styles.otpInputFilled]}
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
                                style={[styles.primaryButton, isVerifying && styles.disabledButton]}
                                onPress={handleVerifyOtp}
                                disabled={isVerifying}
                            >
                                <LinearGradient colors={Gradients.accent} style={styles.primaryGradient}>
                                    {isVerifying ? (
                                        <Text style={styles.primaryButtonText}>Verification...</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.primaryButtonText}>Verifier</Text>
                                            <View style={styles.primaryIconWrap}>
                                                <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
                                            </View>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.signupStepper}>
                                {SIGNUP_STEPS.map((signupStep, index) => {
                                    const isActive = currentSignupStepIndex === index;
                                    const isDone = currentSignupStepIndex > index;
                                    const label =
                                        signupStep === 'identity'
                                            ? 'Profil'
                                            : signupStep === 'security'
                                              ? 'Securite'
                                              : 'Preferences';
                                    return (
                                        <View
                                            key={signupStep}
                                            style={[
                                                styles.signupStepChip,
                                                isActive && styles.signupStepChipActive,
                                                isDone && styles.signupStepChipDone,
                                            ]}
                                        >
                                            {isDone ? (
                                                <Ionicons name="checkmark" size={14} color={Colors.white} />
                                            ) : (
                                                <Text
                                                    style={[
                                                        styles.signupStepNumber,
                                                        isActive && styles.signupStepNumberActive,
                                                    ]}
                                                >
                                                    {index + 1}
                                                </Text>
                                            )}
                                            <Text
                                                style={[
                                                    styles.signupStepText,
                                                    isActive && styles.signupStepTextActive,
                                                    isDone && styles.signupStepTextDone,
                                                ]}
                                            >
                                                {label}
                                            </Text>
                                        </View>
                                    );
                                })}
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
                                                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPin(!showPin)}>
                                                    <Ionicons
                                                        name={showPin ? 'eye-off-outline' : 'eye-outline'}
                                                        size={18}
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
                                                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPin(!showConfirmPin)}>
                                                    <Ionicons
                                                        name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                                                        size={18}
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
                                                    <CategoryIcon
                                                        icon={category.icon}
                                                        size={16}
                                                        textStyle={styles.categoryIcon}
                                                        imageStyle={styles.categoryIconImage}
                                                    />
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
                                        style={[styles.primaryButton, step === 'preferences' && isRegistering && styles.disabledButton]}
                                        onPress={goToNextSignupStep}
                                        disabled={step === 'preferences' && isRegistering}
                                    >
                                        <LinearGradient
                                            colors={Gradients.primary}
                                            style={styles.primaryGradient}
                                        >
                                            {step === 'preferences' && isRegistering ? (
                                                <Text style={styles.primaryButtonText}>Inscription...</Text>
                                            ) : (
                                                <>
                                                    <Text style={styles.primaryButtonText}>
                                                        {step === 'preferences' ? 'Creer mon compte' : 'Continuer'}
                                                    </Text>
                                                    <View style={styles.primaryIconWrap}>
                                                        <Ionicons
                                                            name={step === 'preferences' ? 'checkmark' : 'arrow-forward'}
                                                            size={18}
                                                            color={Colors.primary}
                                                        />
                                                    </View>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={styles.helperRow}>
                        <Ionicons
                            name={step === 'security' ? 'lock-closed-outline' : 'information-circle-outline'}
                            size={16}
                            color={step === 'otp' ? Colors.accentDark : Colors.primary}
                        />
                        <Text style={styles.helperText}>{helperMessage}</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            {alertNode}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFF',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        position: 'relative',
    },
    colorOrbPrimary: {
        position: 'absolute',
        top: 84,
        right: -22,
        width: 102,
        height: 102,
        borderRadius: 51,
        backgroundColor: Colors.primary + '22',
    },
    colorOrbAccent: {
        position: 'absolute',
        top: 170,
        left: -34,
        width: 126,
        height: 126,
        borderRadius: 63,
        backgroundColor: Colors.accent + '24',
    },
    header: {
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    brandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        ...Shadows.sm,
    },
    brandBadgeText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    modeCard: {
        marginBottom: Spacing.lg,
    },
    modeCardGradient: {
        borderRadius: BorderRadius.xxl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md + 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        ...Shadows.lg,
    },
    modeIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF33',
        borderWidth: 1,
        borderColor: '#FFFFFF55',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeTextWrap: {
        flex: 1,
    },
    modeStepLabel: {
        color: Colors.white + 'D9',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    modeTitle: {
        color: Colors.white,
        marginTop: 2,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    modeSubtitle: {
        color: Colors.white + 'E0',
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        lineHeight: 18,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    otpInput: {
        width: 54,
        height: 60,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        textAlign: 'center',
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    otpInputFilled: {
        borderColor: Colors.accentDark,
        backgroundColor: Colors.accent + '12',
    },
    primaryButton: {
        flex: 1.2,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    primaryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    primaryButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    primaryIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.white + '66',
        backgroundColor: Colors.white,
    },
    disabledButton: {
        opacity: 0.6,
    },
    signupStepper: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    signupStepChip: {
        flex: 1,
        minHeight: 38,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: Spacing.xs,
    },
    signupStepChipActive: {
        borderColor: Colors.primary + '60',
        backgroundColor: Colors.primary + '12',
    },
    signupStepChipDone: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    signupStepNumber: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray500,
    },
    signupStepNumberActive: {
        color: Colors.primary,
    },
    signupStepText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    signupStepTextActive: {
        color: Colors.primary,
    },
    signupStepTextDone: {
        color: Colors.white,
    },
    form: {
        gap: Spacing.md,
    },
    inputGroup: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    inputContainerFocused: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '0A',
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    eyeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray100,
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
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
    },
    categoryChipSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryIconImage: {
        borderRadius: 8,
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
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    secondaryButton: {
        flex: 0.8,
        minHeight: 54,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
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
    helperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.xs,
        marginTop: Spacing.md,
    },
    helperText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        lineHeight: 18,
        fontWeight: Typography.fontWeight.medium,
    },
});


