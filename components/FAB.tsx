/**
 * Floating Action Button (FAB) pour publier une annonce
 */

import { Colors, Gradients, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface FABProps {
    onPress?: () => void;
}

export const FAB: React.FC<FABProps> = ({ onPress }) => {
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            // Navigate to publish screen
            router.push('/(tabs)/publish');
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.button}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={Gradients.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    <Ionicons name="add" size={32} color={Colors.primary} />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90, // Au-dessus de la tab bar
        right: Spacing.xl,
        zIndex: 1000,
    },
    button: {
        width: 64,
        height: 64,
        borderRadius: 32,
        ...Shadows.xl,
    },
    gradient: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
