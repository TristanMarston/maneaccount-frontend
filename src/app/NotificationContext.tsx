'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUnreadNotificationCount } from '@/app/actions/notifications';

type UnreadCounts = {
    total: number;
    byType: Record<string, number>;
};

type NotificationContextType = {
    unreadCounts: UnreadCounts;
    refreshCounts: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ total: 0, byType: {} });

    const refreshCounts = useCallback(async () => {
        const counts = await getUnreadNotificationCount();
        setUnreadCounts(counts);
    }, []);

    useEffect(() => {
        refreshCounts();

        // Poll every 15 seconds
        const interval = setInterval(refreshCounts, 15000);

        // Instant refresh on window focus
        const handleFocus = () => {
            refreshCounts();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [refreshCounts]);

    return <NotificationContext.Provider value={{ unreadCounts, refreshCounts }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
