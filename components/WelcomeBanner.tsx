/**
 * Composant WelcomeBanner - Bannière de bienvenue animée
 */

import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WelcomeBannerProps {
    onDismiss?: () => void;
    onAction?: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ onDismiss, onAction }) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss?.();
        });
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <LinearGradient
                colors={Gradients.sunset}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Bouton de fermeture */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleDismiss}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={20} color={Colors.white} />
                </TouchableOpacity>

                {/* Contenu */}
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="gift-outline" size={32} color={Colors.white} />
                    </View>
                    
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>🎉 Offre spéciale</Text>
                        <Text style={styles.subtitle}>
                            Publiez votre première annonce gratuitement !
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onAction}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionText}>Commencer</Text>
                        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    gradient: {
        padding: Spacing.lg,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
        marginBottom: Spacing.xs / 2,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        opacity: 0.95,
        lineHeight: 18,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
        ...Shadows.md,
    },
    actionText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
});

