'use client';

import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useSVGFilter } from '@/hooks/useSVGFilter';
import { Check, Palette, X } from 'lucide-react';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type Colors = {
    primary: string;
    light: string;
    dark: string;
    background?: string;
    backgroundSecondary?: string;
};

const ColorSelection = () => {
    const [selectedColor, setSelectedColor] = useState<Colors>({
        primary: '024e3a',
        light: '03805f',
        dark: '011c15',
        background: 'f4eee5',
        backgroundSecondary: 'FBF7F2',
    });
    const [open, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(dialogRef, [], () => setOpen(false));

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', `#${selectedColor.primary}`);
        document.documentElement.style.setProperty('--primary-light', `#${selectedColor.light}`);
        document.documentElement.style.setProperty('--primary-dark', `#${selectedColor.dark}`);
        document.documentElement.style.setProperty('--background', `#${selectedColor.background}`);
        document.documentElement.style.setProperty('--background-secondary', `#${selectedColor.backgroundSecondary}`);

        const result = useSVGFilter(selectedColor.primary);
        if (result) {
            document.documentElement.style.setProperty('--svg-filter-invert', `${result.invert}%`);
            document.documentElement.style.setProperty('--svg-filter-sepia', `${result.sepia}%`);
            document.documentElement.style.setProperty('--svg-filter-saturate', `${result.saturate}%`);
            document.documentElement.style.setProperty('--svg-filter-hue-rotate', `${result.hueRotate}`);
            document.documentElement.style.setProperty('--svg-filter-brightness', `${result.brightness}%`);
            document.documentElement.style.setProperty('--svg-filter-contrast', `${result.contrast}%`);
        }
    }, [selectedColor]);

    return (
        <AnimatePresence>
            <motion.div ref={dialogRef} initial='closed' animate={open ? 'expanded' : 'closed'} variants={expandVariants} className='fixed bg-black right-8 bottom-8 rounded-lg shadow-md'>
                {open ? (
                    <>
                        <motion.div initial='hidden' animate={open ? 'visible' : 'hidden'} variants={visibleVariants} className='rounded-lg flex flex-col p-4'>
                            <motion.div
                                animate={{ backgroundColor: `#${selectedColor.primary}` }}
                                className='rounded-lg py-2 w-full border-2 border-white text-white uppercase font-bold grid place-items-center font-figtree'
                            >
                                primary
                            </motion.div>
                            <motion.div
                                animate={{ backgroundColor: `#${selectedColor.light}` }}
                                className='rounded-lg py-2 w-full border-2 border-white text-white uppercase mt-2 font-bold grid place-items-center font-figtree'
                            >
                                light
                            </motion.div>
                            <motion.div
                                animate={{ backgroundColor: `#${selectedColor.dark}` }}
                                className='rounded-lg py-2 w-full border-2 border-white text-white uppercase mt-2 font-bold grid place-items-center font-figtree'
                            >
                                dark
                            </motion.div>
                            <motion.div
                                animate={{ backgroundColor: `#${selectedColor.background}` }}
                                className='rounded-lg py-2 w-full border-2 border-white text-black uppercase mt-2 font-bold grid place-items-center font-figtree'
                            >
                                background
                            </motion.div>
                            <h4 className='text-black bg-white rounded-lg px-2 text-lg font-figtree font-black mt-4'>THEMES</h4>
                            <div className='grid grid-rows-2 grid-cols-5 w-full gap-2 mt-2'>
                                {themeColorOptions.map(({ primary, light, dark }) => (
                                    <div
                                        key={primary}
                                        onClick={() => {
                                            setSelectedColor((prev) => {
                                                return { ...prev, primary, light, dark };
                                            });
                                        }}
                                        style={{ backgroundColor: `#${light}` }}
                                        className='aspect-square p-2 border-[2.5px] border-white rounded-full cursor-pointer relative'
                                    >
                                        {selectedColor.primary === primary && <Check className='text-white absolute top-[50%] left-[50%] translate-[-50%]' strokeWidth={3} />}
                                    </div>
                                ))}
                            </div>
                            <h4 className='text-black bg-white rounded-lg px-2 text-lg font-figtree font-black mt-4'>BACKGROUND</h4>
                            <div className='grid grid-rows-1 grid-cols-5 w-full gap-2 mt-2'>
                                {backgroundColorOptions.map(({ background, backgroundSecondary }) => (
                                    <div
                                        key={background}
                                        onClick={() => {
                                            setSelectedColor((prev) => {
                                                return { ...prev, background, backgroundSecondary };
                                            });
                                        }}
                                        style={{ backgroundColor: `#${background}` }}
                                        className='aspect-square p-2 border-[2.5px] border-white rounded-full cursor-pointer relative'
                                    >
                                        {selectedColor.background === background && <Check className='text-black absolute top-[50%] left-[50%] translate-[-50%]' strokeWidth={3} />}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ rotate: '0deg', scale: 1 }}
                            whileHover={{ rotate: '90deg', scale: 1 }}
                            transition={{ duration: 0.5, bounce: 0.5, type: 'spring' }}
                            exit={{ scale: 0 }}
                            className='bg-white rounded-full p-1 absolute -top-4 -right-4 shadow-sm cursor-pointer'
                            onClick={() => setOpen(false)}
                        >
                            <X />
                        </motion.div>
                    </>
                ) : (
                    <div onClick={() => setOpen(true)} className='grid place-items-center p-2 cursor-pointer'>
                        <motion.div initial={open ? 'hidden' : 'visible'} animate={open ? 'hidden' : 'visible'} variants={visibleVariants}>
                            <Palette className='text-white' />
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

const themeColorOptions: Colors[] = [
    {
        primary: 'CA0000',
        dark: '970000',
        light: 'fd0000',
    },
    {
        primary: 'e65700',
        dark: 'b34400',
        light: 'ff711a',
    },
    {
        primary: '633100',
        dark: '301800',
        light: '964a00',
    },
    {
        primary: '008c49',
        dark: '00592e',
        light: '00bf64',
    },
    {
        primary: '024e3a',
        dark: '011c15',
        light: '03805f',
    },
    {
        primary: '538475',
        dark: '3f6559',
        light: '69a190',
    },
    {
        primary: '00347a',
        dark: '001e47',
        light: '004aad',
    },
    {
        primary: '006c7f',
        dark: '00414c',
        light: '0097b2',
    },
    {
        primary: '811b9e',
        dark: '5d1472',
        light: 'a522ca',
    },
    {
        primary: 'cc007d',
        dark: '99005e',
        light: 'ff009c',
    },
];

const backgroundColorOptions = [
    { background: 'ffffff', backgroundSecondary: 'f3f4f6' },
    { background: 'f4eee5', backgroundSecondary: 'FBF7F2' },
];

const expandVariants: Variants = {
    closed: {
        width: 40,
        height: 40,
        transition: { duration: 0.6, type: 'spring', bounce: 0.3 },
    },
    expanded: {
        width: 256,
        height: 460,
        transition: { duration: 0.6, type: 'spring', bounce: 0.3 },
    },
};

const visibleVariants: Variants = {
    hidden: {
        scale: 0,
        transition: { duration: 0.4, delay: 0.5 },
    },
    visible: {
        scale: 1,
        transition: { duration: 0.1, delay: 0.1 },
    },
};

export default ColorSelection;
