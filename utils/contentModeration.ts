const OBJECTIONABLE_PATTERNS: { pattern: RegExp; label: string }[] = [
    { pattern: /\b(pornographie|porno|contenu sexuel|nude|nudite)\b/i, label: 'contenu sexuel' },
    { pattern: /\b(terrorisme|attentat|explosif|bombe artisanale)\b/i, label: 'contenu dangereux' },
    { pattern: /\b(tuer|assassiner|menace de mort)\b/i, label: 'menace ou violence' },
    { pattern: /\b(arnaque|escroquerie|faux document)\b/i, label: 'fraude' },
];

export interface ContentCheckResult {
    allowed: boolean;
    reason?: string;
}

export const checkUserGeneratedText = (...values: (string | null | undefined)[]): ContentCheckResult => {
    const content = values.filter(Boolean).join(' ').normalize('NFKC');
    const match = OBJECTIONABLE_PATTERNS.find(({ pattern }) => pattern.test(content));

    return match
        ? { allowed: false, reason: match.label }
        : { allowed: true };
};

export const OBJECTIONABLE_CONTENT_MESSAGE =
    'Ce contenu semble enfreindre les regles de la communaute Uty. Modifiez-le avant de continuer.';

