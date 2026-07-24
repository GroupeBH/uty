import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGAL_ACCEPTANCE_KEY = 'uty.legal-acceptance.v1';

export const hasAcceptedCurrentLegalTerms = async (): Promise<boolean> => {
    try {
        return Boolean(await AsyncStorage.getItem(LEGAL_ACCEPTANCE_KEY));
    } catch {
        return false;
    }
};

export const recordCurrentLegalAcceptance = async (): Promise<void> => {
    await AsyncStorage.setItem(
        LEGAL_ACCEPTANCE_KEY,
        JSON.stringify({ version: 1, acceptedAt: new Date().toISOString() }),
    );
};
