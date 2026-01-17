'use client';

import { Check, X } from 'lucide-react';
import { motion, Variants } from 'motion/react';
import FAQ from './FAQ';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const pricingPlans = [
    {
        name: 'starter',
        priceMonthly: '29',
        priceYearly: '299',
        description: 'Perfect for individual braiders.',
        features: [
            { description: 'Up to 50 horses per week', included: true },
            { description: 'Client & horse records', included: true },
            { description: 'Scheduling & job tracking', included: true },
            { description: 'Invoicing & payments', included: true },
            { description: 'Email notifications', included: true },
            { description: 'No subcontractor access', included: false },
        ],
        popular: false,
    },
    {
        name: 'professional',
        priceMonthly: '69',
        priceYearly: '699',
        description: 'For established braiders and teams.',
        features: [
            { description: 'Everything in Starter', included: true },
            { description: 'Up to 50 horses per day', included: true },
            { description: 'Up to 10 subcontractors', included: true },
            { description: 'Team assignment & scheduling', included: true },
            { description: 'Performance insights', included: true },
            { description: 'Priority support', included: true },
        ],
        popular: true,
    },
    {
        name: 'enterprise',
        priceMonthly: '129',
        priceYearly: '1299',
        description: 'For large braiding operations.',
        features: [
            { description: 'Everything in Professional', included: true },
            { description: 'Unlimited horses', included: true },
            { description: 'Unlimited subcontractors', included: true },
            { description: 'Communication channels', included: true },
            { description: 'Account manager', included: true },
            { description: 'Dedicated support', included: true },
        ],
        popular: false,
    },
];

const Pricing = () => {
    const [view, setView] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <div className='relative w-full'>
            <div className='absolute -top-30' id='pricing'></div>
            <div className='w-full relative bg-stone-50 pb-24 flex flex-col items-center'>
                <div className='w-full absolute overflow-hidden leading-none z-10'>
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

                <div className='w-full max-w-max-width'>
                    <section className='w-full pt-20 lg:pt-28 pb-24 px-8'>
                        <div className='w-full max-w-max-width flex flex-col items-center mx-auto'>
                            <div className='flex flex-col items-center justify-center text-center mt-4 7xl:mt-0 mb-8'>
                                <h2 className='font-lusitana leading-[1.1] text-primary mb-4 text-[30px] min-[340px]:text-[33px] sm:text-4xl md:text-[43px] lg:text-4xl min-[540px]:text-[40px] min-[580px]:text-[44px] min-[630px]:text-5xl min-[720px]:text-[54px] 3xl:text-6xl'>
                                    Simple, transparent pricing.
                                </h2>
                                <p className='font-figtree text-primary-dark text-[15px] md:text-base min-[580px]:text-[17px] min-[720px]:text-lg max-w-2xl'>
                                    Choose the plan that fits your business. <br className='hidden xxs:block min-[650px]:hidden' /> Start with two months free.
                                </p>
                            </div>

                            <div className='grid grid-cols-2 items-center gap-4 justify-center mb-16 xl:mb-20'>
                                <button className='bg-primary rounded-[10px] cursor-pointer w-full' onClick={() => setView('monthly')}>
                                    <motion.div
                                        variants={rowHoverVariants}
                                        initial={'unhovered'}
                                        whileHover={view === 'monthly' ? 'selected' : 'hovered'}
                                        animate={view === 'monthly' ? 'selected' : 'unhovered'}
                                        className='font-lusitana capitalize flex text-primary text-[22px] min-[880px]:text-2xl bg-white rounded-[10px] px-10 py-2 border-[1.9px] border-primary w-full h-full items-center justify-center'
                                    >
                                        Monthly
                                    </motion.div>
                                </button>
                                <button className='bg-primary rounded-[10px] cursor-pointer w-full relative' onClick={() => setView('yearly')}>
                                    <motion.div
                                        variants={rowHoverVariants}
                                        initial={'unhovered'}
                                        whileHover={view === 'yearly' ? 'selected' : 'hovered'}
                                        animate={view === 'yearly' ? 'selected' : 'unhovered'}
                                        className='font-lusitana capitalize flex text-primary text-[22px] min-[880px]:text-2xl bg-white rounded-[10px] px-10 py-2 border-[1.9px] border-primary w-full h-full items-center justify-center'
                                    >
                                        Yearly
                                    </motion.div>
                                    <motion.div
                                        initial={{ top: '-18px' }}
                                        animate={{ top: view === 'yearly' ? '-22px' : '-18px' }}
                                        transition={{ duration: 0.2 }}
                                        className='absolute -right-2 bg-amber-100 border border-amber-200 shadow-sm rotate-3 uppercase px-2 py-0.5 rounded-lg font-figtree font-bold text-amber-600'
                                    >
                                        Save 15%
                                    </motion.div>
                                </button>
                            </div>

                            <div className='w-full grid grid-cols-1 pricing-lg:grid-cols-2 pricing-max:grid-cols-3 gap-4 pricing-max:gap-8 items-start max-w-6xl'>
                                {pricingPlans.map((plan, index) => (
                                    <div
                                        key={index}
                                        className={`
                                            relative flex flex-col p-8 bg-white rounded-3xl transition-all duration-300
                                            ${
                                                plan.popular
                                                    ? 'border-2 border-primary shadow-2xl scale-100 pricing-max:scale-110 z-10 col-span-1 pricing-lg:col-span-2 pricing-max:col-span-1 order-first pricing-max:order-0'
                                                    : 'border border-gray-100 shadow-lg my-2 pricing-lg:my-4'
                                            }
                                        `}
                                    >
                                        {plan.popular && (
                                            <div className='absolute -top-5 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1.5 rounded-full font-figtree text-sm font-semibold tracking-wide shadow-md whitespace-nowrap'>
                                                MOST POPULAR
                                            </div>
                                        )}

                                        <div className='mb-6'>
                                            <h3 className={`font-lusitana capitalize text-3xl ${plan.popular ? 'text-primary' : 'text-gray-800'}`}>{plan.name}</h3>
                                            <p className='font-figtree text-gray-500 text-sm mt-2 h-auto pricing-max:h-11 4xl:h-auto'>{plan.description}</p>
                                        </div>

                                        <div className='flex items-baseline mb-6'>
                                            <span className='text-4xl font-bold font-figtree text-gray-900'>${view === 'monthly' ? plan.priceMonthly : plan.priceYearly}</span>
                                            <span className='text-gray-500 ml-2 font-figtree'>/{view === 'monthly' ? 'month' : 'year'}</span>
                                        </div>

                                        <div className='grow mb-8'>
                                            <ul className='space-y-4'>
                                                {plan.features.map(({ description, included }, i) => (
                                                    <li key={i} className='flex items-start'>
                                                        <div
                                                            className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                                                                plan.popular && included
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : plan.popular && !included
                                                                      ? 'bg-primary/20 text-primary'
                                                                      : included
                                                                        ? 'bg-gray-100 text-gray-600'
                                                                        : 'bg-gray-300 text-gray-600'
                                                            }`}
                                                        >
                                                            {included ? <Check className='w-3 h-3' strokeWidth={3} /> : <X className='w-3 h-3' strokeWidth={3} />}
                                                        </div>
                                                        <span className='ml-3 font-figtree text-gray-600 text-[15px] pricing-max:text-sm 4xl:text-[15px]'>{description}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {plan.popular ? (
                                            <button className='w-full rounded-[10px] px-4 py-2 font-figtree font-semibold bg-primary-light text-background primary-border-hover text-[15px] xs:text-base min-[430px]:text-[17px] 4xl:text-lg cursor-pointer'>
                                                Start Free Trial
                                            </button>
                                        ) : (
                                            <button className='w-full rounded-[10px] px-4 py-2 font-figtree font-semibold bg-background text-primary primary-border-hover text-[15px] xs:text-base min-[430px]:text-[17px] 4xl:text-lg cursor-pointer'>
                                                Start Free Trial
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <FAQ page='landing' />
                        </div>
                    </section>
                </div>
            </div>
        </div>
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

export default Pricing;
