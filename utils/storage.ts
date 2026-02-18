import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
    ONBOARDING_COMPLETED: 'onboardingCompleted',
    ONBOARDING_SPACE: 'onboardingSpace',
} as const;

export const storage = {
    // Tokens
    async setAccessToken(token: string) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        } catch (error) {
            console.error('Error saving access token:', error);
        }
    },

    async getAccessToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    },

    async setRefreshToken(token: string) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        } catch (error) {
            console.error('Error saving refresh token:', error);
        }
    },

    async getRefreshToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    },

    // User
    async setUser(user: any) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } catch (error) {
            console.error('Error saving user:', error);
        }
    },

    async getUser(): Promise<any | null> {
        try {
            const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    // Clear all
    async clearAuth() {
        try {
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.ACCESS_TOKEN,
                STORAGE_KEYS.REFRESH_TOKEN,
                STORAGE_KEYS.USER,
            ]);
        } catch (error) {
            console.error('Error clearing auth:', error);
        }
    },

    // Save auth data
    async saveAuthData(accessToken: string, refreshToken: string, user: any) {
        try {
            await Promise.all([
                this.setAccessToken(accessToken),
                this.setRefreshToken(refreshToken),
                this.setUser(user),
            ]);
        } catch (error) {
            console.error('Error saving auth data:', error);
        }
    },

    // Get all auth data
    async getAuthData() {
        try {
            const [accessToken, refreshToken, user] = await Promise.all([
                this.getAccessToken(),
                this.getRefreshToken(),
                this.getUser(),
            ]);
            return { accessToken, refreshToken, user };
        } catch (error) {
            console.error('Error getting auth data:', error);
            return { accessToken: null, refreshToken: null, user: null };
        }
    },

    // Onboarding
    async setOnboardingCompleted(value: boolean) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, value ? '1' : '0');
        } catch (error) {
            console.error('Error saving onboarding flag:', error);
        }
    },

    async hasCompletedOnboarding(): Promise<boolean> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
            return raw === '1';
        } catch (error) {
            console.error('Error reading onboarding flag:', error);
            return false;
        }
    },

    async setOnboardingPreferredSpace(space: 'client' | 'seller' | 'delivery-persons') {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SPACE, space);
        } catch (error) {
            console.error('Error saving onboarding preferred space:', error);
        }
    },

    async getOnboardingPreferredSpace(): Promise<'client' | 'seller' | 'delivery-persons' | null> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SPACE);
            if (raw === 'client' || raw === 'seller' || raw === 'delivery-persons') {
                return raw;
            }
            return null;
        } catch (error) {
            console.error('Error reading onboarding preferred space:', error);
            return null;
        }
    },
};

