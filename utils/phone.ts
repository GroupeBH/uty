const DEFAULT_COUNTRY_CODE = '243';
const E164_DIGITS_REGEX = /^[1-9]\d{7,14}$/;
const DRC_LOCAL_NUMBER_REGEX = /^[89]\d{8}$/;

const PHONE_INVALID_MESSAGE = 'Numero de telephone invalide.';
const PHONE_AMBIGUOUS_MESSAGE =
    'Numero local ambigu. Utilisez le format international avec indicatif pays.';

const sanitizePhoneInput = (phone: string): string => {
    if (typeof phone !== 'string') {
        throw new Error(PHONE_INVALID_MESSAGE);
    }

    const normalized = phone.trim().replace(/[\s()-]/g, '');
    if (!normalized) {
        throw new Error(PHONE_INVALID_MESSAGE);
    }

    return normalized;
};

const toE164 = (digits: string): string => {
    if (!E164_DIGITS_REGEX.test(digits)) {
        throw new Error(PHONE_INVALID_MESSAGE);
    }

    return `+${digits}`;
};

const isLegacyDrcLocalNumber = (digits: string, defaultCountryCode: string): boolean => {
    if (defaultCountryCode !== DEFAULT_COUNTRY_CODE) {
        return false;
    }

    if (DRC_LOCAL_NUMBER_REGEX.test(digits)) {
        return true;
    }

    if (digits.startsWith('0')) {
        return DRC_LOCAL_NUMBER_REGEX.test(digits.slice(1));
    }

    return false;
};

export const normalizePhoneNumberForApi = (
    phone: string,
    options?: { defaultCountryCode?: string },
): string => {
    const defaultCountryCode = options?.defaultCountryCode || DEFAULT_COUNTRY_CODE;
    const normalized = sanitizePhoneInput(phone);

    if (normalized.startsWith('+')) {
        return toE164(normalized.slice(1).replace(/\D/g, ''));
    }

    if (normalized.startsWith('00')) {
        return toE164(normalized.slice(2).replace(/\D/g, ''));
    }

    const digitsOnly = normalized.replace(/\D/g, '');
    if (!digitsOnly) {
        throw new Error(PHONE_INVALID_MESSAGE);
    }

    if (digitsOnly.startsWith(defaultCountryCode)) {
        return toE164(digitsOnly);
    }

    if (isLegacyDrcLocalNumber(digitsOnly, defaultCountryCode)) {
        const localDigits = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
        return toE164(`${defaultCountryCode}${localDigits}`);
    }

    if (digitsOnly.startsWith('0')) {
        throw new Error(PHONE_AMBIGUOUS_MESSAGE);
    }

    return toE164(digitsOnly);
};
