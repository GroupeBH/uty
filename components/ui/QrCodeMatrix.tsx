import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type QrCodeMatrixProps = {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    style?: StyleProp<ViewStyle>;
};

type QrSvgProps = {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    quietZone?: number;
};

const QUIET_ZONE_PIXELS = 8;
let hasLoggedMissingQrSvgError = false;
let cachedQrSvgComponent: React.ComponentType<QrSvgProps> | null | undefined;

const getQrSvgComponent = (): React.ComponentType<QrSvgProps> | null => {
    if (cachedQrSvgComponent !== undefined) {
        return cachedQrSvgComponent;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const qrSvgModule = require('react-native-qrcode-svg') as {
            default?: React.ComponentType<QrSvgProps>;
        };
        cachedQrSvgComponent = qrSvgModule.default || null;
    } catch (error) {
        if (!hasLoggedMissingQrSvgError) {
            console.warn('[qr] react-native-qrcode-svg est introuvable.', error);
            hasLoggedMissingQrSvgError = true;
        }
        cachedQrSvgComponent = null;
    }

    return cachedQrSvgComponent;
};

export function QrCodeMatrix({
    value,
    size = 220,
    color = '#000000',
    backgroundColor = '#FFFFFF',
    style,
}: QrCodeMatrixProps) {
    const QrSvgComponent = getQrSvgComponent();
    const normalizedValue = value.trim();

    if (!QrSvgComponent || !normalizedValue) {
        return null;
    }

    return (
        <View accessibilityRole="image" accessibilityLabel="Code QR" style={style}>
            <QrSvgComponent
                value={normalizedValue}
                size={size}
                color={color}
                backgroundColor={backgroundColor}
                quietZone={QUIET_ZONE_PIXELS}
            />
        </View>
    );
}
