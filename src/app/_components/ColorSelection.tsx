'use client';

import { useSVGFilter } from '@/hooks/useSVGFilter';
import { Palette, X } from 'lucide-react';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { useEffect, useState } from 'react';

type Colors = {
    primary: string;
    light: string;
    dark: string;
    background?: string;
};

const ColorSelection = () => {
    const [selectedColor, setSelectedColor] = useState<Colors>({
        primary: '024e3a',
        light: '03805f',
        dark: '011c15',
        background: 'f4eee5',
    });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', `#${selectedColor.primary}`);
        document.documentElement.style.setProperty('--primary-light', `#${selectedColor.light}`);
        document.documentElement.style.setProperty('--primary-dark', `#${selectedColor.dark}`);
        document.documentElement.style.setProperty('--background', `#${selectedColor.background}`);

        const result = useSVGFilter(selectedColor.primary);
        console.log(result);
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
            <motion.div initial='closed' animate={open ? 'expanded' : 'closed'} variants={expandVariants} className='absolute bg-black right-8 bottom-8 rounded-lg shadow-md'>
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
                                        style={{ backgroundColor: `#${primary}` }}
                                        className='aspect-square p-2 border-[2.5px] border-white rounded-full cursor-pointer'
                                    />
                                ))}
                            </div>
                            <h4 className='text-black bg-white rounded-lg px-2 text-lg font-figtree font-black mt-4'>BACKGROUND</h4>
                            <div className='grid grid-rows-1 grid-cols-5 w-full gap-2 mt-2'>
                                {backgroundColorOptions.map((background) => (
                                    <div
                                        key={background}
                                        onClick={() => {
                                            setSelectedColor((prev) => {
                                                return { ...prev, background };
                                            });
                                        }}
                                        style={{ backgroundColor: `#${background}` }}
                                        className='aspect-square p-2 border-[2.5px] border-white rounded-full cursor-pointer'
                                    />
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
        primary: '024e3a',
        dark: '011c15',
        light: '03805f',
    },
    {
        primary: 'ff3131',
        dark: 'fd0000',
        light: 'ff6464',
    },
    {
        primary: 'ff66c4',
        dark: 'ff33b0',
        light: 'ff99d8',
    },
    {
        primary: 'cb6ce6',
        dark: 'bc40df',
        light: 'da98ed',
    },
    {
        primary: '0097b2',
        dark: '006c7f',
        light: '00c2e5',
    },
    {
        primary: '0cc0df',
        dark: '0996af',
        light: '2ad6f4',
    },
    {
        primary: '004aad',
        dark: '00347a',
        light: '0060e0',
    },
    {
        primary: '00bf63',
        dark: '008c49',
        light: '00f27d',
    },
    {
        primary: 'ffde59',
        dark: 'ffd426',
        light: 'ffe88c',
    },
    {
        primary: 'ff914d',
        dark: 'ff711a',
        light: 'ffb080',
    },
];

const backgroundColorOptions = ['ffffff', 'f4eee5'];

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
