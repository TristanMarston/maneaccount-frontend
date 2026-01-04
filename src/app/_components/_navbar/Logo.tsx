'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

const Logo = ({
    href = '/',
    position = 'navbar',
    color = 'default',
    className = '',
}: {
    href?: string;
    position?: 'navbar' | 'footer';
    color?: 'default' | 'background';
    className?: string;
}) => {
    return (
        <Link href={href} className={cn('flex items-center gap-1 font-figtree', className)}>
            {color === 'default' ? (
                <Image src='/maneaccount-logo.png' alt='Logo' width={500} height={182} className={cn('w-full', position === 'navbar' ? 'w-auto h-11 4xl:h-13' : '')} />
            ) : (
                <Image src='/maneaccount-logo-white.png' alt='Logo' width={500} height={182} className={cn('w-full', position === 'navbar' ? 'w-auto h-11 4xl:h-13' : '')} />
            )}
            {/* {color === 'default' ? (
                <>
                    <Image
                        src='/mane-account-M.svg'
                        alt='M'
                        className='svg-filter text-primary fill-current w-10 h-7 xxs:w-11 xxs:h-8 sm:w-12 sm:h-9 min-[450px]:w-13 min-[450px]:h-10'
                        width={50}
                        height={50}
                    />
                    <p
                        className={cn(
                            'text-primary font-lustria pt-2 xxs:pt-2.5 sm:pt-[11px]',
                            position === 'navbar' ? 'text-[26px] xs:text-[28px] sm:text-3xl 4xl:text-[32px] navbar-lg:text-4xl' : ''
                        )}
                    >
                        ane
                    </p>
                    <Image
                        src='/mane-account-A.svg'
                        alt='A'
                        className='svg-filter text-primary fill-current w-7 h-7 xxs:w-8 xxs:h-8 sm:w-9 sm:h-9 min-[450px]:w-10 min-[450px]:h-10'
                        width={50}
                        height={50}
                    />
                    <p
                        className={cn(
                            'text-primary font-lustria pt-2 xxs:pt-2.5 sm:pt-[11px]',
                            position === 'navbar' ? 'text-[24px] xxs:text-[26px] xs:text-[28px] sm:text-3xl 4xl:text-[32px] navbar-lg:text-4xl' : ''
                        )}
                    >
                        ccount
                    </p>
                </>
            ) : (
                <>
                    <Image
                        src='mane-account-M.svg'
                        alt='M'
                        className='background-svg-filter text-background fill-current w-10 h-7 xxs:w-11 xxs:h-8 sm:w-12 sm:h-9 min-[450px]:w-13 min-[450px]:h-10'
                        width={50}
                        height={50}
                    />
                    <p
                        className={cn(
                            'text-background font-lustria pt-2 xxs:pt-2.5 sm:pt-[11px]',
                            position === 'navbar' ? 'text-[26px] xs:text-[28px] sm:text-3xl 4xl:text-[32px] navbar-lg:text-4xl' : ''
                        )}
                    >
                        ane
                    </p>
                    <Image
                        src='mane-account-A.svg'
                        alt='A'
                        className='background-svg-filter text-background fill-current w-7 h-7 xxs:w-8 xxs:h-8 sm:w-9 sm:h-9 min-[450px]:w-10 min-[450px]:h-10'
                        width={50}
                        height={50}
                    />
                    <p
                        className={cn(
                            'text-background font-lustria pt-2 xxs:pt-2.5 sm:pt-[11px]',
                            position === 'navbar' ? 'text-[24px] xxs:text-[26px] xs:text-[28px] sm:text-3xl 4xl:text-[32px] navbar-lg:text-4xl' : ''
                        )}
                    >
                        ccount
                    </p>
                </>
            )} */}
        </Link>
    );
};

export default Logo;
