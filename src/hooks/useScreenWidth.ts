'use client';

import { useState, useLayoutEffect } from 'react';

const useScreenWidth = (): number => {
    const [screenWidth, setScreenWidth] = useState<number>(400);

    useLayoutEffect(() => {
        const handleResize = () => {
            setScreenWidth(window.innerWidth);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return screenWidth;
};

export default useScreenWidth;
