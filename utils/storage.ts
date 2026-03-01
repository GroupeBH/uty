import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
    ONBOARDING_COMPLETED: 'onboardingCompleted',
    ONBOARDING_SPACE: 'onboardingSpace',
} as const;

const USER_STORAGE_KEYS = [
    '_id',
    'id',
    'username',
    'firstName',
    'lastName',
    'phone',
    'verified_phone',
    'email',
    'image',
    'roles',
    'rating',
    'preferredCategories',
    'createdAt',
    'updatedAt',
] as const;

const sanitizeUserForStorage = (user: any) => {
    if (!user || typeof user !== 'object') {
        return null;
    }

    const compact: Record<string, any> = {};
    for (const key of USER_STORAGE_KEYS) {
        const value = user[key];
        if (value === undefined || value === null) continue;

        if (typeof value === 'string') {
            compact[key] = value.length > 1024 ? value.slice(0, 1024) : value;
            continue;
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            compact[key] = value;
            continue;
        }

        if (Array.isArray(value)) {
            compact[key] = value
                .slice(0, 100)
                .map((entry) =>
                    typeof entry === 'string'
                        ? entry.slice(0, 256)
                        : typeof entry === 'number' || typeof entry === 'boolean'
                        ? entry
                        : null,
                )
                .filter((entry) => entry !== null);
        }
    }

    return compact;
};

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
        const compactUser = sanitizeUserForStorage(user);
        try {
            if (!compactUser) {
                await AsyncStorage.removeItem(STORAGE_KEYS.USER);
                return;
            }

            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(compactUser));
        } catch (error) {
            console.error('Error saving user:', error);
            const message = String((error as any)?.message || '');
            if (message.includes('SQLITE_FULL') || message.toLowerCase().includes('disk is full')) {
                try {
                    // Free the biggest auth payload first when SQLite quota is exceeded.
                    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
                    if (compactUser?._id) {
                        await AsyncStorage.setItem(
                            STORAGE_KEYS.USER,
                            JSON.stringify({
                                _id: compactUser._id,
                                roles: Array.isArray(compactUser.roles) ? compactUser.roles : [],
                            }),
                        );
                    }
                } catch {
                    // Ignore cleanup errors.
                }
            }
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

