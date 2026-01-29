'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion, Variants } from 'motion/react';
import Image from 'next/image';
import { useState } from 'react';

type ViewOption = 'braiders' | 'subcontractors' | 'barns';

const Solutions = () => {
    const [selectedView, setSelectedView] = useState<ViewOption>('braiders');

    const contentMap = {
        braiders: {
            alt: 'Dashboard view for Braiders showing schedule and income',
            src: 'https://placehold.co/1200x675/png?text=Braider+Dashboard+View',
        },
        subcontractors: {
            alt: 'Mobile view for Subcontractors showing assigned horses',
            src: 'https://placehold.co/1200x675/png?text=Subcontractor+Mobile+List',
        },
        barns: {
            alt: 'Desktop view for Horse Barns showing horse lists',
            src: 'https://placehold.co/1200x675/png?text=Barn+Dashboard+View',
        },
    };

    return (
        <div className='relative w-full'>
            <div className='absolute -top-20' id='solutions'></div>
            <div className='w-full relative bg-white flex flex-col items-center'>
                <div className='w-full absolute -top-14 lg:-top-24 overflow-hidden rotate-180 leading-none z-10'>
                    <svg
                        className='relative block w-[calc(100%+1.3px)] h-[60px] lg:h-[100px]'
                        data-name='Layer 1'
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 1200 120'
                        preserveAspectRatio='none'
                    >
                        <path
                            d='M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z'
                            className='fill-white'
                        ></path>
                    </svg>
                </div>

                <div className='w-full max-w-max-width px-8 pt-10 min-[450px]:pt-14 5xl:pt-24 pb-24'>
                    <section className='w-full flex flex-col items-center'>
                        <div className='flex flex-col items-center justify-center text-center mt-4 7xl:mt-0 mb-10'>
                            <h2 className='font-lusitana leading-[1.1] text-primary mb-4 text-[28px] xs:text-[32px] cm:text-[38px] min-[450px]:text-[43.5px] lg:text-5xl min-[540px]:text-[54px] 3xl:text-5xl min-[880px]:text-[54px] 5xl:text-6xl'>
                                A platform for everyone <br className='hidden min-[620px]:block 3xl:hidden' /> in the barn.
                            </h2>
                            <p className='font-figtree text-primary-dark text-sm sm:text-[15px] lg:text-base min-[540px]:text-[17px] min-[880px]:text-lg max-w-2xl'>
                                Whether you're managing the business, braiding the horses, or organizing your shows, ManeAccount adapts to your specific workflow.
                            </p>
                        </div>

                        <div className='max-w-3xl grid grid-cols-1 xl:grid-cols-3 w-full gap-4 xl:gap-3 3xl:gap-6 mb-10 xl:mb-16'>
                            <ShiftButton type='braiders' selectedView={selectedView} setSelectedView={setSelectedView} />
                            <ShiftButton type='subcontractors' selectedView={selectedView} setSelectedView={setSelectedView} />
                            <ShiftButton type='barns' selectedView={selectedView} setSelectedView={setSelectedView} />
                        </div>

                        <div className='w-full max-w-4xl mx-auto perspective-[1000px]'>
                            <div className='bg-[#DDDDDD] rounded-xl shadow-2xl border border-gray-200 overflow-hidden'>
                                <div className='bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2'>
                                    <div className='w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]'></div>
                                    <div className='w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]'></div>
                                    <div className='w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]'></div>
                                </div>

                                <div className='relative w-full aspect-video my-8 lg:my-0 overflow-hidden'>
                                    <AnimatePresence mode='wait'>
                                        <motion.div
                                            key={selectedView}
                                            variants={windowContentVariants}
                                            initial='initial'
                                            animate='animate'
                                            exit='exit'
                                            className='absolute inset-0 w-full h-full'
                                        >
                                            <div className='relative w-full h-full'>
                                                <Image src={contentMap[selectedView].src} alt={contentMap[selectedView].alt} fill className='object-cover object-top' priority />
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const ShiftButton = ({ type, selectedView, setSelectedView }: { type: ViewOption; selectedView: ViewOption; setSelectedView: React.Dispatch<React.SetStateAction<ViewOption>> }) => {
    return (
        <button className={cn('bg-primary rounded-[10px] cursor-pointer w-full')} onClick={() => setSelectedView(type)}>
            <motion.div
                variants={rowHoverVariants}
                initial={'unhovered'}
                whileHover={selectedView === type ? 'selected' : 'hovered'}
                animate={selectedView === type ? 'selected' : 'unhovered'}
                className='font-lusitana capitalize hidden xl:flex text-primary text-lg 2xl:text-xl 3xl:text-[22px] min-[880px]:text-2xl bg-white rounded-[10px] px-2 py-2 xl:py-1.5 2xl:py-2 border-[1.9px] border-primary w-full h-full items-center justify-center'
            >
                For {type}
            </motion.div>
            <motion.div
                variants={columnHoverVariants}
                initial={'unhovered'}
                whileHover={selectedView === type ? 'selected' : 'hovered'}
                animate={selectedView === type ? 'selected' : 'unhovered'}
                className='font-lusitana xl:hidden capitalize text-primary text-[17px] sm:text-lg min-[450px]:text-xl bg-white rounded-[10px] px-2 py-1.5 sm:py-2 border-[1.9px] border-primary w-full h-full flex items-center justify-center'
            >
                For {type}
            </motion.div>
        </button>
    );
};

const rowHoverVariants: Variants = {
    unhovered: {
        rotate: 0,
        y: 0,
        transition: { duration: 0.2 },
    },
    hovered: {
        rotate: -2.5,
        y: -6,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
    selected: {
        y: -4,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
};

const columnHoverVariants: Variants = {
    unhovered: {
        rotate: 0,
        y: 0,
        transition: { duration: 0.2 },
    },
    hovered: {
        rotate: -1.25,
        y: -5,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
    selected: {
        y: -4,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
};

const windowContentVariants: Variants = {
    initial: {
        opacity: 0,
        y: 20,
        filter: 'blur(4px)',
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.4, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        y: -20,
        filter: 'blur(4px)',
        transition: { duration: 0.3, ease: 'easeIn' },
    },
};

export default Solutions;
