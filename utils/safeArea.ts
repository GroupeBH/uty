import { Spacing } from '@/constants/theme';
import { Platform } from 'react-native';

const ANDROID_NAV_FALLBACK = Spacing.xxl;
const DEFAULT_BOTTOM_FALLBACK = Spacing.lg;

export const getBottomSafeInset = (bottomInset: number): number => {
    if (bottomInset > 0) {
        return bottomInset;
    }

    return Platform.OS === 'android' ? ANDROID_NAV_FALLBACK : DEFAULT_BOTTOM_FALLBACK;
};

export const getBottomActionPadding = (
    bottomInset: number,
    extraPadding: number = Spacing.md,
): number => getBottomSafeInset(bottomInset) + extraPadding;
