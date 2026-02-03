import { Colors } from '@/constants/theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface LoadingSpinnerProps {
    size?: 'small' | 'large';
    color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'large',
    color = Colors.primary,
}) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
