import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OnboardingStep = 0 | 1 | 2;
type AppSpace = 'client' | 'seller' | 'delivery-persons';

const BLUE_CTA = '#4B73E6';
const YELLOW_CTA = '#F8C527';
const BG_TOP = '#0A1230';
const BG_BOTTOM = '#050A1D';

const SPACE_ROUTES: Record<AppSpace, string> = {
    client: '/(tabs)',
    seller: '/seller',
    'delivery-persons': '/delivery-persons',
};

const SLIDES = [
    {
        titlePrefix: 'Tout ce dont vous avez besoin, ',
        titleHighlight: 'livre chez vous',
        subtitle:
            "Decouvrez des millions de produits et profitez d'une livraison ultra-rapide.",
    },
    {
        titlePrefix: "Gagnez de l'argent en livrant ou ",
        titleHighlight: 'boostez vos ventes',
        subtitle:
            'Rejoignez notre reseau de partenaires dynamiques. Coursier ou commercant, nous vous aidons a grandir.',
    },
] as const;

export default function OnboardingScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [step, setStep] = React.useState<OnboardingStep>(0);
    const [selectedSpace, setSelectedSpace] = React.useState<AppSpace>('client');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const canChoosePrivilegedSpace = isAuthenticated;

    React.useEffect(() => {
        if (!isAuthenticated && selectedSpace !== 'client') {
            setSelectedSpace('client');
        }
    }, [isAuthenticated, selectedSpace]);

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
            setStep((value) => (Math.min(2, value + 1) as OnboardingStep));
            return;
        }
        await finishOnboarding();
    };

    const onSkip = () => {
        setStep(2);
    };

    const onBack = () => {
        if (step === 0) return;
        setStep((value) => (Math.max(0, value - 1) as OnboardingStep));
    };

    const slideIndex = Math.min(step, 1);
    const slide = SLIDES[slideIndex];

    const ctaLabel =
        isSubmitting ? 'Chargement...' : step < 2 ? 'Suivant' : 'Continuer';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={styles.background}>
                <View style={styles.bgHaloOne} />
                <View style={styles.bgHaloTwo} />

                <View style={styles.header}>
                    {step === 2 ? (
                        <TouchableOpacity style={styles.backCircle} onPress={onBack}>
                            <Ionicons name="arrow-back" size={20} color={Colors.white} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.backPlaceholder} />
                    )}

                    {step === 2 ? (
                        <Text style={styles.stepCounter}>ETAPE 3 SUR 3</Text>
                    ) : (
                        <View style={styles.backPlaceholder} />
                    )}

                    {step < 2 ? (
                        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                            <Text style={styles.skipText}>PASSER</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.backPlaceholder} />
                    )}
                </View>

                {step < 2 ? (
                    <View style={styles.slideWrapper}>
                        <View style={styles.dotRowTop}>
                            {[0, 1, 2].map((dot) => (
                                <View
                                    key={`top-dot-${dot}`}
                                    style={[
                                        styles.dot,
                                        step === dot && styles.dotActive,
                                    ]}
                                />
                            ))}
                        </View>

                        <View style={[styles.visualCard, step === 0 ? styles.visualCardCream : styles.visualCardBlue]}>
                            {step === 0 ? (
                                <>
                                    <Ionicons name="person-outline" size={130} color="#2B3E5A" style={styles.mainVisualIcon} />
                                    <View style={[styles.floatingBubble, styles.floatLeftYellow]}>
                                        <Ionicons name="bag-outline" size={18} color="#0A1230" />
                                    </View>
                                    <View style={[styles.floatingBubble, styles.floatMidDark]}>
                                        <Ionicons name="heart" size={18} color={BLUE_CTA} />
                                    </View>
                                    <View style={[styles.floatingBubble, styles.floatRightBlue]}>
                                        <Ionicons name="card-outline" size={18} color={Colors.white} />
                                    </View>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="bicycle-outline" size={132} color={YELLOW_CTA} style={styles.mainVisualIcon} />
                                    <View style={[styles.floatingBubble, styles.floatPack]}>
                                        <Ionicons name="cube-outline" size={18} color="#0A1230" />
                                    </View>
                                    <View style={[styles.smallPoint, styles.pointA]} />
                                    <View style={[styles.smallPoint, styles.pointB]} />
                                    <View style={[styles.smallRing, styles.ringA]} />
                                </>
                            )}
                        </View>

                        <Text style={styles.slideTitle}>
                            {slide.titlePrefix}
                            <Text style={styles.slideTitleHighlight}>{slide.titleHighlight}</Text>
                        </Text>
                        <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

                        <View style={styles.dotRowBottom}>
                            {[0, 1, 2].map((dot) => (
                                <View
                                    key={`bottom-dot-${dot}`}
                                    style={[
                                        styles.dot,
                                        step === dot && styles.dotActive,
                                    ]}
                                />
                            ))}
                        </View>

                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="shield-checkmark-outline" size={14} color={Colors.gray400} />
                                <Text style={styles.metaText}>Securise</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="flash-outline" size={14} color={Colors.gray400} />
                                <Text style={styles.metaText}>Rapide</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.spaceStepWrapper}>
                        <Text style={styles.spaceTitle}>Choisissez votre espace</Text>
                        <Text style={styles.spaceSubtitle}>
                            Selectionnez le profil qui correspond le mieux a votre utilisation.
                        </Text>

                        <SpaceChoiceCard
                            title="Je suis un Client"
                            subtitle="Achetez vos articles preferes et decouvrez des nouveautes."
                            icon="bag-outline"
                            selected={selectedSpace === 'client'}
                            disabled={false}
                            onPress={() => onChooseSpace('client')}
                        />

                        <SpaceChoiceCard
                            title="Je suis un Vendeur"
                            subtitle="Gerez votre boutique, vos stocks et vos ventes facilement."
                            icon="storefront-outline"
                            selected={selectedSpace === 'seller'}
                            disabled={!canChoosePrivilegedSpace}
                            onPress={() => onChooseSpace('seller')}
                        />

                        <SpaceChoiceCard
                            title="Je suis un Livreur"
                            subtitle="Gagnez de l'argent en livrant des colis dans votre zone."
                            icon="bicycle-outline"
                            selected={selectedSpace === 'delivery-persons'}
                            disabled={!canChoosePrivilegedSpace}
                            onPress={() => onChooseSpace('delivery-persons')}
                        />

                        {!isAuthenticated ? (
                            <TouchableOpacity
                                style={styles.loginBanner}
                                onPress={() => router.push('/(auth)/login')}
                            >
                                <Ionicons name="log-in-outline" size={15} color={Colors.primary} />
                                <Text style={styles.loginBannerText}>
                                    Connectez-vous pour debloquer vendeur/livreur
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        <Text style={styles.termsText}>
                            En continuant, vous acceptez nos Conditions
                            {" d'Utilisation "}
                            et notre Politique de Confidentialite.
                        </Text>
                    </View>
                )}

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.ctaButton,
                            step === 2 ? styles.ctaYellow : styles.ctaBlue,
                            isSubmitting && styles.ctaDisabled,
                        ]}
                        onPress={() => void onNext()}
                        disabled={isSubmitting}
                        activeOpacity={0.9}
                    >
                        <Text
                            style={[
                                styles.ctaText,
                                step === 2 ? styles.ctaTextDark : styles.ctaTextLight,
                            ]}
                        >
                            {ctaLabel}
                        </Text>
                        <Ionicons
                            name="arrow-forward"
                            size={22}
                            color={step === 2 ? '#0B1128' : Colors.white}
                        />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </SafeAreaView>
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
            style={[
                styles.spaceCard,
                selected && styles.spaceCardSelected,
                disabled && styles.spaceCardDisabled,
            ]}
            disabled={disabled}
        >
            <View style={styles.spaceIconBox}>
                <Ionicons name={icon} size={22} color={BLUE_CTA} />
            </View>
            <View style={styles.spaceTextBox}>
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
    bgHaloOne: {
        position: 'absolute',
        width: 380,
        height: 380,
        borderRadius: 190,
        backgroundColor: '#1F3B8C22',
        top: -120,
        left: -90,
    },
    bgHaloTwo: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#17326C33',
        bottom: -110,
        right: -80,
    },
    header: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    backCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A2547',
    },
    backPlaceholder: {
        width: 44,
        height: 44,
    },
    stepCounter: {
        color: '#A9B7D1',
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        letterSpacing: 0.7,
    },
    skipButton: {
        minWidth: 68,
        alignItems: 'flex-end',
    },
    skipText: {
        color: '#A9B7D1',
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    slideWrapper: {
        flex: 1,
    },
    dotRowTop: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    dot: {
        width: 44,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#32456B',
    },
    dotActive: {
        backgroundColor: BLUE_CTA,
    },
    visualCard: {
        height: 330,
        borderRadius: 34,
        borderWidth: 1,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    visualCardCream: {
        backgroundColor: '#ECE8E1',
        borderColor: '#EDE4D8',
    },
    visualCardBlue: {
        backgroundColor: '#2D4CB9',
        borderColor: '#3F62D8',
    },
    mainVisualIcon: {
        opacity: 0.95,
    },
    floatingBubble: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatLeftYellow: {
        left: 22,
        top: 24,
        backgroundColor: YELLOW_CTA,
    },
    floatMidDark: {
        right: 32,
        top: 116,
        borderRadius: 26,
        backgroundColor: '#23355A',
    },
    floatRightBlue: {
        right: 18,
        top: 182,
        backgroundColor: BLUE_CTA,
    },
    floatPack: {
        right: 38,
        top: 82,
        backgroundColor: YELLOW_CTA,
    },
    smallPoint: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    pointA: {
        left: 34,
        top: 52,
        backgroundColor: YELLOW_CTA,
    },
    pointB: {
        right: 88,
        bottom: 56,
        backgroundColor: '#91A7DF',
    },
    smallRing: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 3,
        borderColor: '#DCE6FF',
    },
    ringA: {
        right: 32,
        top: 106,
    },
    slideTitle: {
        marginTop: Spacing.xl,
        color: Colors.white,
        fontSize: 54 / 2,
        lineHeight: 35,
        textAlign: 'center',
        fontWeight: Typography.fontWeight.extrabold,
        paddingHorizontal: Spacing.md,
    },
    slideTitleHighlight: {
        color: BLUE_CTA,
    },
    slideSubtitle: {
        marginTop: Spacing.md,
        color: '#8FA0BF',
        fontSize: Typography.fontSize.xl,
        lineHeight: 38 / 2,
        textAlign: 'center',
        paddingHorizontal: Spacing.sm,
    },
    dotRowBottom: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xl,
    },
    metaRow: {
        marginTop: Spacing.xl,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.xl,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        color: '#8FA0BF',
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
    },
    spaceStepWrapper: {
        flex: 1,
        paddingTop: Spacing.sm,
    },
    spaceTitle: {
        color: Colors.white,
        fontSize: 52 / 2,
        textAlign: 'center',
        fontWeight: Typography.fontWeight.extrabold,
    },
    spaceSubtitle: {
        marginTop: Spacing.sm,
        color: '#8FA0BF',
        textAlign: 'center',
        fontSize: Typography.fontSize.xl,
        lineHeight: 38 / 2,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.sm,
    },
    spaceCard: {
        borderRadius: 26,
        backgroundColor: '#1A2447',
        borderWidth: 2,
        borderColor: 'transparent',
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        minHeight: 132,
    },
    spaceCardSelected: {
        borderColor: BLUE_CTA,
        backgroundColor: '#111D42',
    },
    spaceCardDisabled: {
        opacity: 0.78,
    },
    spaceIconBox: {
        width: 62,
        height: 62,
        borderRadius: 20,
        backgroundColor: '#1E2F61',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    spaceTextBox: {
        flex: 1,
        paddingRight: Spacing.xs,
    },
    spaceCardTitle: {
        color: Colors.white,
        fontSize: 24 / 2,
        fontWeight: Typography.fontWeight.extrabold,
    },
    spaceCardSubtitle: {
        marginTop: 4,
        color: '#8FA0BF',
        fontSize: Typography.fontSize.xl,
        lineHeight: 18 + 2,
    },
    radioOuter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#455A7D',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: BLUE_CTA,
    },
    radioInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: BLUE_CTA,
    },
    lockBubble: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2C3551',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginBanner: {
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: '#111D42',
        borderWidth: 1,
        borderColor: BLUE_CTA + '70',
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    loginBannerText: {
        color: '#C9D6F5',
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    termsText: {
        marginTop: Spacing.sm,
        color: '#6F7F9E',
        textAlign: 'center',
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        paddingHorizontal: Spacing.xs,
    },
    footer: {
        paddingBottom: Spacing.md,
        paddingTop: Spacing.md,
    },
    ctaButton: {
        minHeight: 68,
        borderRadius: BorderRadius.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
        ...Shadows.lg,
    },
    ctaBlue: {
        backgroundColor: BLUE_CTA,
    },
    ctaYellow: {
        backgroundColor: YELLOW_CTA,
    },
    ctaDisabled: {
        opacity: 0.72,
    },
    ctaText: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    ctaTextLight: {
        color: Colors.white,
    },
    ctaTextDark: {
        color: '#0B1128',
    },
});
