import { getCategoryIconText, getCategoryIconUri } from '@/utils/categoryIcon';
import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

interface CategoryIconProps {
    icon?: unknown;
    size?: number;
    fallback?: string;
    textStyle?: StyleProp<TextStyle>;
    imageStyle?: StyleProp<ImageStyle>;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
    icon,
    size = 20,
    fallback,
    textStyle,
    imageStyle,
}) => {
    const uri = getCategoryIconUri(icon);

    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={[
                    styles.image,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    },
                    imageStyle,
                ]}
            />
        );
    }

    return (
        <Text style={[{ fontSize: size }, textStyle]}>
            {getCategoryIconText(icon, fallback)}
        </Text>
    );
};

const styles = StyleSheet.create({
    image: {
        resizeMode: 'cover',
    },
});
