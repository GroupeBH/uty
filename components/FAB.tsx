/**
 * Floating Action Button (FAB) pour publier une annonce
 * Version améliorée avec animations
 */

import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FABProps {
    onPress?: () => void;
}

export const FAB: React.FC<FABProps> = ({ onPress }) => {
    const router = useRouter();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 0.9,
                useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            router.push('/(tabs)/publish');
        }
    };

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '90deg'],
    });

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.button,
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={handlePress}
                    activeOpacity={1}
                >
                    <LinearGradient
                        colors={Gradients.accent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                            <Ionicons name="add" size={32} color={Colors.primary} />
                        </Animated.View>
                    </LinearGradient>
                    
                    {/* Pulse effect */}
                    <View style={styles.pulseContainer}>
                        <View style={[styles.pulse, styles.pulse1]} />
                        <View style={[styles.pulse, styles.pulse2]} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
            
            {/* Label optionnel */}
            <View style={styles.labelContainer}>
                <Text style={styles.label}>Publier</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,
        right: Spacing.xl,
        zIndex: 1000,
        alignItems: 'center',
    },
    button: {
        width: 68,
        height: 68,
        borderRadius: 34,
        ...Shadows.xl,
    },
    gradient: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: Colors.white,
    },
    pulseContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1,
    },
    pulse: {
        position: 'absolute',
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: Colors.accent,
        opacity: 0.3,
    },
    pulse1: {
        transform: [{ scale: 1.2 }],
    },
    pulse2: {
        transform: [{ scale: 1.4 }],
        opacity: 0.15,
    },
    labelContainer: {
        marginTop: Spacing.xs,
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs / 2,
        borderRadius: BorderRadius.full,
        ...Shadows.md,
    },
    label: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        textAlign: 'center',
    },
});
