export const normalizeTextInputValue = (value: string) => {
    try {
        return value.normalize('NFC');
    } catch {
        return value;
    }
};
