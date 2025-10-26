'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const Logo = ({ href = '/' }: { href?: string }) => {
    return (
        <Link href={href} className='flex w-full gap-1 font-figtree'>
            <div className='bg-primary rounded-lg p-1 grid place-items-center'>
                <Image src='mane-account-M.svg' alt='M' className='bg-filter text-primary fill-current w-13 h-10' width={50} height={50} />
            </div>
            <span className='text-primary text-5xl font-semibold flex items-end pt-1.5'>ane</span>
            <div className='bg-primary rounded-lg p-1 grid place-items-center'>
                <Image src='mane-account-A.svg' alt='A' className='bg-filter text-primary fill-current w-10 h-10' width={50} height={50} />
            </div>
            <span className='text-primary text-5xl font-semibold flex items-end pt-1.5'>ccount</span>
        </Link>
    );
};

export default Logo;
