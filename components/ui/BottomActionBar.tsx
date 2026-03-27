import { getBottomActionPadding } from '@/utils/safeArea';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomActionBarProps = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    extraBottomPadding?: number;
};

export function BottomActionBar({
    children,
    style,
    extraBottomPadding,
}: BottomActionBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                style,
                {
                    paddingBottom: getBottomActionPadding(insets.bottom, extraBottomPadding),
                },
            ]}
        >
            {children}
        </View>
    );
}
