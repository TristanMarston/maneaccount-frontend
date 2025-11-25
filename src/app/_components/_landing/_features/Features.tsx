'use client';

import { Calendar, ChartBar, QrCode, TabletSmartphone, UserCheck, Users } from 'lucide-react';

const Features = () => {
    return (
        <div className='relative w-full'>
            <div className='absolute -top-30' id='features'></div>
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
                        <div className='w-full max-w-max-width mx-auto'>
                            <div className='flex flex-col items-center justify-center text-center mt-4 7xl:mt-0 mb-12 xl:mb-16'>
                                <h2 className='font-lusitana leading-[1.1] text-primary mb-4 text-[33px] xs:text-4xl min-[450px]:text-[33px] lg:text-[38px] min-[650px]:text-[43px] min-[720px]:text-5xl 3xl:text-[54px] 4xl:text-6xl'>
                                    Everything you <br className='block min-[450px]:hidden' /> need to run your <br className='block min-[450px]:hidden min-[650px]:block' /> braiding
                                    business.
                                </h2>
                                <p className='font-figtree text-primary-dark text-base lg:text-[17px] min-[720px]:text-lg max-w-2xl'>
                                    From client management to payment processing, ManeAccount streamlines every aspect of your horse braiding operation.
                                </p>
                            </div>

                            <div className='grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-3 gap-4 min-[750px]:gap-6 7xl:gap-8'>
                                {features.map((feature, index) => (
                                    <div key={index} className='bg-white rounded-2xl p-5 min-[750px]:p-7 5xl:p-5 6xl:p-7 shadow-sm primary-border-hover'>
                                        <div className='rounded-[14px] bg-primary-light primary-border p-2 w-12 md:w-14 h-12 md:h-14 aspect-square grid place-items-center'>
                                            {feature.icon()}
                                        </div>
                                        <h3 className='font-lusitana text-xl min-[360px]:text-[22px] md:text-2xl xl:text-[19px] min-[630px]:text-[20px] min-[670px]:text-[22px] min-[750px]:text-2xl 5xl:text-[22px] 6xl:text-2xl text-primary mb-1 mt-3 min-[670px]:mb-2 min-[670px]:mt-4'>
                                            {feature.title}
                                        </h3>
                                        <p className='font-figtree text-sm min-[360px]:text-[15px] md:text-base xl:text-sm min-[670px]:text-[15px] min-[750px]:text-base 5xl:text-[15px] 6xl:text-base text-primary-dark leading-relaxed'>
                                            {feature.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const features = [
    {
        title: 'Calendar Management',
        description: 'Organize bookings by show weeks and manage your entire schedule from one dashboard.',
        icon: () => <Calendar className='text-background w-7 h-7' />,
    },
    {
        title: 'Client & Horse Registry',
        description: 'Keep detailed records of trainers, owners, and their horses with easy search and filtering.',
        icon: () => <Users className='text-background w-7 h-7' />,
    },
    {
        title: 'Subcontractor Assignment',
        description: 'Assign horses to your team braiders and track completion status in real-time.',
        icon: () => <UserCheck className='text-background w-7 h-7' />,
    },
    {
        title: 'QR Code Invoicing',
        description: 'Generate invoices with Venmo/Zelle QR codes for instant mobile payments.',
        icon: () => <QrCode className='text-background w-7 h-7' />,
    },
    {
        title: 'Mobile-First Design',
        description: 'Built for use at horse shows - access everything from your phone or tablet.',
        icon: () => <TabletSmartphone className='text-background w-7 h-7' />,
    },
    {
        title: 'Business Insights',
        description: 'Track payments, workload distribution, and get insights into your business performance.',
        icon: () => <ChartBar className='text-background w-7 h-7' />,
    },
];

export default Features;
