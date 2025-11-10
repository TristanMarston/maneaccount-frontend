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
    dropdown?: () => React.ReactNode;
};

const Navbar = () => {
    const [currentDropdown, setCurrentDropdown] = useState(-1);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <section className='w-screen fixed top-0 backdrop-blur-sm px-5 z-100 flex justify-center max-w-max-width'>
                <div className='flex items-center justify-between h-16 4xl:h-18 mt-5 rounded-[18px] primary-border px-4 min-[450px]:px-4.5 navbar-desktop:px-6 w-full max-w-max-width bg-background'>
                    <Logo position='navbar' />
                    {/* <Image src='/maneaccount-logo.png' alt='logo' className='h-15 w-[430px]' width={300} height={42} /> */}
                    <div className='hidden navbar-desktop:flex justify-center gap-1 font-figtree font-semibold text-base pt-1'>
                        <NavbarLinks links={navLinks} currentDropdown={currentDropdown} setCurrentDropdown={setCurrentDropdown} />
                    </div>
                    <div className='hidden navbar-desktop:flex gap-2 pl-[43px] navbar-lg:pl-[63px] items-center justify-end font-figtree font-bold text-base'>
                        <Link href='/sign-in' className='w-full text-nowrap grid place-items-center rounded-[10px] py-1 px-4 text-[17px] text-primary primary-border-hover'>
                            Sign In
                        </Link>
                        <Link
                            href='/get-started'
                            className='w-full text-nowrap grid place-items-center rounded-[10px] py-1 px-4 text-[17px] bg-primary-light text-background primary-border-hover'
                        >
                            Get Started
                        </Link>
                    </div>
                    <MenuToggle className='navbar-desktop:hidden' toggle={() => setMenuOpen((prev) => !prev)} isOpen={menuOpen} />
                </div>
            </section>
            <MobileMenu isOpen={menuOpen} setIsOpen={setMenuOpen} links={navLinks} />
        </>
    );
};

const NavbarLinks = ({
    links,
    currentDropdown = -1,
    setCurrentDropdown,
}: {
    links: NavLink[];
    currentDropdown: number;
    setCurrentDropdown: React.Dispatch<React.SetStateAction<number>>;
}) => {
    return links.map(({ name, href, dropdown }, index) =>
        dropdown !== undefined ? (
            <DropdownLink key={name} name={name} dropdown={dropdown} index={index} currentDropdown={currentDropdown} setCurrentDropdown={setCurrentDropdown} />
        ) : (
            <Link
                key={name}
                href={href}
                className='text-primary font-figtree font-semibold text-[17px] select-none py-0.5 px-3 rounded-full hover:bg-secondary/40 border border-transparent hover:border-secondary-dark transition-all duration-200'
            >
                {name}
            </Link>
        )
    );
};

const DropdownLink = ({
    name,
    dropdown,
    currentDropdown,
    setCurrentDropdown,
    index,
}: {
    name: string;
    dropdown: () => React.ReactNode;
    currentDropdown: number;
    setCurrentDropdown: React.Dispatch<React.SetStateAction<number>>;
    index: number;
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(dropdownRef, [buttonRef], () => setDropdownOpen(false));

    useEffect(() => {
        if ((currentDropdown !== index && dropdownOpen) || (currentDropdown === -1 && dropdownOpen)) setDropdownOpen(false);
    }, [currentDropdown]);

    return (
        <div className='relative'>
            <div
                className={cn(
                    'text-primary font-figtree font-semibold text-[17px] flex items-center gap-1 cursor-pointer select-none py-0.5 px-3 rounded-full border border-transparent',
                    dropdownOpen ? 'bg-secondary/40 border-secondary-dark transition-all duration-200' : 'hover:bg-secondary/40 hover:border-secondary-dark transition-all duration-200'
                )}
                onClick={() => {
                    setCurrentDropdown(!dropdownOpen ? index : -1);
                    setDropdownOpen((prev) => {
                        return !prev;
                    });
                }}
                ref={buttonRef}
            >
                {name}
                <motion.div variants={flipVariants} initial='closed' animate={dropdownOpen ? 'open' : 'closed'}>
                    <ChevronDown strokeWidth={1.8} />
                </motion.div>
            </div>
            <AnimatePresence>
                {dropdownOpen && (
                    <motion.div
                        className={cn(
                            'absolute top-17 bg-background rounded-[18px] primary-border',
                            index === 0 ? 'left-0 w-[400%] navbar-xl:w-[580%]' : index === 1 ? 'left-[-125px] w-[400%] navbar-xl:w-[580%]' : ''
                        )}
                        variants={dropdownVariants}
                        initial='closed'
                        animate={dropdownOpen ? 'open' : 'closed'}
                        exit='closed'
                        ref={dropdownRef}
                    >
                        <div className='flex flex-col navbar-desktop:grid navbar-xl:grid-cols-[49%_49%] navbar-xl:grid-rows-2 gap-2 w-full h-full navbar-desktop:p-3'>{dropdown()}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const navLinks: NavLink[] = [
    {
        name: 'Features',
        href: '/features',
        dropdown: () => (
            <>
                <div className='p-3 w-full rounded-xl flex gap-3 hover:bg-background-secondary transition-colors cursor-pointer'>
                    <div className='rounded-full bg-primary-light primary-border p-2 w-14 h-14 aspect-square grid place-items-center'>
                        <Calendar className='text-background w-7 h-7' />
                    </div>
                    <div className='font-figtree'>
                        <h4 className='font-bold text-lg'>Calendar Management</h4>
                        <p className='font-light text-[15px]'>Stay on top of every client and event with a real-time, color-coded calendar.</p>
                    </div>
                </div>
                <div className='p-3 w-full rounded-xl flex gap-3 hover:bg-background-secondary transition-colors cursor-pointer'>
                    <div className='rounded-full bg-primary-light primary-border p-2 w-14 h-14 aspect-square grid place-items-center'>
                        <QrCode className='text-background w-7 h-7' />
                    </div>
                    <div className='font-figtree'>
                        <h4 className='font-bold text-lg'>QR Code Invoicing</h4>
                        <p className='font-light text-[15px]'>Send digital invoices that your clients can instantly scan and pay.</p>
                    </div>
                </div>
                <div className='p-3 w-full rounded-xl flex gap-3 hover:bg-background-secondary transition-colors cursor-pointer'>
                    <div className='rounded-full bg-primary-light primary-border p-2 w-14 h-14 aspect-square grid place-items-center'>
                        <UserCheck className='text-background w-7 h-7' />
                    </div>
                    <div className='font-figtree'>
                        <h4 className='font-bold text-lg'>Subcontractor Coordination</h4>
                        <p className='font-light text-[15px]'>Easily delegate clients to your team members and manage workloads with one click.</p>
                    </div>
                </div>
                <div className='p-3 w-full rounded-xl flex gap-3 hover:bg-background-secondary transition-colors cursor-pointer'>
                    <div className='rounded-full bg-primary-light primary-border p-2 w-14 h-14 aspect-square grid place-items-center'>
                        <Users className='text-background w-7 h-7' />
                    </div>
                    <div className='font-figtree'>
                        <h4 className='font-bold text-lg'>Client & Horse Registry</h4>
                        <p className='font-light text-[15px]'>Keep detailed records of clients and horses, synced across devices for instant access.</p>
                    </div>
                </div>
            </>
        ),
    },
    {
        name: 'Solutions',
        href: '/solutions',
        dropdown: () => (
            <>
                <div className='p-3 w-full rounded-xl flex gap-3 hover:bg-background-secondary transition-colors cursor-pointer'>
                    <div className='rounded-full bg-primary-light primary-border p-2 w-14 h-14 aspect-square grid place-items-center'>
                        <Icon iconNode={horseHead} className='text-background w-7 h-7' />
                    </div>
                    <div className='font-figtree'>
                        <h4 className='font-bold text-lg'>For Trainers</h4>
                        <p className='font-light text-[15px]'>Request services, view invoices, and pay instantly with integrated payments.</p>
                    </div>
                </div>
                <div className='p-3 w-full rounded-xl flex gap-3 hover:bg-background-secondary transition-colors cursor-pointer'>
                    <div className='rounded-full bg-primary-light primary-border p-2 w-14 h-14 aspect-square grid place-items-center'>
                        <Users className='text-background w-7 h-7' />
                    </div>
                    <div className='font-figtree'>
                        <h4 className='font-bold text-lg'>For Subcontractor Braiders</h4>
                        <p className='font-light text-[15px]'>Book braiding services and simplify your horse management.</p>
                    </div>
                </div>
                <div className='p-3 w-full rounded-xl flex gap-3 hover:bg-background-secondary transition-colors cursor-pointer'>
                    <div className='rounded-full bg-primary-light primary-border p-2 w-14 h-14 aspect-square grid place-items-center'>
                        <Scissors className='text-background w-7 h-7' />
                    </div>
                    <div className='font-figtree'>
                        <h4 className='font-bold text-lg'>For Independent Braiders</h4>
                        <p className='font-light text-[15px]'>Simplify your bookings, track payments, and keep your schedule organized.</p>
                    </div>
                </div>
            </>
        ),
    },
    {
        name: 'Pricing',
        href: '/pricing',
    },
];

export const dropdownVariants: Variants = {
    closed: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.3, ease: 'easeInOut' },
    },
    open: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: 'easeInOut' },
    },
};

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
