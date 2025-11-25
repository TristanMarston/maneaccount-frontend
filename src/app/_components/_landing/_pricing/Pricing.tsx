'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import FAQ from './FAQ';

const Pricing = () => {
    const plans = [
        {
            name: 'Starter',
            price: '29',
            description: 'Perfect for individual braiders.',
            features: ['Up to 50 horses', 'Basic invoicing', 'QR code payments', 'Email support', 'Basic scheduling'],
            popular: false,
        },
        {
            name: 'Professional',
            price: '59',
            description: 'For growing braiding businesses.',
            features: ['Unlimited Horses', 'Advanced reporting', 'Subcontractor portal', 'SMS notifications', 'Custom branding'],
            popular: true,
        },
        {
            name: 'Enterprise',
            price: '99',
            description: 'For large braiding operations.',
            features: ['Multi-location support', 'Custom integrations', 'Account manager', 'Priority support', 'Advanced scheduling'],
            popular: false,
        },
    ];

    return (
        <div className='relative w-full'>
            <div className='absolute -top-30' id='pricing'></div>
            <div className='w-full relative bg-stone-50 pb-24 flex flex-col items-center'>
                {/* SVG Wave */}
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
                    <section className='w-full pt-28 pb-24 px-8'>
                        <div className='w-full max-w-max-width flex flex-col items-center mx-auto'>
                            {/* Header Text */}
                            <div className='flex flex-col items-center justify-center text-center mt-4 7xl:mt-0 mb-16 xl:mb-20'>
                                <h2 className='font-lusitana leading-[1.1] text-primary mb-4 text-[30px] min-[340px]:text-[33px] sm:text-4xl md:text-[43px] lg:text-4xl min-[540px]:text-[40px] min-[580px]:text-[44px] min-[630px]:text-5xl min-[720px]:text-[54px] 3xl:text-6xl'>
                                    Simple, transparent pricing.
                                </h2>
                                <p className='font-figtree text-primary-dark text-[15px] md:text-base min-[580px]:text-[17px] min-[720px]:text-lg max-w-2xl'>
                                    Choose the plan that fits your business. <br className='hidden xxs:block min-[650px]:hidden' /> All plans include a 14-day free trial.
                                </p>
                            </div>

                            {/* Pricing Cards */}
                            <div className='w-full grid grid-cols-1 pricing-lg:grid-cols-2 pricing-max:grid-cols-3 gap-4 pricing-max:gap-8 items-start max-w-6xl'>
                                {plans.map((plan, index) => (
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
                                            <h3 className={`font-lusitana text-3xl ${plan.popular ? 'text-primary' : 'text-gray-800'}`}>{plan.name}</h3>
                                            <p className='font-figtree text-gray-500 text-sm mt-2 h-auto pricing-max:h-11 4xl:h-auto'>{plan.description}</p>
                                        </div>

                                        <div className='flex items-baseline mb-6'>
                                            <span className='text-4xl font-bold font-figtree text-gray-900'>${plan.price}</span>
                                            <span className='text-gray-500 ml-2 font-figtree'>/month</span>
                                        </div>

                                        <div className='grow mb-8'>
                                            <ul className='space-y-4'>
                                                {plan.features.map((feature, i) => (
                                                    <li key={i} className='flex items-start'>
                                                        <div
                                                            className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                                                                plan.popular ? 'bg-primary/10' : 'bg-gray-100'
                                                            }`}
                                                        >
                                                            <Check className={`w-3 h-3 ${plan.popular ? 'text-primary' : 'text-gray-600'}`} strokeWidth={3} />
                                                        </div>
                                                        <span className='ml-3 font-figtree text-gray-600 text-[15px] pricing-max:text-sm 4xl:text-[15px]'>{feature}</span>
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

export default Pricing;
