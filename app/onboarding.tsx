import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OnboardingStep = 0 | 1 | 2;
type AppSpace = 'client' | 'seller' | 'delivery-persons';

const SPACE_ROUTES: Record<AppSpace, string> = {
    client: '/(tabs)',
    seller: '/seller',
    'delivery-persons': '/delivery-persons',
};

const SLIDES = [
    {
        badge: 'Acheter simplement',
        title: 'Commandez tout ce dont vous avez besoin',
        subtitle:
            'Parcourez les annonces locales, comparez les offres et passez commande en quelques secondes.',
        primaryIcon: 'bag-handle-outline' as const,
        secondaryIcon: 'card-outline' as const,
    },
    {
        badge: 'Vendre et livrer',
        title: 'Developpez votre activite avec UTY',
        subtitle:
            'Vendeur ou livreur, suivez vos performances, gerez vos operations et augmentez vos revenus.',
        primaryIcon: 'storefront-outline' as const,
        secondaryIcon: 'bicycle-outline' as const,
    },
] as const;

const BG_TOP = '#EAF1FF';
const BG_BOTTOM = '#F8FAFF';

export default function OnboardingScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [step, setStep] = React.useState<OnboardingStep>(0);
    const [selectedSpace, setSelectedSpace] = React.useState<AppSpace>('client');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const transition = React.useRef(new Animated.Value(1)).current;

    const canChoosePrivilegedSpace = isAuthenticated;

    React.useEffect(() => {
        if (!isAuthenticated && selectedSpace !== 'client') {
            setSelectedSpace('client');
        }
    }, [isAuthenticated, selectedSpace]);

    React.useEffect(() => {
        Animated.sequence([
            Animated.timing(transition, {
                toValue: 0,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.spring(transition, {
                toValue: 1,
                friction: 8,
                tension: 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, [step, transition]);

    const onChooseSpace = (space: AppSpace) => {
        if (!canChoosePrivilegedSpace && space !== 'client') return;
        setSelectedSpace(space);
    };

    const finishOnboarding = async () => {
        const targetSpace =
            !isAuthenticated && selectedSpace !== 'client' ? 'client' : selectedSpace;
        setIsSubmitting(true);
        try {
            await storage.setOnboardingPreferredSpace(targetSpace);
            await storage.setOnboardingCompleted(true);
            router.replace(SPACE_ROUTES[targetSpace] as any);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onNext = async () => {
        if (step < 2) {
            setStep((value) => Math.min(2, value + 1) as OnboardingStep);
            return;
        }
        await finishOnboarding();
    };

    const onSkip = () => setStep(2);
    const onBack = () => {
        if (step === 0) return;
        setStep((value) => Math.max(0, value - 1) as OnboardingStep);
    };

    const slide = SLIDES[Math.min(step, 1)];
    const ctaLabel = isSubmitting ? 'Chargement...' : step < 2 ? 'Suivant' : "Entrer dans l'app";

    const animatedStyle = {
        opacity: transition,
        transform: [
            {
                translateY: transition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                }),
            },
            {
                scale: transition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1],
                }),
            },
        ],
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={styles.background}>
                <View style={styles.bgShapeOne} />
                <View style={styles.bgShapeTwo} />
                <View style={styles.bgShapeThree} />

                <View style={styles.header}>
                    <TouchableOpacity
                        style={[styles.iconButton, step === 0 && styles.iconButtonGhost]}
                        onPress={onBack}
                        disabled={step === 0}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={20}
                            color={step === 0 ? Colors.gray300 : Colors.primary}
                        />
                    </TouchableOpacity>

                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${((step + 1) / 3) * 100}%` }]} />
                    </View>

                    {step < 2 ? (
                        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                            <Text style={styles.skipText}>Passer</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.skipPlaceholder} />
                    )}
                </View>

                <Animated.View style={[styles.body, animatedStyle]}>
                    {step < 2 ? (
                        <>
                            <View style={styles.slideCard}>
                                <View style={styles.slideTop}>
                                    <View style={styles.badgePill}>
                                        <Text style={styles.badgeText}>{slide.badge}</Text>
                                    </View>
                                </View>

                                <View style={styles.heroVisual}>
                                    <LinearGradient colors={Gradients.primary} style={styles.heroOrbMain}>
                                        <Ionicons name={slide.primaryIcon} size={66} color={Colors.white} />
                                    </LinearGradient>
                                    <LinearGradient colors={Gradients.accent} style={styles.heroOrbSecondary}>
                                        <Ionicons name={slide.secondaryIcon} size={30} color={Colors.primary} />
                                    </LinearGradient>
                                    <View style={styles.heroDotOne} />
                                    <View style={styles.heroDotTwo} />
                                </View>

                                <Text style={styles.slideTitle}>{slide.title}</Text>
                                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

                                <View style={styles.slideIndicators}>
                                    {[0, 1, 2].map((dot) => (
                                        <View
                                            key={`step-dot-${dot}`}
                                            style={[styles.stepDot, dot === step && styles.stepDotActive]}
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.miniStatsRow}>
                                <MiniStat icon="shield-checkmark-outline" label="Paiement securise" />
                                <MiniStat icon="flash-outline" label="Execution rapide" />
                            </View>
                        </>
                    ) : (
                        <View style={styles.spaceSection}>
                            <Text style={styles.spaceTitle}>Commencez simplement</Text>
                            <Text style={styles.spaceSubtitle}>
                                Commencez comme client. Vous pourrez activer vendeur ou livreur plus tard depuis votre profil.
                            </Text>

                            <SpaceChoiceCard
                                title="Espace Client"
                                subtitle="Acheter, comparer et suivre vos commandes."
                                icon="bag-handle-outline"
                                selected={selectedSpace === 'client'}
                                disabled={false}
                                onPress={() => onChooseSpace('client')}
                            />

                            {isAuthenticated ? (
                                <>
                                    <SpaceChoiceCard
                                        title="Espace Vendeur"
                                        subtitle="Publier vos annonces, gerer vos ventes et votre boutique."
                                        icon="storefront-outline"
                                        selected={selectedSpace === 'seller'}
                                        disabled={!canChoosePrivilegedSpace}
                                        onPress={() => onChooseSpace('seller')}
                                    />

                                    <SpaceChoiceCard
                                        title="Espace Livreur"
                                        subtitle="Accepter des courses et developper vos revenus."
                                        icon="bicycle-outline"
                                        selected={selectedSpace === 'delivery-persons'}
                                        disabled={!canChoosePrivilegedSpace}
                                        onPress={() => onChooseSpace('delivery-persons')}
                                    />
                                </>
                            ) : (
                                <TouchableOpacity
                                    style={styles.loginHint}
                                    onPress={() => router.push('/(auth)/login')}
                                >
                                    <Ionicons name="log-in-outline" size={14} color={Colors.primary} />
                                    <Text style={styles.loginHintText}>
                                        Vendeur ou livreur ? Activez-le plus tard depuis votre profil
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </Animated.View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.ctaButton, isSubmitting && styles.ctaButtonDisabled]}
                        onPress={() => void onNext()}
                        disabled={isSubmitting}
                        activeOpacity={0.9}
                    >
                        <LinearGradient colors={Gradients.accent} style={styles.ctaGradient}>
                            <Text style={styles.ctaText}>{ctaLabel}</Text>
                            <View style={styles.ctaIconWrap}>
                                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
}

function MiniStat({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
    return (
        <View style={styles.miniStatCard}>
            <Ionicons name={icon} size={14} color={Colors.primary} />
            <Text style={styles.miniStatText}>{label}</Text>
        </View>
    );
}

type SpaceChoiceCardProps = {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    disabled: boolean;
    onPress: () => void;
};

function SpaceChoiceCard({
    title,
    subtitle,
    icon,
    selected,
    disabled,
    onPress,
}: SpaceChoiceCardProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={disabled ? 1 : 0.9}
            disabled={disabled}
            style={[
                styles.spaceCard,
                selected && styles.spaceCardSelected,
                disabled && styles.spaceCardDisabled,
            ]}
        >
            <LinearGradient colors={Gradients.primary} style={styles.spaceIconWrap}>
                <Ionicons name={icon} size={20} color={Colors.white} />
            </LinearGradient>

            <View style={styles.spaceTextWrap}>
                <Text style={styles.spaceCardTitle}>{title}</Text>
                <Text style={styles.spaceCardSubtitle}>{subtitle}</Text>
            </View>

            {disabled ? (
                <View style={styles.lockBubble}>
                    <Ionicons name="lock-closed-outline" size={12} color={Colors.warning} />
                </View>
            ) : (
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_BOTTOM,
    },
    background: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
    },
    bgShapeOne: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: Colors.primary + '18',
        top: -120,
        left: -60,
    },
    bgShapeTwo: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: Colors.accent + '22',
        bottom: -100,
        right: -70,
    },
    bgShapeThree: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.primary + '12',
        top: 180,
        right: -20,
    },
    header: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    iconButtonGhost: {
        opacity: 0.55,
    },
    progressBarTrack: {
        flex: 1,
        height: 8,
        borderRadius: 999,
        backgroundColor: Colors.gray200,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 999,
    },
    skipButton: {
        minWidth: 58,
        alignItems: 'flex-end',
    },
    skipText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    skipPlaceholder: {
        width: 58,
    },
    body: {
        flex: 1,
        justifyContent: 'center',
    },
    slideCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xxxl,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.lg,
    },
    slideTop: {
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    badgePill: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        backgroundColor: Colors.primary + '14',
        borderWidth: 1,
        borderColor: Colors.primary + '22',
    },
    badgeText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        letterSpacing: 0.4,
    },
    heroVisual: {
        height: 240,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        marginBottom: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroOrbMain: {
        width: 170,
        height: 170,
        borderRadius: 85,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    heroOrbSecondary: {
        position: 'absolute',
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        bottom: 34,
        right: 52,
        ...Shadows.md,
    },
    heroDotOne: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.accent,
        top: 50,
        right: 46,
    },
    heroDotTwo: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primaryLight,
        bottom: 42,
        left: 50,
    },
    slideTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xxl,
        lineHeight: 30,
        textAlign: 'center',
        fontWeight: Typography.fontWeight.extrabold,
    },
    slideSubtitle: {
        marginTop: Spacing.md,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.base,
        lineHeight: 22,
        textAlign: 'center',
    },
    slideIndicators: {
        marginTop: Spacing.xl,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.gray300,
    },
    stepDotActive: {
        width: 24,
        borderRadius: 999,
        backgroundColor: Colors.primary,
    },
    miniStatsRow: {
        marginTop: Spacing.lg,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    miniStatCard: {
        flex: 1,
        minHeight: 38,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        ...Shadows.sm,
    },
    miniStatText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    spaceSection: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xxxl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.lg,
    },
    spaceTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xxl,
        textAlign: 'center',
        fontWeight: Typography.fontWeight.extrabold,
    },
    spaceSubtitle: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    spaceCard: {
        minHeight: 96,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        gap: Spacing.md,
    },
    spaceCardSelected: {
        borderColor: Colors.primary + '70',
        backgroundColor: Colors.primary + '10',
    },
    spaceCardDisabled: {
        opacity: 0.68,
    },
    spaceIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spaceTextWrap: {
        flex: 1,
    },
    spaceCardTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
    },
    spaceCardSubtitle: {
        marginTop: 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 19,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: Colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    lockBubble: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.warning + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginHint: {
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.full,
        minHeight: 38,
        borderWidth: 1,
        borderColor: Colors.primary + '35',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: Colors.primary + '10',
    },
    loginHintText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    footer: {
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    ctaButton: {
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    ctaButtonDisabled: {
        opacity: 0.68,
    },
    ctaGradient: {
        minHeight: 60,
        paddingHorizontal: Spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    ctaText: {
        color: Colors.primaryDark,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    ctaIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
