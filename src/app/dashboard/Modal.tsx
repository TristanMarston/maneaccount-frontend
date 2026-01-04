'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';

const Modal = ({
    isOpen,
    setIsOpen,
    className = '',
    children,
    closeOnOutsideClick = true,
}: {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>> | ((open: boolean) => void);
    className?: string;
    children: React.ReactNode;
    closeOnOutsideClick?: boolean;
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                        if (closeOnOutsideClick) setIsOpen(false);
                    }}
                    className={cn(
                        'bg-slate-900/10 backdrop-blur p-6 min-[450px]:p-8 fixed inset-0 z-70 grid place-items-center overflow-y-scroll',
                        closeOnOutsideClick ? 'cursor-pointer' : ''
                    )}
                >
                    <motion.div
                        initial={{ scale: 0, rotate: '12.5deg' }}
                        animate={{ scale: 1, rotate: '0deg' }}
                        exit={{ scale: 0, rotate: '0deg' }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn('bg-background p-6 rounded-lg w-full max-w-lg shadow-xl cursor-default max-h-[93dvh] relative overflow-x-hidden overflow-y-auto! hide-scrollbar', className)}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
