import { Variants } from 'motion/react';
import toast from 'react-hot-toast';

export const scrollVariants = (delay: number = 0, duration: number = 1, staggerChildren: number = 0): Variants => ({
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            delay,
            duration,
            staggerChildren,
            ease: 'anticipate',
        },
    },
});

export const failToast = (message: string) => {
    toast.error(message, {
        duration: 10000,
        position: 'top-center',
        className: 'font-figtree primary-border-important p-[8px_16px_8px_20px] !rounded-[14px] font-semibold text-lg w-full !max-w-fit',
    });
};

export const successToast = (message: string) => {
    toast.success(message, {
        duration: 10000,
        position: 'top-center',
        className: 'font-figtree primary-border-important p-[8px_16px_8px_20px] !rounded-[14px] font-semibold text-lg w-full !max-w-fit',
    });
};
