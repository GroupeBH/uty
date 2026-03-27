import { KINSHASA_COMMUNES, KINSHASA_FEATURED_COMMUNES } from '@/constants/kinshasa';

export type KinshasaAddressFields = {
    commune: string;
    quartier: string;
    avenue: string;
    reference: string;
    details: string;
};

export const EMPTY_KINSHASA_ADDRESS_FIELDS: KinshasaAddressFields = {
    commune: '',
    quartier: '',
    avenue: '',
    reference: '',
    details: '',
};

const normalizeText = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();

const cleanSegment = (value: string) => value.replace(/\s+/g, ' ').trim();

const labelAvenue = (value: string) => {
    const cleaned = cleanSegment(value);
    if (!cleaned) return '';
    if (/^(avenue|av\.?|rue|boulevard|blvd\.?)/i.test(cleaned)) {
        return cleaned;
    }
    return `Avenue ${cleaned}`;
};

const labelCommune = (value: string) => {
    const cleaned = cleanSegment(value);
    if (!cleaned) return '';
    return `Commune ${cleaned}`;
};

const labelQuartier = (value: string) => {
    const cleaned = cleanSegment(value);
    if (!cleaned) return '';
    return `Quartier ${cleaned}`;
};

const labelReference = (value: string) => {
    const cleaned = cleanSegment(value);
    if (!cleaned) return '';
    return `Repere: ${cleaned}`;
};

export const hasKinshasaAddressValue = (fields: KinshasaAddressFields) =>
    Object.values(fields).some((value) => cleanSegment(value).length > 0);

export const formatKinshasaAddress = (fields: KinshasaAddressFields) => {
    const parts = [
        labelAvenue(fields.avenue),
        labelQuartier(fields.quartier),
        labelCommune(fields.commune),
        labelReference(fields.reference),
        cleanSegment(fields.details),
    ].filter(Boolean);

    return parts.join(', ');
};

const findKnownCommune = (value: string) => {
    const normalizedValue = normalizeText(value);
    return [...KINSHASA_FEATURED_COMMUNES, ...KINSHASA_COMMUNES].find(
        (commune) => normalizedValue.includes(normalizeText(commune)),
    );
};

export const parseKinshasaAddress = (value: string | null | undefined): KinshasaAddressFields => {
    const raw = cleanSegment(value || '');
    if (!raw) {
        return { ...EMPTY_KINSHASA_ADDRESS_FIELDS };
    }

    const segments = raw.split(',').map((segment) => cleanSegment(segment)).filter(Boolean);
    const parsed: KinshasaAddressFields = { ...EMPTY_KINSHASA_ADDRESS_FIELDS };
    let fallbackDetails = '';

    for (const segment of segments) {
        const normalizedSegment = normalizeText(segment);
        const detectedCommune = findKnownCommune(segment);

        if (!parsed.commune && detectedCommune) {
            parsed.commune = detectedCommune;
            continue;
        }

        if (!parsed.quartier && normalizedSegment.includes('quartier')) {
            parsed.quartier = segment.replace(/quartier\s*/i, '').trim();
            continue;
        }

        if (
            !parsed.avenue &&
            /^(avenue|av\.?|rue|boulevard|blvd\.?)/i.test(segment)
        ) {
            parsed.avenue = segment.replace(/^(avenue|av\.?|rue|boulevard|blvd\.?)\s*/i, '').trim();
            continue;
        }

        if (
            !parsed.reference &&
            /(repere|ref\.?|pres de|proche de|a cote de|vers)/i.test(normalizedSegment)
        ) {
            parsed.reference = segment
                .replace(/^(repere|ref\.?)\s*:?\s*/i, '')
                .trim();
            continue;
        }

        if (!parsed.avenue) {
            parsed.avenue = segment;
            continue;
        }

        if (!parsed.reference) {
            parsed.reference = segment;
            continue;
        }

        fallbackDetails = fallbackDetails ? `${fallbackDetails}, ${segment}` : segment;
    }

    if (!parsed.reference && fallbackDetails) {
        parsed.reference = fallbackDetails;
    } else if (fallbackDetails) {
        parsed.details = fallbackDetails;
    }

    if (!parsed.commune) {
        const commune = findKnownCommune(raw);
        if (commune) {
            parsed.commune = commune;
        }
    }

    if (!parsed.reference && raw && !parsed.avenue && !parsed.quartier) {
        parsed.reference = raw;
    }

    return parsed;
};
