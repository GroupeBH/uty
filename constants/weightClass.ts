export const WEIGHT_CLASS_OPTIONS = [
    { value: 'light', label: 'Léger' },
    { value: 'medium', label: 'Moyen' },
    { value: 'heavy', label: 'Lourd' },
    { value: 'bulky', label: 'Volumineux' },
    { value: 'fragile', label: 'Fragile' },
] as const;

export type WeightClassValue = (typeof WEIGHT_CLASS_OPTIONS)[number]['value'];
