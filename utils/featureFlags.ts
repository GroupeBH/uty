const isEnabled = (value?: string) => {
    const normalized = value?.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

export const OTP_DISABLED = isEnabled(process.env.EXPO_PUBLIC_DISABLE_OTP);
