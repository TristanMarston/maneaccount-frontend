'use client';

import { motion } from 'motion/react';
import { GradientBackground } from '../../GradientBackground';
import { useState, useEffect } from 'react';

const Hero = () => {
    const [secondaryColor, setSecondaryColor] = useState('#F1D128');

    useEffect(() => {
        const rootStyles = window.getComputedStyle(document.documentElement);
        const color = rootStyles.getPropertyValue('--secondary').trim();
        setSecondaryColor(color);
    }, []);

    return (
        <div className='w-full max-w-max-width pt-56'>
            <section className='w-full flex flex-col items-center justify-center'>
                <h1 className='font-lusitana text-primary text-7xl leading-[1.2] text-center'>
                    No more{' '}
                    <span className='relative'>
                        tangled
                        <svg viewBox='0 0 286 73' fill='none' className='absolute -left-2 -right-2 top-1 bottom-0 translate-y-1 scale-[1.1]'>
                            <motion.path
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                transition={{
                                    duration: 1.25,
                                    ease: 'easeInOut',
                                }}
                                d='M142.293 1C106.854 16.8908 6.08202 7.17705 1.23654 43.3756C-2.10604 68.3466 29.5633 73.2652 122.688 71.7518C215.814 70.2384 316.298 70.689 275.761 38.0785C230.14 1.37835 97.0503 24.4575 52.9384 1'
                                stroke={secondaryColor}
                                strokeWidth='3'
                            />
                        </svg>
                    </span>{' '}
                    schedules.
                </h1>
                <h3 className='font-lusitana text-primary text-2xl'>Simplify your bookings, invoices, and team coordination all in one place.</h3>
                <HeroVisualElement />
            </section>
        </div>
    );
};

const HeroVisualElement = ({ stroke = '#F1D128', strokeWidth = 3 }) => {
    const paperWidth = 350;
    const paperHeight = (paperWidth * 11) / 8.5;

    return (
        <section className='grid grid-cols-3 items-center w-full mt-24 pb-72'>
            <div
                style={{
                    width: `${paperWidth}px`,
                    height: `${paperHeight}px`,
                    gridTemplateColumns: `${(paperWidth * 1.75) / 8.5}px ${(paperWidth * 6.75) / 8.5}px`,
                    gridTemplateRows: `${(paperHeight * 1.25) / 11}px ${(paperHeight * 9.75) / 11}px`,
                }}
                className='bg-white primary-border rounded-md grid grid-cols-2 grid-rows-2'
            >
                <div className='border-r border-b border-primary relative w-full h-full'></div>
                <div className='border-b border-primary relative w-full h-full'></div>
                <div className='border-r  border-primary relative w-full h-full'></div>
            </div>
            <svg viewBox='0 0 300 100' fill='none' xmlns='http://www.w3.org/2000/svg' style={{ width: 'auto', height: 'auto' }}>
                {/* Curved path */}
                <motion.path
                    d='M10 75 C90 20, 210 120, 290 60'
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    fill='transparent'
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{
                        duration: 1.5,
                        ease: 'easeInOut',
                    }}
                />

                {/* Arrowhead */}
                <motion.path
                    d='M290 56 L290 70 L280 71'
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 1.4, duration: 0.3 }}
                    style={{ rotate: '-90deg', marginTop: '-10px' }}
                />
            </svg>
        </section>
    );
};

export default Hero;
