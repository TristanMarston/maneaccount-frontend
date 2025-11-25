'use client';

import Link from 'next/link';
import Image from 'next/image';
import Logo from './Logo';
import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, QrCode, Scissors, UserCheck, Users, Wallet, Icon } from 'lucide-react';
import { horseHead } from '@lucide/lab';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import MobileMenu from './MobileMenu';
import MenuToggle from './MenuToggle';

export type NavLink = {
    name: string;
    href: string;
    scroll?: boolean;
    dropdown?: () => React.ReactNode;
};

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <section className='w-screen fixed top-0 backdrop-blur-sm px-5 z-100 flex justify-center max-w-max-width'>
                <div className='flex items-center justify-between h-16 4xl:h-18 mt-5 rounded-[18px] primary-border px-4 min-[450px]:px-4.5 navbar-desktop:px-6 w-full max-w-max-width bg-background'>
                    <Logo position='navbar' />
                    {/* <Image src='/maneaccount-logo.png' alt='logo' className='h-15 w-[430px]' width={300} height={42} /> */}
                    <div className='hidden navbar-desktop:flex justify-center gap-1 font-figtree font-semibold text-base pt-1'>
                        <NavbarLinks links={navLinks} />
                    </div>
                    <div className='hidden navbar-desktop:flex gap-2 pl-[110px] navbar-lg:pl-[125px] min-[1150px]:pl-[150px] items-center justify-end font-figtree font-bold text-base'>
                        <Link href='/sign-in' className='w-full text-nowrap grid place-items-center rounded-[10px] py-1 px-4 text-[17px] text-primary primary-border-hover'>
                            Sign In
                        </Link>
                    </div>
                    <MenuToggle className='navbar-desktop:hidden' toggle={() => setMenuOpen((prev) => !prev)} isOpen={menuOpen} />
                </div>
            </section>
            <MobileMenu isOpen={menuOpen} setIsOpen={setMenuOpen} links={navLinks} />
        </>
    );
};

const NavbarLinks = ({ links }: { links: NavLink[] }) => {
    return links.map(({ name, href, scroll }) => (
        <Link
            key={name}
            href={scroll ? '#' : href}
            onClick={(e) => {
                e.preventDefault();
                if (scroll) {
                    const targetElement = document.getElementById(href.substring(1));
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }}
            className='text-primary font-figtree font-semibold text-[17px] select-none py-0.5 px-3 rounded-full hover:bg-secondary/40 border border-transparent hover:border-secondary-dark transition-all duration-200'
        >
            {name}
        </Link>
    ));
};

const navLinks: NavLink[] = [
    {
        name: 'Features',
        href: '#features',
        scroll: true,
    },
    {
        name: 'Solutions',
        href: '#solutions',
        scroll: true,
    },
    {
        name: 'Pricing',
        href: '#pricing',
        scroll: true,
    },
];

export const dropdownVariants: (closeDuration: number, openDuration: number) => Variants = (closeDuration = 0.3, openDuration = 0.3) => ({
    closed: {
        opacity: 0,
        y: -10,
        transition: { duration: closeDuration, ease: 'easeInOut' },
    },
    open: {
        opacity: 1,
        y: 0,
        transition: { duration: openDuration, ease: 'easeInOut' },
    },
});

export const flipVariants: Variants = {
    closed: {
        rotate: '0deg',
        transition: { duration: 0.3, type: 'spring', bounce: 0.3 },
    },
    open: {
        rotate: '180deg',
        transition: { duration: 0.3, type: 'spring', bounce: 0.3 },
    },
};

export default Navbar;
