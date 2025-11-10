import { RefObject, useEffect } from 'react';

type AnyEvent = MouseEvent | TouchEvent;

export function useOnClickOutside<T extends HTMLElement | null = HTMLElement>(
    ref: RefObject<T> | null,
    excludeRefs: RefObject<T>[] | undefined,
    handler: (event: AnyEvent) => void
): void {
    useEffect(() => {
        const listener = (event: AnyEvent) => {
            const el = ref?.current;

            if (!el || el.contains(event.target as Node)) {
                return;
            }

            if (excludeRefs && excludeRefs.length > 0) {
                for (let i = 0; i < excludeRefs.length; i++) {
                    const excludeElement = excludeRefs[i].current;
                    if (!excludeElement) break;
                    if (excludeElement.contains(event.target as Node)) return;
                }
            }

            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}
