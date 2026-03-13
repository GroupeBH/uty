import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

const readParam = (value?: string | string[]) => {
    if (Array.isArray(value)) {
        return value[0] ?? '';
    }
    return value ?? '';
};

export default function RegisterScreenRedirect() {
    const router = useRouter();
    const params = useLocalSearchParams<{ phone?: string | string[] }>();
    const phone = readParam(params.phone).trim();

    const redirectParams = React.useMemo(() => {
        const nextParams: Record<string, string> = {
            mode: 'register',
        };
        if (phone) {
            nextParams.phone = phone;
        }
        return nextParams;
    }, [phone]);

    React.useEffect(() => {
        router.replace({ pathname: '/modal', params: redirectParams });
    }, [redirectParams, router]);

    return null;
}
