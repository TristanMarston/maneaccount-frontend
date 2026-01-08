'use client';

import { useEffect, useRef } from 'react';

export const useAutoRefresh = (refreshFn: () => void | Promise<void>) => {
    const refreshRef = useRef(refreshFn);

    useEffect(() => {
        refreshRef.current = refreshFn;
    }, [refreshFn]);

    useEffect(() => {
        refreshRef.current();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshRef.current();
            }
        };

        const handleFocus = () => {
            refreshRef.current();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);
};
