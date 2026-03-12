const DEFAULT_CATEGORY_ICON = '🏷️';
const ICON_URL_PATTERN = /^(https?:\/\/|data:image\/)/i;

export const getCategoryIconUri = (icon: unknown): string | null => {
    if (typeof icon !== 'string') return null;
    const trimmed = icon.trim();
    if (!trimmed) return null;
    return ICON_URL_PATTERN.test(trimmed) ? trimmed : null;
};

export const getCategoryIconText = (icon: unknown, fallback = DEFAULT_CATEGORY_ICON): string => {
    const uri = getCategoryIconUri(icon);
    if (uri) return fallback;

    if (typeof icon === 'string') {
        const trimmed = icon.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }

    return fallback;
};
