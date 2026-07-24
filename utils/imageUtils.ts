import * as FileSystem from 'expo-file-system/legacy';

const ANNOUNCEMENT_IMAGE_MAX_DIMENSION = 1600;
const ANNOUNCEMENT_IMAGE_COMPRESS_QUALITY = 0.72;

type ImageManipulatorAction = {
    resize: {
        width?: number;
        height?: number;
    };
};

export interface AnnouncementImageInput {
    uri: string;
    fileName?: string | null;
    width?: number | null;
    height?: number | null;
}

export interface PreparedAnnouncementImage {
    uri: string;
    name: string;
    type: string;
    size?: number;
}

/**
 * Convertit une URI d'image en base64
 * @param uri - URI de l'image locale
 * @returns String base64 de l'image
 */
export const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        console.log('base64 of image', base64);
        return base64;
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
};

/**
 * Convertit un tableau d'URIs d'images en base64
 * @param uris - Tableau d'URIs d'images locales
 * @returns Tableau de strings base64
 */
export const convertImagesToBase64 = async (uris: string[]): Promise<string[]> => {
    try {
        const base64Images = await Promise.all(
            uris.map((uri) => convertImageToBase64(uri))
        );
        return base64Images;
    } catch (error) {
        console.error('Error converting images to base64:', error);
        throw error;
    }
};

/**
 * Obtient le type MIME d'une image depuis son URI
 * @param uri - URI de l'image
 * @returns Type MIME (ex: 'image/jpeg')
 */
export const getImageMimeType = (uri: string): string => {
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'webp':
            return 'image/webp';
        default:
            return 'image/jpeg';
    }
};

const buildCompressedImageName = (name?: string | null): string => {
    const fallback = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const baseName = (name || fallback)
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || fallback;

    return `${baseName}.jpg`;
};

const getResizeAction = (
    width?: number | null,
    height?: number | null,
): ImageManipulatorAction[] => {
    const numericWidth = Number(width);
    const numericHeight = Number(height);

    if (
        !Number.isFinite(numericWidth) ||
        !Number.isFinite(numericHeight) ||
        numericWidth <= 0 ||
        numericHeight <= 0
    ) {
        return [{ resize: { width: ANNOUNCEMENT_IMAGE_MAX_DIMENSION } }];
    }

    const longestSide = Math.max(numericWidth, numericHeight);
    if (longestSide <= ANNOUNCEMENT_IMAGE_MAX_DIMENSION) {
        return [];
    }

    const ratio = ANNOUNCEMENT_IMAGE_MAX_DIMENSION / longestSide;
    return [
        {
            resize: {
                width: Math.round(numericWidth * ratio),
                height: Math.round(numericHeight * ratio),
            },
        },
    ];
};

export const prepareAnnouncementImage = async (
    image: AnnouncementImageInput,
): Promise<PreparedAnnouncementImage> => {
    const ImageManipulator = await import('expo-image-manipulator');
    const manipulated = await ImageManipulator.manipulateAsync(
        image.uri,
        getResizeAction(image.width, image.height),
        {
            compress: ANNOUNCEMENT_IMAGE_COMPRESS_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
        },
    );

    let size: number | undefined;
    try {
        const info = await FileSystem.getInfoAsync(manipulated.uri);
        size = info.exists && typeof info.size === 'number' ? info.size : undefined;
    } catch {
        size = undefined;
    }

    return {
        uri: manipulated.uri,
        name: buildCompressedImageName(image.fileName),
        type: 'image/jpeg',
        size,
    };
};

export const prepareAnnouncementImages = async (
    images: AnnouncementImageInput[],
): Promise<PreparedAnnouncementImage[]> => {
    const preparedImages: PreparedAnnouncementImage[] = [];
    for (const image of images) {
        preparedImages.push(await prepareAnnouncementImage(image));
    }
    return preparedImages;
};

/**
 * Convertit une image en data URL (base64 avec préfixe)
 * @param uri - URI de l'image locale
 * @returns Data URL complet (data:image/jpeg;base64,...)
 */
export const convertImageToDataUrl = async (uri: string): Promise<string> => {
    try {
        const base64 = await convertImageToBase64(uri);
        const mimeType = getImageMimeType(uri);
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('Error converting image to data URL:', error);
        throw error;
    }
};

/**
 * Convertit un tableau d'images en data URLs
 * @param uris - Tableau d'URIs d'images locales
 * @returns Tableau de data URLs
 */
export const convertImagesToDataUrls = async (uris: string[]): Promise<string[]> => {
    try {
        const dataUrls = await Promise.all(
            uris.map((uri) => convertImageToDataUrl(uri))
        );
        return dataUrls;
    } catch (error) {
        console.error('Error converting images to data URLs:', error);
        throw error;
    }
};
