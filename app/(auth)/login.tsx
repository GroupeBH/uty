import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

const readParam = (value?: string | string[]) => {
    if (Array.isArray(value)) {
        return value[0] ?? '';
    }
    return value ?? '';
};

export default function LoginScreenRedirect() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        returnUrl?: string | string[];
        message?: string | string[];
        title?: string | string[];
        reason?: string | string[];
        source?: string | string[];
    }>();

    const returnUrl = readParam(params.returnUrl).trim();
    const message = readParam(params.message).trim();
    const title = readParam(params.title).trim();
    const reason = readParam(params.reason).trim();
    const source = readParam(params.source).trim();

    const redirectParams = React.useMemo(() => {
        const nextParams: Record<string, string> = {
            mode: 'login',
        };

        if (returnUrl) nextParams.returnUrl = returnUrl;
        if (message) nextParams.reason = message;
        if (title) nextParams.title = title;
        if (reason) nextParams.reason = reason;
        if (source) nextParams.source = source;

        return nextParams;
    }, [message, reason, returnUrl, source, title]);

    React.useEffect(() => {
        router.replace({ pathname: '/modal', params: redirectParams });
    }, [router, redirectParams]);

    return null;
}
