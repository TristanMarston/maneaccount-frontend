'use client';

import { useSVGFilter } from '@/hooks/useSVGFilter';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import Solutions from '../_solutions/Solutions';

const Hero = () => {
    const videoSections = [
        { title: 'For Braiders', description: 'Manage your schedule & get paid.', wideMobile: true },
        { title: 'For Subcontractors', description: 'Pick up work & track income.', wideMobile: false },
        { title: 'For Barns', description: 'Manage all your horses in one place.', wideMobile: false },
    ];

    useEffect(() => {
        useSVGFilter('#538475');
    }, []);

    return (
        <div className='w-full max-w-max-width pt-32 min-[475px]:pt-36 5xl:pt-48 px-4 sm:px-8 5xl:px-13 pb-20'>
            <div className='grid grid-cols-1 hero-md:grid-cols-12 items-center relative'>
                <div className='relative w-full aspect-video rounded-[18px] overflow-hidden hero-md:col-span-8 hero-md:col-start-5 hero-md:row-start-1 hero-md:ml-auto order-1 hero-md:order-2 group shadow-[-5px_-5px_15px_2px_rgba(0,0,0,0),_5px_5px_15px_2px_rgba(83,132,117,0.4)]'>
                    <Image
                        src='/maneaccount-hero.png'
                        alt='Beautifully braided horse mane'
                        fill
                        className='object-cover transition-transform duration-700 group-hover:scale-105'
                        priority
                    />
                    <div className='absolute inset-0 bg-linear-to-t from-black/20 to-transparent hero-md:hidden' />
                </div>

                <div className='relative z-10 w-full hero-md:col-span-7 hero-md:col-start-1 hero-md:row-start-1 order-2 hero-md:order-1 -mt-2 cm:-mt-4 lg:-mt-5 hero-md:mt-0 px-0 lg:px-4 hero-md:px-0'>
                    <div className='bg-white/60 backdrop-blur-md rounded-[18px] text-center hero-md:text-left p-8 hero-lg:p-10 hero-max:p-12 shadow-[-5px_-5px_15px_2px_rgba(83,132,117,0.4),_5px_5px_15px_2px_rgba(0,0,0,0.1)]'>
                        <h1 className='font-lusitana text-primary leading-[1.1] text-[30px] min-[405px]:text-[32px] min-[420px]:text-[34px] min-[435px]:text-4xl hero-xs:text-[40px] hero-sm:text-[44px] hero-cm:text-5xl hero-md:text-[44px] hero-lg:text-5xl hero-xl:text-[54px] hero-max:text-6xl mb-2 hero-md:mb-4 hero-max:mb-6'>
                            No more <br className='hidden min-[390px]:block hero-xs:hidden hero-md:block' /> tangled schedules.
                        </h1>
                        <h3 className='font-lusitana text-primary/80 text-base min-[435px]:text-[17px] hero-sm:text-lg hero-cm:text-xl hero-md:text-lg hero-lg:text-xl hero-xl:text-[22px] hero-max:text-2xl mb-4 hero-md:mb-6 hero-max:mb-8 leading-relaxed hero-md:max-w-lg'>
                            Simplify your bookings, invoices, and <br className='hidden min-[435px]:block hero-md:hidden' /> team coordination all in one place.
                        </h3>

                        <div className='flex flex-col w-full hero-sm:w-auto hero-sm:flex-row flex-wrap items-center justify-center hero-md:justify-start gap-2 hero-sm:gap-4'>
                            <button
                                onClick={() => {
                                    const targetElement = document.getElementById('solutions');
                                    if (targetElement) {
                                        targetElement.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                                className='rounded-[10px] w-full hero-sm:w-auto px-6 py-2 font-figtree font-bold bg-background text-primary text-[15px] hero-xs:text-base hero-cm:text-lg hero-md:text-base hero-xl:text-lg cursor-pointer primary-border-hover'
                            >
                                See How It Works
                            </button>
                            <Link
                                href='/login?mode=signup'
                                className='rounded-[10px] w-full hero-sm:w-auto px-6 py-2 font-figtree font-bold bg-primary-light text-background text-[15px] hero-xs:text-base hero-cm:text-lg hero-md:text-base hero-xl:text-lg cursor-pointer primary-border-hover'
                            >
                                Start For Free
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className='w-full mt-24'>
                <Solutions />
            </div>
        </div>
    );
};

export default Hero;
