'use client';

import { useSVGFilter } from '@/hooks/useSVGFilter';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

const Hero = () => {
    const videoSections = [
        { title: 'For Braiders', description: 'Manage your schedule & get paid.', wideMobile: true },
        { title: 'For Subcontractors', description: 'Pick up work & track income.', wideMobile: false },
        { title: 'For Barns', description: 'Coordinate your team seamlessly.', wideMobile: false },
    ];

    useEffect(() => {
        useSVGFilter('#538475');
    }, []);

    return (
        <div className='w-full max-w-max-width pt-36 min-[475px]:pt-38 navbar-desktop:pt-48 px-8 hero-xl:px-13 pb-20'>
            <div className='flex flex-col hero-xl:flex-row items-center justify-between gap-12 hero-xl:gap-8'>
                <section className='w-full hero-xl:w-1/2 flex flex-col items-center hero-xl:items-start justify-center text-center hero-xl:text-left'>
                    <h1 className='font-lusitana text-primary leading-[1.1] text-[32px] min-[340px]:text-4xl min-[370px]:text-[40px] cm:text-[44px] min-[430px]:text-5xl min-[475px]:text-[54px] min-[520px]:text-6xl          2xl:text-[50px] min-[740px]:text-[54px] 3xl:text-6xl 4xl:text-[66px]          hero-xl:text-[58px] 6xl:text-[66px] hero-max:text-7xl'>
                        No more <br className='block 2xl:hidden' /> tangled schedules.
                    </h1>
                    <h3 className='font-lusitana text-primary mt-4 text-base cm:text-[17px] min-[430px]:text-lg min-[475px]:text-xl          2xl:text-xl min-[740px]:text-[22px] 4xl:text-2xl          hero-xl:text-[22px] 6xl:text-[24px] hero-max:text-2xl'>
                        Simplify your bookings, invoices, and <br className='block 2xl:hidden' /> team coordination all in one place.
                    </h3>

                    <div className='w-full flex justify-center hero-xl:justify-start items-center gap-4 mt-5'>
                        <button className='rounded-[10px] px-4 py-2 font-figtree font-semibold bg-background text-primary primary-border-hover text-xs xs:text-sm min-[380px]:text-base min-[430px]:text-[17px] 4xl:text-lg cursor-pointer'>
                            See How It Works
                        </button>
                        <Link href='/login?mode=signup' className='rounded-[10px] px-4 py-2 font-figtree font-semibold bg-primary-light text-background primary-border-hover text-xs xs:text-sm min-[380px]:text-base min-[430px]:text-[17px] 4xl:text-lg cursor-pointer'>
                            Start For Free
                        </Link>
                    </div>
                </section>

                <div className='w-full hero-xl:w-1/2 flex justify-center hero-xl:justify-end'>
                    <div className='relative w-full max-w-[600px] aspect-video rounded-2xl overflow-hidden shadow-xl primary-border-bold bg-gray-100'>
                        <Image src='https://placehold.co/1000x600/png?text=Braided+Horse+Image' alt='Beautifully braided horse mane' fill className='object-cover' priority />
                    </div>
                </div>
            </div>

            <div className='w-full mt-24'>
                <div className='grid grid-cols-1 xl:grid-cols-2 min-[950px]:grid-cols-3 gap-8'>
                    {videoSections.map((section, index) => (
                        <div key={index} className={cn('flex flex-col gap-3', section.wideMobile ? 'xl:col-span-2 min-[950px]:col-span-1' : '')}>
                            <div className='w-full aspect-video bg-gray-200 rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden border border-gray-300'>
                                <div className='w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform'>
                                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='w-6 h-6 text-primary ml-1'>
                                        <path
                                            fillRule='evenodd'
                                            d='M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z'
                                            clipRule='evenodd'
                                        />
                                    </svg>
                                </div>
                                <span className='absolute bottom-3 font-figtree right-3 bg-black/60 text-white text-xs px-2 py-1 rounded'>1:30</span>
                            </div>
                            <div className='text-left px-2'>
                                <h4 className='font-lusitana text-2xl xs:text-[26px] 2xl:text-3xl min-[950px]:text-2xl 7xl:text-[26px] text-primary font-light'>{section.title}</h4>
                                <p className='font-figtree text-gray-600 text-sm xs:text-[15px] 2xl:text-base min-[950px]:text-sm 7xl:text-[15px] mt-1'>{section.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Hero;
