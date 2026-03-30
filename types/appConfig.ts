export interface AppConfigLocation {
    latitude: number;
    longitude: number;
}

export interface AppConfigPaymentMethod {
    id: string;
    label: string;
    description: string;
    kind: 'delivery' | 'mobile_money' | 'bank' | 'other';
    isRecommended?: boolean;
    isEnabled?: boolean;
}

export interface AppConfigSupportChannel {
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    hoursLabel?: string | null;
}

export interface AppConfigFaqItem {
    question: string;
    answer: string;
}

export interface AppConfigResponse {
    market: {
        country: string;
        city: string;
        locale: string;
        currencyCode: string;
        phoneCountryCode: string;
    };
    geography: {
        defaultCenter: AppConfigLocation;
        featuredCommunes: string[];
        featuredLandmarks: string[];
        addressExamples: string[];
    };
    checkout: {
        usdToCdfRate: number;
        taxRate: number;
        paymentMethods: AppConfigPaymentMethod[];
        deliveryHints: string[];
    };
    support: {
        channels: AppConfigSupportChannel;
        faq: AppConfigFaqItem[];
    };
    search: {
        featuredTerms: string[];
    };
}
