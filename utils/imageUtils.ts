import * as FileSystem from 'expo-file-system/legacy';

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

