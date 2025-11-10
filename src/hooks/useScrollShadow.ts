import { useState, useEffect, RefObject } from 'react';

export const useScrollShadow = (ref: RefObject<HTMLDivElement | null>) => {
    const [showBottomShadow, setShowBottomShadow] = useState(true);

    useEffect(() => {
        const element = ref?.current;
        if (!element) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = element;
            const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 48;

            setShowBottomShadow(!isAtBottom);
        };

        handleScroll();

        element.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            element.removeEventListener('scroll', handleScroll);
        };
    }, [ref?.current]);

    return { showBottomShadow };
};
