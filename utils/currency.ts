import { Currency } from '@/types/currency';

export const DEFAULT_CURRENCY_CODE = 'CDF';
export const DEFAULT_CURRENCY_SYMBOL = 'FC';

const CURRENCY_CODE_REGEX = /^[A-Za-z]{2,6}$/;
const MONGO_ID_REGEX = /^[a-f\d]{24}$/i;

const normalizeCurrencyCode = (value?: string): string | undefined => {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : undefined;
};

const buildCurrencyMaps = (currencies: Currency[] = []) => {
    const byId = new Map<string, Currency>();
    const byCode = new Map<string, Currency>();

    currencies.forEach((currency) => {
        if (!currency?._id) return;
        byId.set(currency._id, currency);
        const code = normalizeCurrencyCode(currency.code);
        if (code) {
            byCode.set(code, currency);
        }
    });

    return { byId, byCode };
};

export const getDefaultCurrency = (currencies: Currency[] = []): Currency | undefined => {
    const { byCode } = buildCurrencyMaps(currencies);
    return byCode.get(DEFAULT_CURRENCY_CODE) || currencies[0];
};

const resolveCurrencyObject = (
    currency: unknown,
    currencies: Currency[] = [],
): Partial<Currency> | undefined => {
    if (!currency) return undefined;

    const { byId, byCode } = buildCurrencyMaps(currencies);

    if (typeof currency === 'object') {
        const objectCurrency = currency as Partial<Currency>;

        const objectId =
            typeof objectCurrency._id === 'string' ? objectCurrency._id.trim() : undefined;
        if (objectId && byId.has(objectId)) {
            return byId.get(objectId);
        }

        const objectCode = normalizeCurrencyCode(objectCurrency.code);
        if (objectCode && byCode.has(objectCode)) {
            return byCode.get(objectCode);
        }

        return objectCurrency;
    }

    if (typeof currency === 'string') {
        const raw = currency.trim();
        if (!raw) return undefined;

        if (byId.has(raw)) {
            return byId.get(raw);
        }

        const normalizedCode = normalizeCurrencyCode(raw);
        if (normalizedCode && byCode.has(normalizedCode)) {
            return byCode.get(normalizedCode);
        }

        if (normalizedCode && CURRENCY_CODE_REGEX.test(normalizedCode)) {
            return { code: normalizedCode };
        }
    }

    return undefined;
};

export const resolveCurrencySelectionValue = (
    currency: unknown,
    currencies: Currency[] = [],
): string => {
    const resolved = resolveCurrencyObject(currency, currencies);

    if (resolved?._id && typeof resolved._id === 'string') {
        return resolved._id;
    }

    const resolvedCode = normalizeCurrencyCode(resolved?.code);
    if (resolvedCode) {
        const { byCode } = buildCurrencyMaps(currencies);
        const fromCode = byCode.get(resolvedCode);
        if (fromCode?._id) {
            return fromCode._id;
        }
        return resolvedCode;
    }

    if (typeof currency === 'string') {
        const raw = currency.trim();
        if (raw && !MONGO_ID_REGEX.test(raw)) {
            const normalizedCode = normalizeCurrencyCode(raw);
            if (normalizedCode && CURRENCY_CODE_REGEX.test(normalizedCode)) {
                return normalizedCode;
            }
        }
    }

    const defaultCurrency = getDefaultCurrency(currencies);
    if (defaultCurrency?._id) {
        return defaultCurrency._id;
    }

    return DEFAULT_CURRENCY_CODE;
};

export const resolveCurrencyDisplay = (
    currency: unknown,
    options?: { currencies?: Currency[] },
): string => {
    const currencies = options?.currencies || [];
    const resolved = resolveCurrencyObject(currency, currencies);

    if (resolved?.symbol && resolved.symbol.trim()) {
        return resolved.symbol.trim();
    }

    const resolvedCode = normalizeCurrencyCode(resolved?.code);
    if (resolvedCode) {
        if (resolvedCode === DEFAULT_CURRENCY_CODE) {
            return DEFAULT_CURRENCY_SYMBOL;
        }
        return resolvedCode;
    }

    if (typeof currency === 'string') {
        const raw = currency.trim();
        if (!raw) {
            return DEFAULT_CURRENCY_SYMBOL;
        }

        if (raw.length <= 6 && !CURRENCY_CODE_REGEX.test(raw) && !MONGO_ID_REGEX.test(raw)) {
            return raw;
        }

        const normalizedCode = normalizeCurrencyCode(raw);
        if (normalizedCode && CURRENCY_CODE_REGEX.test(normalizedCode)) {
            if (normalizedCode === DEFAULT_CURRENCY_CODE) {
                return DEFAULT_CURRENCY_SYMBOL;
            }
            return normalizedCode;
        }
    }

    const defaultCurrency = getDefaultCurrency(currencies);
    if (defaultCurrency?.symbol && defaultCurrency.symbol.trim()) {
        return defaultCurrency.symbol.trim();
    }

    const defaultCode = normalizeCurrencyCode(defaultCurrency?.code);
    if (defaultCode && defaultCode !== DEFAULT_CURRENCY_CODE) {
        return defaultCode;
    }

    return DEFAULT_CURRENCY_SYMBOL;
};

export const formatCurrencyAmount = (
    amount: unknown,
    currency: unknown,
    options?: {
        currencies?: Currency[];
        locale?: string;
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
        fallbackText?: string;
    },
): string => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) {
        return options?.fallbackText || 'N/A';
    }

    const locale = options?.locale || 'fr-FR';
    const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
    const maximumFractionDigits = options?.maximumFractionDigits ?? 2;
    const amountLabel = numericAmount.toLocaleString(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
    });

    const currencyLabel = resolveCurrencyDisplay(currency, {
        currencies: options?.currencies,
    });
    return `${amountLabel} ${currencyLabel}`;
};
