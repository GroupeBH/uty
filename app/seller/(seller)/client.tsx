import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'expo-router';
import React from 'react';

export default function SellerBackToClientTab() {
    const router = useRouter();

    React.useEffect(() => {
        router.replace('/(tabs)' as any);
    }, [router]);

    return <LoadingSpinner fullScreen />;
}
