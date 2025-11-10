import { motion } from 'motion/react';

const Path = ({ color = 'var(--primary)', isOpen, ...props }: { color: string; isOpen: boolean; [key: string]: any }) => (
    <motion.path fill='transparent' strokeWidth='3' stroke={color} animate={isOpen ? 'open' : 'closed'} strokeLinecap='round' {...props} />
);

const MenuToggle = ({ className, toggle, isOpen, color = 'var(--primary)' }: { className: string; toggle: () => void; isOpen: boolean; color?: string }) => (
    <button
        onClick={toggle}
        className={`${className} ${
            isOpen ? 'border-primary overflow-y-hidden ' : 'border-transparent'
        } z-60 p-3 border-2 rounded-full grid place-items-center transition-colors sticky cursor-pointer`}
    >
        <svg width='21' height='21' viewBox='0 0 21 20'>
            <Path
                color={color}
                variants={{
                    closed: { d: 'M 2 2.5 L 20 2.5' },
                    open: { d: 'M 3 16.5 L 17 2.5' },
                }}
                initial={{ d: 'M 2 2.5 L 20 2.5' }}
                isOpen={isOpen}
            />
            <Path
                color={color}
                transition={{ duration: 0.1 }}
                d='M 2 9.423 L 20 9.423'
                variants={{
                    closed: { opacity: 1 },
                    open: { opacity: 0 },
                }}
                isOpen={isOpen}
            />
            <Path
                color={color}
                variants={{
                    closed: { d: 'M 2 16.346 L 20 16.346' },
                    open: { d: 'M 3 2.5 L 17 16.346' },
                }}
                initial={{ d: 'M 2 16.346 L 20 16.346' }}
                isOpen={isOpen}
            />
        </svg>
    </button>
);

export default MenuToggle;
